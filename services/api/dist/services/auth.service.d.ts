/**
 * Authentication Service
 * Handles user authentication, JWT token generation and validation
 */
import { Pool } from 'pg';
export interface User {
    id: number;
    username: string;
    email: string;
    role: string;
    created_at: Date;
}
export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: string;
}
export interface TokenPayload {
    userId: string;
    username: string;
    role: string;
}
export declare class AuthService {
    private pool;
    constructor(pool: Pool);
    /**
     * Register a new user
     */
    register(username: string, password: string, email: string, role?: string): Promise<User>;
    /**
     * Authenticate user and generate tokens
     */
    login(username: string, password: string): Promise<AuthTokens>;
    /**
     * Generate access and refresh tokens
     */
    generateTokens(payload: TokenPayload): AuthTokens;
    /**
     * Verify JWT token
     */
    verifyToken(token: string): TokenPayload;
    /**
     * Refresh access token using refresh token
     */
    refreshAccessToken(refreshToken: string): Promise<AuthTokens>;
    /**
     * Get user by ID
     */
    getUserById(userId: string): Promise<User | null>;
    /**
     * Change user password
     */
    changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void>;
}
//# sourceMappingURL=auth.service.d.ts.map