/**
 * CSV Import/Export Performance Optimizations
 * 
 * This module provides optimized functions and utilities for handling large CSV datasets
 * with improved memory efficiency and processing speed.
 */

import { Readable } from 'stream';
import Papa from 'papaparse';
import { CsvContactData } from './validation';
import { PrismaClient } from '@prisma/client';

/**
 * Configuration for batch processing
 */
export const BATCH_CONFIG = {
  // Number of rows to process in each batch during import
  IMPORT_BATCH_SIZE: 100,
  
  // Number of rows to process in each batch during export
  EXPORT_BATCH_SIZE: 500,
  
  // Maximum number of concurrent batch operations
  MAX_CONCURRENT_BATCHES: 3
};

/**
 * Processes a CSV file in batches to optimize memory usage
 * @param filePath Path to the CSV file
 * @param processBatch Function to process each batch of rows
 * @param onProgress Optional callback for progress updates
 */
export async function processCsvInBatches(
  filePath: string,
  processBatch: (batch: CsvContactData[]) => Promise<void>,
  onProgress?: (progress: { processed: number; total: number; percentage: number }) => void
): Promise<{ processed: number; total: number }> {
  return new Promise((resolve, reject) => {
    let currentBatch: CsvContactData[] = [];
    let processedCount = 0;
    let totalCount = 0;
    let batchPromises: Promise<void>[] = [];
    let isFirstChunk = true;
    
    // Create a readable stream for the CSV file
    const fileStream = new Readable({
      read() {} // Implementation required but not used
    });
    
    // Process the CSV stream
    Papa.parse(fileStream, {
      header: true,
      dynamicTyping: false, // Keep everything as strings for validation
      skipEmptyLines: true,
      delimiter: '', // Auto-detect delimiter (supports comma, semicolon, tab, etc.)
      delimitersToGuess: [',', ';', '\t', '|'], // Try these delimiters in order
      transformHeader: (header: string) => {
        // Strip UTF-8 BOM and normalize headers
        return header.replace(/^\uFEFF/, '').trim();
      },
      
      // Process each chunk as it's parsed
      chunk: async (results, parser) => {
        // Pause parsing while we process this chunk
        parser.pause();
        
        // Count total rows on first chunk if possible
        if (isFirstChunk) {
          // This is an estimate based on file size and first chunk
          // It will be updated as we process more chunks
          const chunkSize = results.data.length;
          if (chunkSize > 0) {
            totalCount = chunkSize * 100; // Rough estimate
          }
          isFirstChunk = false;
        }
        
        // Add rows to current batch
        currentBatch.push(...results.data as CsvContactData[]);
        
        // Process batch if it reaches the batch size
        if (currentBatch.length >= BATCH_CONFIG.IMPORT_BATCH_SIZE) {
          const batchToProcess = [...currentBatch];
          currentBatch = [];
          
          // Process the batch
          const batchPromise = processBatch(batchToProcess)
            .then(() => {
              processedCount += batchToProcess.length;
              
              // Report progress
              if (onProgress) {
                onProgress({
                  processed: processedCount,
                  total: Math.max(totalCount, processedCount), // Update total if our estimate was low
                  percentage: (processedCount / Math.max(totalCount, processedCount)) * 100
                });
              }
              
              // Remove this promise from the tracking array
              const index = batchPromises.indexOf(batchPromise);
              if (index !== -1) {
                batchPromises.splice(index, 1);
              }
            });
          
          batchPromises.push(batchPromise);
          
          // Wait if we have too many concurrent batches
          if (batchPromises.length >= BATCH_CONFIG.MAX_CONCURRENT_BATCHES) {
            await Promise.race(batchPromises);
          }
        }
        
        // Resume parsing
        parser.resume();
      },
      
      // Handle completion
      complete: async () => {
        try {
          // Process any remaining rows in the last batch
          if (currentBatch.length > 0) {
            await processBatch(currentBatch);
            processedCount += currentBatch.length;
          }
          
          // Wait for all batch promises to complete
          await Promise.all(batchPromises);
          
          // Final progress update
          if (onProgress) {
            onProgress({
              processed: processedCount,
              total: processedCount,
              percentage: 100
            });
          }
          
          resolve({ processed: processedCount, total: processedCount });
        } catch (error) {
          reject(error);
        }
      },
      
      // Handle errors
      error: (error) => {
        reject(error);
      }
    });
    
    // Read the file in chunks and pipe to Papa Parse
    const fs = require('fs');
    const readStream = fs.createReadStream(filePath, { encoding: 'utf8' });
    
    readStream.on('data', (chunk: string) => {
      fileStream.push(chunk);
    });
    
    readStream.on('end', () => {
      fileStream.push(null); // Signal the end of the file
    });
    
    readStream.on('error', (error: Error) => {
      reject(error);
    });
  });
}

/**
 * Optimized database insertion for CSV data using batched transactions
 * @param prisma PrismaClient instance
 * @param contacts Array of contacts to insert
 */
export async function batchInsertContacts(
  prisma: PrismaClient,
  contacts: Array<Omit<CsvContactData, "id" | "created_at" | "updated_at">>
): Promise<number> {
  // Split contacts into batches for efficient insertion
  const batches: Array<Array<any>> = [];
  for (let i = 0; i < contacts.length; i += BATCH_CONFIG.IMPORT_BATCH_SIZE) {
    batches.push(contacts.slice(i, i + BATCH_CONFIG.IMPORT_BATCH_SIZE));
  }
  
  // Process batches with limited concurrency
  let insertedCount = 0;
  let currentBatchIndex = 0;
  
  // Process batches with controlled concurrency
  while (currentBatchIndex < batches.length) {
    const batchPromises: Promise<any>[] = [];
    
    // Start up to MAX_CONCURRENT_BATCHES batches
    for (let i = 0; i < BATCH_CONFIG.MAX_CONCURRENT_BATCHES && currentBatchIndex < batches.length; i++) {
      const batch = batches[currentBatchIndex++];
      
      // Use a transaction for each batch
      const batchPromise = prisma.$transaction(async (tx) => {
        const result = await tx.mediaContact.createMany({
          data: batch,
          skipDuplicates: true // Skip records that would cause unique constraint violations
        });
        
        return result.count;
      });
      
      batchPromises.push(batchPromise);
    }
    
    // Wait for all current batch promises to complete
    const results = await Promise.all(batchPromises);
    insertedCount += results.reduce((sum, count) => sum + count, 0);
  }
  
  return insertedCount;
}

/**
 * Optimized database query for exporting contacts with pagination
 * @param prisma PrismaClient instance
 * @param filters Query filters
 * @param processPage Function to process each page of results
 */
export async function queryContactsInPages(
  prisma: PrismaClient,
  filters: Record<string, any>,
  processPage: (contacts: any[]) => Promise<void>
): Promise<number> {
  let totalProcessed = 0;
  let hasMoreRecords = true;
  let lastId: string | null = null;
  
  // Query in pages using cursor-based pagination for efficiency
  while (hasMoreRecords) {
    const cursorCondition: Record<string, any> = lastId ? { id: { gt: lastId } } : {};
    
    const contacts: any[] = await prisma.mediaContact.findMany({
      where: {
        ...filters,
        ...cursorCondition
      },
      orderBy: {
        id: 'asc'
      },
      take: BATCH_CONFIG.EXPORT_BATCH_SIZE
    });
    
    if (contacts.length === 0) {
      hasMoreRecords = false;
      break;
    }
    
    // Process this page of results
    await processPage(contacts);
    
    // Update cursor for next page
    lastId = contacts[contacts.length - 1].id;
    totalProcessed += contacts.length;
    
    // Check if we've reached the end
    if (contacts.length < BATCH_CONFIG.EXPORT_BATCH_SIZE) {
      hasMoreRecords = false;
    }
  }
  
  return totalProcessed;
}

/**
 * Creates a memory-efficient CSV string from data using streams
 * @param headers CSV headers
 * @param getRows Function that yields rows in batches
 * @returns Promise resolving to the CSV string
 */
export async function createCsvWithStreams(
  headers: string[],
  getRows: (batchSize: number, offset: number) => Promise<Record<string, string>[]>
): Promise<string> {
  // Create a string accumulator for the CSV content
  let csvContent = '';
  
  // Add headers
  csvContent += Papa.unparse([headers]) + '\n';
  
  // Process rows in batches
  let offset = 0;
  let hasMoreRows = true;
  
  while (hasMoreRows) {
    const rows = await getRows(BATCH_CONFIG.EXPORT_BATCH_SIZE, offset);
    
    if (rows.length === 0) {
      hasMoreRows = false;
      break;
    }
    
    // Convert batch to CSV and append
    csvContent += Papa.unparse(rows, { header: false }) + (hasMoreRows ? '\n' : '');
    
    // Update offset for next batch
    offset += rows.length;
    
    // Check if we've reached the end
    if (rows.length < BATCH_CONFIG.EXPORT_BATCH_SIZE) {
      hasMoreRows = false;
    }
  }
  
  return csvContent;
}

/**
 * Web Worker compatible function for CSV parsing
 * Can be used with browser Web Workers for client-side performance
 */
export function parseCSVInWorker(csvText: string, options: Papa.ParseConfig): Papa.ParseResult<any> {
  return Papa.parse(csvText, options);
}
