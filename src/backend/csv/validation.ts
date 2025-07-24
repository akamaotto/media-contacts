import { z } from "zod";

/**
 * Zod schema for validating CSV row data for media contacts
 * Handles validation and transformation of CSV string data to appropriate types
 */
export const csvContactSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  email: z.string().email({ message: "Valid email is required" }),
  title: z.string().optional(),
  outlet: z.string().optional(),
  beats: z.string().optional()
    .transform(str => str ? str.split(',').map(s => s.trim()).filter(Boolean) : []),
  countries: z.string().optional()
    .transform(str => str ? str.split(',').map(s => s.trim()).filter(Boolean) : []),
  twitterHandle: z.string().optional(),
  instagramHandle: z.string().optional(),
  linkedinUrl: z.string().optional(),
  bio: z.string().optional(),
  notes: z.string().optional(),
  authorLinks: z.string().optional()
    .transform(str => str ? str.split(',').map(s => s.trim()).filter(Boolean) : []),
});

/**
 * Type definition for CSV contact data after validation
 */
export type CsvContactData = z.infer<typeof csvContactSchema>;

/**
 * Zod schema for validating CSV export options
 */
export const exportOptionsSchema = z.object({
  fields: z.array(z.string()).refine(arr => arr.length >= 1, { message: "At least one field must be selected" }),
  filters: z.record(z.string(), z.any()).optional(),
});

/**
 * Validates a single CSV row and returns the result
 * @param row The CSV row data as an object
 * @returns Validation result with data or errors
 */
export function validateCsvRow(row: Record<string, string>) {
  const result = csvContactSchema.safeParse(row);
  
  if (result.success) {
    return {
      success: true,
      data: result.data,
      errors: []
    };
  } else {
    // Extract formatted errors from Zod validation result
    const formattedErrors = [];
    
    // Process each validation issue
    for (const issue of result.error.issues) {
      const path = issue.path.join('.') || 'unknown';
      formattedErrors.push({
        path,
        message: issue.message || 'Invalid value'
      });
    }
    
    return {
      success: false,
      data: null,
      errors: formattedErrors
    };
  }
}

/**
 * Validates CSV column headers against required and optional fields
 * @param headers Array of CSV column headers
 * @returns Validation result with mapping information or errors
 */
export function validateCsvHeaders(headers: string[]) {
  const requiredFields = ['name', 'email'];
  const optionalFields = [
    'title', 'outlet', 'beats', 'countries', 
    'twitterHandle', 'instagramHandle', 
    'linkedinUrl', 'bio', 'notes', 'authorLinks'
  ];
  
  // Create mapping between human-readable headers and field names
  const headerFieldMapping: Record<string, string> = {
    // Required fields - new format
    'name': 'name',
    'full name': 'name',
    'email': 'email',
    // Backward compatibility - old format
    'first name': 'firstName',
    'last name': 'lastName',
    // Optional fields
    'title': 'title',
    'outlet': 'outlet',
    'beats': 'beats',
    'countries': 'countries',
    'twitter handle': 'twitterHandle',
    'instagram handle': 'instagramHandle',
    'linkedin url': 'linkedinUrl',
    'bio': 'bio',
    'notes': 'notes',
    'author links': 'authorLinks'
  };
  
  const allFields = [...requiredFields, ...optionalFields];
  const normalizedHeaders = headers.map(h => h.trim().toLowerCase());
  
  // Check for required fields using the mapping
  const missingRequired = requiredFields.filter(field => {
    // Check both direct field name and mapped header name
    const directMatch = normalizedHeaders.some(h => h === field.toLowerCase());
    const mappedMatch = normalizedHeaders.some(h => headerFieldMapping[h] === field);
    return !directMatch && !mappedMatch;
  });
  
  // Create mapping between CSV headers and schema fields
  const headerMapping = new Map<string, string>();
  
  normalizedHeaders.forEach((header, index) => {
    // First try direct field name match
    const directMatch = allFields.find(f => f.toLowerCase() === header);
    if (directMatch) {
      headerMapping.set(headers[index], directMatch);
      return;
    }
    
    // Then try mapped header name
    const mappedField = headerFieldMapping[header];
    if (mappedField && allFields.includes(mappedField)) {
      headerMapping.set(headers[index], mappedField);
    }
  });
  
  return {
    success: missingRequired.length === 0,
    headerMapping,
    missingRequired,
    unmappedHeaders: headers.filter(h => !headerMapping.has(h))
  };
}
