"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_service_1 = require("../services/user.service");
const activity_service_1 = require("../services/activity.service");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
/**
 * GET /api/users
 * List users with pagination and filters (admin only)
 */
router.get('/', auth_1.requireAdmin, async (req, res) => {
    try {
        const { role, active, search, page = '1', limit = '20' } = req.query;
        const filter = {
            role: role,
            active: active === 'true' ? true : active === 'false' ? false : undefined,
            search: search,
            page: parseInt(page, 10),
            limit: parseInt(limit, 10)
        };
        const { users, total } = await user_service_1.userService.getUsers(filter);
        // Log activity
        await activity_service_1.activityService.logFromRequest(req, 'list_users', {
            resourceType: 'user',
            metadata: { filters: filter }
        });
        res.json({
            success: true,
            data: users,
            pagination: {
                page: filter.page,
                limit: filter.limit,
                total,
                totalPages: Math.ceil(total / filter.limit)
            }
        });
    }
    catch (error) {
        console.error('[GET /api/users] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch users',
            message: error.message
        });
    }
});
/**
 * GET /api/users/stats
 * Get user statistics (admin only)
 */
router.get('/stats', auth_1.requireAdmin, async (req, res) => {
    try {
        const stats = await user_service_1.userService.getStats();
        res.json({
            success: true,
            data: stats
        });
    }
    catch (error) {
        console.error('[GET /api/users/stats] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user statistics',
            message: error.message
        });
    }
});
/**
 * GET /api/users/:id
 * Get user details
 */
router.get('/:id', auth_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        // Users can only view their own profile unless they're admin
        if (req.user?.userId !== id && req.user?.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Forbidden: You can only view your own profile'
            });
        }
        const user = await user_service_1.userService.getUserById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        res.json({
            success: true,
            data: user
        });
    }
    catch (error) {
        console.error('[GET /api/users/:id] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user',
            message: error.message
        });
    }
});
/**
 * POST /api/users
 * Create new user (admin only)
 */
router.post('/', auth_1.requireAdmin, async (req, res) => {
    try {
        const { username, email, password, full_name, role } = req.body;
        // Validate required fields
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: username, email, password'
            });
        }
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email format'
            });
        }
        // Validate password strength
        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 8 characters long'
            });
        }
        const user = await user_service_1.userService.createUser({
            username,
            email,
            password,
            full_name,
            role
        });
        // Log activity
        await activity_service_1.activityService.logFromRequest(req, 'create_user', {
            resourceType: 'user',
            resourceId: user.id,
            metadata: { username: user.username, role: user.role }
        });
        res.status(201).json({
            success: true,
            data: user,
            message: 'User created successfully'
        });
    }
    catch (error) {
        console.error('[POST /api/users] Error:', error);
        // Log failed activity
        await activity_service_1.activityService.logFromRequest(req, 'create_user', {
            resourceType: 'user',
            success: false,
            errorMessage: error.message
        });
        res.status(400).json({
            success: false,
            error: 'Failed to create user',
            message: error.message
        });
    }
});
/**
 * PUT /api/users/:id
 * Update user details
 */
router.put('/:id', auth_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { email, full_name, role, active } = req.body;
        // Users can only update their own profile unless they're admin
        const isAdmin = req.user?.role === 'admin';
        const isOwnProfile = req.user?.userId === id;
        if (!isAdmin && !isOwnProfile) {
            return res.status(403).json({
                success: false,
                error: 'Forbidden: You can only update your own profile'
            });
        }
        // Only admins can change role and active status
        if (!isAdmin && (role !== undefined || active !== undefined)) {
            return res.status(403).json({
                success: false,
                error: 'Forbidden: Only admins can change role or active status'
            });
        }
        const user = await user_service_1.userService.updateUser(id, {
            email,
            full_name,
            role,
            active
        });
        // Log activity
        await activity_service_1.activityService.logFromRequest(req, 'update_user', {
            resourceType: 'user',
            resourceId: id,
            metadata: { changes: { email, full_name, role, active } }
        });
        res.json({
            success: true,
            data: user,
            message: 'User updated successfully'
        });
    }
    catch (error) {
        console.error('[PUT /api/users/:id] Error:', error);
        // Log failed activity
        await activity_service_1.activityService.logFromRequest(req, 'update_user', {
            resourceType: 'user',
            resourceId: req.params.id,
            success: false,
            errorMessage: error.message
        });
        res.status(400).json({
            success: false,
            error: 'Failed to update user',
            message: error.message
        });
    }
});
/**
 * PUT /api/users/:id/role
 * Change user role (admin only)
 */
router.put('/:id/role', auth_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;
        if (!role) {
            return res.status(400).json({
                success: false,
                error: 'Missing required field: role'
            });
        }
        const user = await user_service_1.userService.changeRole(id, role);
        // Log activity
        await activity_service_1.activityService.logFromRequest(req, 'change_user_role', {
            resourceType: 'user',
            resourceId: id,
            metadata: { newRole: role }
        });
        res.json({
            success: true,
            data: user,
            message: 'User role updated successfully'
        });
    }
    catch (error) {
        console.error('[PUT /api/users/:id/role] Error:', error);
        // Log failed activity
        await activity_service_1.activityService.logFromRequest(req, 'change_user_role', {
            resourceType: 'user',
            resourceId: req.params.id,
            success: false,
            errorMessage: error.message
        });
        res.status(400).json({
            success: false,
            error: 'Failed to change user role',
            message: error.message
        });
    }
});
/**
 * DELETE /api/users/:id
 * Delete user (admin only)
 */
router.delete('/:id', auth_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        // Prevent self-deletion
        if (req.user?.userId === id) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete your own account'
            });
        }
        const success = await user_service_1.userService.deleteUser(id);
        if (!success) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        // Log activity
        await activity_service_1.activityService.logFromRequest(req, 'delete_user', {
            resourceType: 'user',
            resourceId: id
        });
        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    }
    catch (error) {
        console.error('[DELETE /api/users/:id] Error:', error);
        // Log failed activity
        await activity_service_1.activityService.logFromRequest(req, 'delete_user', {
            resourceType: 'user',
            resourceId: req.params.id,
            success: false,
            errorMessage: error.message
        });
        res.status(400).json({
            success: false,
            error: 'Failed to delete user',
            message: error.message
        });
    }
});
exports.default = router;
//# sourceMappingURL=users.js.map