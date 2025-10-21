"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activityService = exports.ActivityService = void 0;
const database_1 = __importDefault(require("../config/database"));
class ActivityService {
    /**
     * Log user activity
     */
    async logActivity(params) {
        try {
            await database_1.default.query(`INSERT INTO user_activity 
        (user_id, action, resource_type, resource_id, ip_address, user_agent, metadata, success, error_message)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, [
                params.userId,
                params.action,
                params.resourceType || null,
                params.resourceId || null,
                params.ipAddress || null,
                params.userAgent || null,
                params.metadata ? JSON.stringify(params.metadata) : null,
                params.success !== undefined ? params.success : true,
                params.errorMessage || null
            ]);
        }
        catch (error) {
            console.error('[ActivityService] Failed to log activity:', error);
            // Don't throw - logging failure shouldn't break the main operation
        }
    }
    /**
     * Log activity from Express request
     */
    async logFromRequest(req, action, options) {
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
    async getActivities(filter) {
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
        const params = [];
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
        const countResult = await database_1.default.query(countQuery, params);
        const total = parseInt(countResult.rows[0].total, 10);
        // Add sorting and pagination
        query += ` ORDER BY a.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        params.push(limit, offset);
        const result = await database_1.default.query(query, params);
        return { activities: result.rows, total };
    }
    /**
     * Get activity by ID
     */
    async getActivityById(id) {
        const result = await database_1.default.query(`SELECT 
        a.*,
        u.username,
        u.full_name
       FROM user_activity a
       JOIN users u ON a.user_id = u.id
       WHERE a.id = $1`, [id]);
        return result.rows[0] || null;
    }
    /**
     * Get recent activities for a user
     */
    async getUserRecentActivities(userId, limit = 10) {
        const result = await database_1.default.query(`SELECT * FROM user_activity
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`, [userId, limit]);
        return result.rows;
    }
    /**
     * Get activity statistics
     */
    async getStats(userId) {
        let whereClause = '';
        const params = [];
        if (userId) {
            whereClause = 'WHERE user_id = $1';
            params.push(userId);
        }
        // Total activities
        const totalResult = await database_1.default.query(`SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful
       FROM user_activity ${whereClause}`, params);
        const total = parseInt(totalResult.rows[0].total, 10);
        const successful = parseInt(totalResult.rows[0].successful, 10);
        const successRate = total > 0 ? (successful / total) * 100 : 100;
        // By action
        const byActionResult = await database_1.default.query(`SELECT action, COUNT(*) as count
       FROM user_activity ${whereClause}
       GROUP BY action
       ORDER BY count DESC
       LIMIT 10`, params);
        // By resource type
        const byResourceResult = await database_1.default.query(`SELECT resource_type, COUNT(*) as count
       FROM user_activity
       ${whereClause}
       ${whereClause ? 'AND' : 'WHERE'} resource_type IS NOT NULL
       GROUP BY resource_type
       ORDER BY count DESC`, params);
        // Recent failures
        const failuresResult = await database_1.default.query(`SELECT a.*, u.username
       FROM user_activity a
       JOIN users u ON a.user_id = u.id
       ${whereClause}
       ${whereClause ? 'AND' : 'WHERE'} a.success = FALSE
       ORDER BY a.created_at DESC
       LIMIT 10`, params);
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
    async deleteOldLogs(daysToKeep = 90) {
        const result = await database_1.default.query(`DELETE FROM user_activity
       WHERE created_at < NOW() - INTERVAL '${daysToKeep} days'
       RETURNING id`);
        return result.rowCount || 0;
    }
}
exports.ActivityService = ActivityService;
// Export singleton instance
exports.activityService = new ActivityService();
//# sourceMappingURL=activity.service.js.map