/**
 * CSV Import/Export Performance Benchmarking Utility
 * 
 * This utility helps benchmark the performance of CSV import/export operations
 * with various dataset sizes to identify bottlenecks and optimize performance.
 * 
 * Usage:
 * - Run with `node -r ts-node/register __tests__/backend/csv/benchmark.ts`
 * - Set environment variables to control behavior:
 *   - CSV_BENCHMARK_SIZE=small|medium|large (default: small)
 *   - CSV_BENCHMARK_MODE=import|export|both (default: both)
 */

import fs from 'fs/promises';
import path from 'path';
import { performance } from 'perf_hooks';
import { importMediaContactsFromCsv, exportMediaContactsToCsv } from '@/backend/csv/actions';

// Configuration
const SIZES = {
  small: 100,
  medium: 1000,
  large: 10000
};

const benchmarkSize = (process.env.CSV_BENCHMARK_SIZE || 'small') as keyof typeof SIZES;
const benchmarkMode = process.env.CSV_BENCHMARK_MODE || 'both';
const rowCount = SIZES[benchmarkSize];
const testDir = path.join(process.cwd(), 'tmp', 'benchmark-csv');

/**
 * Generate a sample CSV file with specified number of rows
 */
async function generateSampleCsv(rowCount: number): Promise<string> {
  console.log(`Generating sample CSV with ${rowCount} rows...`);
  
  // Create headers
  const headers = 'firstName,lastName,email,title,outlet,beats,countries,regions,languages,twitterHandle,instagramHandle,linkedinUrl,bio,notes,authorLinks';
  
  // Create rows
  const rows: string[] = [];
  for (let i = 0; i < rowCount; i++) {
    rows.push(
      `FirstName${i},LastName${i},email${i}@example.com,Title${i},Outlet${i},` +
      `"Beat1${i}, Beat2${i}","Country1${i}, Country2${i}","Region${i}","Language${i}",` +
      `@twitter${i},@insta${i},https://linkedin.com/in/user${i},` +
      `"Bio for contact ${i}","Notes for contact ${i}","https://example.com/author/${i}"`
    );
  }
  
  // Combine headers and rows
  const csvContent = [headers, ...rows].join('\n');
  
  // Create directory if it doesn't exist
  await fs.mkdir(testDir, { recursive: true });
  
  // Write to file
  const filePath = path.join(testDir, `sample-${rowCount}.csv`);
  await fs.writeFile(filePath, csvContent, 'utf8');
  
  console.log(`Sample CSV generated at ${filePath}`);
  return filePath;
}

/**
 * Benchmark CSV import
 */
async function benchmarkImport(filePath: string): Promise<void> {
  console.log('\n=== CSV Import Benchmark ===');
  console.log(`File: ${filePath}`);
  
  const startTime = performance.now();
  let lastProgress = 0;
  
  const result = await importMediaContactsFromCsv({
    filePath,
    onProgress: (progress) => {
      // Only log every 10% to reduce console spam
      if (progress.percentage >= lastProgress + 10 || progress.percentage === 100) {
        console.log(`Progress: ${progress.percentage.toFixed(1)}% - Processed ${progress.processed} of ${progress.total} rows`);
        lastProgress = Math.floor(progress.percentage / 10) * 10;
      }
    },
    // Set dryRun to true to prevent actual database insertion
    dryRun: true
  });
  
  const endTime = performance.now();
  const duration = (endTime - startTime) / 1000;
  
  console.log('\nImport Results:');
  console.log(`- Duration: ${duration.toFixed(2)} seconds`);
  console.log(`- Rows per second: ${(rowCount / duration).toFixed(2)}`);
  console.log(`- Total rows: ${result.totalRows}`);
  console.log(`- Valid rows: ${result.validRows}`);
  console.log(`- Invalid rows: ${result.invalidRows}`);
  console.log(`- Memory usage: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`);
}

/**
 * Benchmark CSV export
 */
async function benchmarkExport(): Promise<void> {
  console.log('\n=== CSV Export Benchmark ===');
  
  // Generate mock data for export
  const mockContacts = Array.from({ length: rowCount }, (_, i) => ({
    id: `${i}`,
    name: `FirstName${i} LastName${i}`,
    email: `email${i}@example.com`,
    title: `Title${i}`,
    bio: `Bio for contact ${i}`,
    email_verified_status: true,
    created_at: new Date(),
    updated_at: new Date(),
    socials: [`@twitter${i}`, `@insta${i}`, `https://linkedin.com/in/user${i}`],
    authorLinks: [`https://example.com/author/${i}`],
    firstName: `FirstName${i}`,
    lastName: `LastName${i}`,
    outlet: `Outlet${i}`,
    beats: [`Beat1${i}`, `Beat2${i}`],
    countries: [`Country1${i}`, `Country2${i}`],
    regions: [`Region${i}`],
    languages: [`Language${i}`],
    twitterHandle: `@twitter${i}`,
    instagramHandle: `@insta${i}`,
    linkedinUrl: `https://linkedin.com/in/user${i}`,
    notes: `Notes for contact ${i}`
  }));
  
  // Mock the database query
  jest.mock('@/backend/csv/repository', () => ({
    findMediaContacts: jest.fn().mockResolvedValue(mockContacts)
  }));
  
  const startTime = performance.now();
  
  const result = await exportMediaContactsToCsv({
    fields: ['firstName', 'lastName', 'email', 'title', 'outlet', 'beats', 'countries', 
             'regions', 'languages', 'twitterHandle', 'instagramHandle', 'linkedinUrl', 
             'bio', 'notes', 'authorLinks'],
    filters: {}
  });
  
  const endTime = performance.now();
  const duration = (endTime - startTime) / 1000;
  
  console.log('\nExport Results:');
  console.log(`- Duration: ${duration.toFixed(2)} seconds`);
  console.log(`- Rows per second: ${(rowCount / duration).toFixed(2)}`);
  console.log(`- CSV size: ${result.data ? (result.data.length / 1024 / 1024).toFixed(2) : 0} MB`);
  console.log(`- Memory usage: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`);
  
  // Save the exported CSV
  if (result.success && result.data) {
    const exportPath = path.join(testDir, `export-${rowCount}.csv`);
    await fs.writeFile(exportPath, result.data, 'utf8');
    console.log(`Exported CSV saved to ${exportPath}`);
  }
}

/**
 * Run the benchmark
 */
async function runBenchmark() {
  try {
    console.log(`Running CSV ${benchmarkMode} benchmark with ${rowCount} rows (${benchmarkSize} dataset)`);
    
    // Generate sample CSV for import benchmark
    let filePath = '';
    if (benchmarkMode === 'import' || benchmarkMode === 'both') {
      filePath = await generateSampleCsv(rowCount);
    }
    
    // Run import benchmark
    if (benchmarkMode === 'import' || benchmarkMode === 'both') {
      await benchmarkImport(filePath);
    }
    
    // Run export benchmark
    if (benchmarkMode === 'export' || benchmarkMode === 'both') {
      await benchmarkExport();
    }
    
    console.log('\nBenchmark completed successfully!');
  } catch (error) {
    console.error('Benchmark failed:', error);
  }
}

// Run the benchmark
runBenchmark();
