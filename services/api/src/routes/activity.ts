import { Router, Request, Response } from 'express';
import { activityService } from '../services/activity.service';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

/**
 * GET /api/activity
 * List activity logs with filters (admin only)
 */
router.get('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const {
      userId,
      action,
      resourceType,
      startDate,
      endDate,
      success,
      page = '1',
      limit = '50'
    } = req.query;

    const filter = {
      userId: userId as string,
      action: action as string,
      resourceType: resourceType as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      success: success === 'true' ? true : success === 'false' ? false : undefined,
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10)
    };

    const { activities, total } = await activityService.getActivities(filter);

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
  } catch (error: any) {
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
router.get('/stats', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;

    const stats = await activityService.getStats(userId as string);

    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
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
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const { limit = '10' } = req.query;

    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const activities = await activityService.getUserRecentActivities(
      req.user.userId,
      parseInt(limit as string, 10)
    );

    res.json({
      success: true,
      data: activities
    });
  } catch (error: any) {
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
router.get('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const activity = await activityService.getActivityById(id);

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
  } catch (error: any) {
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
router.delete('/cleanup', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { daysToKeep = '90' } = req.query;

    const deletedCount = await activityService.deleteOldLogs(
      parseInt(daysToKeep as string, 10)
    );

    // Log activity
    await activityService.logFromRequest(req, 'cleanup_activity_logs', {
      resourceType: 'system',
      metadata: { daysToKeep, deletedCount }
    });

    res.json({
      success: true,
      data: { deletedCount },
      message: `Deleted ${deletedCount} old activity logs`
    });
  } catch (error: any) {
    console.error('[DELETE /api/activity/cleanup] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup activity logs',
      message: error.message
    });
  }
});

export default router;

