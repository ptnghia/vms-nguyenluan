import React, { useEffect, useState, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Fullscreen as FullscreenIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import Hls from 'hls.js';

interface Camera {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline';
  rtsp_url: string;
}

interface CameraStreamProps {
  camera: Camera;
  onFullscreen: (cameraId: string) => void;
}

const CameraStream: React.FC<CameraStreamProps> = ({ camera, onFullscreen }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const streamUrl = `http://192.168.1.232:8888/live/${camera.id}/high/index.m3u8`;
  const isOnline = camera.status === 'online';

  useEffect(() => {
    if (!videoRef.current || !isOnline) {
      setLoading(false);
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
        setLoading(false);
        video.play().catch((err) => {
          console.error('Autoplay failed:', err);
        });
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        console.error('HLS error for ' + camera.name + ':', data);
        if (data.fatal) {
          setError('Stream error');
          setLoading(false);
        }
      });

      return () => {
        hls.destroy();
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
      video.addEventListener('loadedmetadata', () => {
        setLoading(false);
        video.play().catch((err) => {
          console.error('Autoplay failed:', err);
        });
      });
    }
  }, [camera.id, camera.name, isOnline, streamUrl]);

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Box>
            <Typography variant="subtitle1" fontWeight="bold">
              {camera.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {camera.location}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Chip
              label={isOnline ? 'LIVE' : 'OFFLINE'}
              color={isOnline ? 'success' : 'default'}
              size="small"
            />
            <Tooltip title="Fullscreen">
              <IconButton size="small" onClick={() => onFullscreen(camera.id)}>
                <FullscreenIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Box
          sx={{
            position: 'relative',
            width: '100%',
            paddingTop: '56.25%',
            bgcolor: 'black',
            borderRadius: 1,
            overflow: 'hidden',
          }}
        >
          {isOnline ? (
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
                muted
                playsInline
              />
              {loading && (
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
              {error && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                  }}
                >
                  <Typography color="error">{error}</Typography>
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
              <Typography color="text.secondary">Camera Offline</Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

const LiveViewPage: React.FC = () => {
  const navigate = useNavigate();
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCameras = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://192.168.1.232:3000/api/cameras');

      if (!response.ok) {
        throw new Error('Failed to fetch cameras');
      }

      const result = await response.json();
      setCameras(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cameras');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCameras();
  }, []);

  const handleFullscreen = (cameraId: string) => {
    navigate('/camera/' + cameraId);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Live View
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {cameras.filter((c) => c.status === 'online').length} of {cameras.length} cameras online
          </Typography>
        </Box>

        <Tooltip title="Refresh">
          <IconButton onClick={fetchCameras}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {cameras.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            No cameras found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Add cameras to start monitoring
          </Typography>
        </Paper>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              lg: 'repeat(3, 1fr)',
            },
            gap: 2,
          }}
        >
          {cameras.map((camera) => (
            <CameraStream key={camera.id} camera={camera} onFullscreen={handleFullscreen} />
          ))}
        </Box>
      )}
    </Box>
  );
};

export default LiveViewPage;

