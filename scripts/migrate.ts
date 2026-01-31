import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function runMigrations() {
  // Use DATABASE_URL if available, otherwise fall back to individual vars
  const poolConfig = process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      }
    : {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432', 10),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      };

  const pool = new Pool(poolConfig);

  try {
    console.log('🔄 Starting migrations...');
    console.log('📍 Connecting to database...');

    // Create migrations tracking table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get all migration files
    const migrationsDir = join(process.cwd(), 'migrations');
    const files = await readdir(migrationsDir);
    const migrationFiles = files.filter((f) => f.endsWith('.sql')).sort();

    // Check which migrations have been executed
    const { rows: executedMigrations } = await pool.query('SELECT name FROM migrations');
    const executedNames = new Set(executedMigrations.map((r) => r.name));

    // Run pending migrations
    for (const file of migrationFiles) {
      if (executedNames.has(file)) {
        console.log(`⏭️  Skipping ${file} (already executed)`);
        continue;
      }

      console.log(`🔧 Running ${file}...`);
      const sql = await readFile(join(migrationsDir, file), 'utf-8');

      await pool.query('BEGIN');
      try {
        await pool.query(sql);
        await pool.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
        await pool.query('COMMIT');
        console.log(`✅ ${file} completed`);
      } catch (error) {
        await pool.query('ROLLBACK');
        throw error;
      }
    }

    console.log('✅ All migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
