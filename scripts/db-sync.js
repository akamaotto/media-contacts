/**
 * Database Synchronization Script
 * 
 * This script synchronizes data between local and production databases.
 * It can sync specific tables or join tables to ensure data consistency.
 * 
 * Usage:
 *   node scripts/db-sync.js local-to-prod [tables]
 *   node scripts/db-sync.js prod-to-local [tables]
 * 
 * Examples:
 *   node scripts/db-sync.js local-to-prod _MediaContactBeats _MediaContactCountries _MediaContactOutlets
 *   node scripts/db-sync.js prod-to-local users
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env' }); // Local DB
const prodEnv = dotenv.config({ path: '.env.production' }).parsed; // Production DB

// Default tables to sync if none specified
const DEFAULT_JOIN_TABLES = [
  '_MediaContactBeats',
  '_MediaContactCountries',
  '_MediaContactOutlets'
];

// Parse command line arguments
const direction = process.argv[2];
const tables = process.argv.slice(3).length > 0 ? process.argv.slice(3) : DEFAULT_JOIN_TABLES;

// Ensure backups directory exists
const backupsDir = path.join(__dirname, '../backups');
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

// Get timestamp for filenames
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

// Database connection parameters
const localDb = {
  user: 'akamaotto',
  database: 'media_contacts',
  host: 'localhost'
};

const prodDb = {
  user: 'neondb_owner',
  database: 'neondb',
  host: 'ep-tight-pine-a2baeagw-pooler.eu-central-1.aws.neon.tech',
  password: prodEnv.DATABASE_URL ? prodEnv.DATABASE_URL.split(':')[2].split('@')[0] : 'password-not-found'
};

/**
 * Sync data from source to target database
 */
function syncDatabases(source, target, tables) {
  try {
    // Create a temporary dump file
    const dumpFile = path.join(backupsDir, `sync_${direction}_${timestamp}.sql`);
    
    // Build table parameters for pg_dump
    const tableParams = tables.map(table => `-t "\\"${table}\\"""`).join(' ');
    
    console.log(`Syncing tables: ${tables.join(', ')}`);
    console.log(`Direction: ${direction}`);
    
    // Export data from source database
    console.log('Exporting data from source database...');
    let dumpCmd;
    
    if (source === localDb) {
      dumpCmd = `pg_dump -U ${source.user} -d ${source.database} ${tableParams} --data-only > ${dumpFile}`;
    } else {
      // For production, use the password from env
      dumpCmd = `PGPASSWORD=${source.password} pg_dump -h ${source.host} -U ${source.user} -d ${source.database} ${tableParams} --data-only > ${dumpFile}`;
    }
    
    execSync(dumpCmd, { stdio: 'inherit' });
    
    // Import data to target database
    console.log('Importing data to target database...');
    let importCmd;
    
    if (target === localDb) {
      importCmd = `cat ${dumpFile} | psql -U ${target.user} -d ${target.database}`;
    } else {
      // For production, use the password from env
      importCmd = `cat ${dumpFile} | PGPASSWORD=${target.password} psql -h ${target.host} -U ${target.user} -d ${target.database}`;
    }
    
    execSync(importCmd, { stdio: 'inherit' });
    
    console.log('Sync completed successfully!');
    console.log(`Temporary dump file created at: ${dumpFile}`);
    console.log('You can delete this file once you verify the sync was successful.');
    
    // Verify the sync
    console.log('Run npm run db:verify-sync to verify the synchronization.');
    
  } catch (error) {
    console.error('Error during database synchronization:', error.message);
    process.exit(1);
  }
}

// Execute sync based on direction
if (direction === 'local-to-prod') {
  syncDatabases(localDb, prodDb, tables);
} else if (direction === 'prod-to-local') {
  syncDatabases(prodDb, localDb, tables);
} else {
  console.error('Invalid direction. Use "local-to-prod" or "prod-to-local"');
  process.exit(1);
}
