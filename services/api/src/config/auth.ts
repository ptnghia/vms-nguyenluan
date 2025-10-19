/**
 * Authentication Configuration
 * JWT token settings and secrets
 */

export const authConfig = {
  // JWT Secret - In production, use environment variable
  jwtSecret: process.env.JWT_SECRET || 'vms-secret-key-change-in-production',
  
  // Token expiration times
  accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '24h',  // 24 hours
  refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d', // 7 days
  
  // Bcrypt rounds for password hashing
  bcryptRounds: 10,
  
  // Token issuer
  issuer: 'vms-api',
  
  // Allowed roles
  roles: {
    ADMIN: 'admin',
    OPERATOR: 'operator',
    VIEWER: 'viewer'
  }
};
