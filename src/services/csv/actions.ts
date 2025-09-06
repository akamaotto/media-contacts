"use server";

import {
  createMediaContactWithRelations,
  updateMediaContactWithRelations,
} from './relation-mappers';
import Papa from 'papaparse';
import { promises as fsPromises } from 'fs';
import { prisma } from '@/lib/database/prisma';
import { validateCsvHeaders, validateCsvRow } from './validation';
import { processCsvInBatches, createCsvWithStreams } from './optimizations';
import { generateCsvHeaders, mapMediaContactToCsvRow, ExtendedMediaContact } from './mappers';

export interface ImportProgress {
  percentage: number;
  processed: number;
  total: number;
  currentOperation: 'parsing' | 'validating' | 'importing' | 'completed';
  estimatedTimeRemaining?: number;
}

export interface ImportResult {
  success: boolean;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: Array<{
    row: Record<string, string>;
    errors: Array<{
      path: string;
      message: string;
    }>;
  }>;
  error?: string;
}

export interface ExportResult {
  success: boolean;
  data?: string;
  error?: string;
}

export interface ExportOptions {
  fields: string[];
  filters: Record<string, unknown>;
}

export async function importMediaContactsFromCsv({
  filePath,
  onProgress,
  dryRun = false,
}: {
  filePath: string;
  onProgress?: (progress: ImportProgress) => void;
  dryRun?: boolean;
}): Promise<ImportResult> {
  console.log('🚀 CSV IMPORT STARTED:', { filePath, dryRun });
  try {
    const result: ImportResult = {
      success: true,
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      errors: [],
    };

    // Report parsing start
    if (onProgress) {
      onProgress({
        percentage: 0,
        processed: 0,
        total: 0,
        currentOperation: 'parsing'
      });
    }

    // Validate CSV headers first
    let headerMapping: Map<string, string> | null = null;
    
    // Read and parse the first line to get headers with same delimiter detection
    const firstLineContent = await fsPromises.readFile(filePath, 'utf8');
    const firstLine = firstLineContent.split('\n')[0];
    
    // Use Papa Parse with same delimiter detection settings to parse headers
    const headerParseResult = Papa.parse(firstLine, {
      header: false,
      delimiter: '', // Auto-detect delimiter
      delimitersToGuess: [',', ';', '\t', '|'], // Same as main parser
      transformHeader: (header: string) => {
        // Strip UTF-8 BOM and normalize headers
        return header.replace(/^\uFEFF/, '').trim();
      },
    });
    
    const headers = (headerParseResult.data[0] as string[]).map(header => 
      // Strip UTF-8 BOM and normalize headers
      header.replace(/^\uFEFF/, '').trim()
    );
    
    // Debug: Log the detected headers
    console.log(' CSV Headers Debug:', {
      filePath,
      firstLine,
      detectedDelimiter: headerParseResult.meta?.delimiter,
      detectedHeaders: headers,
      headerCount: headers.length
    });
    
    const headerValidation = validateCsvHeaders(headers);
    
    // Debug: Log header validation results
    console.log(' Header Validation Debug:', {
      success: headerValidation.success,
      missingRequired: headerValidation.missingRequired,
      unmappedHeaders: headerValidation.unmappedHeaders,
      headerMappingEntries: Array.from(headerValidation.headerMapping.entries())
    });
    
    if (!headerValidation.success) {
      result.success = false;
      result.error = `Invalid CSV headers: ${headerValidation.missingRequired.join(', ')}`;
      return result;
    }
    
    headerMapping = headerValidation.headerMapping;
    const validContacts: Record<string, unknown>[] = [];

    // Report validation start
    if (onProgress) {
      onProgress({
        percentage: 0,
        processed: 0,
        total: 0,
        currentOperation: 'validating'
      });
    }

    // Process the CSV file in batches
    await processCsvInBatches(
      filePath,
      async (batch) => {
        // Process each row in the batch
        for (const row of batch) {
          // Skip empty rows (check if all values are empty or just whitespace)
          const rowValues = Object.values(row as Record<string, unknown>);
          const hasContent = rowValues.some(value => 
            value && typeof value === 'string' && value.trim().length > 0
          );
          
          if (!hasContent) {
            continue; // Skip this empty row
          }
          
          result.totalRows++;
          
          // Map CSV column names to expected field names
          const mappedRow: Record<string, string> = {};
          for (const [csvHeader, fieldName] of headerMapping!.entries()) {
            const value = (row as Record<string, string>)[csvHeader];
            mappedRow[fieldName] = value || ''; // Ensure we don't have undefined values
          }
          
          // Backward compatibility: Combine firstName + lastName into name if needed
          if (mappedRow.firstName || mappedRow.lastName) {
            const firstName = mappedRow.firstName || '';
            const lastName = mappedRow.lastName || '';
            mappedRow.name = `${firstName} ${lastName}`.trim();
            // Remove the separate firstName/lastName fields as they're not in the schema
            delete mappedRow.firstName;
            delete mappedRow.lastName;
          }
          
          // Debug: Log the mapping for the first few rows
          if (result.totalRows <= 3) {
            console.log('🔍 Row mapping debug:', {
              originalRow: row,
              mappedRow,
              headerMapping: Array.from(headerMapping!.entries())
            });
          }
          
          // Validate the row
          const validation = validateCsvRow(mappedRow);
          
          if (validation.success && validation.data) {
            // Process contact with relations immediately (no batching for relations)
            if (!dryRun) {
              try {
                // Use singleton prisma instance
                
                // Check if contact already exists
                const existingContact = await prisma.media_contacts.findUnique({
                  where: { email: validation.data.email }
                });
                
                let contactResult;
                if (existingContact) {
                  // Update existing contact with relations (selective update)
                  contactResult = await updateMediaContactWithRelations(
                    existingContact.id,
                    validation.data
                  );
                } else {
                  // Create new contact with relations
                  contactResult = await createMediaContactWithRelations(
                    validation.data
                  );
                }
                
                // Singleton pattern - no need to disconnect
                result.validRows++;
                
                // Add any warnings about rejected countries to the result
                if (contactResult.warnings.length > 0) {
                  result.errors.push({
                    row: mappedRow,
                    errors: contactResult.warnings.map(warning => ({
                      path: 'countries',
                      message: warning,
                    })),
                  });
                }
              } catch (contactError) {
                // If contact creation fails, add to errors with detailed context
                result.invalidRows++;
                result.errors.push({
                  row: mappedRow,
                  errors: [{
                    path: 'contact',
                    message: contactError instanceof Error ? contactError.message : 'Failed to create contact',
                  }],
                });
              }
            } else {
              // Dry run - just count valid contacts
              validContacts.push(validation.data);
              result.validRows++;
            }
          } else {
            // Add validation errors with detailed context
            result.invalidRows++;
            result.errors.push({
              row: mappedRow,
              errors: validation.errors.map((err) => ({
                path: err.path || '',
                message: err.message || 'Invalid value',
              })),
            });
          }
        }
      },
      (progress) => {
        // Report importing progress
        if (onProgress) {
          onProgress({
            percentage: progress.percentage,
            processed: progress.processed,
            total: progress.total,
            currentOperation: 'importing'
          });
        }
      }
    );
    
    // Report completion
    if (onProgress) {
      onProgress({
        percentage: 100,
        processed: result.totalRows,
        total: result.totalRows,
        currentOperation: 'completed'
      });
    }
    
    // Clean up the temporary file
    if (!dryRun) {
      await fsPromises.unlink(filePath);
    }
    
    return result;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      errors: [],
      error: `Failed to import contacts: ${errorMessage}`,
    };
  }
}

export async function exportMediaContactsToCsv(options: ExportOptions): Promise<ExportResult> {
  try {
    const { fields, filters } = options;
    // Use singleton prisma instance
    
    // Generate CSV headers
    const headers = generateCsvHeaders(fields);
    
    // Use streaming approach for large datasets
    const csv = await createCsvWithStreams(
      headers,
      async (batchSize: number, offset: number) => {
        // Get contacts in batches
        const contacts = await prisma.media_contacts.findMany({
          where: filters,
          skip: offset,
          take: batchSize,
          orderBy: { id: 'asc' }
        });
        
        // Map contacts to CSV rows
        return contacts.map((contact) => mapMediaContactToCsvRow(contact as unknown as ExtendedMediaContact, fields));
      }
    );
    
    // Singleton pattern - no need to disconnect
    
    return {
      success: true,
      data: csv,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Failed to export contacts: ${errorMessage}`,
    };
  }
}
