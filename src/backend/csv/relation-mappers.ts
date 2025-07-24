import { PrismaClient } from '@prisma/client';

/**
 * Utility functions for mapping CSV data to database relationships
 * Handles finding or creating related entities (Outlets, Countries, Beats)
 */

/**
 * Find or create outlets from comma-separated string
 * @param outletNames Comma-separated outlet names
 * @param prisma Prisma client instance
 * @returns Array of outlet IDs
 */
export async function findOrCreateOutlets(
  outletNames: string | string[], 
  prisma: PrismaClient
): Promise<string[]> {
  if (!outletNames) return [];
  
  // Handle both string and array inputs
  const names = Array.isArray(outletNames) 
    ? outletNames.filter(Boolean)
    : outletNames.split(',').map(name => name.trim()).filter(Boolean);
  const outletIds: string[] = [];
  
  for (const name of names) {
    // Try to find existing outlet
    let outlet = await prisma.outlet.findUnique({
      where: { name }
    });
    
    // Create if doesn't exist
    if (!outlet) {
      outlet = await prisma.outlet.create({
        data: { 
          name,
          description: null,
          website: null
        }
      });
    }
    
    outletIds.push(outlet.id);
  }
  
  return outletIds;
}

/**
 * Find existing countries from comma-separated string (validation-only, no creation)
 * @param countryNames Comma-separated country names
 * @param prisma Prisma client instance
 * @returns Object with valid country IDs and invalid country names
 */
export async function findExistingCountries(
  countryNames: string | string[], 
  prisma: PrismaClient
): Promise<{ validIds: string[], invalidNames: string[] }> {
  if (!countryNames) return { validIds: [], invalidNames: [] };
  
  // Handle both string and array inputs
  const names = Array.isArray(countryNames) 
    ? countryNames.filter(Boolean)
    : countryNames.split(',').map(name => name.trim()).filter(Boolean);
  
  const validIds: string[] = [];
  const invalidNames: string[] = [];
  
  for (const name of names) {
    // Try to find existing country (case-insensitive)
    const country = await prisma.country.findFirst({
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
    }
  }
  
  return { validIds, invalidNames };
}

/**
 * Find or create beats from comma-separated string
 * @param beatNames Comma-separated beat names
 * @param prisma Prisma client instance
 * @returns Array of beat IDs
 */
export async function findOrCreateBeats(
  beatNames: string | string[], 
  prisma: PrismaClient
): Promise<string[]> {
  if (!beatNames) return [];
  
  // Handle both string and array inputs
  const names = Array.isArray(beatNames) 
    ? beatNames.filter(Boolean)
    : beatNames.split(',').map(name => name.trim()).filter(Boolean);
  const beatIds: string[] = [];
  
  for (const name of names) {
    // Try to find existing beat
    let beat = await prisma.beat.findUnique({
      where: { name }
    });
    
    // Create if doesn't exist
    if (!beat) {
      beat = await prisma.beat.create({
        data: { 
          name,
          description: null
        }
      });
    }
    
    beatIds.push(beat.id);
  }
  
  return beatIds;
}

/**
 * Create media contact with proper relationship mapping
 * @param contactData Contact data from CSV
 * @param prisma Prisma client instance
 * @returns Object with created contact and any warnings about rejected countries
 */
export async function createMediaContactWithRelations(
  contactData: any,
  prisma: PrismaClient
): Promise<{ contact: any, warnings: string[] }> {
  // Find or create related entities
  const outletIds = contactData.outlet ? await findOrCreateOutlets(contactData.outlet, prisma) : [];
  const countryResult = contactData.countries ? await findExistingCountries(contactData.countries, prisma) : { validIds: [], invalidNames: [] };
  const beatIds = contactData.beats ? await findOrCreateBeats(contactData.beats, prisma) : [];
  
  // Collect warnings for invalid countries (but don't block import)
  const warnings: string[] = [];
  if (countryResult.invalidNames.length > 0) {
    warnings.push(`Invalid countries rejected: ${countryResult.invalidNames.join(', ')}. Contact imported successfully, but these countries were not linked.`);
  }
  
  // Create the media contact with relationships
  const contact = await prisma.mediaContact.create({
    data: {
      name: contactData.name,
      email: contactData.email,
      title: contactData.title || '',
      bio: contactData.bio || null,
      email_verified_status: false,
      socials: [
        contactData.twitterHandle,
        contactData.instagramHandle,
        contactData.linkedinUrl
      ].filter(Boolean) as string[],
      authorLinks: contactData.authorLinks || [],
      
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
    include: {
      outlets: true,
      countries: true,
      beats: true
    }
  });
  
  return { contact, warnings };
}

/**
 * Update existing media contact with proper relationship mapping
 * @param contactId Existing contact ID
 * @param contactData Contact data from CSV
 * @param prisma Prisma client instance
 * @returns Object with updated contact and any warnings about rejected countries
 */
export async function updateMediaContactWithRelations(
  contactId: string,
  contactData: any,
  prisma: PrismaClient
): Promise<{ contact: any, warnings: string[] }> {
  // Find or create related entities
  const outletIds = contactData.outlet ? await findOrCreateOutlets(contactData.outlet, prisma) : [];
  const countryResult = contactData.countries ? await findExistingCountries(contactData.countries, prisma) : { validIds: [], invalidNames: [] };
  const beatIds = contactData.beats ? await findOrCreateBeats(contactData.beats, prisma) : [];
  
  // Collect warnings for invalid countries (but don't block update)
  const warnings: string[] = [];
  if (countryResult.invalidNames.length > 0) {
    warnings.push(`Invalid countries rejected: ${countryResult.invalidNames.join(', ')}. Contact updated successfully, but these countries were not linked.`);
  }
  
  // Update the media contact with relationships
  const contact = await prisma.mediaContact.update({
    where: { id: contactId },
    data: {
      name: contactData.name,
      email: contactData.email,
      title: contactData.title || '',
      bio: contactData.bio || null,
      email_verified_status: false,
      socials: [
        contactData.twitterHandle,
        contactData.instagramHandle,
        contactData.linkedinUrl
      ].filter(Boolean) as string[],
      authorLinks: contactData.authorLinks || [],
      
      // Replace relationships (disconnect all, then connect new ones)
      outlets: {
        set: [], // Disconnect all
        connect: outletIds.map((id: string) => ({ id }))
      },
      countries: {
        set: [], // Disconnect all
        connect: countryResult.validIds.map((id: string) => ({ id }))
      },
      beats: {
        set: [], // Disconnect all
        connect: beatIds.map((id: string) => ({ id }))
      }
    },
    include: {
      outlets: true,
      countries: true,
      beats: true
    }
  });
  
  return { contact, warnings };
}
