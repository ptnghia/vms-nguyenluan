"use strict";
/**
 * Authentication Middleware
 * Protects routes and validates JWT tokens
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuth = exports.authorize = exports.authenticate = void 0;
const auth_service_1 = require("../services/auth.service");
const database_1 = __importDefault(require("../config/database"));
const authService = new auth_service_1.AuthService(database_1.default);
/**
 * Middleware to verify JWT token
 */
const authenticate = async (req, res, next) => {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                success: false,
                error: 'No token provided'
            });
            return;
        }
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        // Verify token
        const payload = authService.verifyToken(token);
        // Attach user to request
        req.user = payload;
        next();
    }
    catch (error) {
        res.status(401).json({
            success: false,
            error: error instanceof Error ? error.message : 'Authentication failed'
        });
    }
};
exports.authenticate = authenticate;
/**
 * Middleware to check user role
 */
const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
            return;
        }
        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({
                success: false,
                error: 'Insufficient permissions'
            });
            return;
        }
        next();
    };
};
exports.authorize = authorize;
/**
 * Optional authentication - adds user if token present but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const payload = authService.verifyToken(token);
            req.user = payload;
        }
    }
    catch (error) {
        // Ignore errors for optional auth
    }
    next();
};
exports.optionalAuth = optionalAuth;
//# sourceMappingURL=auth.js.map