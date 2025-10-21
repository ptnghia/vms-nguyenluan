/**
 * Camera Card Component
 * Displays camera preview with live stream
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  Fullscreen as FullscreenIcon,
  Videocam as VideocamIcon,
  FiberManualRecord as RecordIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import VideoPlayer from '../video/VideoPlayer';
import type { Camera } from '../../types';

interface CameraCardProps {
  camera: Camera;
  showStream?: boolean;
  onFullscreen?: (camera: Camera) => void;
  onSettings?: (camera: Camera) => void;
}

const CameraCard: React.FC<CameraCardProps> = ({
  camera,
  showStream = true,
  onFullscreen,
  onSettings,
}) => {
  const [streamUrl, setStreamUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (showStream && camera.status === 'online') {
      // Construct HLS stream URL
      // Format: http://mediamtx-host:8888/live/{camera_id}/high/index.m3u8
      const hlsUrl = `http://192.168.1.232:8888/live/${camera.id}/high/index.m3u8`;
      setStreamUrl(hlsUrl);
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  }, [camera, showStream]);

  const handlePlayerReady = (_player: any) => {
    console.log(`Player ready for camera: ${camera.name}`);
    setHasError(false);
  };

  const handlePlayerError = (error: any) => {
    console.error(`Player error for camera ${camera.name}:`, error);
    setHasError(true);
  };

  const isOnline = camera.status === 'online';

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Video Preview */}
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          paddingTop: '56.25%', // 16:9 aspect ratio
          bgcolor: 'grey.900',
          overflow: 'hidden',
        }}
      >
        {showStream && isOnline && streamUrl && !hasError ? (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
            }}
          >
            <VideoPlayer
              src={streamUrl}
              autoplay={true}
              muted={true}
              controls={false}
              fluid={false}
              onReady={handlePlayerReady}
              onError={handlePlayerError}
            />
          </Box>
        ) : (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            {isLoading ? (
              <CircularProgress />
            ) : hasError ? (
              <>
                <VideocamIcon sx={{ fontSize: 64, color: 'error.main' }} />
                <Typography variant="body2" color="error">
                  Stream Error
                </Typography>
              </>
            ) : !isOnline ? (
              <>
                <VideocamIcon sx={{ fontSize: 64, color: 'grey.600' }} />
                <Typography variant="body2" color="text.secondary">
                  Camera Offline
                </Typography>
              </>
            ) : (
              <VideocamIcon sx={{ fontSize: 64, color: 'grey.600' }} />
            )}
          </Box>
        )}

        {/* Status Badge */}
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            left: 8,
            display: 'flex',
            gap: 1,
          }}
        >
          <Chip
            icon={<RecordIcon sx={{ fontSize: 12 }} />}
            label={isOnline ? 'LIVE' : 'OFFLINE'}
            color={isOnline ? 'error' : 'default'}
            size="small"
            sx={{
              fontWeight: 'bold',
              bgcolor: isOnline ? 'error.main' : 'grey.700',
              color: 'white',
            }}
          />
        </Box>

        {/* Action Buttons */}
        {isOnline && (
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              display: 'flex',
              gap: 0.5,
            }}
          >
            {onFullscreen && (
              <Tooltip title="Fullscreen">
                <IconButton
                  size="small"
                  onClick={() => onFullscreen(camera)}
                  sx={{
                    bgcolor: 'rgba(0, 0, 0, 0.6)',
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'rgba(0, 0, 0, 0.8)',
                    },
                  }}
                >
                  <FullscreenIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        )}
      </Box>

      {/* Camera Info */}
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography variant="h6" component="div" gutterBottom>
          {camera.name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {camera.location || 'No location'}
        </Typography>
      </CardContent>

      {/* Actions */}
      <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
        <Chip
          label={camera.status}
          size="small"
          color={isOnline ? 'success' : 'default'}
        />
        {onSettings && (
          <Tooltip title="Settings">
            <IconButton size="small" onClick={() => onSettings(camera)}>
              <SettingsIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </CardActions>
    </Card>
  );
};

export default CameraCard;

