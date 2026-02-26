import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface MigrationRecord {
  id: number;
  name: string;
  executed_at: Date;
  batch: number;
}

function getPoolConfig() {
  return process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
      }
    : {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432', 10),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      };
}

async function parseMigrationFile(filePath: string): Promise<{ up: string; down: string }> {
  const content = await readFile(filePath, 'utf-8');

  // Split by -- DOWN marker
  const parts = content.split(/-- DOWN|--DOWN/i);

  if (parts.length === 1) {
    // Old format: no down migration
    return { up: parts[0].trim(), down: '' };
  }

  const up = parts[0].replace(/-- UP|--UP/i, '').trim();
  const down = parts[1].trim();

  return { up, down };
}

async function runMigrations() {
  const pool = new Pool(getPoolConfig());

  try {
    console.log('🔄 Starting migrations...');
    console.log('📍 Connecting to database...');

    // Create migrations tracking table with batch support
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        batch INTEGER NOT NULL DEFAULT 1,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get current batch number
    const { rows: batchRows } = await pool.query(
      'SELECT COALESCE(MAX(batch), 0) as max_batch FROM migrations'
    );
    const currentBatch = (batchRows[0]?.max_batch || 0) + 1;

    // Get all migration files
    const migrationsDir = join(process.cwd(), 'migrations');
    const files = await readdir(migrationsDir);
    const migrationFiles = files.filter((f) => f.endsWith('.sql')).sort();

    // Check which migrations have been executed
    const { rows: executedMigrations } = await pool.query<MigrationRecord>(
      'SELECT name, batch FROM migrations ORDER BY name'
    );
    const executedNames = new Set(executedMigrations.map((r) => r.name));

    // Run pending migrations
    let migrationsRun = 0;
    for (const file of migrationFiles) {
      if (executedNames.has(file)) {
        console.log(`⏭️  Skipping ${file} (already executed)`);
        continue;
      }

      console.log(`🔧 Running ${file}...`);
      const filePath = join(migrationsDir, file);
      const { up } = await parseMigrationFile(filePath);

      if (!up) {
        console.log(`⚠️  Skipping ${file} (empty migration)`);
        continue;
      }

      await pool.query('BEGIN');
      try {
        // Execute the UP migration
        await pool.query(up);

        // Record the migration
        await pool.query('INSERT INTO migrations (name, batch) VALUES ($1, $2)', [
          file,
          currentBatch,
        ]);

        await pool.query('COMMIT');
        console.log(`✅ ${file} completed (batch ${currentBatch})`);
        migrationsRun++;
      } catch (error) {
        await pool.query('ROLLBACK');
        console.error(`❌ Failed to run ${file}:`, error);
        throw error;
      }
    }

    if (migrationsRun === 0) {
      console.log('✅ No new migrations to run');
    } else {
      console.log(`✅ Successfully ran ${migrationsRun} migration(s) in batch ${currentBatch}`);
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
