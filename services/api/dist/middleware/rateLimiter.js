"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.strictLimiter = exports.uploadLimiter = exports.apiLimiter = exports.authLimiter = void 0;
const redis_1 = require("redis");
class RateLimiter {
    constructor() {
        this.redis = null;
        this.useMemory = true;
        this.memoryStore = new Map();
        this.initRedis();
    }
    async initRedis() {
        try {
            const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
            this.redis = (0, redis_1.createClient)({ url: redisUrl });
            this.redis.on('error', (err) => {
                console.error('[RateLimiter] Redis error:', err);
                this.useMemory = true;
            });
            await this.redis.connect();
            this.useMemory = false;
            console.log('[RateLimiter] Connected to Redis');
        }
        catch (error) {
            console.warn('[RateLimiter] Redis not available, using memory store');
            this.useMemory = true;
        }
    }
    /**
     * Create rate limiter middleware
     */
    createLimiter(config) {
        return async (req, res, next) => {
            try {
                const key = this.getKey(req);
                const now = Date.now();
                if (this.useMemory) {
                    // Memory-based rate limiting
                    const record = this.memoryStore.get(key);
                    if (!record || now > record.resetTime) {
                        // New window
                        this.memoryStore.set(key, {
                            count: 1,
                            resetTime: now + config.windowMs
                        });
                        return next();
                    }
                    if (record.count >= config.maxRequests) {
                        // Rate limit exceeded
                        const retryAfter = Math.ceil((record.resetTime - now) / 1000);
                        res.set('Retry-After', String(retryAfter));
                        res.set('X-RateLimit-Limit', String(config.maxRequests));
                        res.set('X-RateLimit-Remaining', '0');
                        res.set('X-RateLimit-Reset', String(record.resetTime));
                        return res.status(429).json({
                            success: false,
                            error: config.message || 'Too many requests, please try again later',
                            retryAfter
                        });
                    }
                    // Increment counter
                    record.count++;
                    res.set('X-RateLimit-Limit', String(config.maxRequests));
                    res.set('X-RateLimit-Remaining', String(config.maxRequests - record.count));
                    res.set('X-RateLimit-Reset', String(record.resetTime));
                    return next();
                }
                else {
                    // Redis-based rate limiting
                    if (!this.redis) {
                        return next();
                    }
                    const windowKey = `ratelimit:${key}:${Math.floor(now / config.windowMs)}`;
                    const count = await this.redis.incr(windowKey);
                    if (count === 1) {
                        // Set expiry on first request in window
                        await this.redis.expire(windowKey, Math.ceil(config.windowMs / 1000));
                    }
                    const ttl = await this.redis.ttl(windowKey);
                    const resetTime = now + (ttl * 1000);
                    res.set('X-RateLimit-Limit', String(config.maxRequests));
                    res.set('X-RateLimit-Remaining', String(Math.max(0, config.maxRequests - count)));
                    res.set('X-RateLimit-Reset', String(resetTime));
                    if (count > config.maxRequests) {
                        const retryAfter = ttl;
                        res.set('Retry-After', String(retryAfter));
                        return res.status(429).json({
                            success: false,
                            error: config.message || 'Too many requests, please try again later',
                            retryAfter
                        });
                    }
                    return next();
                }
            }
            catch (error) {
                console.error('[RateLimiter] Error:', error);
                // On error, allow request to proceed
                return next();
            }
        };
    }
    /**
     * Get rate limit key from request
     */
    getKey(req) {
        // Use user ID if authenticated, otherwise use IP
        if (req.user?.userId) {
            return `user:${req.user.userId}`;
        }
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        return `ip:${ip}`;
    }
    /**
     * Clean up memory store (remove expired entries)
     */
    cleanupMemoryStore() {
        const now = Date.now();
        for (const [key, record] of this.memoryStore.entries()) {
            if (now > record.resetTime) {
                this.memoryStore.delete(key);
            }
        }
    }
}
// Create singleton instance
const rateLimiter = new RateLimiter();
// Cleanup memory store every 5 minutes
setInterval(() => {
    rateLimiter.cleanupMemoryStore();
}, 5 * 60 * 1000);
// Export rate limiters for different endpoints
exports.authLimiter = rateLimiter.createLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 login attempts
    message: 'Too many login attempts, please try again later'
});
exports.apiLimiter = rateLimiter.createLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute
    message: 'Too many requests, please slow down'
});
exports.uploadLimiter = rateLimiter.createLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 uploads per minute
    message: 'Too many upload requests, please try again later'
});
exports.strictLimiter = rateLimiter.createLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 requests per minute
    message: 'Rate limit exceeded for this endpoint'
});
exports.default = rateLimiter;
//# sourceMappingURL=rateLimiter.js.map