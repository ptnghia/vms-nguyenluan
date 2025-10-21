/**
 * Recording Playback Page
 * Play single recording with controls
 */

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  IconButton,
  Chip,
  Tooltip,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Videocam as VideocamIcon,
  VideoLibrary as VideoIcon,
} from '@mui/icons-material';
import { apiClient } from '../services/api';
import type { Recording } from '../types';

const RecordingPlaybackPage: React.FC = () => {
  const { recordingId } = useParams<{ recordingId: string }>();
  const navigate = useNavigate();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [recording, setRecording] = useState<Recording | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [videoError, setVideoError] = useState(false);
  const [videoLoading, setVideoLoading] = useState(true);
  const [relatedRecordings, setRelatedRecordings] = useState<Recording[]>([]);

  useEffect(() => {
    if (recordingId) {
      loadRecording(recordingId);
      loadRelatedRecordings(recordingId);
    }
  }, [recordingId]);

  // Load video with authentication - MUST be before any conditional returns
  useEffect(() => {
    if (!videoRef.current || !recording) return;

    const token = localStorage.getItem('accessToken');
    if (!token) {
      setVideoError(true);
      setVideoLoading(false);
      return;
    }

    const video = videoRef.current;
    const streamUrl = 'http://192.168.1.232:3000/api/recordings/' + recording.id + '/stream';

    setVideoLoading(true);

    // Fetch video with authentication and create blob URL
    fetch(streamUrl, {
      headers: {
        'Authorization': 'Bearer ' + token
      }
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to load video: ' + response.status);
        }
        return response.blob();
      })
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob);
        video.src = blobUrl;
        video.autoplay = true; // Enable autoplay
        setVideoLoading(false);
        setVideoError(false);
      })
      .catch(err => {
        console.error('Failed to load video:', err);
        setVideoError(true);
        setVideoLoading(false);
      });

    return () => {
      if (video.src && video.src.startsWith('blob:')) {
        URL.revokeObjectURL(video.src);
      }
    };
  }, [recording]);

  const loadRecording = async (id: string) => {
    try {
      setIsLoading(true);
      const data = await apiClient.getRecording(id);
      setRecording(data);
      setError('');
    } catch (err) {
      console.error('Failed to load recording:', err);
      setError('Failed to load recording');
    } finally {
      setIsLoading(false);
    }
  };

  const loadRelatedRecordings = async (currentId: string) => {
    try {
      // Get current recording first to know camera_id
      const current = await apiClient.getRecording(currentId);

      // Get recordings from same camera, sorted by start_time desc
      const response = await apiClient.getRecordings({
        camera_id: current.camera_id,
        limit: 11, // Get 11 to exclude current one
        sort_by: 'start_time',
        sort_order: 'desc'
      });

      // Filter out current recording and take only 10
      const related = response.recordings
        .filter(r => r.id !== currentId)
        .slice(0, 10);

      setRelatedRecordings(related);
    } catch (err) {
      console.error('Failed to load related recordings:', err);
      setRelatedRecordings([]);
    }
  };

  const handleRelatedRecordingClick = (id: string) => {
    // Navigate to new recording
    navigate('/recordings/' + id);
  };

  const handleBack = () => {
    navigate('/recordings');
  };

  const handleDownload = async () => {
    if (!recording) return;

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

  const handleDelete = async () => {
    if (!recording) return;

    if (!confirm('Are you sure you want to delete this recording?')) {
      return;
    }

    try {
      await apiClient.deleteRecording(recording.id);
      navigate('/recordings');
    } catch (err) {
      console.error('Failed to delete recording:', err);
      alert('Failed to delete recording');
    }
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
      second: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !recording) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || 'Recording not found'}
        </Alert>
        <IconButton onClick={handleBack}>
          <BackIcon />
        </IconButton>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Tooltip title="Back to Recordings">
          <IconButton onClick={handleBack}>
            <BackIcon />
          </IconButton>
        </Tooltip>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4" component="h1">
            {recording.filename}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {formatDate(recording.start_time)}
          </Typography>
        </Box>
        <Tooltip title="Download">
          <IconButton onClick={handleDownload} color="info">
            <DownloadIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete">
          <IconButton onClick={handleDelete} color="error">
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Video Player */}
      <Paper sx={{ mb: 3, overflow: 'hidden', bgcolor: 'black' }}>
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            paddingTop: '56.25%',
            bgcolor: 'black',
          }}
        >
          {!videoError ? (
            <>
              <video
                ref={videoRef}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                }}
                controls
                playsInline
                autoPlay
                onError={() => setVideoError(true)}
              />
              {videoLoading && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                  }}
                >
                  <CircularProgress />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    Loading video...
                  </Typography>
                </Box>
              )}
            </>
          ) : (
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
              }}
            >
              <VideocamIcon sx={{ fontSize: 80, color: 'error.main' }} />
              <Typography variant="h6" color="error">
                Video Error
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Unable to load video file
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Recording Details */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recording Information
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Filename
                  </Typography>
                  <Typography variant="body1">{recording.filename}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Start Time
                  </Typography>
                  <Typography variant="body1">
                    {formatDate(recording.start_time)}
                  </Typography>
                </Box>
                {recording.end_time && (
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      End Time
                    </Typography>
                    <Typography variant="body1">
                      {formatDate(recording.end_time)}
                    </Typography>
                  </Box>
                )}
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Duration
                  </Typography>
                  <Typography variant="body1">
                    {formatDuration(recording.duration)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Technical Details
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    File Size
                  </Typography>
                  <Typography variant="body1">
                    {formatFileSize(recording.file_size)}
                  </Typography>
                </Box>
                {recording.resolution && (
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Resolution
                    </Typography>
                    <Typography variant="body1">{recording.resolution}</Typography>
                  </Box>
                )}
                {recording.fps && (
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      FPS
                    </Typography>
                    <Typography variant="body1">{recording.fps}</Typography>
                  </Box>
                )}
                {recording.codec && (
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Codec
                    </Typography>
                    <Typography variant="body1">{recording.codec}</Typography>
                  </Box>
                )}
                {recording.bitrate && (
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Bitrate
                    </Typography>
                    <Typography variant="body1">
                      {(recording.bitrate / 1000000).toFixed(2)} Mbps
                    </Typography>
                  </Box>
                )}
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Storage Tier
                  </Typography>
                  <Chip
                    label={recording.storage_tier}
                    size="small"
                    color={recording.storage_tier === 'hot' ? 'success' : 'default'}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Related Recordings */}
      {relatedRecordings.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            Video gần đây cùng camera
          </Typography>
          <Grid container spacing={2}>
            {relatedRecordings.map((relatedRec) => (
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }} key={relatedRec.id}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 4,
                    },
                    border: relatedRec.id === recording.id ? '2px solid' : 'none',
                    borderColor: 'primary.main',
                  }}
                  onClick={() => handleRelatedRecordingClick(relatedRec.id)}
                >
                  <CardContent sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <VideoIcon sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 'bold',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={relatedRec.filename}
                      >
                        {relatedRec.filename}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {formatDate(relatedRec.start_time)}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
                      <Chip
                        label={formatDuration(relatedRec.duration)}
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        label={formatFileSize(relatedRec.file_size)}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
};

export default RecordingPlaybackPage;

