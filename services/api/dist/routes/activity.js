"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const activity_service_1 = require("../services/activity.service");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
/**
 * GET /api/activity
 * List activity logs with filters (admin only)
 */
router.get('/', auth_1.requireAdmin, async (req, res) => {
    try {
        const { userId, action, resourceType, startDate, endDate, success, page = '1', limit = '50' } = req.query;
        const filter = {
            userId: userId,
            action: action,
            resourceType: resourceType,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            success: success === 'true' ? true : success === 'false' ? false : undefined,
            page: parseInt(page, 10),
            limit: parseInt(limit, 10)
        };
        const { activities, total } = await activity_service_1.activityService.getActivities(filter);
        res.json({
            success: true,
            data: activities,
            pagination: {
                page: filter.page,
                limit: filter.limit,
                total,
                totalPages: Math.ceil(total / filter.limit)
            }
        });
    }
    catch (error) {
        console.error('[GET /api/activity] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch activity logs',
            message: error.message
        });
    }
});
/**
 * GET /api/activity/stats
 * Get activity statistics (admin only)
 */
router.get('/stats', auth_1.requireAdmin, async (req, res) => {
    try {
        const { userId } = req.query;
        const stats = await activity_service_1.activityService.getStats(userId);
        res.json({
            success: true,
            data: stats
        });
    }
    catch (error) {
        console.error('[GET /api/activity/stats] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch activity statistics',
            message: error.message
        });
    }
});
/**
 * GET /api/activity/me
 * Get current user's recent activities
 */
router.get('/me', auth_1.authenticate, async (req, res) => {
    try {
        const { limit = '10' } = req.query;
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        const activities = await activity_service_1.activityService.getUserRecentActivities(req.user.userId, parseInt(limit, 10));
        res.json({
            success: true,
            data: activities
        });
    }
    catch (error) {
        console.error('[GET /api/activity/me] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user activities',
            message: error.message
        });
    }
});
/**
 * GET /api/activity/:id
 * Get single activity log (admin only)
 */
router.get('/:id', auth_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const activity = await activity_service_1.activityService.getActivityById(id);
        if (!activity) {
            return res.status(404).json({
                success: false,
                error: 'Activity log not found'
            });
        }
        res.json({
            success: true,
            data: activity
        });
    }
    catch (error) {
        console.error('[GET /api/activity/:id] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch activity log',
            message: error.message
        });
    }
});
/**
 * DELETE /api/activity/cleanup
 * Delete old activity logs (admin only)
 */
router.delete('/cleanup', auth_1.requireAdmin, async (req, res) => {
    try {
        const { daysToKeep = '90' } = req.query;
        const deletedCount = await activity_service_1.activityService.deleteOldLogs(parseInt(daysToKeep, 10));
        // Log activity
        await activity_service_1.activityService.logFromRequest(req, 'cleanup_activity_logs', {
            resourceType: 'system',
            metadata: { daysToKeep, deletedCount }
        });
        res.json({
            success: true,
            data: { deletedCount },
            message: `Deleted ${deletedCount} old activity logs`
        });
    }
    catch (error) {
        console.error('[DELETE /api/activity/cleanup] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to cleanup activity logs',
            message: error.message
        });
    }
});
exports.default = router;
//# sourceMappingURL=activity.js.map