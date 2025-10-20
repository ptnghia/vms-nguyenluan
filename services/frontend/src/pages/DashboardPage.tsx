/**
 * Dashboard Page
 * Main camera grid view
 */

import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Paper,
  Typography,
  AppBar,
  Toolbar,
  Button,
  IconButton,
  Badge,
  CircularProgress,
} from '@mui/material';
import {
  Logout,
  Videocam,
  FiberManualRecord,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../services/api';
import type { Camera } from '../types';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCameras();
    // Refresh every 30 seconds
    const interval = setInterval(loadCameras, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadCameras = async () => {
    try {
      const data = await apiClient.getCameras();
      setCameras(data);
      setError('');
    } catch (err) {
      setError('Failed to load cameras');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleCameraClick = (cameraId: string) => {
    navigate(`/camera/${cameraId}`);
  };

  const onlineCameras = cameras.filter((c) => c.status === 'online').length;

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* App Bar */}
      <AppBar position="static">
        <Toolbar>
          <Videocam sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            VMS Dashboard
          </Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>
            {user?.username} ({user?.role})
          </Typography>
          <Badge badgeContent={onlineCameras} color="success" sx={{ mr: 2 }}>
            <Typography variant="body2">Cameras Online</Typography>
          </Badge>
          <IconButton color="inherit" onClick={handleLogout}>
            <Logout />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error" align="center">
            {error}
          </Typography>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)',
              },
              gap: 3,
            }}
          >
            {cameras.map((camera) => (
              <Paper
                key={camera.id}
                  elevation={3}
                  sx={{
                    p: 2,
                    cursor: 'pointer',
                    '&:hover': {
                      boxShadow: 6,
                    },
                  }}
                  onClick={() => handleCameraClick(camera.id)}
                >
                  {/* Camera Preview Placeholder */}
                  <Box
                    sx={{
                      width: '100%',
                      height: 200,
                      bgcolor: 'grey.900',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 1,
                      mb: 2,
                    }}
                  >
                    <Videocam sx={{ fontSize: 64, color: 'grey.600' }} />
                  </Box>

                  {/* Camera Info */}
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <FiberManualRecord
                      sx={{
                        fontSize: 12,
                        color: camera.status === 'online' ? 'success.main' : 'error.main',
                        mr: 1,
                      }}
                    />
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                      {camera.name}
                    </Typography>
                  </Box>

                  <Typography variant="body2" color="text.secondary">
                    {camera.location || 'No location'}
                  </Typography>

                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                    Status: {camera.status}
                  </Typography>

                  <Button
                    variant="outlined"
                    size="small"
                    fullWidth
                    sx={{ mt: 2 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/camera/${camera.id}`);
                    }}
                  >
                  View Live
                </Button>
              </Paper>
            ))}
          </Box>
        )}        {!isLoading && cameras.length === 0 && (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              No cameras configured
            </Typography>
          </Paper>
        )}
      </Container>
    </Box>
  );
};

export default DashboardPage;
