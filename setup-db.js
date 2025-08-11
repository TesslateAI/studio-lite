const { execSync } = require('child_process');
const postgres = require('postgres');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const POSTGRES_URL = process.env.POSTGRES_URL || 'postgresql://studio_user:studio_password@localhost:5432/studio_db';

async function runMigrations() {
  console.log('Connecting to database...');
  const sql = postgres(POSTGRES_URL);
  
  try {
    // Read and execute migration files
    const migrationsPath = path.join(__dirname, 'lib', 'db', 'migrations');
    const migrationFiles = fs.readdirSync(migrationsPath)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    console.log(`Found ${migrationFiles.length} migration files`);
    
    for (const file of migrationFiles) {
      console.log(`Running migration: ${file}`);
      const migrationSQL = fs.readFileSync(path.join(migrationsPath, file), 'utf8');
      await sql.unsafe(migrationSQL);
      console.log(`✓ Migration ${file} completed`);
    }
    
    console.log('All migrations completed successfully!');
  } catch (error) {
    console.error('Migration error:', error.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigrations();