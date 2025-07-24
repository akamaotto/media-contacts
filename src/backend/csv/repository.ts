import { parse } from "papaparse";
import { stringify } from "csv-stringify/sync";
import { prisma } from "@/lib/prisma";
import { validateCsvRow, validateCsvHeaders, CsvContactData } from "./validation";
import { mapCsvRowToMediaContact, mapMediaContactToCsvRow, generateCsvHeaders } from "./mappers";
import { PrismaClient } from "@prisma/client";

// Constants for processing
const BATCH_SIZE = 100;

/**
 * Process a CSV file for import
 * @param fileContent CSV file content as string
 * @param userId ID of the user performing the import
 * @returns Result object with success status, counts, and any errors
 */
export async function processImport(fileContent: string, userId: string) {
  try {
    // Parse CSV content
    const { data, errors: parseErrors } = parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    }) as { data: Record<string, string>[]; errors: any[] };

    if (parseErrors.length > 0) {
      return {
        success: false,
        importedCount: 0,
        totalRows: 0,
        errorRows: 0,
        errors: parseErrors.map(err => ({
          row: err.row,
          message: `CSV parsing error: ${err.message}`
        }))
      };
    }

    if (data.length === 0) {
      return {
        success: false,
        importedCount: 0,
        totalRows: 0,
        errorRows: 0,
        errors: [{ message: "CSV file is empty or contains no valid data" }]
      };
    }

    // Validate headers
    const headers = data.length > 0 ? Object.keys(data[0]) : [];
    const headerValidation = validateCsvHeaders(headers);

    if (!headerValidation.success) {
      return {
        success: false,
        importedCount: 0,
        totalRows: data.length,
        errorRows: data.length,
        errors: [{ 
          message: `Missing required columns: ${headerValidation.missingRequired.join(", ")}` 
        }]
      };
    }

    // Process rows in batches
    const validContacts: CsvContactData[] = [];
    const errors: { row: number; message: string }[] = [];

    // Validate all rows first
    data.forEach((row, index) => {
      // Apply header mapping
      const mappedRow: Record<string, string> = {};
      Object.entries(row).forEach(([key, value]) => {
        const mappedKey = headerValidation.headerMapping.get(key);
        if (mappedKey) {
          mappedRow[mappedKey] = typeof value === 'string' ? value : '';
        }
      });

      // Validate the mapped row
      const validation = validateCsvRow(mappedRow);
      
      if (validation.success && validation.data) {
        validContacts.push(validation.data);
      } else {
        validation.errors.forEach((err: { path: string; message: string }) => {
          errors.push({
            row: index + 2, // +2 because index is 0-based and we have a header row
            message: `${err.path}: ${err.message}`
          });
        });
      }
    });

    // If there are no valid contacts, return early
    if (validContacts.length === 0) {
      return {
        success: false,
        importedCount: 0,
        totalRows: data.length,
        errorRows: data.length,
        errors: errors.length > 0 ? errors : [{ message: "No valid contacts found in CSV" }]
      };
    }

    // Insert valid contacts in batches
    let importedCount = 0;
    
    for (let i = 0; i < validContacts.length; i += BATCH_SIZE) {
      const batch = validContacts.slice(i, i + BATCH_SIZE);
      const contactsToCreate = batch.map(contact => mapCsvRowToMediaContact(contact));
      
      // Use a transaction for each batch
      await prisma.$transaction(async (tx) => {
        for (const contact of contactsToCreate) {
          // Check for duplicate email
          const existing = await tx.mediaContact.findUnique({
            where: { email: contact.email },
          });
          
          if (existing) {
            // Update existing contact
            await tx.mediaContact.update({
              where: { id: existing.id },
              data: contact,
            });
          } else {
            // Create new contact
            await tx.mediaContact.create({
              data: contact,
            });
          }
          
          importedCount++;
        }
      });
    }

    return {
      success: true,
      importedCount,
      totalRows: data.length,
      errorRows: errors.length,
      errors: errors.length > 0 ? errors : []
    };
  } catch (error) {
    console.error("Error processing CSV import:", error);
    return {
      success: false,
      importedCount: 0,
      totalRows: 0,
      errorRows: 0,
      errors: [{ message: error instanceof Error ? error.message : "Unknown error occurred" }]
    };
  }
}

/**
 * Process an export request to generate CSV data
 * @param fields Array of field names to include in the export
 * @param filters Optional filters to apply to the query
 * @returns Result object with CSV content and counts
 */
export async function processExport(fields: string[], filters?: Record<string, any>) {
  try {
    // Build query based on filters
    const where = buildWhereClause(filters);
    
    // Query contacts from database
    const contacts = await prisma.mediaContact.findMany({
      where,
      orderBy: { name: 'asc' }, // Using name instead of lastName to match Prisma schema
    });

    if (contacts.length === 0) {
      return {
        success: true,
        csvContent: "",
        exportedCount: 0
      };
    }

    // Generate CSV headers
    const headers = generateCsvHeaders(fields);
    
    // Map contacts to CSV rows
    const rows = contacts.map(contact => mapMediaContactToCsvRow(contact, fields));
    
    // Generate CSV content
    const csvContent = stringify([headers, ...rows.map(row => fields.map(field => row[field]))]);
    
    return {
      success: true,
      csvContent,
      exportedCount: contacts.length
    };
  } catch (error) {
    console.error("Error processing CSV export:", error);
    throw error;
  }
}

/**
 * Build a Prisma where clause from filter parameters
 * @param filters Optional filters to apply
 * @returns Prisma where clause object
 */
export function buildWhereClause(filters?: Record<string, any>) {
  if (!filters) return {};
  
  const where: Record<string, any> = {};
  
  // Process text search
  if (filters.search) {
    where.OR = [
      { firstName: { contains: filters.search, mode: 'insensitive' } },
      { lastName: { contains: filters.search, mode: 'insensitive' } },
      { email: { contains: filters.search, mode: 'insensitive' } },
      { title: { contains: filters.search, mode: 'insensitive' } },
      { outlet: { contains: filters.search, mode: 'insensitive' } },
    ];
  }
  
  // Process array filters
  ['beats', 'countries', 'regions', 'languages'].forEach(field => {
    if (filters[field] && Array.isArray(filters[field]) && filters[field].length > 0) {
      where[field] = { hasSome: filters[field] };
    }
  });
  
  return where;
}

/**
 * Create one or more media contacts in the database
 * @param contacts Array of media contact data to create
 * @returns Number of contacts created
 */
export async function createMediaContact(contacts: Array<any>): Promise<number> {
  try {
    // Use transaction for data consistency
    const result = await prisma.$transaction(async (tx) => {
      let createdCount = 0;
      
      for (const contact of contacts) {
        // Check for duplicate email
        const existing = await tx.mediaContact.findUnique({
          where: { email: contact.email },
        });
        
        if (existing) {
          // Update existing contact
          await tx.mediaContact.update({
            where: { id: existing.id },
            data: contact,
          });
        } else {
          // Create new contact
          await tx.mediaContact.create({
            data: contact,
          });
        }
        
        createdCount++;
      }
      
      return createdCount;
    });
    
    return result;
  } catch (error) {
    console.error("Error creating media contacts:", error);
    throw error;
  }
}

/**
 * Find media contacts based on filters
 * @param filters Optional filters to apply to the query
 * @returns Array of media contacts
 */
export async function findMediaContacts(filters?: Record<string, any>): Promise<any[]> {
  try {
    // Build query based on filters
    const where = buildWhereClause(filters);
    
    // Query contacts from database
    const contacts = await prisma.mediaContact.findMany({
      where,
      orderBy: { name: 'asc' },
    });
    
    return contacts;
  } catch (error) {
    console.error("Error finding media contacts:", error);
    throw error;
  }
}
