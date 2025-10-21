import { Request } from 'express';
import pool from '../config/database';

export interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: any;
  success: boolean;
  error_message: string | null;
  created_at: Date;
}

export interface ActivityFilter {
  userId?: string;
  action?: string;
  resourceType?: string;
  startDate?: Date;
  endDate?: Date;
  success?: boolean;
  page?: number;
  limit?: number;
}

export class ActivityService {
  /**
   * Log user activity
   */
  async logActivity(params: {
    userId: string;
    action: string;
    resourceType?: string;
    resourceId?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: any;
    success?: boolean;
    errorMessage?: string;
  }): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO user_activity 
        (user_id, action, resource_type, resource_id, ip_address, user_agent, metadata, success, error_message)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          params.userId,
          params.action,
          params.resourceType || null,
          params.resourceId || null,
          params.ipAddress || null,
          params.userAgent || null,
          params.metadata ? JSON.stringify(params.metadata) : null,
          params.success !== undefined ? params.success : true,
          params.errorMessage || null
        ]
      );
    } catch (error) {
      console.error('[ActivityService] Failed to log activity:', error);
      // Don't throw - logging failure shouldn't break the main operation
    }
  }

  /**
   * Log activity from Express request
   */
  async logFromRequest(
    req: Request,
    action: string,
    options?: {
      resourceType?: string;
      resourceId?: string;
      metadata?: any;
      success?: boolean;
      errorMessage?: string;
    }
  ): Promise<void> {
    if (!req.user) {
      return; // No user to log for
    }

    const ipAddress = req.ip || req.socket.remoteAddress || undefined;
    const userAgent = req.headers['user-agent'] || undefined;

    await this.logActivity({
      userId: req.user.userId,
      action,
      resourceType: options?.resourceType,
      resourceId: options?.resourceId,
      ipAddress,
      userAgent,
      metadata: options?.metadata,
      success: options?.success,
      errorMessage: options?.errorMessage
    });
  }

  /**
   * Get activity logs with filters
   */
  async getActivities(filter: ActivityFilter): Promise<{ activities: ActivityLog[]; total: number }> {
    const page = filter.page || 1;
    const limit = filter.limit || 50;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        a.*,
        u.username,
        u.full_name
      FROM user_activity a
      JOIN users u ON a.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    // Apply filters
    if (filter.userId) {
      params.push(filter.userId);
      query += ` AND a.user_id = $${paramIndex++}`;
    }

    if (filter.action) {
      params.push(filter.action);
      query += ` AND a.action = $${paramIndex++}`;
    }

    if (filter.resourceType) {
      params.push(filter.resourceType);
      query += ` AND a.resource_type = $${paramIndex++}`;
    }

    if (filter.startDate) {
      params.push(filter.startDate);
      query += ` AND a.created_at >= $${paramIndex++}`;
    }

    if (filter.endDate) {
      params.push(filter.endDate);
      query += ` AND a.created_at <= $${paramIndex++}`;
    }

    if (filter.success !== undefined) {
      params.push(filter.success);
      query += ` AND a.success = $${paramIndex++}`;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM (${query}) as filtered`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total, 10);

    // Add sorting and pagination
    query += ` ORDER BY a.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return { activities: result.rows, total };
  }

  /**
   * Get activity by ID
   */
  async getActivityById(id: string): Promise<ActivityLog | null> {
    const result = await pool.query(
      `SELECT 
        a.*,
        u.username,
        u.full_name
       FROM user_activity a
       JOIN users u ON a.user_id = u.id
       WHERE a.id = $1`,
      [id]
    );

    return result.rows[0] || null;
  }

  /**
   * Get recent activities for a user
   */
  async getUserRecentActivities(userId: string, limit: number = 10): Promise<ActivityLog[]> {
    const result = await pool.query(
      `SELECT * FROM user_activity
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows;
  }

  /**
   * Get activity statistics
   */
  async getStats(userId?: string): Promise<{
    totalActivities: number;
    successRate: number;
    byAction: Array<{ action: string; count: number }>;
    byResourceType: Array<{ resource_type: string; count: number }>;
    recentFailures: ActivityLog[];
  }> {
    let whereClause = '';
    const params: any[] = [];

    if (userId) {
      whereClause = 'WHERE user_id = $1';
      params.push(userId);
    }

    // Total activities
    const totalResult = await pool.query(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful
       FROM user_activity ${whereClause}`,
      params
    );

    const total = parseInt(totalResult.rows[0].total, 10);
    const successful = parseInt(totalResult.rows[0].successful, 10);
    const successRate = total > 0 ? (successful / total) * 100 : 100;

    // By action
    const byActionResult = await pool.query(
      `SELECT action, COUNT(*) as count
       FROM user_activity ${whereClause}
       GROUP BY action
       ORDER BY count DESC
       LIMIT 10`,
      params
    );

    // By resource type
    const byResourceResult = await pool.query(
      `SELECT resource_type, COUNT(*) as count
       FROM user_activity
       ${whereClause}
       ${whereClause ? 'AND' : 'WHERE'} resource_type IS NOT NULL
       GROUP BY resource_type
       ORDER BY count DESC`,
      params
    );

    // Recent failures
    const failuresResult = await pool.query(
      `SELECT a.*, u.username
       FROM user_activity a
       JOIN users u ON a.user_id = u.id
       ${whereClause}
       ${whereClause ? 'AND' : 'WHERE'} a.success = FALSE
       ORDER BY a.created_at DESC
       LIMIT 10`,
      params
    );

    return {
      totalActivities: total,
      successRate: Math.round(successRate * 100) / 100,
      byAction: byActionResult.rows.map(row => ({
        action: row.action,
        count: parseInt(row.count, 10)
      })),
      byResourceType: byResourceResult.rows.map(row => ({
        resource_type: row.resource_type,
        count: parseInt(row.count, 10)
      })),
      recentFailures: failuresResult.rows
    };
  }

  /**
   * Delete old activity logs (cleanup)
   */
  async deleteOldLogs(daysToKeep: number = 90): Promise<number> {
    const result = await pool.query(
      `DELETE FROM user_activity
       WHERE created_at < NOW() - INTERVAL '${daysToKeep} days'
       RETURNING id`
    );

    return result.rowCount || 0;
  }
}

// Export singleton instance
export const activityService = new ActivityService();

