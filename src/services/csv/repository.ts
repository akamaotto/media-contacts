import { parse } from "papaparse";
import { stringify } from "csv-stringify/sync";
import { prisma } from "@/lib/database/prisma";
import { validateCsvRow, validateCsvHeaders, CsvContactData } from "./validation";
import { mapCsvRowToMediaContact, mapMediaContactToCsvRow, generateCsvHeaders } from "./mappers";
import { randomUUID } from 'crypto';


// Constants for processing
const BATCH_SIZE = 100;

/**
 * Process a CSV file for import with enhanced error reporting
 * @param fileContent CSV file content as string
 * @param userId ID of the user performing the import
 * @returns Result object with success status, counts, and any errors
 */
export async function processImport(fileContent: string) {
  try {
    // Parse CSV content
    const { data, errors: parseErrors } = parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    }) as { data: Record<string, string>[]; errors: { row: number; message: string }[] };

    if (parseErrors.length > 0) {
      return {
        success: false,
        importedCount: 0,
        totalRows: 0,
        errorRows: 0,
        errors: parseErrors.map((err) => ({
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
    const validContacts: { data: CsvContactData; rowIndex: number }[] = [];
    const errors: { row: number; field?: string; value?: string; message: string }[] = [];

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
        validContacts.push({ data: validation.data, rowIndex: index });
      } else {
        validation.errors.forEach((err: { path: string; message: string }) => {
          errors.push({
            row: index + 2, // +2 because index is 0-based and we have a header row
            field: err.path,
            value: mappedRow[err.path],
            message: err.message
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

    // Insert valid contacts in batches using createMany for better performance
    let importedCount = 0;
    
    for (let i = 0; i < validContacts.length; i += BATCH_SIZE) {
      const batch = validContacts.slice(i, i + BATCH_SIZE);
      
      // Use transaction for data consistency
      await prisma.$transaction(async (tx) => {
        // Process each contact in the batch
        for (const { data: contactData, rowIndex } of batch) {
          try {
            // Check for duplicate email
            const existing = await tx.media_contacts.findUnique({
              where: { email: contactData.email },
            });
            
            if (existing) {
              // For updates, only update fields present in CSV (selective update)
              const updateData: any = {
                updated_at: new Date(),
              };
              
              // Only add fields that exist in the CSV data
              if (contactData.name !== undefined) updateData.name = contactData.name;
              if (contactData.title !== undefined) updateData.title = contactData.title || '';
              if (contactData.bio !== undefined) updateData.bio = contactData.bio || null;
              
              // Update existing contact
              await tx.media_contacts.update({
                where: { id: existing.id },
                data: updateData,
              });
            } else {
              // Create new contact with only fields present in CSV
              const createData: any = {
                id: randomUUID(),
                updated_at: new Date(),
                email_verified_status: false, // Always set to false for new imports
              };
              
              // Only add fields that exist in the CSV data and are not undefined
              if (contactData.name !== undefined) createData.name = contactData.name;
              if (contactData.email !== undefined) createData.email = contactData.email;
              if (contactData.title !== undefined) createData.title = contactData.title || '';
              if (contactData.bio !== undefined) createData.bio = contactData.bio || null;

              // Handle socials array
              const socials: string[] = [];
              if (contactData.twitterHandle) socials.push(contactData.twitterHandle);
              if (contactData.instagramHandle) socials.push(contactData.instagramHandle);
              if (contactData.linkedinUrl) socials.push(contactData.linkedinUrl);
              if (socials.length > 0) createData.socials = socials;

              // Handle author links
              if (contactData.authorLinks !== undefined) createData.authorLinks = contactData.authorLinks || [];
              
              await tx.media_contacts.create({
                data: createData,
              });
            }
            
            importedCount++;
          } catch (error) {
            // Add specific error for this row
            errors.push({
              row: rowIndex + 2,
              message: error instanceof Error ? error.message : "Unknown error during contact processing"
            });
          }
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
export async function processExport(fields: string[], filters?: Record<string, unknown>) {
  try {
    // Build query based on filters
    const where = buildWhereClause(filters);
    
    // Query contacts from database
    const contacts = await prisma.media_contacts.findMany({
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
export function buildWhereClause(filters?: Record<string, unknown>) {
  if (!filters) return {};
  
  const where: Record<string, unknown> = {};
  
  // Process text search
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search as string, mode: 'insensitive' } },
      { email: { contains: filters.search as string, mode: 'insensitive' } },
      { title: { contains: filters.search as string, mode: 'insensitive' } },
    ];
  }
  // Note: relation filtering (beats, countries, outlets) intentionally omitted here
  // because it requires nested some/AND filters by relation name/ID. Add when needed.
  
  return where;
}

/**
 * Create one or more media contacts in the database
 * @param contacts Array of media contact data to create
 * @returns Number of contacts created
 */
export async function createMediaContact(contacts: Array<ReturnType<typeof mapCsvRowToMediaContact>>): Promise<number> {
  try {
    // Use transaction for data consistency
    const result = await prisma.$transaction(async (tx) => {
      let createdCount = 0;
      
      for (const contact of contacts) {
        // Check for duplicate email
        const existing = await tx.media_contacts.findUnique({
          where: { email: contact.email as string },
        });
        
        if (existing) {
          // Update existing contact
          await tx.media_contacts.update({
            where: { id: existing.id },
            data: { ...contact, updated_at: new Date() },
          });
        } else {
          // Create new contact with required fields
          const contactData = {
            id: randomUUID(),
            updated_at: new Date(),
            name: contact.name || '', // Ensure name is provided
            email: contact.email || '', // Ensure email is provided
            title: contact.title || '',
            bio: contact.bio || null,
            authorLinks: contact.authorLinks || [],
            email_verified_status: contact.email_verified_status || false,
            socials: contact.socials || [],
            ...contact, // Override with any other provided fields
          };
          
          await tx.media_contacts.create({
            data: contactData,
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
export async function findMediaContacts(filters?: Record<string, unknown>): Promise<Record<string, unknown>[]> {
  try {
    // Build query based on filters
    const where = buildWhereClause(filters);
    
    // Query contacts from database
    const contacts = await prisma.media_contacts.findMany({
      where,
      orderBy: { name: 'asc' },
    });
    
    return contacts;
  } catch (error) {
    console.error("Error finding media contacts:", error);
    throw error;
  }
}
