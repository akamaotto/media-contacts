// CSV importer for the media contacts seeding system

import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { MediaContactData } from '../config';
import { validateContacts, normalizeContact } from '../utils/data-validator';

/**
 * Import media contacts from a CSV file
 * @param filePath Path to the CSV file
 * @returns Array of media contact data
 */
export async function importContactsFromCSV(filePath: string): Promise<MediaContactData[]> {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`CSV file not found: ${filePath}`);
    }
    
    // Read the CSV file
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Parse CSV data
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    
    // Convert records to MediaContactData objects
    const contacts: MediaContactData[] = records.map((record: any) => {
      return {
        name: record.Name || '',
        email: record.Email || '',
        title: record.Title || '',
        outlet: record.Outlet || '',
        beats: record.Beats ? record.Beats.split(',').map((b: string) => b.trim()) : [],
        countries: record.Countries ? record.Countries.split(',').map((c: string) => c.trim()) : [],
        twitterHandle: record['Twitter Handle'] || undefined,
        instagramHandle: record['Instagram Handle'] || undefined,
        linkedinUrl: record['LinkedIn URL'] || undefined,
        bio: record.Bio || undefined,
        notes: record.Notes || undefined,
        authorLinks: record['Author Links'] ? record['Author Links'].split(',').map((l: string) => l.trim()) : undefined
      };
    });
    
    // Normalize and validate contacts
    const normalizedContacts = contacts.map(normalizeContact);
    const { validContacts, invalidContacts } = validateContacts(normalizedContacts);
    
    // Log any invalid contacts
    if (invalidContacts.length > 0) {
      console.warn(`Found ${invalidContacts.length} invalid contacts:`);
      invalidContacts.forEach(({ contact, errors }) => {
        console.warn(`- ${contact.name}: ${errors.join(', ')}`);
      });
    }
    
    return validContacts;
  } catch (error) {
    console.error('Error importing contacts from CSV:', error);
    throw error;
  }
}

/**
 * Export media contacts to a CSV file
 * @param contacts Array of media contact data
 * @param filePath Path to the output CSV file
 */
export async function exportContactsToCSV(contacts: MediaContactData[], filePath: string): Promise<void> {
  try {
    // Define CSV headers
    const headers = [
      'Name', 'Email', 'Title', 'Outlet', 'Beats', 'Countries', 
      'Twitter Handle', 'Instagram Handle', 'LinkedIn URL', 'Bio', 'Notes', 'Author Links'
    ];
    
    // Convert contacts to CSV format
    const csvRows = [headers.join(',')];
    
    for (const contact of contacts) {
      const row = [
        contact.name,
        contact.email,
        contact.title,
        contact.outlet,
        contact.beats.join(', '),
        contact.countries.join(', '),
        contact.twitterHandle || '',
        contact.instagramHandle || '',
        contact.linkedinUrl || '',
        contact.bio || '',
        contact.notes || '',
        contact.authorLinks ? contact.authorLinks.join(', ') : ''
      ].map(field => {
        // Escape fields that contain commas or quotes
        if (typeof field === 'string' && (field.includes(',') || field.includes('"'))) {
          return `"${field.replace(/"/g, '""')}"`;
        }
        return field;
      });
      
      csvRows.push(row.join(','));
    }
    
    // Write to file
    const csvContent = csvRows.join('\n');
    fs.writeFileSync(filePath, csvContent);
    
    console.log(`Successfully exported ${contacts.length} contacts to ${filePath}`);
  } catch (error) {
    console.error('Error exporting contacts to CSV:', error);
    throw error;
  }
}