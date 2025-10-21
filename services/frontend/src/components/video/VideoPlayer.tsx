/**
 * Video Player Component
 * HLS video player using Video.js
 */

import React, { useEffect, useRef } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import '@videojs/themes/dist/city/index.css';
import { Box } from '@mui/material';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  autoplay?: boolean;
  muted?: boolean;
  controls?: boolean;
  fluid?: boolean;
  aspectRatio?: string;
  onReady?: (player: any) => void;
  onError?: (error: any) => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  poster,
  autoplay = true,
  muted = true,
  controls = true,
  fluid = true,
  aspectRatio = '16:9',
  onReady,
  onError,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    // Make sure Video.js player is only initialized once
    if (!playerRef.current && videoRef.current) {
      const videoElement = videoRef.current;

      // Check if element is in DOM before initializing
      if (!document.body.contains(videoElement)) {
        console.warn('Video element not yet in DOM, skipping initialization');
        return;
      }

      const player = videojs(videoElement, {
        autoplay,
        muted,
        controls,
        fluid,
        aspectRatio,
        responsive: true,
        preload: 'auto',
        liveui: true,
        html5: {
          vhs: {
            enableLowInitialPlaylist: true,
            smoothQualityChange: true,
            overrideNative: true,
          },
        },
        sources: [
          {
            src,
            type: 'application/x-mpegURL',
          },
        ],
        poster,
      });

      playerRef.current = player;

      // Handle player ready event
      player.ready(() => {
        console.log('Video.js player is ready');
        if (onReady) {
          onReady(player);
        }
      });

      // Handle errors
      player.on('error', (_e: any) => {
        const error = player.error();
        console.error('Video.js error:', error);
        if (onError) {
          onError(error);
        }
      });

      // Handle loading
      player.on('loadstart', () => {
        console.log('Video loading started');
      });

      player.on('loadeddata', () => {
        console.log('Video data loaded');
      });

      player.on('canplay', () => {
        console.log('Video can play');
      });

      player.on('playing', () => {
        console.log('Video is playing');
      });

      player.on('waiting', () => {
        console.log('Video is waiting for data');
      });

      player.on('stalled', () => {
        console.log('Video download stalled');
      });
    }
  }, []);

  // Update source when src changes
  useEffect(() => {
    const player = playerRef.current;
    if (player && src) {
      player.src({
        src,
        type: 'application/x-mpegURL',
      });
    }
  }, [src]);

  // Dispose the Video.js player when the component unmounts
  useEffect(() => {
    const player = playerRef.current;

    return () => {
      if (player && !player.isDisposed()) {
        player.dispose();
        playerRef.current = null;
      }
    };
  }, []);

  return (
    <Box sx={{ width: '100%', bgcolor: 'black' }}>
      <div data-vjs-player>
        <video
          ref={videoRef}
          className="video-js vjs-theme-city vjs-big-play-centered"
          playsInline
        />
      </div>
    </Box>
  );
};

export default VideoPlayer;

