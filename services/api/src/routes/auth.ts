/**
 * Authentication Routes
 * Handles user registration, login, token refresh
 */

import express, { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import pool from '../config/database';
import { authenticate } from '../middleware/auth';
import { authConfig } from '../config/auth';

const router = express.Router();
const authService = new AuthService(pool);

/**
 * POST /auth/register
 * Register a new user
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, password, email, role } = req.body;

    // Validate input
    if (!username || !password) {
      res.status(400).json({
        success: false,
        error: 'Username and password are required'
      });
      return;
    }

    if (username.length < 3) {
      res.status(400).json({
        success: false,
        error: 'Username must be at least 3 characters'
      });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters'
      });
      return;
    }

    // Register user
    const user = await authService.register(
      username,
      password,
      email || `${username}@vms.local`,
      role || authConfig.roles.VIEWER
    );

    res.status(201).json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Registration failed'
    });
  }
});

/**
 * POST /auth/login
 * Authenticate user and return tokens
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      res.status(400).json({
        success: false,
        error: 'Username and password are required'
      });
      return;
    }

    // Authenticate
    const tokens = await authService.login(username, password);

    res.json({
      success: true,
      data: tokens
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({
      success: false,
      error: error instanceof Error ? error.message : 'Authentication failed'
    });
  }
});

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        error: 'Refresh token is required'
      });
      return;
    }

    const tokens = await authService.refreshAccessToken(refreshToken);

    res.json({
      success: true,
      data: tokens
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      error: error instanceof Error ? error.message : 'Token refresh failed'
    });
  }
});

/**
 * GET /auth/me
 * Get current user profile (requires authentication)
 */
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
      return;
    }

    const user = await authService.getUserById(req.user.userId);

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user profile'
    });
  }
});

/**
 * POST /auth/change-password
 * Change user password (requires authentication)
 */
router.post('/change-password', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
      return;
    }

    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      res.status(400).json({
        success: false,
        error: 'Old password and new password are required'
      });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({
        success: false,
        error: 'New password must be at least 6 characters'
      });
      return;
    }

    await authService.changePassword(req.user.userId, oldPassword, newPassword);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Password change failed'
    });
  }
});

/**
 * POST /auth/logout
 * Logout user (client should discard tokens)
 */
router.post('/logout', authenticate, (req: Request, res: Response) => {
  // In a stateless JWT system, logout is handled client-side by discarding tokens
  // In a production system, you might want to maintain a token blacklist
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

export default router;
