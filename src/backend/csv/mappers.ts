import { CsvContactData } from "./validation";
import { MediaContact } from "@prisma/client";

// Extended MediaContact type to handle the actual structure in our application
type ExtendedMediaContact = MediaContact & {
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
 * @param csvData Validated CSV data from a single row
 * @returns MediaContact object ready for database insertion
 */
export function mapCsvRowToMediaContact(csvData: CsvContactData): Omit<MediaContact, "id" | "created_at" | "updated_at"> {
  return {
    name: csvData.name,
    email: csvData.email,
    title: csvData.title || '',
    bio: csvData.bio || null,
    email_verified_status: false, // Default value
    socials: [
      csvData.twitterHandle,
      csvData.instagramHandle,
      csvData.linkedinUrl
    ].filter(Boolean) as string[], // Filter out null/undefined values
    authorLinks: csvData.authorLinks || [],
  };
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
    if (mapping[field]) {
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
