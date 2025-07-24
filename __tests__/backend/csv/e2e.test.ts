import fs from 'fs/promises';
import path from 'path';
import { importMediaContactsFromCsv, exportMediaContactsToCsv } from '../../../src/backend/csv/actions';
import { PrismaClient } from '@prisma/client';
import { describe, test, expect, jest, beforeAll, afterAll } from '@jest/globals';

// This test requires a test database connection
// It should only be run in a test environment with a test database
// Use TEST_MODE=e2e jest to run these tests

describe('CSV End-to-End Tests', () => {
  // Helper function to conditionally run or skip tests based on TEST_MODE
  const runTest = (name: string, fn: () => Promise<void>, timeout?: number) => {
    if (process.env.TEST_MODE === 'e2e') {
      test(name, fn, timeout);
    } else {
      test.skip(name, fn, timeout);
    }
  };
  
  let prisma: PrismaClient;
  const testDir = path.join(process.cwd(), 'tmp', 'test-csv');
  
  beforeAll(async () => {
    // Create test directory if it doesn't exist
    try {
      await fs.mkdir(testDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create test directory:', error);
    }
    
    // Connect to test database
    if (process.env.TEST_MODE === 'e2e') {
      prisma = new PrismaClient();
      
      // Clean up test data from previous runs
      await prisma.mediaContact.deleteMany({
        where: {
          email: {
            endsWith: '@test-csv.com'
          }
        }
      });
    }
  });
  
  afterAll(async () => {
    // Clean up test data
    if (process.env.TEST_MODE === 'e2e') {
      await prisma.mediaContact.deleteMany({
        where: {
          email: {
            endsWith: '@test-csv.com'
          }
        }
      });
      
      await prisma.$disconnect();
    }
    
    // Clean up test files
    try {
      const files = await fs.readdir(testDir);
      for (const file of files) {
        await fs.unlink(path.join(testDir, file));
      }
      await fs.rmdir(testDir);
    } catch (error) {
      console.error('Failed to clean up test files:', error);
    }
  });
  
  runTest('complete import-export cycle', async () => {
    // Skip if not running in e2e mode
    if (process.env.TEST_MODE !== 'e2e') return;
    
    // 1. Create a test CSV file
    const testCsvPath = path.join(testDir, 'test-import.csv');
    const csvContent = `firstName,lastName,email,title,outlet,beats,countries
John,Doe,john.doe@test-csv.com,Reporter,Test News,Technology,USA
Jane,Smith,jane.smith@test-csv.com,Editor,Test Magazine,"Science, Health","Canada, UK"
Alex,Johnson,alex.johnson@test-csv.com,Freelancer,Independent,"Politics, Business",Australia`;
    
    await fs.writeFile(testCsvPath, csvContent, 'utf8');
    
    // 2. Import the CSV file
    const importResult = await importMediaContactsFromCsv({
      filePath: testCsvPath,
      onProgress: (progress) => {
        // Optional: Log progress for debugging
        // console.log('Import progress:', progress);
      }
    });
    
    // 3. Verify import results
    expect(importResult.success).toBe(true);
    expect(importResult.totalRows).toBe(3);
    expect(importResult.validRows).toBe(3);
    expect(importResult.invalidRows).toBe(0);
    
    // 4. Query the database to verify contacts were created
    const contacts = await prisma.mediaContact.findMany({
      where: {
        email: {
          endsWith: '@test-csv.com'
        }
      },
      orderBy: {
        email: 'asc'
      }
    });
    
    // 5. Verify database records
    expect(contacts.length).toBe(3);
    expect(contacts[0].name).toBe('Alex Johnson');
    expect(contacts[1].name).toBe('Jane Smith');
    expect(contacts[2].name).toBe('John Doe');
    
    // 6. Export the contacts to CSV
    const exportResult = await exportMediaContactsToCsv({
      fields: ['firstName', 'lastName', 'email', 'title', 'outlet', 'beats', 'countries'],
      filters: {
        email: {
          endsWith: '@test-csv.com'
        }
      }
    });
    
    // 7. Verify export results
    expect(exportResult.success).toBe(true);
    expect(exportResult.data).toBeTruthy();
    
    // 8. Save the exported CSV to a file
    const exportedCsvPath = path.join(testDir, 'test-export.csv');
    await fs.writeFile(exportedCsvPath, exportResult.data as string, 'utf8');
    
    // 9. Read the exported CSV and verify content
    const exportedContent = await fs.readFile(exportedCsvPath, 'utf8');
    
    // 10. Verify the exported CSV contains all contacts
    expect(exportedContent).toContain('john.doe@test-csv.com');
    expect(exportedContent).toContain('jane.smith@test-csv.com');
    expect(exportedContent).toContain('alex.johnson@test-csv.com');
    
    // Verify headers are present
    expect(exportedContent).toContain('First Name');
    expect(exportedContent).toContain('Last Name');
    expect(exportedContent).toContain('Email');
    expect(exportedContent).toContain('Title');
    expect(exportedContent).toContain('Outlet');
    expect(exportedContent).toContain('Beats');
    expect(exportedContent).toContain('Countries');
  }, 30000); // Increase timeout for this test
  
  runTest('handles validation errors during import', async () => {
    // Skip if not running in e2e mode
    if (process.env.TEST_MODE !== 'e2e') return;
    
    // 1. Create a test CSV file with invalid data
    const testCsvPath = path.join(testDir, 'test-invalid.csv');
    const csvContent = `firstName,lastName,email,title,outlet
John,Doe,john.valid@test-csv.com,Reporter,Test News
Jane,,invalid-email,Editor,Test Magazine
,Johnson,missing.firstname@test-csv.com,Freelancer,Independent`;
    
    await fs.writeFile(testCsvPath, csvContent, 'utf8');
    
    // 2. Import the CSV file
    const importResult = await importMediaContactsFromCsv({
      filePath: testCsvPath,
      onProgress: (progress) => {
        // Optional: Log progress for debugging
        // console.log('Import progress:', progress);
      }
    });
    
    // 3. Verify import results
    expect(importResult.success).toBe(true); // Import process completes even with errors
    expect(importResult.totalRows).toBe(3);
    expect(importResult.validRows).toBe(1); // Only one valid row
    expect(importResult.invalidRows).toBe(2);
    expect(importResult.errors.length).toBe(2);
    
    // 4. Query the database to verify only valid contact was created
    const contacts = await prisma.mediaContact.findMany({
      where: {
        email: 'john.valid@test-csv.com'
      }
    });
    
    expect(contacts.length).toBe(1);
    expect(contacts[0].name).toBe('John Doe');
    
    // 5. Verify the errors contain appropriate messages
    const emailError = importResult.errors.find(e => e.row.email === 'invalid-email');
    const firstNameError = importResult.errors.find(e => e.row.firstName === '');
    
    expect(emailError).toBeTruthy();
    expect(firstNameError).toBeTruthy();
    expect(emailError?.errors.some(e => e.path === 'email')).toBe(true);
    expect(firstNameError?.errors.some(e => e.path === 'firstName')).toBe(true);
  }, 30000); // Increase timeout for this test
});
