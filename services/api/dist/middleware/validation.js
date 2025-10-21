"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationError = void 0;
exports.isValidUUID = isValidUUID;
exports.isValidEmail = isValidEmail;
exports.isValidUrl = isValidUrl;
exports.isValidRtspUrl = isValidRtspUrl;
exports.sanitizeString = sanitizeString;
exports.validatePagination = validatePagination;
exports.validateUUID = validateUUID;
exports.validateRequired = validateRequired;
exports.validateEmail = validateEmail;
exports.validatePassword = validatePassword;
exports.validateRtspUrl = validateRtspUrl;
exports.sanitizeBody = sanitizeBody;
exports.validateDateRange = validateDateRange;
exports.validateEnum = validateEnum;
exports.validateNumberRange = validateNumberRange;
/**
 * Validation error class
 */
class ValidationError extends Error {
    constructor(field, message) {
        super(message);
        this.field = field;
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
/**
 * Validate UUID format
 */
function isValidUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}
/**
 * Validate email format
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
/**
 * Validate URL format
 */
function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Validate RTSP URL format
 */
function isValidRtspUrl(url) {
    return url.startsWith('rtsp://') || url.startsWith('rtsps://');
}
/**
 * Sanitize string (remove dangerous characters)
 */
function sanitizeString(str) {
    return str
        .replace(/[<>]/g, '') // Remove < and >
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+=/gi, '') // Remove event handlers
        .trim();
}
/**
 * Validate and sanitize pagination parameters
 */
function validatePagination(req, res, next) {
    const { page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    if (isNaN(pageNum) || pageNum < 1) {
        return res.status(400).json({
            success: false,
            error: 'Invalid page number'
        });
    }
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        return res.status(400).json({
            success: false,
            error: 'Invalid limit (must be between 1 and 100)'
        });
    }
    // Attach validated values to request
    req.query.page = String(pageNum);
    req.query.limit = String(limitNum);
    next();
}
/**
 * Validate UUID parameter
 */
function validateUUID(paramName = 'id') {
    return (req, res, next) => {
        const uuid = req.params[paramName];
        if (!uuid || !isValidUUID(uuid)) {
            return res.status(400).json({
                success: false,
                error: `Invalid ${paramName} format`
            });
        }
        next();
    };
}
/**
 * Validate required fields in request body
 */
function validateRequired(fields) {
    return (req, res, next) => {
        const missing = fields.filter(field => {
            const value = req.body[field];
            return value === undefined || value === null || value === '';
        });
        if (missing.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
                fields: missing
            });
        }
        next();
    };
}
/**
 * Validate email in request body
 */
function validateEmail(req, res, next) {
    const { email } = req.body;
    if (email && !isValidEmail(email)) {
        return res.status(400).json({
            success: false,
            error: 'Invalid email format'
        });
    }
    next();
}
/**
 * Validate password strength
 */
function validatePassword(req, res, next) {
    const { password } = req.body;
    if (!password) {
        return next();
    }
    if (password.length < 8) {
        return res.status(400).json({
            success: false,
            error: 'Password must be at least 8 characters long'
        });
    }
    // Optional: Add more password requirements
    // const hasUpperCase = /[A-Z]/.test(password);
    // const hasLowerCase = /[a-z]/.test(password);
    // const hasNumbers = /\d/.test(password);
    // const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    next();
}
/**
 * Validate RTSP URL
 */
function validateRtspUrl(req, res, next) {
    const { rtsp_url } = req.body;
    if (rtsp_url && !isValidRtspUrl(rtsp_url)) {
        return res.status(400).json({
            success: false,
            error: 'Invalid RTSP URL format (must start with rtsp:// or rtsps://)'
        });
    }
    next();
}
/**
 * Sanitize request body strings
 */
function sanitizeBody(req, res, next) {
    if (req.body && typeof req.body === 'object') {
        for (const key in req.body) {
            if (typeof req.body[key] === 'string') {
                req.body[key] = sanitizeString(req.body[key]);
            }
        }
    }
    next();
}
/**
 * Validate date range
 */
function validateDateRange(req, res, next) {
    const { startDate, endDate } = req.query;
    if (startDate) {
        const start = new Date(startDate);
        if (isNaN(start.getTime())) {
            return res.status(400).json({
                success: false,
                error: 'Invalid startDate format'
            });
        }
    }
    if (endDate) {
        const end = new Date(endDate);
        if (isNaN(end.getTime())) {
            return res.status(400).json({
                success: false,
                error: 'Invalid endDate format'
            });
        }
    }
    if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (start > end) {
            return res.status(400).json({
                success: false,
                error: 'startDate must be before endDate'
            });
        }
    }
    next();
}
/**
 * Validate enum value
 */
function validateEnum(field, allowedValues) {
    return (req, res, next) => {
        const value = req.body[field] || req.query[field];
        if (value && !allowedValues.includes(value)) {
            return res.status(400).json({
                success: false,
                error: `Invalid ${field} value`,
                allowedValues
            });
        }
        next();
    };
}
/**
 * Validate number range
 */
function validateNumberRange(field, min, max) {
    return (req, res, next) => {
        const value = req.body[field] || req.query[field];
        if (value !== undefined) {
            const num = Number(value);
            if (isNaN(num)) {
                return res.status(400).json({
                    success: false,
                    error: `${field} must be a number`
                });
            }
            if (num < min || num > max) {
                return res.status(400).json({
                    success: false,
                    error: `${field} must be between ${min} and ${max}`
                });
            }
        }
        next();
    };
}
//# sourceMappingURL=validation.js.map