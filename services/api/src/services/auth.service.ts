/**
 * Authentication Service
 * Handles user authentication, JWT token generation and validation
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { Pool } from 'pg';
import { authConfig } from '../config/auth';

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

export class AuthService {
  constructor(private pool: Pool) {}

  /**
   * Register a new user
   */
  async register(
    username: string,
    password: string,
    email: string,
    role: string = 'viewer'
  ): Promise<User> {
    // Validate role
    const validRoles = Object.values(authConfig.roles);
    if (!validRoles.includes(role)) {
      throw new Error(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
    }

    // Check if username already exists
    const existingUser = await this.pool.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );

    if (existingUser.rows.length > 0) {
      throw new Error('Username already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, authConfig.bcryptRounds);

    // Insert user
    const result = await this.pool.query(
      `INSERT INTO users (username, password_hash, email, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, email, role, created_at`,
      [username, passwordHash, email, role]
    );

    return result.rows[0];
  }

  /**
   * Authenticate user and generate tokens
   */
  async login(username: string, password: string): Promise<AuthTokens> {
    // Get user from database
    const result = await this.pool.query(
      'SELECT id, username, password_hash, role FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid username or password');
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
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
  generateTokens(payload: TokenPayload): AuthTokens {
    const accessToken = jwt.sign(payload, authConfig.jwtSecret, {
      expiresIn: authConfig.accessTokenExpiry as string,
      issuer: authConfig.issuer
    } as jwt.SignOptions);

    const refreshToken = jwt.sign(
      { userId: payload.userId },
      authConfig.jwtSecret,
      {
        expiresIn: authConfig.refreshTokenExpiry as string,
        issuer: authConfig.issuer
      } as jwt.SignOptions
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: authConfig.accessTokenExpiry as string
    };
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, authConfig.jwtSecret, {
        issuer: authConfig.issuer
      }) as TokenPayload;

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      }
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
    try {
      const decoded = jwt.verify(refreshToken, authConfig.jwtSecret, {
        issuer: authConfig.issuer
      }) as { userId: number };

      // Get user details
      const result = await this.pool.query(
        'SELECT id, username, role FROM users WHERE id = $1',
        [decoded.userId]
      );

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
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    const result = await this.pool.query(
      'SELECT id, username, email, role, created_at FROM users WHERE id = $1',
      [userId]
    );

    return result.rows[0] || null;
  }

  /**
   * Change user password
   */
  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string
  ): Promise<void> {
    // Get current password hash
    const result = await this.pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    // Verify old password
    const isValid = await bcrypt.compare(oldPassword, result.rows[0].password_hash);
    if (!isValid) {
      throw new Error('Invalid current password');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, authConfig.bcryptRounds);

    // Update password
    await this.pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [newPasswordHash, userId]
    );
  }
}
