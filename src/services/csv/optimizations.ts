/**
 * CSV Import/Export Performance Optimizations
 * 
 * This module provides optimized functions and utilities for handling large CSV datasets
 * with improved memory efficiency and processing speed.
 */

import { Readable } from 'stream';
import { createReadStream } from 'fs';
import Papa from 'papaparse';
import { CsvContactData } from './validation';
import { prisma } from '@/lib/database/prisma';
import { randomUUID } from 'crypto';

/**
 * Configuration for batch processing
 */
export const BATCH_CONFIG = {
  // Number of rows to process in each batch during import
  IMPORT_BATCH_SIZE: 100,
  
  // Number of rows to process in each batch during export
  EXPORT_BATCH_SIZE: 500,
  
  // Maximum number of concurrent batch operations
  MAX_CONCURRENT_BATCHES: 3,
  
  // Delay between batch processing to prevent resource exhaustion (in ms)
  BATCH_PROCESSING_DELAY: 10
};

/**
 * Processes a CSV file in batches to optimize memory usage with improved concurrency control
 * @param filePath Path to the CSV file
 * @param processBatch Function to process each batch of rows
 * @param onProgress Optional callback for progress updates
 */
export async function processCsvInBatches(
  filePath: string,
  processBatch: (batch: Record<string, string>[]) => Promise<void>,
  onProgress?: (progress: { processed: number; total: number; percentage: number }) => void
): Promise<{ processed: number; total: number }> {
  return new Promise((resolve, reject) => {
    let currentBatch: Record<string, string>[] = [];
    let processedCount = 0;
    let totalCount = 0;
    const batchPromises: Promise<void>[] = [];
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
        
        // Add rows to current batch (raw CSV rows are strings)
        currentBatch.push(...(results.data as unknown as Record<string, string>[]));
        
        // Process batch if it reaches the batch size
        if (currentBatch.length >= BATCH_CONFIG.IMPORT_BATCH_SIZE) {
          const batchToProcess = [...currentBatch];
          currentBatch = [];
          
          // Process the batch with controlled concurrency
          const batchPromise = processBatch(batchToProcess)
            .then(async () => {
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
              
              // Small delay to prevent resource exhaustion
              if (BATCH_CONFIG.BATCH_PROCESSING_DELAY > 0) {
                await new Promise(resolve => setTimeout(resolve, BATCH_CONFIG.BATCH_PROCESSING_DELAY));
              }
            })
            .catch(error => {
              // Remove this promise from the tracking array on error
              const index = batchPromises.indexOf(batchPromise);
              if (index !== -1) {
                batchPromises.splice(index, 1);
              }
              throw error;
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
    const readStream = createReadStream(filePath, { encoding: 'utf8' });
    
    readStream.on('data', (chunk: string | Buffer) => {
      fileStream.push(typeof chunk === 'string' ? chunk : chunk.toString('utf8'));
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
 * Optimized database insertion for CSV data using batched transactions with improved performance
 * @param contacts Array of contacts to insert
 */
export async function batchInsertContacts(
  contacts: Array<Omit<CsvContactData, "id" | "created_at" | "updated_at">>
): Promise<number> {
  // Split contacts into batches for efficient insertion
  const batches: Array<Array<Record<string, unknown>>> = [];
  for (let i = 0; i < contacts.length; i += BATCH_CONFIG.IMPORT_BATCH_SIZE) {
    batches.push(contacts.slice(i, i + BATCH_CONFIG.IMPORT_BATCH_SIZE));
  }
  
  // Process batches with limited concurrency
  let insertedCount = 0;
  let currentBatchIndex = 0;
  
  // Process batches with controlled concurrency
  while (currentBatchIndex < batches.length) {
    const batchPromises: Promise<number>[] = [];
    
    // Start up to MAX_CONCURRENT_BATCHES batches
    const concurrentLimit = Math.min(
      BATCH_CONFIG.MAX_CONCURRENT_BATCHES, 
      batches.length - currentBatchIndex
    );
    
    for (let i = 0; i < concurrentLimit; i++) {
      const batch = batches[currentBatchIndex++];
      
      // Use a transaction for each batch
      const batchPromise = prisma.$transaction(async (tx) => {
        // For better performance, use createMany when possible (for new contacts only)
        // For updates or mixed scenarios, use individual operations
        
        // Separate new contacts from existing ones
        const newContacts: any[] = [];
        let updatedCount = 0;
        
        for (const contact of batch) {
          // Check if contact already exists
          const existing = await tx.media_contacts.findUnique({
            where: { email: contact.email as string },
          });
          
          if (existing) {
            // Update existing contact with selective field updates
            const updateData: any = {
              updated_at: new Date(),
            };
            
            // Only add fields that exist in the CSV data
            if (contact.name !== undefined) updateData.name = contact.name;
            if (contact.title !== undefined) updateData.title = contact.title || '';
            if (contact.bio !== undefined) updateData.bio = contact.bio || null;
            
            await tx.media_contacts.update({
              where: { id: existing.id },
              data: updateData,
            });
            updatedCount++;
          } else {
            // Add to new contacts for bulk creation
            const createData: any = {
              id: randomUUID(), 
              updated_at: new Date(),
              email_verified_status: false, // Always set to false for new imports
            };
            
            // Only add fields that exist in the CSV data
            if (contact.name !== undefined) createData.name = contact.name;
            if (contact.email !== undefined) createData.email = contact.email;
            if (contact.title !== undefined) createData.title = contact.title || '';
            if (contact.bio !== undefined) createData.bio = contact.bio || null;

            // Handle socials array
            const socials: string[] = [];
            if (contact.twitterHandle) socials.push(contact.twitterHandle as string);
            if (contact.instagramHandle) socials.push(contact.instagramHandle as string);
            if (contact.linkedinUrl) socials.push(contact.linkedinUrl as string);
            if (socials.length > 0) createData.socials = socials;

            // Handle author links
            if (contact.authorLinks !== undefined) createData.authorLinks = contact.authorLinks || [];
            
            newContacts.push(createData);
          }
        }
        
        // Bulk create new contacts
        let createdCount = 0;
        if (newContacts.length > 0) {
          const result = await tx.media_contacts.createMany({
            data: newContacts,
            skipDuplicates: true // Skip records that would cause unique constraint violations
          });
          createdCount = result.count;
        }
        
        return createdCount + updatedCount;
      });
      
      batchPromises.push(batchPromise);
    }
    
    // Wait for all current batch promises to complete
    const results = (await Promise.all(batchPromises)) as number[];
    insertedCount += results.reduce((sum: number, count: number) => sum + count, 0);
    
    // Small delay between batch processing to prevent resource exhaustion
    if (BATCH_CONFIG.BATCH_PROCESSING_DELAY > 0 && currentBatchIndex < batches.length) {
      await new Promise(resolve => setTimeout(resolve, BATCH_CONFIG.BATCH_PROCESSING_DELAY));
    }
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
  filters: Record<string, unknown>,
  processPage: (contacts: Record<string, unknown>[]) => Promise<void>
): Promise<number> {
  let totalProcessed = 0;
  let hasMoreRecords = true;
  let lastId: string | null = null;
  
  // Query in pages using cursor-based pagination for efficiency
  while (hasMoreRecords) {
    const cursorCondition: Record<string, unknown> = lastId ? { id: { gt: lastId } } : {};
    
    const contacts: Record<string, unknown>[] = await prisma.media_contacts.findMany({
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
    lastId = String(contacts[contacts.length - 1].id);
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
export function parseCSVInWorker(csvText: string, options: Papa.ParseConfig): Papa.ParseResult<Record<string, unknown>> {
  return Papa.parse(csvText, options);
}
