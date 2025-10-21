/**
 * Dashboard Page
 * Main dashboard with system overview
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import {
  Videocam as VideocamIcon,
  Storage as StorageIcon,
  Memory as MemoryIcon,
  Speed as SpeedIcon,
} from '@mui/icons-material';
import { apiClient } from '../services/api';

interface SystemStats {
  cameras: {
    total: number;
    active: number;
  };
  recordings: {
    total: number;
  };
  cpu: {
    usage: number;
    cores: number;
  };
  memory: {
    usagePercent: number;
    totalFormatted: string;
    usedFormatted: string;
  };
  disk: {
    usagePercent: number;
    recordingsSizeFormatted: string;
  };
  gpu?: {
    available: boolean;
    name?: string;
    utilization?: number;
    encoderUtilization?: number;
  };
}

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStats();
    // Refresh stats every 5 seconds
    const interval = setInterval(loadStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      // Fetch system stats and status in parallel
      const [systemStats, systemStatus] = await Promise.all([
        apiClient.getSystemStats(),
        apiClient.getSystemStatus()
      ]);

      setStats({
        cameras: systemStatus.cameras,
        recordings: systemStatus.recordings,
        cpu: systemStats.cpu,
        memory: systemStats.memory,
        disk: systemStats.disk,
        gpu: systemStats.gpu,
      });
      setError('');
    } catch (err) {
      console.error('Failed to load stats:', err);
      setError('Failed to load system statistics');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

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
        System Overview
      </Typography>

      <Grid container spacing={3}>
        {/* Cameras Card */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <VideocamIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4">{stats?.cameras.total || 0}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Cameras
                  </Typography>
                </Box>
              </Box>
              <Chip
                label={`${stats?.cameras.active || 0} Active`}
                color="success"
                size="small"
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Recordings Card */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <StorageIcon sx={{ fontSize: 40, color: 'info.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4">{stats?.recordings.total || 0}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Recordings
                  </Typography>
                </Box>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {stats?.disk.recordingsSizeFormatted || '0 B'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* CPU Card */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <SpeedIcon sx={{ fontSize: 40, color: 'warning.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4">{stats?.cpu.usage.toFixed(1)}%</Typography>
                  <Typography variant="body2" color="text.secondary">
                    CPU Usage
                  </Typography>
                </Box>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {stats?.cpu.cores} cores
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Memory Card */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <MemoryIcon sx={{ fontSize: 40, color: 'error.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4">{stats?.memory.usagePercent.toFixed(1)}%</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Memory Usage
                  </Typography>
                </Box>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {stats?.memory.usedFormatted} / {stats?.memory.totalFormatted}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* GPU Card (if available) */}
        {stats?.gpu?.available && (
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  GPU: {stats.gpu.name}
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Utilization
                    </Typography>
                    <Typography variant="h5">{stats.gpu.utilization}%</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Encoder
                    </Typography>
                    <Typography variant="h5">{stats.gpu.encoderUtilization}%</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Disk Usage Card */}
        <Grid size={{ xs: 12, sm: 6, md: stats?.gpu?.available ? 8 : 12 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Disk Usage
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="h4">{stats?.disk.usagePercent.toFixed(1)}%</Typography>
                <Typography variant="body2" color="text.secondary">
                  Recordings: {stats?.disk.recordingsSizeFormatted}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          Quick Actions
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card
              sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
              onClick={() => navigate('/live')}
            >
              <CardContent>
                <Typography variant="h6">View Live Streams</Typography>
                <Typography variant="body2" color="text.secondary">
                  Monitor all cameras in real-time
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card
              sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
              onClick={() => navigate('/recordings')}
            >
              <CardContent>
                <Typography variant="h6">Browse Recordings</Typography>
                <Typography variant="body2" color="text.secondary">
                  Search and playback recordings
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card
              sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
              onClick={() => navigate('/cameras')}
            >
              <CardContent>
                <Typography variant="h6">Manage Cameras</Typography>
                <Typography variant="body2" color="text.secondary">
                  Add, edit, or remove cameras
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card
              sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
              onClick={() => navigate('/settings')}
            >
              <CardContent>
                <Typography variant="h6">Settings</Typography>
                <Typography variant="body2" color="text.secondary">
                  Configure system settings
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default DashboardPage;

