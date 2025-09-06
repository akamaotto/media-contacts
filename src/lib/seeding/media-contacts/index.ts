// Main entry point for the media contacts seeding system

import { SeedingConfig, DEFAULT_SEEDING_CONFIG, MediaContactData } from './config';
import { generateRandomContacts, filterContacts, enrichContacts } from './utils/contact-generator';
import { importContactsFromCSV, exportContactsToCSV } from './importer/csv-importer';
import { importContactsViaAPI } from './importer/api-importer';
import * as path from 'path';

/**
 * Seed media contacts based on the provided configuration
 * @param config Seeding configuration
 * @returns Seeding result with success count and any errors
 */
export async function seedMediaContacts(config: Partial<SeedingConfig> = {}): Promise<{ 
  successCount: number; 
  errorCount: number; 
  contacts: MediaContactData[];
  errors: string[] 
}> {
  try {
    // Merge provided config with defaults
    const fullConfig: SeedingConfig = {
      ...DEFAULT_SEEDING_CONFIG,
      ...config
    };
    
    console.log(`Seeding media contacts with config:`, fullConfig);
    
    // Generate contacts based on configuration
    let contacts: MediaContactData[];
    
    if (fullConfig.count > 0) {
      // Generate random contacts
      contacts = generateRandomContacts(fullConfig, fullConfig.count);
    } else {
      // Load contacts from sample data
      const sampleDataPath = path.join(__dirname, 'data', 'samples', 'sample-contacts.csv');
      contacts = await importContactsFromCSV(sampleDataPath);
    }
    
    // Filter contacts based on requirements
    contacts = filterContacts(contacts, fullConfig);
    
    // Enrich contacts with additional data
    contacts = enrichContacts(contacts);
    
    // Import contacts via API
    const importResult = await importContactsViaAPI(contacts);
    
    return {
      successCount: importResult.successCount,
      errorCount: importResult.errorCount,
      contacts,
      errors: importResult.errors
    };
  } catch (error) {
    console.error('Error seeding media contacts:', error);
    throw error;
  }
}

/**
 * Seed media contacts from a CSV file
 * @param csvFilePath Path to the CSV file
 * @returns Seeding result with success count and any errors
 */
export async function seedMediaContactsFromCSV(csvFilePath: string): Promise<{ 
  successCount: number; 
  errorCount: number; 
  contacts: MediaContactData[];
  errors: string[] 
}> {
  try {
    console.log(`Seeding media contacts from CSV: ${csvFilePath}`);
    
    // Import contacts from CSV
    const contacts = await importContactsFromCSV(csvFilePath);
    
    // Import contacts via API
    const importResult = await importContactsViaAPI(contacts);
    
    return {
      successCount: importResult.successCount,
      errorCount: importResult.errorCount,
      contacts,
      errors: importResult.errors
    };
  } catch (error) {
    console.error('Error seeding media contacts from CSV:', error);
    throw error;
  }
}

/**
 * Export current database contacts to a CSV file
 * @param csvFilePath Path to the output CSV file
 * @param filterOptions Optional filter options
 * @returns Export result
 */
export async function exportMediaContactsToCSV(csvFilePath: string, filterOptions?: any): Promise<{ 
  success: boolean; 
  count: number; 
  errors: string[] 
}> {
  try {
    console.log(`Exporting media contacts to CSV: ${csvFilePath}`);
    
    // In a real implementation, this would fetch contacts from the database
    // For now, we'll create some sample data
    const sampleContacts: MediaContactData[] = [
      {
        name: 'John Smith',
        email: 'john.smith@example.com',
        title: 'Technology Reporter',
        outlet: 'Tech News Daily',
        beats: ['Technology', 'AI', 'Startups'],
        countries: ['United States', 'Canada']
      }
    ];
    
    await exportContactsToCSV(sampleContacts, csvFilePath);
    
    return {
      success: true,
      count: sampleContacts.length,
      errors: []
    };
  } catch (error) {
    console.error('Error exporting media contacts to CSV:', error);
    return {
      success: false,
      count: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

// Export types and utilities for external use
export * from './config';
export { importContactsFromCSV, exportContactsToCSV } from './importer/csv-importer';