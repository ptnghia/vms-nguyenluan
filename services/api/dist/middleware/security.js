"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.securityHeaders = void 0;
exports.configureCORS = configureCORS;
exports.requestLogger = requestLogger;
exports.errorHandler = errorHandler;
exports.notFoundHandler = notFoundHandler;
exports.requestSizeLimiter = requestSizeLimiter;
exports.ipWhitelist = ipWhitelist;
exports.preventParameterPollution = preventParameterPollution;
const helmet_1 = __importDefault(require("helmet"));
/**
 * Security headers middleware using helmet
 */
exports.securityHeaders = (0, helmet_1.default)({
    // Content Security Policy
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"]
        }
    },
    // X-DNS-Prefetch-Control
    dnsPrefetchControl: { allow: false },
    // X-Frame-Options
    frameguard: { action: 'deny' },
    // Hide X-Powered-By
    hidePoweredBy: true,
    // HTTP Strict Transport Security
    hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
    },
    // X-Download-Options for IE8+
    ieNoOpen: true,
    // X-Content-Type-Options
    noSniff: true,
    // X-Permitted-Cross-Domain-Policies
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },
    // Referrer-Policy
    referrerPolicy: { policy: 'no-referrer' },
    // X-XSS-Protection
    xssFilter: true
});
/**
 * CORS configuration
 */
function configureCORS(req, res, next) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3001'];
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }
    next();
}
/**
 * Request logging middleware
 */
function requestLogger(req, res, next) {
    const start = Date.now();
    const { method, url, ip } = req;
    const userAgent = req.headers['user-agent'] || 'unknown';
    // Log request
    console.log(`[${new Date().toISOString()}] ${method} ${url} - IP: ${ip}`);
    // Log response
    res.on('finish', () => {
        const duration = Date.now() - start;
        const { statusCode } = res;
        console.log(`[${new Date().toISOString()}] ${method} ${url} - ${statusCode} - ${duration}ms`);
    });
    next();
}
/**
 * Error handler middleware
 */
function errorHandler(err, req, res, next) {
    console.error('[Error Handler]', err);
    // Don't leak error details in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    if (err.name === 'UnauthorizedError') {
        return res.status(401).json({
            success: false,
            error: 'Invalid or expired token'
        });
    }
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            error: err.message,
            field: err.field
        });
    }
    if (err.code === '23505') {
        // PostgreSQL unique violation
        return res.status(409).json({
            success: false,
            error: 'Resource already exists'
        });
    }
    if (err.code === '23503') {
        // PostgreSQL foreign key violation
        return res.status(400).json({
            success: false,
            error: 'Referenced resource does not exist'
        });
    }
    // Generic error response
    res.status(err.status || 500).json({
        success: false,
        error: isDevelopment ? err.message : 'Internal server error',
        ...(isDevelopment && { stack: err.stack })
    });
}
/**
 * 404 handler
 */
function notFoundHandler(req, res) {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.path
    });
}
/**
 * Request size limiter
 */
function requestSizeLimiter(maxSize = '10mb') {
    return (req, res, next) => {
        const contentLength = req.headers['content-length'];
        if (contentLength) {
            const sizeInBytes = parseInt(contentLength, 10);
            const maxSizeInBytes = parseSize(maxSize);
            if (sizeInBytes > maxSizeInBytes) {
                return res.status(413).json({
                    success: false,
                    error: 'Request entity too large',
                    maxSize
                });
            }
        }
        next();
    };
}
/**
 * Parse size string to bytes
 */
function parseSize(size) {
    const units = {
        b: 1,
        kb: 1024,
        mb: 1024 * 1024,
        gb: 1024 * 1024 * 1024
    };
    const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*([a-z]+)$/);
    if (!match) {
        return parseInt(size, 10);
    }
    const value = parseFloat(match[1]);
    const unit = match[2];
    return value * (units[unit] || 1);
}
/**
 * IP whitelist middleware
 */
function ipWhitelist(allowedIPs) {
    return (req, res, next) => {
        const clientIP = req.ip || req.socket.remoteAddress || '';
        if (!allowedIPs.includes(clientIP)) {
            return res.status(403).json({
                success: false,
                error: 'Access denied from this IP address'
            });
        }
        next();
    };
}
/**
 * Prevent parameter pollution
 */
function preventParameterPollution(req, res, next) {
    // Check for duplicate query parameters
    const seen = new Set();
    for (const key in req.query) {
        if (Array.isArray(req.query[key])) {
            // Take only the first value if multiple values provided
            req.query[key] = req.query[key][0];
        }
        if (seen.has(key)) {
            return res.status(400).json({
                success: false,
                error: 'Duplicate query parameters detected'
            });
        }
        seen.add(key);
    }
    next();
}
//# sourceMappingURL=security.js.map