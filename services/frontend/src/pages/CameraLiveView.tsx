/**
 * Camera Live View Page
 * HLS video player for live streaming
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Box,
  Paper,
  Typography,
  AppBar,
  Toolbar,
  IconButton,
  Button,
  Chip,
} from '@mui/material';
import {
  ArrowBack,
  FiberManualRecord,
  Videocam,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import videojs from 'video.js';
import type Player from 'video.js/dist/types/player';
import 'video.js/dist/video-js.css';
import { apiClient } from '../services/api';
import type { Camera, StreamInfo } from '../types';

const CameraLiveView: React.FC = () => {
  const { cameraId } = useParams<{ cameraId: string }>();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<Player | null>(null);
  
  const [camera, setCamera] = useState<Camera | null>(null);
  const [streamInfo, setStreamInfo] = useState<StreamInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadCameraData = async () => {
    if (!cameraId) return;
    
    try {
      const [cameraData, streamData] = await Promise.all([
        apiClient.getCamera(cameraId),
        apiClient.getStreamInfo(cameraId),
      ]);
      
      setCamera(cameraData);
      setStreamInfo(streamData);
      setError('');
    } catch (err) {
      setError('Failed to load camera data');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!cameraId) return;
    
    loadCameraData();
    
    // Refresh stream info every 10 seconds
    const interval = setInterval(loadCameraData, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraId]);

  useEffect(() => {
    // Need both video element and stream URL
    if (!videoRef.current || !streamInfo?.streams.hls) return;

    // Cleanup any existing player first
    if (playerRef.current) {
      playerRef.current.dispose();
      playerRef.current = null;
    }

    // Initialize Video.js player
    const player = videojs(videoRef.current, {
      controls: true,
      autoplay: true,
      preload: 'auto',
      fluid: true,
      liveui: true,
      html5: {
        vhs: {
          enableLowInitialPlaylist: true,
          smoothQualityChange: true,
          overrideNative: true,
        },
      },
    });

    player.src({
      src: streamInfo.streams.hls,
      type: 'application/x-mpegURL',
    });

    playerRef.current = player;

    // Handle player errors
    player.on('error', () => {
      const error = player.error();
      console.error('Video.js error:', error);
    });

    // Cleanup on unmount
    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [streamInfo]);

  const handleBack = () => {
    navigate('/');
  };

  const handleViewRecordings = () => {
    navigate(`/playback/${cameraId}`);
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* App Bar */}
      <AppBar position="static">
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={handleBack}>
            <ArrowBack />
          </IconButton>
          <Videocam sx={{ ml: 2, mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {camera?.name || 'Camera'}
          </Typography>
          {camera && (
            <Chip
              icon={<FiberManualRecord />}
              label={camera.status}
              color={camera.status === 'online' ? 'success' : 'error'}
              size="small"
              sx={{ mr: 2 }}
            />
          )}
          <Button color="inherit" onClick={handleViewRecordings}>
            Recordings
          </Button>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        {error && (
          <Typography color="error" align="center" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        {/* Video Player */}
        <Paper elevation={3} sx={{ bgcolor: 'black' }}>
          <Box sx={{ position: 'relative', paddingTop: '56.25%' }}>
            {/* Always render video element for video.js - must stay visible */}
            <video
              ref={videoRef}
              className="video-js vjs-default-skin vjs-big-play-centered"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
              }}
            />
            
            {/* Loading overlay */}
            {isLoading && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'grey.900',
                  zIndex: 10,
                }}
              >
                <Typography color="grey.500">Loading...</Typography>
              </Box>
            )}
            
            {/* No stream overlay */}
            {!isLoading && !streamInfo?.streams.hls && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'grey.900',
                  zIndex: 10,
                }}
              >
                <Typography color="grey.500">
                  Stream not available
                </Typography>
              </Box>
            )}
          </Box>
        </Paper>

        {/* Camera Info */}
        {camera && (
          <Paper sx={{ mt: 3, p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Camera Information
            </Typography>
            <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Name
                </Typography>
                <Typography variant="body1">{camera.name}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Location
                </Typography>
                <Typography variant="body1">
                  {camera.location || 'N/A'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Status
                </Typography>
                <Typography variant="body1">{camera.status}</Typography>
              </Box>
              {streamInfo?.stats && (
                <>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Viewers
                    </Typography>
                    <Typography variant="body1">
                      {streamInfo.stats.viewers}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Bytes Received
                    </Typography>
                    <Typography variant="body1">
                      {(streamInfo.stats.bytesReceived / 1024 / 1024).toFixed(2)} MB
                    </Typography>
                  </Box>
                </>
              )}
            </Box>
          </Paper>
        )}
      </Container>
    </Box>
  );
};

export default CameraLiveView;
