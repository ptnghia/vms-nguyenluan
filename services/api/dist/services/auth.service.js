"use strict";
/**
 * Authentication Service
 * Handles user authentication, JWT token generation and validation
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const auth_1 = require("../config/auth");
class AuthService {
    constructor(pool) {
        this.pool = pool;
    }
    /**
     * Register a new user
     */
    async register(username, password, email, role = 'viewer') {
        // Validate role
        const validRoles = Object.values(auth_1.authConfig.roles);
        if (!validRoles.includes(role)) {
            throw new Error(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
        }
        // Check if username already exists
        const existingUser = await this.pool.query('SELECT id FROM users WHERE username = $1', [username]);
        if (existingUser.rows.length > 0) {
            throw new Error('Username already exists');
        }
        // Hash password
        const passwordHash = await bcrypt_1.default.hash(password, auth_1.authConfig.bcryptRounds);
        // Insert user
        const result = await this.pool.query(`INSERT INTO users (username, password_hash, email, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, email, role, created_at`, [username, passwordHash, email, role]);
        return result.rows[0];
    }
    /**
     * Authenticate user and generate tokens
     */
    async login(username, password) {
        // Get user from database
        const result = await this.pool.query('SELECT id, username, password_hash, role FROM users WHERE username = $1', [username]);
        if (result.rows.length === 0) {
            throw new Error('Invalid username or password');
        }
        const user = result.rows[0];
        // Verify password
        const isValidPassword = await bcrypt_1.default.compare(password, user.password_hash);
        if (!isValidPassword) {
            throw new Error('Invalid username or password');
        }
        // Generate tokens
        const tokens = this.generateTokens({
            userId: user.id,
            username: user.username,
            role: user.role
        });
        return tokens;
    }
    /**
     * Generate access and refresh tokens
     */
    generateTokens(payload) {
        const accessToken = jsonwebtoken_1.default.sign(payload, auth_1.authConfig.jwtSecret, {
            expiresIn: auth_1.authConfig.accessTokenExpiry,
            issuer: auth_1.authConfig.issuer
        });
        const refreshToken = jsonwebtoken_1.default.sign({ userId: payload.userId }, auth_1.authConfig.jwtSecret, {
            expiresIn: auth_1.authConfig.refreshTokenExpiry,
            issuer: auth_1.authConfig.issuer
        });
        return {
            accessToken,
            refreshToken,
            expiresIn: auth_1.authConfig.accessTokenExpiry
        };
    }
    /**
     * Verify JWT token
     */
    verifyToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, auth_1.authConfig.jwtSecret, {
                issuer: auth_1.authConfig.issuer
            });
            return decoded;
        }
        catch (error) {
            if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
                throw new Error('Token expired');
            }
            else if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
                throw new Error('Invalid token');
            }
            throw error;
        }
    }
    /**
     * Refresh access token using refresh token
     */
    async refreshAccessToken(refreshToken) {
        try {
            const decoded = jsonwebtoken_1.default.verify(refreshToken, auth_1.authConfig.jwtSecret, {
                issuer: auth_1.authConfig.issuer
            });
            // Get user details
            const result = await this.pool.query('SELECT id, username, role FROM users WHERE id = $1', [decoded.userId]);
            if (result.rows.length === 0) {
                throw new Error('User not found');
            }
            const user = result.rows[0];
            // Generate new tokens
            return this.generateTokens({
                userId: user.id,
                username: user.username,
                role: user.role
            });
        }
        catch (error) {
            throw new Error('Invalid refresh token');
        }
    }
    /**
     * Get user by ID
     */
    async getUserById(userId) {
        const result = await this.pool.query('SELECT id, username, email, role, created_at FROM users WHERE id = $1', [userId]);
        return result.rows[0] || null;
    }
    /**
     * Change user password
     */
    async changePassword(userId, oldPassword, newPassword) {
        // Get current password hash
        const result = await this.pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
        if (result.rows.length === 0) {
            throw new Error('User not found');
        }
        // Verify old password
        const isValid = await bcrypt_1.default.compare(oldPassword, result.rows[0].password_hash);
        if (!isValid) {
            throw new Error('Invalid current password');
        }
        // Hash new password
        const newPasswordHash = await bcrypt_1.default.hash(newPassword, auth_1.authConfig.bcryptRounds);
        // Update password
        await this.pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newPasswordHash, userId]);
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=auth.service.js.map