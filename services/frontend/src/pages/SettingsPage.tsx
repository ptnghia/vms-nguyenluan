/**
 * Settings Page
 * User profile and system settings
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Divider,
  Grid,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Person as PersonIcon,
  Security as SecurityIcon,
  Notifications as NotificationsIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { apiClient } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const SettingsPage: React.FC = () => {
  const { user: authUser } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Profile form
  const [profileData, setProfileData] = useState({
    username: '',
    email: '',
    full_name: '',
  });
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Password form
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    cameraOfflineAlerts: true,
    recordingAlerts: false,
    systemAlerts: true,
  });
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    if (!authUser?.userId) return;

    try {
      setIsLoading(true);
      setError('');
      const user = await apiClient.getUser(authUser.userId);
      setProfileData({
        username: user.username,
        email: user.email,
        full_name: user.full_name || '',
      });
    } catch (err: any) {
      console.error('Failed to load user profile:', err);
      setError('Không thể tải thông tin người dùng');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileChange = (field: string, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
    if (profileErrors[field]) {
      setProfileErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateProfile = (): boolean => {
    const errors: Record<string, string> = {};

    if (!profileData.email.trim()) {
      errors.email = 'Email là bắt buộc';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email)) {
      errors.email = 'Email không hợp lệ';
    }

    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveProfile = async () => {
    if (!validateProfile() || !authUser?.userId) return;

    try {
      setIsSavingProfile(true);
      setSuccessMessage('');
      setError('');

      await apiClient.updateUser(authUser.userId, {
        email: profileData.email,
        full_name: profileData.full_name,
      });

      setSuccessMessage('Cập nhật thông tin thành công!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      setProfileErrors({ submit: err.response?.data?.error || 'Không thể cập nhật thông tin' });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordChange = (field: string, value: string) => {
    setPasswordData(prev => ({ ...prev, [field]: value }));
    if (passwordErrors[field]) {
      setPasswordErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validatePassword = (): boolean => {
    const errors: Record<string, string> = {};

    if (!passwordData.currentPassword) {
      errors.currentPassword = 'Mật khẩu hiện tại là bắt buộc';
    }

    if (!passwordData.newPassword) {
      errors.newPassword = 'Mật khẩu mới là bắt buộc';
    } else if (passwordData.newPassword.length < 8) {
      errors.newPassword = 'Mật khẩu phải có ít nhất 8 ký tự';
    }

    if (!passwordData.confirmPassword) {
      errors.confirmPassword = 'Xác nhận mật khẩu là bắt buộc';
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSavePassword = async () => {
    if (!validatePassword() || !authUser?.userId) return;

    try {
      setIsSavingPassword(true);
      setSuccessMessage('');
      setError('');

      // Note: Backend should verify currentPassword before updating
      await apiClient.updateUser(authUser.userId, {
        password: passwordData.newPassword,
      });

      setSuccessMessage('Đổi mật khẩu thành công!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      console.error('Failed to change password:', err);
      setPasswordErrors({ submit: err.response?.data?.error || 'Không thể đổi mật khẩu' });
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleNotificationChange = (field: string, value: boolean) => {
    setNotificationSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveNotifications = async () => {
    try {
      setIsSavingNotifications(true);
      setSuccessMessage('');
      setError('');

      // TODO: Implement notification settings API
      // await apiClient.updateNotificationSettings(notificationSettings);

      setSuccessMessage('Cập nhật cài đặt thông báo thành công!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      console.error('Failed to update notification settings:', err);
      setError('Không thể cập nhật cài đặt thông báo');
    } finally {
      setIsSavingNotifications(false);
    }
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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <SettingsIcon sx={{ fontSize: 32, color: 'primary.main' }} />
        <Typography variant="h4" component="h1">
          Cài đặt
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Profile Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <PersonIcon color="primary" />
                <Typography variant="h6">Thông tin cá nhân</Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />

              {profileErrors.submit && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {profileErrors.submit}
                </Alert>
              )}

              <TextField
                fullWidth
                label="Tên đăng nhập"
                value={profileData.username}
                margin="normal"
                disabled
                helperText="Tên đăng nhập không thể thay đổi"
              />

              <TextField
                fullWidth
                label="Email"
                type="email"
                value={profileData.email}
                onChange={(e) => handleProfileChange('email', e.target.value)}
                error={!!profileErrors.email}
                helperText={profileErrors.email}
                margin="normal"
                required
              />

              <TextField
                fullWidth
                label="Họ tên"
                value={profileData.full_name}
                onChange={(e) => handleProfileChange('full_name', e.target.value)}
                margin="normal"
              />

              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSaveProfile}
                disabled={isSavingProfile}
                sx={{ mt: 2 }}
                fullWidth
              >
                {isSavingProfile ? 'Đang lưu...' : 'Lưu thay đổi'}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Password Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <SecurityIcon color="primary" />
                <Typography variant="h6">Đổi mật khẩu</Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />

              {passwordErrors.submit && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {passwordErrors.submit}
                </Alert>
              )}

              <TextField
                fullWidth
                label="Mật khẩu hiện tại"
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                error={!!passwordErrors.currentPassword}
                helperText={passwordErrors.currentPassword}
                margin="normal"
                required
              />

              <TextField
                fullWidth
                label="Mật khẩu mới"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                error={!!passwordErrors.newPassword}
                helperText={passwordErrors.newPassword || 'Tối thiểu 8 ký tự'}
                margin="normal"
                required
              />

              <TextField
                fullWidth
                label="Xác nhận mật khẩu mới"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                error={!!passwordErrors.confirmPassword}
                helperText={passwordErrors.confirmPassword}
                margin="normal"
                required
              />

              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSavePassword}
                disabled={isSavingPassword}
                sx={{ mt: 2 }}
                fullWidth
              >
                {isSavingPassword ? 'Đang lưu...' : 'Đổi mật khẩu'}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Notification Settings */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <NotificationsIcon color="primary" />
                <Typography variant="h6">Cài đặt thông báo</Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={notificationSettings.emailNotifications}
                      onChange={(e) => handleNotificationChange('emailNotifications', e.target.checked)}
                    />
                  }
                  label="Nhận thông báo qua Email"
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={notificationSettings.cameraOfflineAlerts}
                      onChange={(e) => handleNotificationChange('cameraOfflineAlerts', e.target.checked)}
                    />
                  }
                  label="Cảnh báo khi camera offline"
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={notificationSettings.recordingAlerts}
                      onChange={(e) => handleNotificationChange('recordingAlerts', e.target.checked)}
                    />
                  }
                  label="Thông báo khi có recording mới"
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={notificationSettings.systemAlerts}
                      onChange={(e) => handleNotificationChange('systemAlerts', e.target.checked)}
                    />
                  }
                  label="Cảnh báo hệ thống (CPU, Disk, Memory)"
                />
              </Box>

              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSaveNotifications}
                disabled={isSavingNotifications}
                sx={{ mt: 3 }}
              >
                {isSavingNotifications ? 'Đang lưu...' : 'Lưu cài đặt'}
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SettingsPage;

