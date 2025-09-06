import { prisma } from '@/lib/database/prisma';
import { randomUUID } from 'crypto';
import type { Prisma } from '@prisma/client';
import type { CsvContactData } from './validation';

/**
 * Utility functions for mapping CSV data to database relationships
 * Handles finding or creating related entities (Outlets, Countries, Beats)
 */

/**
 * Find or create outlets from comma-separated string
 * @param outletNames Comma-separated outlet names
 * @returns Array of outlet IDs
 */
export async function findOrCreateOutlets(
  outletNames: string | string[]
): Promise<string[]> {
  if (!outletNames) return [];
  
  // Handle both string and array inputs
  const names = Array.isArray(outletNames) 
    ? outletNames.filter(Boolean)
    : outletNames.split(',').map(name => name.trim()).filter(Boolean);
  const outletIds: string[] = [];
  
  for (const name of names) {
    // Try to find existing outlet
    let outlet = await prisma.outlets.findUnique({
      where: { name }
    });
    
    // Create if doesn't exist
    if (!outlet) {
      outlet = await prisma.outlets.create({
        data: {
          id: randomUUID(),
          name,
          description: null,
          website: null,
          updated_at: new Date(),
        },
      });
    }
    
    outletIds.push(outlet.id);
  }
  
  return outletIds;
}

/**
 * Find existing countries from comma-separated string with enhanced error reporting
 * @param countryNames Comma-separated country names
 * @returns Object with valid country IDs, invalid country names, and suggestions
 */
export async function findExistingCountries(
  countryNames: string | string[]
): Promise<{ validIds: string[]; invalidNames: string[]; suggestions: string[] }> {
  if (!countryNames) return { validIds: [], invalidNames: [], suggestions: [] };
  
  // Handle both string and array inputs
  const names = Array.isArray(countryNames) 
    ? countryNames.filter(Boolean)
    : countryNames.split(',').map(name => name.trim()).filter(Boolean);
  
  const validIds: string[] = [];
  const invalidNames: string[] = [];
  const suggestions: string[] = [];
  
  for (const name of names) {
    // Try to find existing country (case-insensitive)
    const country = await prisma.countries.findFirst({
      where: { 
        name: {
          equals: name,
          mode: 'insensitive'
        }
      }
    });
    
    if (country) {
      validIds.push(country.id);
    } else {
      invalidNames.push(name);
      // Find similar country names for suggestions
      const similarCountries = await prisma.countries.findMany({
        where: {
          name: {
            contains: name,
            mode: 'insensitive'
          }
        },
        take: 3
      });
      similarCountries.forEach(c => {
        if (!suggestions.includes(c.name)) {
          suggestions.push(c.name);
        }
      });
    }
  }
  
  return { validIds, invalidNames, suggestions };
}

/**
 * Find or create beats from comma-separated string
 * @param beatNames Comma-separated beat names
 * @param prisma Prisma client instance
 * @returns Array of beat IDs
 */
export async function findOrCreateBeats(
  beatNames: string | string[]
): Promise<string[]> {
  if (!beatNames) return [];
  
  // Handle both string and array inputs
  const names = Array.isArray(beatNames) 
    ? beatNames.filter(Boolean)
    : beatNames.split(',').map(name => name.trim()).filter(Boolean);
  const beatIds: string[] = [];
  
  for (const name of names) {
    // Try to find existing beat
    let beat = await prisma.beats.findUnique({
      where: { name }
    });
    
    // Create if doesn't exist
    if (!beat) {
      beat = await prisma.beats.create({
        data: {
          id: randomUUID(),
          name,
          description: null,
          updated_at: new Date(),
        },
      });
    }
    
    beatIds.push(beat.id);
  }
  
  return beatIds;
}

/**
 * Create media contact with proper relationship mapping
 * @param contactData Contact data from CSV
 * @returns Object with created contact and any warnings about rejected countries
 */
type ContactWithRelations = Prisma.media_contactsGetPayload<{
  select: {
    id: true;
    name: true;
    email: true;
    title: true;
    bio: true;
    socials: true;
    authorLinks: true;
    email_verified_status: true;
    updated_at: true;
    outlets: { select: { id: true; name: true } };
    countries: { select: { id: true; name: true; code: true } };
    beats: { select: { id: true; name: true } };
  };
}>;

export async function createMediaContactWithRelations(
  contactData: CsvContactData
): Promise<{ contact: ContactWithRelations; warnings: string[] }> {
  // Find or create related entities
  const outletVal = contactData.outlet;
  const countriesVal = contactData.countries;
  const beatsVal = contactData.beats;

  const outletIds =
    typeof outletVal === 'string' || Array.isArray(outletVal)
      ? await findOrCreateOutlets(outletVal)
      : [];
  const countryResult =
    typeof countriesVal === 'string' || Array.isArray(countriesVal)
      ? await findExistingCountries(countriesVal)
      : { validIds: [], invalidNames: [], suggestions: [] };
  const beatIds =
    typeof beatsVal === 'string' || Array.isArray(beatsVal)
      ? await findOrCreateBeats(beatsVal)
      : [];
  
  // Collect warnings for invalid countries with suggestions
  const warnings: string[] = [];
  if (countryResult.invalidNames.length > 0) {
    let warningMsg = `Invalid countries rejected: ${countryResult.invalidNames.join(', ')}.`;
    if (countryResult.suggestions.length > 0) {
      warningMsg += ` Did you mean: ${countryResult.suggestions.join(', ')}?`;
    }
    warningMsg += ` Contact imported successfully, but these countries were not linked.`;
    warnings.push(warningMsg);
  }
  
  // Create the media contact with relationships
  const contact = await prisma.media_contacts.create({
    data: {
      id: randomUUID(),
      name: contactData.name,
      email: contactData.email,
      title: contactData.title || '',
      bio: contactData.bio || null,
      email_verified_status: false,
      socials: [
        contactData.twitterHandle,
        contactData.instagramHandle,
        contactData.linkedinUrl,
      ].filter((v): v is string => Boolean(v)),
      authorLinks: contactData.authorLinks || [],
      updated_at: new Date(),
      
      // Connect to related entities
      outlets: {
        connect: outletIds.map((id: string) => ({ id }))
      },
      countries: {
        connect: countryResult.validIds.map((id: string) => ({ id }))
      },
      beats: {
        connect: beatIds.map((id: string) => ({ id }))
      }
    },
    select: {
      id: true,
      name: true,
      email: true,
      title: true,
      bio: true,
      socials: true,
      authorLinks: true,
      email_verified_status: true,
      updated_at: true,
      outlets: { select: { id: true, name: true } },
      countries: { select: { id: true, name: true, code: true } },
      beats: { select: { id: true, name: true } },
    }
  });
  
  return { contact, warnings };
}

/**
 * Update existing media contact with proper relationship mapping
 * @param contactId Existing contact ID
 * @param contactData Contact data from CSV
 * @returns Object with updated contact and any warnings about rejected countries
 */
export async function updateMediaContactWithRelations(
  contactId: string,
  contactData: CsvContactData
): Promise<{ contact: ContactWithRelations; warnings: string[] }> {
  // Find or create related entities
  const outletVal = contactData.outlet;
  const countriesVal = contactData.countries;
  const beatsVal = contactData.beats;

  const outletIds =
    typeof outletVal === 'string' || Array.isArray(outletVal)
      ? await findOrCreateOutlets(outletVal)
      : [];
  const countryResult =
    typeof countriesVal === 'string' || Array.isArray(countriesVal)
      ? await findExistingCountries(countriesVal)
      : { validIds: [], invalidNames: [], suggestions: [] };
  const beatIds =
    typeof beatsVal === 'string' || Array.isArray(beatsVal)
      ? await findOrCreateBeats(beatsVal)
      : [];
  
  // Collect warnings for invalid countries with suggestions
  const warnings: string[] = [];
  if (countryResult.invalidNames.length > 0) {
    let warningMsg = `Invalid countries rejected: ${countryResult.invalidNames.join(', ')}.`;
    if (countryResult.suggestions.length > 0) {
      warningMsg += ` Did you mean: ${countryResult.suggestions.join(', ')}?`;
    }
    warningMsg += ` Contact updated successfully, but these countries were not linked.`;
    warnings.push(warningMsg);
  }
  
  // Build update data with only fields present in CSV
  const updateData: Prisma.media_contactsUpdateInput = {
    updated_at: new Date(),
  };
  
  // Only update fields that exist in the CSV data
  if (contactData.name !== undefined) updateData.name = contactData.name;
  if (contactData.email !== undefined) updateData.email = contactData.email;
  if (contactData.title !== undefined) updateData.title = contactData.title || '';
  if (contactData.bio !== undefined) updateData.bio = contactData.bio || null;
  
  // Handle socials
  if (contactData.twitterHandle !== undefined || 
      contactData.instagramHandle !== undefined || 
      contactData.linkedinUrl !== undefined) {
    const socials: string[] = [];
    if (contactData.twitterHandle) socials.push(contactData.twitterHandle);
    if (contactData.instagramHandle) socials.push(contactData.instagramHandle);
    if (contactData.linkedinUrl) socials.push(contactData.linkedinUrl);
    updateData.socials = socials;
  }
  
  // Handle author links
  if (contactData.authorLinks !== undefined) updateData.authorLinks = contactData.authorLinks || [];
  
  // Update relationships
  updateData.outlets = {
    set: [], // Disconnect all
    connect: outletIds.map((id: string) => ({ id }))
  };
  updateData.countries = {
    set: [], // Disconnect all
    connect: countryResult.validIds.map((id: string) => ({ id }))
  };
  updateData.beats = {
    set: [], // Disconnect all
    connect: beatIds.map((id: string) => ({ id }))
  };
  
  // Update the media contact with relationships
  const contact = await prisma.media_contacts.update({
    where: { id: contactId },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      title: true,
      bio: true,
      socials: true,
      authorLinks: true,
      email_verified_status: true,
      updated_at: true,
      outlets: { select: { id: true, name: true } },
      countries: { select: { id: true, name: true, code: true } },
      beats: { select: { id: true, name: true } },
    }
  });
  
  return { contact, warnings };
}
