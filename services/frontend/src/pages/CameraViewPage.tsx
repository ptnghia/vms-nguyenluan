/**
 * Camera View Page
 * Single camera fullscreen view with controls
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
  Videocam as VideocamIcon,
  FiberManualRecord as RecordIcon,
} from '@mui/icons-material';
import Hls from 'hls.js';
import { apiClient } from '../services/api';
import type { Camera } from '../types';

const CameraViewPage: React.FC = () => {
  const { cameraId } = useParams<{ cameraId: string }>();
  const navigate = useNavigate();

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [camera, setCamera] = useState<Camera | null>(null);
  const [streamUrl, setStreamUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [streamError, setStreamError] = useState(false);
  const [videoLoading, setVideoLoading] = useState(true);

  useEffect(() => {
    if (cameraId) {
      loadCamera(cameraId);
    }
  }, [cameraId]);

  const loadCamera = async (id: string) => {
    try {
      setIsLoading(true);
      const data = await apiClient.getCamera(id);
      setCamera(data);

      // Construct HLS stream URL
      const hlsUrl = `http://192.168.1.232:8888/live/${id}/high/index.m3u8`;
      setStreamUrl(hlsUrl);

      setError('');
    } catch (err) {
      console.error('Failed to load camera:', err);
      setError('Failed to load camera');
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize HLS player
  useEffect(() => {
    if (!videoRef.current || !streamUrl || !camera || camera.status !== 'online') {
      setVideoLoading(false);
      return;
    }

    const video = videoRef.current;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
      });

      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('HLS manifest parsed for ' + camera.name);
        setVideoLoading(false);
        setStreamError(false);
        video.play().catch((err) => {
          console.error('Autoplay failed:', err);
        });
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        console.error('HLS error for ' + camera.name + ':', data);
        if (data.fatal) {
          setStreamError(true);
          setVideoLoading(false);
        }
      });

      return () => {
        hls.destroy();
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
      video.addEventListener('loadedmetadata', () => {
        setVideoLoading(false);
        setStreamError(false);
        video.play().catch((err) => {
          console.error('Autoplay failed:', err);
        });
      });
    }
  }, [streamUrl, camera]);

  const handleBack = () => {
    navigate('/live');
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !camera) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || 'Camera not found'}
        </Alert>
        <IconButton onClick={handleBack}>
          <BackIcon />
        </IconButton>
      </Box>
    );
  }

  const isOnline = camera.status === 'online';

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Tooltip title="Back to Live View">
          <IconButton onClick={handleBack}>
            <BackIcon />
          </IconButton>
        </Tooltip>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4" component="h1">
            {camera.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {camera.location || 'No location'}
          </Typography>
        </Box>
        <Chip
          icon={<RecordIcon sx={{ fontSize: 12 }} />}
          label={isOnline ? 'LIVE' : 'OFFLINE'}
          color={isOnline ? 'error' : 'default'}
          sx={{
            fontWeight: 'bold',
            bgcolor: isOnline ? 'error.main' : 'grey.700',
            color: 'white',
          }}
        />
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
          {isOnline && streamUrl && !streamError ? (
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
              />
              {videoLoading && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <CircularProgress />
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
              {streamError ? (
                <>
                  <VideocamIcon sx={{ fontSize: 80, color: 'error.main' }} />
                  <Typography variant="h6" color="error">
                    Stream Error
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Unable to load video stream
                  </Typography>
                </>
              ) : (
                <>
                  <VideocamIcon sx={{ fontSize: 80, color: 'grey.600' }} />
                  <Typography variant="h6" color="text.secondary">
                    Camera Offline
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    This camera is currently offline
                  </Typography>
                </>
              )}
            </Box>
          )}
        </Box>
      </Paper>

      {/* Camera Details */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Camera Information
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Name:
                  </Typography>
                  <Typography variant="body2">{camera.name}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Location:
                  </Typography>
                  <Typography variant="body2">{camera.location || 'N/A'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Status:
                  </Typography>
                  <Chip label={camera.status} size="small" color={isOnline ? 'success' : 'default'} />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Camera ID:
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                    {camera.id}
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
                Stream Information
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Protocol:
                  </Typography>
                  <Typography variant="body2">HLS</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Quality:
                  </Typography>
                  <Typography variant="body2">High (1080p)</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Server:
                  </Typography>
                  <Typography variant="body2">MediaMTX</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Stream URL:
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontFamily: 'monospace',
                      fontSize: '0.65rem',
                      maxWidth: '60%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {streamUrl}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CameraViewPage;

