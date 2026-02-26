import { readdir } from 'fs/promises';
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

async function status() {
  const pool = new Pool(getPoolConfig());

  try {
    console.log('📊 Migration Status');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Check if migrations table exists
    const { rows: tableExists } = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'migrations'
      )
    `);

    if (!tableExists[0]?.exists) {
      console.log('⚠️  No migrations table found.');
      console.log('   Run "npm run migrate" to create the table and run migrations.\n');
      return;
    }

    // Get all migration files
    const migrationsDir = join(process.cwd(), 'migrations');
    const files = await readdir(migrationsDir);
    const migrationFiles = files.filter((f) => f.endsWith('.sql')).sort();

    // Get executed migrations
    const { rows: executedMigrations } = await pool.query<MigrationRecord>(
      'SELECT * FROM migrations ORDER BY name'
    );
    const executedMap = new Map(executedMigrations.map((m) => [m.name, m]));

    // Display status
    console.log('📦 Database:', process.env.DB_NAME || 'unknown');
    console.log(`📝 Total migrations found: ${migrationFiles.length}`);
    console.log(`✅ Executed: ${executedMigrations.length}`);
    console.log(`⏳ Pending: ${migrationFiles.length - executedMigrations.length}\n`);

    if (migrationFiles.length === 0) {
      console.log('No migration files found.\n');
      return;
    }

    console.log('Status | Batch | Migration');
    console.log('───────┼───────┼─────────────────────────────────────────────');

    for (const file of migrationFiles) {
      const record = executedMap.get(file);
      if (record) {
        const date = new Date(record.executed_at).toISOString().split('T')[0];
        console.log(`   ✅  │  ${String(record.batch).padStart(3)}  │ ${file} (${date})`);
      } else {
        console.log(`   ⏳  │   -   │ ${file}`);
      }
    }

    console.log('');

    // Show batches summary
    if (executedMigrations.length > 0) {
      const batches = new Map<number, MigrationRecord[]>();
      for (const migration of executedMigrations) {
        if (!batches.has(migration.batch)) {
          batches.set(migration.batch, []);
        }
        batches.get(migration.batch)!.push(migration);
      }

      console.log(`\n📦 Batches (${batches.size} total):`);
      for (const [batchNum, migrations] of Array.from(batches.entries()).sort(
        (a, b) => b[0] - a[0]
      )) {
        console.log(`   Batch ${batchNum}: ${migrations.length} migration(s)`);
      }
    }

    const pendingCount = migrationFiles.length - executedMigrations.length;
    if (pendingCount > 0) {
      console.log(`\n💡 Run "npm run migrate" to execute ${pendingCount} pending migration(s)`);
    } else {
      console.log('\n✨ All migrations are up to date!');
    }

    console.log('');
  } catch (error) {
    console.error('❌ Failed to get migration status:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

status();
