/**
 * Recordings Page
 * Browse and playback recordings with filters
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Button,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Pagination,
  InputAdornment,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Videocam as VideocamIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';
import { apiClient } from '../services/api';
import type { Recording, Camera } from '../types';

const RecordingsPage: React.FC = () => {
  const navigate = useNavigate();
  
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 12;
  
  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recordingToDelete, setRecordingToDelete] = useState<Recording | null>(null);

  useEffect(() => {
    loadCameras();
  }, []);

  useEffect(() => {
    loadRecordings();
  }, [page, selectedCamera, searchQuery, startDate, endDate]);

  const loadCameras = async () => {
    try {
      const data = await apiClient.getCameras();
      setCameras(data);
    } catch (err) {
      console.error('Failed to load cameras:', err);
    }
  };

  const loadRecordings = async () => {
    try {
      setIsLoading(true);
      const { recordings: data, pagination } = await apiClient.getRecordings({
        cameraId: selectedCamera || undefined,
        search: searchQuery || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page,
        limit,
      });
      
      setRecordings(data);
      setTotalPages(pagination.totalPages);
      setTotal(pagination.total);
      setError('');
    } catch (err) {
      console.error('Failed to load recordings:', err);
      setError('Failed to load recordings');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  const handleCameraChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedCamera(event.target.value);
    setPage(1);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
    setPage(1);
  };

  const handleStartDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setStartDate(event.target.value);
    setPage(1);
  };

  const handleEndDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEndDate(event.target.value);
    setPage(1);
  };

  const handlePlayRecording = (recording: Recording) => {
    // Navigate to playback page or open modal
    navigate('/recordings/' + recording.id);
  };

  const handleDownloadRecording = async (recording: Recording) => {
    try {
      const blob = await apiClient.downloadRecording(recording.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = recording.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to download recording:', err);
      alert('Failed to download recording');
    }
  };

  const handleDeleteClick = (recording: Recording) => {
    setRecordingToDelete(recording);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!recordingToDelete) return;

    try {
      await apiClient.deleteRecording(recordingToDelete.id);
      setDeleteDialogOpen(false);
      setRecordingToDelete(null);
      loadRecordings();
    } catch (err) {
      console.error('Failed to delete recording:', err);
      alert('Failed to delete recording');
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setRecordingToDelete(null);
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return hours + 'h ' + minutes + 'm ' + secs + 's';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Recordings
      </Typography>

      {/* Filters */}
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              select
              fullWidth
              label="Camera"
              value={selectedCamera}
              onChange={handleCameraChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <VideocamIcon />
                  </InputAdornment>
                ),
              }}
            >
              <MenuItem value="">All Cameras</MenuItem>
              {cameras.map((camera) => (
                <MenuItem key={camera.id} value={camera.id}>
                  {camera.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              fullWidth
              label="Search"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search by filename..."
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              fullWidth
              type="datetime-local"
              label="Start Date"
              value={startDate}
              onChange={handleStartDateChange}
              InputLabelProps={{ shrink: true }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <CalendarIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              fullWidth
              type="datetime-local"
              label="End Date"
              value={endDate}
              onChange={handleEndDateChange}
              InputLabelProps={{ shrink: true }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <CalendarIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
        </Grid>
      </Box>

      {/* Results Summary */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Found {total} recordings
        </Typography>
      </Box>

      {/* Loading */}
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Recordings Grid */}
      {!isLoading && recordings.length === 0 && (
        <Alert severity="info">No recordings found</Alert>
      )}

      {!isLoading && recordings.length > 0 && (
        <>
          <Grid container spacing={2}>
            {recordings.map((recording) => (
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={recording.id}>
                <Card>
                  <CardMedia
                    component="div"
                    sx={{
                      height: 140,
                      bgcolor: 'grey.900',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <VideocamIcon sx={{ fontSize: 60, color: 'grey.600' }} />
                  </CardMedia>
                  <CardContent>
                    <Typography variant="subtitle2" noWrap title={recording.filename}>
                      {recording.filename}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {formatDate(recording.start_time)}
                    </Typography>
                    <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip label={formatDuration(recording.duration)} size="small" />
                      <Chip label={formatFileSize(recording.file_size)} size="small" />
                      {recording.resolution && (
                        <Chip label={recording.resolution} size="small" />
                      )}
                    </Box>
                  </CardContent>
                  <CardActions>
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handlePlayRecording(recording)}
                      title="Play"
                    >
                      <PlayIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="info"
                      onClick={() => handleDownloadRecording(recording)}
                      title="Download"
                    >
                      <DownloadIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteClick(recording)}
                      title="Delete"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Pagination */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={handlePageChange}
              color="primary"
            />
          </Box>
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Delete Recording</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this recording?
          </Typography>
          {recordingToDelete && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {recordingToDelete.filename}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RecordingsPage;

