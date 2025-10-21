import { Request, Response, NextFunction } from 'express';
interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
    message?: string;
    skipSuccessfulRequests?: boolean;
    skipFailedRequests?: boolean;
}
declare class RateLimiter {
    private redis;
    private useMemory;
    private memoryStore;
    constructor();
    private initRedis;
    /**
     * Create rate limiter middleware
     */
    createLimiter(config: RateLimitConfig): (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
    /**
     * Get rate limit key from request
     */
    private getKey;
    /**
     * Clean up memory store (remove expired entries)
     */
    cleanupMemoryStore(): void;
}
declare const rateLimiter: RateLimiter;
export declare const authLimiter: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
export declare const apiLimiter: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
export declare const uploadLimiter: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
export declare const strictLimiter: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
export default rateLimiter;
//# sourceMappingURL=rateLimiter.d.ts.map