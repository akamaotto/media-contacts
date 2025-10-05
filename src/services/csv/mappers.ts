import { CsvContactData } from "./validation";
import type { media_contacts } from "@prisma/client";

// Extended MediaContact type to handle the actual structure in our application
export type ExtendedMediaContact = media_contacts & {
  firstName?: string;
  lastName?: string;
  outlet?: string | null;
  beats?: string[];
  countries?: string[];
  regions?: string[];
  languages?: string[];
  twitterHandle?: string | null;
  instagramHandle?: string | null;
  linkedinUrl?: string | null;
  notes?: string | null;
};

/**
 * Maps a validated CSV row to a MediaContact object for database insertion
 * Only includes fields that are present in the CSV data to prevent data loss
 * @param csvData Validated CSV data from a single row
 * @returns MediaContact object ready for database insertion
 */
export function mapCsvRowToMediaContact(csvData: CsvContactData): Partial<Omit<media_contacts, 'id' | 'created_at'>> {
  const result: Partial<Omit<media_contacts, 'id' | 'created_at'>> = {};

  // Only add fields that exist in the CSV data
  if (csvData.name !== undefined) result.name = csvData.name;
  if (csvData.email !== undefined) result.email = csvData.email;
  if (csvData.title !== undefined) result.title = csvData.title || '';
  if (csvData.bio !== undefined) result.bio = csvData.bio || null;
  
  // Always set email verification status to false for new imports
  result.email_verified_status = false;

  // Handle socials array
  const socials: string[] = [];
  if (csvData.twitterHandle) socials.push(csvData.twitterHandle);
  if (csvData.instagramHandle) socials.push(csvData.instagramHandle);
  if (csvData.linkedinUrl) socials.push(csvData.linkedinUrl);
  if (socials.length > 0) result.socials = socials;

  // Handle author links
  if (csvData.authorLinks !== undefined) result.authorLinks = csvData.authorLinks || [];

  return result;
}

/**
 * Maps a MediaContact object to a CSV row for export
 * @param contact MediaContact object from database
 * @param fields Array of field names to include in the export
 * @returns Object with string values ready for CSV generation
 */
export function mapMediaContactToCsvRow(contact: ExtendedMediaContact, fields: string[]): Record<string, string> {
  const mapping: Record<string, (contact: ExtendedMediaContact) => string> = {
    firstName: (c) => c.firstName || (c.name ? c.name.split(' ')[0] : '') || '',
    lastName: (c) => c.lastName || (c.name ? c.name.split(' ').slice(1).join(' ') : '') || '',
    email: (c) => c.email,
    title: (c) => c.title || "",
    outlet: (c) => c.outlet || "",
    beats: (c) => (c.beats || []).join(", "),
    countries: (c) => (c.countries || []).join(", "),
    regions: (c) => (c.regions || []).join(", "),
    languages: (c) => (c.languages || []).join(", "),
    twitterHandle: (c) => c.twitterHandle || "",
    instagramHandle: (c) => c.instagramHandle || "",
    linkedinUrl: (c) => c.linkedinUrl || "",
    bio: (c) => c.bio || "",
    notes: (c) => c.notes || "",
    authorLinks: (c) => (c.authorLinks || []).join(", "),
  };

  const result: Record<string, string> = {};
  
  fields.forEach((field) => {
    if (
      Object.prototype.hasOwnProperty.call(mapping, field) &&
      typeof mapping[field] === "function"
    ) {
      result[field] = mapping[field](contact);
    }
  });

  return result;
}

/**
 * Generates CSV header row based on selected fields
 * @param fields Array of field names to include in the export
 * @returns Array of header names for CSV
 */
export function generateCsvHeaders(fields: string[]): string[] {
  // Map internal field names to user-friendly header names if needed
  const headerMapping: Record<string, string> = {
    firstName: "First Name",
    lastName: "Last Name",
    email: "Email",
    title: "Title",
    outlet: "Outlet",
    beats: "Beats",
    countries: "Countries",
    regions: "Regions",
    languages: "Languages",
    twitterHandle: "Twitter Handle",
    instagramHandle: "Instagram Handle",
    linkedinUrl: "LinkedIn URL",
    bio: "Bio",
    notes: "Notes",
    authorLinks: "Author Links",
  };

  return fields.map((field) => headerMapping[field] || field);
}
