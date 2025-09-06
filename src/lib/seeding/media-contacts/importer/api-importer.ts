// API importer for the media contacts seeding system

import { MediaContactData } from '../config';
import { validateContacts, normalizeContact } from '../utils/data-validator';
import { PrismaClient } from '@prisma/client';

// Initialize Prisma client
const prisma = new PrismaClient();

// Generate a unique ID for a contact
function generateContactId(): string {
  return 'contact_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Import media contacts directly into the database via API
 * @param contacts Array of media contact data
 * @returns Import result with success count and any errors
 */
export async function importContactsViaAPI(contacts: MediaContactData[]): Promise<{ 
  successCount: number; 
  errorCount: number; 
  errors: string[] 
}> {
  try {
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
    
    let successCount = 0;
    const errors: string[] = [];
    
    // Import valid contacts
    for (const contact of validContacts) {
      try {
        // Check if contact already exists
        const existingContact = await prisma.media_contacts.findFirst({
          where: {
            email: contact.email
          }
        });
        
        // Find country IDs
        const countryIds = [];
        for (const countryName of contact.countries) {
          const country = await prisma.countries.findFirst({
            where: {
              name: countryName
            }
          });
          
          if (country) {
            countryIds.push(country.id);
          }
        }
        
        // Find or create outlet
        let outletId = null;
        if (contact.outlet) {
          let outlet = await prisma.outlets.findFirst({
            where: {
              name: contact.outlet
            }
          });
          
          // If outlet doesn't exist, create it
          if (!outlet) {
            outlet = await prisma.outlets.create({
              data: {
                id: 'outlet_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                name: contact.outlet,
                created_at: new Date(),
                updated_at: new Date()
              }
            });
          }
          
          outletId = outlet.id;
        }
        
        // Prepare contact data
        const contactData = {
          name: contact.name,
          title: contact.title,
          bio: contact.bio,
          email_verified_status: false, // Default to unverified
          socials: [
            contact.twitterHandle,
            contact.instagramHandle,
            contact.linkedinUrl
          ].filter(Boolean) as string[],
          authorLinks: contact.authorLinks,
          updated_at: new Date(),
          countries: {
            connect: countryIds.map(id => ({ id }))
          },
          outlets: outletId ? {
            connect: [{ id: outletId }]
          } : undefined
        };
        
        if (existingContact) {
          // Update existing contact
          await prisma.media_contacts.update({
            where: { id: existingContact.id },
            data: contactData
          });
        } else {
          // Create new contact
          await prisma.media_contacts.create({
            data: {
              id: generateContactId(),
              email: contact.email,
              ...contactData,
              created_at: new Date()
            }
          });
        }
        
        successCount++;
      } catch (error) {
        const errorMessage = `Error importing contact ${contact.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(errorMessage);
        errors.push(errorMessage);
      }
    }
    
    return {
      successCount,
      errorCount: invalidContacts.length + errors.length,
      errors: [
        ...invalidContacts.map(({ contact, errors }) => `Invalid contact ${contact.name}: ${errors.join(', ')}`),
        ...errors
      ]
    };
  } catch (error) {
    console.error('Error importing contacts via API:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Import contacts from sample data
 * @returns Import result
 */
export async function importSampleContacts(): Promise<{ 
  successCount: number; 
  errorCount: number; 
  errors: string[] 
}> {
  // In a real implementation, this would load sample data from a file
  // For now, we'll return a success result
  return {
    successCount: 0,
    errorCount: 0,
    errors: []
  };
}