import { readFile } from 'fs/promises';
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

async function rollback() {
  const pool = new Pool(getPoolConfig());

  // Get the step parameter (default: 1)
  const steps = parseInt(process.argv[2] || '1', 10);

  if (isNaN(steps) || steps < 1) {
    console.error('❌ Invalid step number. Usage: npm run migrate:rollback [steps]');
    process.exit(1);
  }

  try {
    console.log(`🔄 Rolling back last ${steps} batch(es)...`);
    console.log('📍 Connecting to database...');

    // Check if migrations table exists
    const { rows: tableExists } = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'migrations'
      )
    `);

    if (!tableExists[0]?.exists) {
      console.log('⚠️  No migrations table found. Nothing to rollback.');
      return;
    }

    // Get the last N batches
    const { rows: batchRows } = await pool.query<{ batch: number }>(
      'SELECT DISTINCT batch FROM migrations ORDER BY batch DESC LIMIT $1',
      [steps]
    );

    if (batchRows.length === 0) {
      console.log('⚠️  No migrations to rollback.');
      return;
    }

    const batchesToRollback = batchRows.map((r) => r.batch);
    console.log(`📦 Rolling back batches: ${batchesToRollback.join(', ')}`);

    // Get migrations from those batches in reverse order
    const { rows: migrations } = await pool.query<MigrationRecord>(
      'SELECT * FROM migrations WHERE batch = ANY($1) ORDER BY name DESC',
      [batchesToRollback]
    );

    console.log(`📝 Found ${migrations.length} migration(s) to rollback`);

    // Rollback each migration
    for (const migration of migrations) {
      console.log(`\n🔧 Rolling back ${migration.name}...`);

      const filePath = join(process.cwd(), 'migrations', migration.name);

      try {
        const { down } = await parseMigrationFile(filePath);

        if (!down) {
          console.log(`⚠️  No DOWN migration found for ${migration.name}, skipping...`);
          // Still remove from tracking table
          await pool.query('DELETE FROM migrations WHERE name = $1', [migration.name]);
          continue;
        }

        await pool.query('BEGIN');
        try {
          // Execute the DOWN migration
          await pool.query(down);

          // Remove from migrations table
          await pool.query('DELETE FROM migrations WHERE name = $1', [migration.name]);

          await pool.query('COMMIT');
          console.log(`✅ ${migration.name} rolled back successfully (batch ${migration.batch})`);
        } catch (error) {
          await pool.query('ROLLBACK');
          console.error(`❌ Failed to rollback ${migration.name}:`, error);
          throw error;
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          console.error(`❌ Migration file not found: ${migration.name}`);
          console.log('   You may need to remove it manually from the database:');
          console.log(`   DELETE FROM migrations WHERE name = '${migration.name}';`);
        }
        throw error;
      }
    }

    console.log(`\n✅ Successfully rolled back ${migrations.length} migration(s)`);
  } catch (error) {
    console.error('\n❌ Rollback failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

rollback();
