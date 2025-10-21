import pool from '../config/database';
import bcrypt from 'bcrypt';

export interface User {
  id: string;
  username: string;
  email: string;
  full_name: string | null;
  role: string;
  active: boolean;
  last_login: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface UserFilter {
  role?: string;
  active?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateUserInput {
  username: string;
  email: string;
  password: string;
  full_name?: string;
  role?: string;
}

export interface UpdateUserInput {
  email?: string;
  full_name?: string;
  role?: string;
  active?: boolean;
}

export class UserService {
  /**
   * Get users with filters and pagination
   */
  async getUsers(filter: UserFilter): Promise<{ users: User[]; total: number }> {
    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        id, username, email, full_name, role, active, last_login, created_at, updated_at
      FROM users
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    // Apply filters
    if (filter.role) {
      params.push(filter.role);
      query += ` AND role = $${paramIndex++}`;
    }

    if (filter.active !== undefined) {
      params.push(filter.active);
      query += ` AND active = $${paramIndex++}`;
    }

    if (filter.search) {
      params.push(`%${filter.search}%`);
      query += ` AND (username ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR full_name ILIKE $${paramIndex})`;
      paramIndex++;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM (${query}) as filtered`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total, 10);

    // Add sorting and pagination
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return { users: result.rows, total };
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<User | null> {
    const result = await pool.query(
      `SELECT 
        id, username, email, full_name, role, active, last_login, created_at, updated_at
       FROM users
       WHERE id = $1`,
      [id]
    );

    return result.rows[0] || null;
  }

  /**
   * Get user by username
   */
  async getUserByUsername(username: string): Promise<User | null> {
    const result = await pool.query(
      `SELECT 
        id, username, email, full_name, role, active, last_login, created_at, updated_at
       FROM users
       WHERE username = $1`,
      [username]
    );

    return result.rows[0] || null;
  }

  /**
   * Create new user
   */
  async createUser(input: CreateUserInput): Promise<User> {
    // Check if username exists
    const existingUser = await this.getUserByUsername(input.username);
    if (existingUser) {
      throw new Error('Username already exists');
    }

    // Check if email exists
    const emailCheck = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [input.email]
    );
    if (emailCheck.rows.length > 0) {
      throw new Error('Email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(input.password, 10);

    // Insert user
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, username, email, full_name, role, active, last_login, created_at, updated_at`,
      [
        input.username,
        input.email,
        passwordHash,
        input.full_name || null,
        input.role || 'viewer'
      ]
    );

    return result.rows[0];
  }

  /**
   * Update user
   */
  async updateUser(id: string, input: UpdateUserInput): Promise<User> {
    const user = await this.getUserById(id);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if email is being changed and already exists
    if (input.email && input.email !== user.email) {
      const emailCheck = await pool.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [input.email, id]
      );
      if (emailCheck.rows.length > 0) {
        throw new Error('Email already exists');
      }
    }

    // Build update query dynamically
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (input.email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      params.push(input.email);
    }

    if (input.full_name !== undefined) {
      updates.push(`full_name = $${paramIndex++}`);
      params.push(input.full_name);
    }

    if (input.role !== undefined) {
      updates.push(`role = $${paramIndex++}`);
      params.push(input.role);
    }

    if (input.active !== undefined) {
      updates.push(`active = $${paramIndex++}`);
      params.push(input.active);
    }

    if (updates.length === 0) {
      return user; // No updates
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);

    const result = await pool.query(
      `UPDATE users
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, username, email, full_name, role, active, last_login, created_at, updated_at`,
      params
    );

    return result.rows[0];
  }

  /**
   * Change user password
   */
  async changePassword(id: string, newPassword: string): Promise<void> {
    const passwordHash = await bcrypt.hash(newPassword, 10);

    await pool.query(
      `UPDATE users
       SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [passwordHash, id]
    );
  }

  /**
   * Change user role
   */
  async changeRole(id: string, role: string): Promise<User> {
    const validRoles = ['admin', 'operator', 'viewer'];
    if (!validRoles.includes(role)) {
      throw new Error('Invalid role');
    }

    const result = await pool.query(
      `UPDATE users
       SET role = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, username, email, full_name, role, active, last_login, created_at, updated_at`,
      [role, id]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    return result.rows[0];
  }

  /**
   * Delete user
   */
  async deleteUser(id: string): Promise<boolean> {
    // Check if user exists
    const user = await this.getUserById(id);
    if (!user) {
      return false;
    }

    // Prevent deleting the last admin
    if (user.role === 'admin') {
      const adminCount = await pool.query(
        `SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND active = TRUE`
      );
      if (parseInt(adminCount.rows[0].count, 10) <= 1) {
        throw new Error('Cannot delete the last admin user');
      }
    }

    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    return true;
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(id: string): Promise<void> {
    await pool.query(
      `UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );
  }

  /**
   * Get user statistics
   */
  async getStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    byRole: Array<{ role: string; count: number }>;
  }> {
    // Total and active users
    const totalResult = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN active THEN 1 ELSE 0 END) as active
      FROM users
    `);

    // By role
    const byRoleResult = await pool.query(`
      SELECT role, COUNT(*) as count
      FROM users
      WHERE active = TRUE
      GROUP BY role
      ORDER BY count DESC
    `);

    return {
      totalUsers: parseInt(totalResult.rows[0].total, 10),
      activeUsers: parseInt(totalResult.rows[0].active, 10),
      byRole: byRoleResult.rows.map(row => ({
        role: row.role,
        count: parseInt(row.count, 10)
      }))
    };
  }
}

// Export singleton instance
export const userService = new UserService();

