"use strict";
/**
 * Authentication Routes
 * Handles user registration, login, token refresh
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_service_1 = require("../services/auth.service");
const database_1 = __importDefault(require("../config/database"));
const auth_1 = require("../middleware/auth");
const auth_2 = require("../config/auth");
const router = express_1.default.Router();
const authService = new auth_service_1.AuthService(database_1.default);
/**
 * POST /auth/register
 * Register a new user
 */
router.post('/register', async (req, res) => {
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
        const user = await authService.register(username, password, email || `${username}@vms.local`, role || auth_2.authConfig.roles.VIEWER);
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
    }
    catch (error) {
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
router.post('/login', async (req, res) => {
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
    }
    catch (error) {
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
router.post('/refresh', async (req, res) => {
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
    }
    catch (error) {
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
router.get('/me', auth_1.authenticate, async (req, res) => {
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
    }
    catch (error) {
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
router.post('/change-password', auth_1.authenticate, async (req, res) => {
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
    }
    catch (error) {
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
router.post('/logout', auth_1.authenticate, (req, res) => {
    // In a stateless JWT system, logout is handled client-side by discarding tokens
    // In a production system, you might want to maintain a token blacklist
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});
exports.default = router;
//# sourceMappingURL=auth.js.map