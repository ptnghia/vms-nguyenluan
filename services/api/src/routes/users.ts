import { Router, Request, Response } from 'express';
import { userService } from '../services/user.service';
import { activityService } from '../services/activity.service';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

/**
 * GET /api/users
 * List users with pagination and filters (admin only)
 */
router.get('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const {
      role,
      active,
      search,
      page = '1',
      limit = '20'
    } = req.query;

    const filter = {
      role: role as string,
      active: active === 'true' ? true : active === 'false' ? false : undefined,
      search: search as string,
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10)
    };

    const { users, total } = await userService.getUsers(filter);

    // Log activity
    await activityService.logFromRequest(req, 'list_users', {
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
  } catch (error: any) {
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
router.get('/stats', requireAdmin, async (req: Request, res: Response) => {
  try {
    const stats = await userService.getStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
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
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Users can only view their own profile unless they're admin
    if (req.user?.userId !== id && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You can only view your own profile'
      });
    }

    const user = await userService.getUserById(id);

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
  } catch (error: any) {
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
router.post('/', requireAdmin, async (req: Request, res: Response) => {
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

    const user = await userService.createUser({
      username,
      email,
      password,
      full_name,
      role
    });

    // Log activity
    await activityService.logFromRequest(req, 'create_user', {
      resourceType: 'user',
      resourceId: user.id,
      metadata: { username: user.username, role: user.role }
    });

    res.status(201).json({
      success: true,
      data: user,
      message: 'User created successfully'
    });
  } catch (error: any) {
    console.error('[POST /api/users] Error:', error);
    
    // Log failed activity
    await activityService.logFromRequest(req, 'create_user', {
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
router.put('/:id', authenticate, async (req: Request, res: Response) => {
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

    const user = await userService.updateUser(id, {
      email,
      full_name,
      role,
      active
    });

    // Log activity
    await activityService.logFromRequest(req, 'update_user', {
      resourceType: 'user',
      resourceId: id,
      metadata: { changes: { email, full_name, role, active } }
    });

    res.json({
      success: true,
      data: user,
      message: 'User updated successfully'
    });
  } catch (error: any) {
    console.error('[PUT /api/users/:id] Error:', error);
    
    // Log failed activity
    await activityService.logFromRequest(req, 'update_user', {
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
router.put('/:id/role', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: role'
      });
    }

    const user = await userService.changeRole(id, role);

    // Log activity
    await activityService.logFromRequest(req, 'change_user_role', {
      resourceType: 'user',
      resourceId: id,
      metadata: { newRole: role }
    });

    res.json({
      success: true,
      data: user,
      message: 'User role updated successfully'
    });
  } catch (error: any) {
    console.error('[PUT /api/users/:id/role] Error:', error);
    
    // Log failed activity
    await activityService.logFromRequest(req, 'change_user_role', {
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
router.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Prevent self-deletion
    if (req.user?.userId === id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete your own account'
      });
    }

    const success = await userService.deleteUser(id);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Log activity
    await activityService.logFromRequest(req, 'delete_user', {
      resourceType: 'user',
      resourceId: id
    });

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error: any) {
    console.error('[DELETE /api/users/:id] Error:', error);
    
    // Log failed activity
    await activityService.logFromRequest(req, 'delete_user', {
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

export default router;

