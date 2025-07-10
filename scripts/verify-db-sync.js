/**
 * Database Synchronization Verification Script
 * 
 * This script verifies that local and production databases have consistent data
 * by comparing row counts for important tables.
 * 
 * Usage:
 *   node scripts/verify-db-sync.js
 */

const { execSync } = require('child_process');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env' }); // Local DB
const prodEnv = dotenv.config({ path: '.env.production' }).parsed; // Production DB

// Tables to verify
const TABLES_TO_VERIFY = [
  'users',
  'media_contacts',
  'beats',
  'countries',
  'outlets',
  'languages',
  'regions',
  '_MediaContactBeats',
  '_MediaContactCountries',
  '_MediaContactOutlets',
  '_CountryRegions',
  '_CountryToLanguage'
];

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
 * Get row count for a table in the specified database
 */
function getTableRowCount(db, table) {
  try {
    let cmd;
    if (db === localDb) {
      cmd = `psql -U ${db.user} -d ${db.database} -t -c "SELECT COUNT(*) FROM \\"${table}\\";"`;
    } else {
      cmd = `PGPASSWORD=${db.password} psql -h ${db.host} -U ${db.user} -d ${db.database} -t -c "SELECT COUNT(*) FROM \\"${table}\\";"`;
    }
    
    const result = execSync(cmd).toString().trim();
    return parseInt(result, 10);
  } catch (error) {
    console.error(`Error getting row count for table ${table}:`, error.message);
    return -1;
  }
}

/**
 * Verify database synchronization by comparing row counts
 */
function verifySync() {
  console.log('Verifying database synchronization...');
  console.log('----------------------------------------');
  console.log('Table               | Local Count | Production Count | Match?');
  console.log('-------------------- ------------ ----------------- -------');
  
  let allMatch = true;
  
  for (const table of TABLES_TO_VERIFY) {
    const localCount = getTableRowCount(localDb, table);
    const prodCount = getTableRowCount(prodDb, table);
    const match = localCount === prodCount ? '✓' : '✗';
    
    if (localCount !== prodCount) {
      allMatch = false;
    }
    
    console.log(
      `${table.padEnd(20)} | ${String(localCount).padEnd(12)} | ${String(prodCount).padEnd(17)} | ${match}`
    );
  }
  
  console.log('----------------------------------------');
  if (allMatch) {
    console.log('✅ All tables are synchronized between local and production databases.');
  } else {
    console.log('❌ Some tables have different row counts. Consider running a sync operation:');
    console.log('   npm run db:sync:local-to-prod');
    console.log('   or');
    console.log('   npm run db:sync:prod-to-local');
  }
}

// Execute verification
verifySync();
