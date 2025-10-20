/**
 * Reset Admin Password Script
 * Usage: npm run reset-admin-password
 */

import bcrypt from 'bcrypt';
import pool from '../src/config/database.js';

async function resetAdminPassword() {
  try {
    const newPassword = 'admin123';
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update admin password
    const result = await pool.query(
      `UPDATE users SET password_hash = $1 WHERE username = 'admin' RETURNING username, email, role`,
      [passwordHash]
    );

    if (result.rows.length === 0) {
      console.log('❌ Admin user not found. Creating new admin user...');
      
      // Create admin user
      const createResult = await pool.query(
        `INSERT INTO users (username, password_hash, email, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id, username, email, role, created_at`,
        ['admin', passwordHash, 'admin@vms.local', 'admin']
      );
      
      console.log('✅ Admin user created successfully:');
      console.log(createResult.rows[0]);
    } else {
      console.log('✅ Admin password reset successfully:');
      console.log(result.rows[0]);
    }

    console.log('\n📝 Login credentials:');
    console.log('   Username: admin');
    console.log('   Password: admin123');

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

resetAdminPassword();
