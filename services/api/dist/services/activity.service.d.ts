import { Request } from 'express';
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
export declare class ActivityService {
    /**
     * Log user activity
     */
    logActivity(params: {
        userId: string;
        action: string;
        resourceType?: string;
        resourceId?: string;
        ipAddress?: string;
        userAgent?: string;
        metadata?: any;
        success?: boolean;
        errorMessage?: string;
    }): Promise<void>;
    /**
     * Log activity from Express request
     */
    logFromRequest(req: Request, action: string, options?: {
        resourceType?: string;
        resourceId?: string;
        metadata?: any;
        success?: boolean;
        errorMessage?: string;
    }): Promise<void>;
    /**
     * Get activity logs with filters
     */
    getActivities(filter: ActivityFilter): Promise<{
        activities: ActivityLog[];
        total: number;
    }>;
    /**
     * Get activity by ID
     */
    getActivityById(id: string): Promise<ActivityLog | null>;
    /**
     * Get recent activities for a user
     */
    getUserRecentActivities(userId: string, limit?: number): Promise<ActivityLog[]>;
    /**
     * Get activity statistics
     */
    getStats(userId?: string): Promise<{
        totalActivities: number;
        successRate: number;
        byAction: Array<{
            action: string;
            count: number;
        }>;
        byResourceType: Array<{
            resource_type: string;
            count: number;
        }>;
        recentFailures: ActivityLog[];
    }>;
    /**
     * Delete old activity logs (cleanup)
     */
    deleteOldLogs(daysToKeep?: number): Promise<number>;
}
export declare const activityService: ActivityService;
//# sourceMappingURL=activity.service.d.ts.map