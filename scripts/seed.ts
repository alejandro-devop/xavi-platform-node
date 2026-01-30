import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { hashPassword } from '../src/shared/utils/password';

// Load environment variables
dotenv.config();

async function seed() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    console.log('🌱 Starting seed...');

    // Check if dev user already exists
    const { rows } = await pool.query('SELECT id FROM users WHERE email = $1', [
      'alejandro.devop@gmail.com',
    ]);

    if (rows.length > 0) {
      console.log('⏭️  Dev user already exists, skipping');
      return;
    }

    // Create dev user
    const hashedPassword = await hashPassword('jkrules1212');

    await pool.query(
      `INSERT INTO users (email, password, name, is_account_verified)
       VALUES ($1, $2, $3, $4)`,
      ['alejandro.devop@gmail.com', hashedPassword, 'Alejandro Dev', true]
    );

    console.log('✅ Dev user created:');
    console.log('   Email: alejandro.devop@gmail.com');
    console.log('   Password: jkrules1212');
    console.log('   Status: Verified');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
