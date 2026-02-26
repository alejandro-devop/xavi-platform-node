import { writeFile, readdir } from 'fs/promises';
import { join } from 'path';

async function createMigration() {
  // Get migration name from command line
  const migrationName = process.argv[2];

  if (!migrationName) {
    console.error('❌ Please provide a migration name.');
    console.error('Usage: npm run migrate:create <migration_name>');
    console.error('Example: npm run migrate:create add_user_preferences');
    process.exit(1);
  }

  // Validate migration name (only lowercase, numbers, underscores)
  if (!/^[a-z0-9_]+$/.test(migrationName)) {
    console.error(
      '❌ Migration name must contain only lowercase letters, numbers, and underscores.'
    );
    process.exit(1);
  }

  try {
    const migrationsDir = join(process.cwd(), 'migrations');

    // Get existing migration files to determine next number
    const files = await readdir(migrationsDir);
    const migrationFiles = files.filter((f) => f.endsWith('.sql'));

    // Find the highest migration number
    let nextNumber = 1;
    for (const file of migrationFiles) {
      const match = file.match(/^(\d+)_/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num >= nextNumber) {
          nextNumber = num + 1;
        }
      }
    }

    // Format the number with leading zeros (3 digits)
    const paddedNumber = String(nextNumber).padStart(3, '0');
    const fileName = `${paddedNumber}_${migrationName}.sql`;
    const filePath = join(migrationsDir, fileName);

    // Create migration template
    const template = `-- UP
-- Migration: ${migrationName}
-- Created: ${new Date().toISOString()}

-- Add your UP migration here
-- Example:
-- CREATE TABLE example (
--   id UUID PRIMARY KEY,
--   name VARCHAR(255) NOT NULL,
--   created_at TIMESTAMP NOT NULL DEFAULT NOW()
-- );


-- DOWN

-- Add your DOWN migration here (to reverse the UP migration)
-- Example:
-- DROP TABLE IF EXISTS example;

`;

    await writeFile(filePath, template, 'utf-8');

    console.log('✅ Migration created successfully!');
    console.log(`📄 File: migrations/${fileName}`);
    console.log('');
    console.log('Next steps:');
    console.log('1. Edit the migration file to add your SQL statements');
    console.log('2. Add SQL in the UP section (applied when migrating)');
    console.log('3. Add SQL in the DOWN section (applied when rolling back)');
    console.log('4. Run: npm run migrate');
  } catch (error) {
    console.error('❌ Failed to create migration:', error);
    process.exit(1);
  }
}

createMigration();
