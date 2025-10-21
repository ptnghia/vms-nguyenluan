/**
 * Camera Management Page
 * CRUD operations for cameras
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Videocam as VideocamIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { apiClient } from '../services/api';
import type { Camera } from '../types';

const CameraManagementPage: React.FC = () => {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Form dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentCamera, setCurrentCamera] = useState<Camera | null>(null);
  
  // Form fields
  const [formData, setFormData] = useState({
    name: '',
    rtsp_url: '',
    location: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  
  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cameraToDelete, setCameraToDelete] = useState<Camera | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadCameras();
  }, []);

  const loadCameras = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await apiClient.getCameras();
      setCameras(data);
    } catch (err) {
      console.error('Failed to load cameras:', err);
      setError('Không thể tải danh sách camera');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddClick = () => {
    setIsEditing(false);
    setCurrentCamera(null);
    setFormData({ name: '', rtsp_url: '', location: '' });
    setFormErrors({});
    setIsDialogOpen(true);
  };

  const handleEditClick = (camera: Camera) => {
    setIsEditing(true);
    setCurrentCamera(camera);
    setFormData({
      name: camera.name,
      rtsp_url: camera.rtsp_url,
      location: camera.location || '',
    });
    setFormErrors({});
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (camera: Camera) => {
    setCameraToDelete(camera);
    setDeleteDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setCurrentCamera(null);
    setFormData({ name: '', rtsp_url: '', location: '' });
    setFormErrors({});
  };

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (formErrors[field]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Tên camera là bắt buộc';
    }

    if (!formData.rtsp_url.trim()) {
      errors.rtsp_url = 'RTSP URL là bắt buộc';
    } else if (!formData.rtsp_url.startsWith('rtsp://') && !formData.rtsp_url.startsWith('rtsps://')) {
      errors.rtsp_url = 'RTSP URL phải bắt đầu với rtsp:// hoặc rtsps://';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = async () => {
    if (!validateForm()) return;

    try {
      setIsSaving(true);
      
      if (isEditing && currentCamera) {
        // Update existing camera
        await apiClient.updateCamera(currentCamera.id, formData);
      } else {
        // Create new camera
        await apiClient.createCamera(formData);
      }

      handleDialogClose();
      loadCameras();
    } catch (err: any) {
      console.error('Failed to save camera:', err);
      setFormErrors({ submit: err.response?.data?.error || 'Không thể lưu camera' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!cameraToDelete) return;

    try {
      setIsDeleting(true);
      await apiClient.deleteCamera(cameraToDelete.id);
      setDeleteDialogOpen(false);
      setCameraToDelete(null);
      loadCameras();
    } catch (err: any) {
      console.error('Failed to delete camera:', err);
      alert(err.response?.data?.error || 'Không thể xóa camera');
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'success';
      case 'offline':
        return 'error';
      case 'recording':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'online':
        return 'Trực tuyến';
      case 'offline':
        return 'Ngoại tuyến';
      case 'recording':
        return 'Đang ghi';
      default:
        return status;
    }
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

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <VideocamIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            Quản lý Camera
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Làm mới">
            <IconButton onClick={loadCameras} color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddClick}
          >
            Thêm Camera
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Camera Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Tên</TableCell>
              <TableCell>Vị trí</TableCell>
              <TableCell>RTSP URL</TableCell>
              <TableCell>Trạng thái</TableCell>
              <TableCell>Ngày tạo</TableCell>
              <TableCell align="right">Thao tác</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cameras.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography variant="body2" color="text.secondary">
                    Chưa có camera nào
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              cameras.map((camera) => (
                <TableRow key={camera.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {camera.name}
                    </Typography>
                  </TableCell>
                  <TableCell>{camera.location || '-'}</TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{
                        maxWidth: 300,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={camera.rtsp_url}
                    >
                      {camera.rtsp_url}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusLabel(camera.status)}
                      color={getStatusColor(camera.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{formatDate(camera.created_at)}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Chỉnh sửa">
                      <IconButton
                        size="small"
                        onClick={() => handleEditClick(camera)}
                        color="primary"
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Xóa">
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteClick(camera)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onClose={handleDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {isEditing ? 'Chỉnh sửa Camera' : 'Thêm Camera mới'}
        </DialogTitle>
        <DialogContent>
          {formErrors.submit && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formErrors.submit}
            </Alert>
          )}

          <TextField
            fullWidth
            label="Tên Camera"
            value={formData.name}
            onChange={(e) => handleFormChange('name', e.target.value)}
            error={!!formErrors.name}
            helperText={formErrors.name}
            margin="normal"
            required
          />

          <TextField
            fullWidth
            label="RTSP URL"
            value={formData.rtsp_url}
            onChange={(e) => handleFormChange('rtsp_url', e.target.value)}
            error={!!formErrors.rtsp_url}
            helperText={formErrors.rtsp_url || 'Ví dụ: rtsp://admin:password@192.168.1.100:554/stream'}
            margin="normal"
            required
            placeholder="rtsp://username:password@ip:port/path"
          />

          <TextField
            fullWidth
            label="Vị trí"
            value={formData.location}
            onChange={(e) => handleFormChange('location', e.target.value)}
            error={!!formErrors.location}
            helperText={formErrors.location}
            margin="normal"
            placeholder="Ví dụ: Cổng chính, Sân trước..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} disabled={isSaving}>
            Hủy
          </Button>
          <Button
            onClick={handleFormSubmit}
            variant="contained"
            disabled={isSaving}
            startIcon={isSaving ? <CircularProgress size={16} /> : null}
          >
            {isSaving ? 'Đang lưu...' : (isEditing ? 'Cập nhật' : 'Thêm')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Xác nhận xóa</DialogTitle>
        <DialogContent>
          <Typography>
            Bạn có chắc chắn muốn xóa camera <strong>{cameraToDelete?.name}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Hành động này không thể hoàn tác.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
            Hủy
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={16} /> : null}
          >
            {isDeleting ? 'Đang xóa...' : 'Xóa'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CameraManagementPage;

