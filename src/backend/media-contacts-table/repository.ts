import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { MediaContactTableItem } from '@/components/features/media-contacts/columns';

/**
 * Full select object for media contacts with complete relation data
 * Follows Rust-inspired explicit typing for proper type checking
 */
const mediaContactFullSelect = {
  id: true,
  name: true,
  email: true,
  title: true,
  email_verified_status: true,
  updated_at: true,
  outlets: { select: { id: true, name: true } },
  countries: { 
    select: { 
      id: true, 
      name: true, 
      code: true,
      // Include regions and languages for filtering
      regions: {
        select: {
          id: true,
          name: true,
          code: true,
          category: true
        }
      },
      languages: {
        select: {
          id: true,
          name: true,
          code: true
        }
      }
    } 
  },
  beats: { select: { id: true, name: true } },
  bio: true,
  socials: true,
  authorLinks: true,
} satisfies Prisma.MediaContactSelect;

/**
 * Interface for media contact filter parameters with pagination
 * Follows Rust-inspired explicit typing pattern
 */
export interface MediaContactFilters {
  // Basic filters
  searchTerm?: string;
  countryIds?: string[];
  beatIds?: string[];
  
  // New filters
  regionCodes?: string[];
  languageCodes?: string[];
  
  // Email verification filter
  emailVerified?: 'all' | 'verified' | 'unverified';
  
  // Pagination parameters
  page?: number;
  pageSize?: number;
}

/**
 * Result interface for paginated media contacts
 * Follows Rust-inspired explicit typing pattern
 */
export interface PaginatedMediaContactsResult {
  contacts: MediaContactTableItem[];
  totalCount: number;
}

/**
 * Error types for media contact repository
 */
export enum MediaContactErrorType {
  DB_NOT_CONNECTED = 'DB_NOT_CONNECTED',
  NO_CONTACTS_FOUND = 'NO_CONTACTS_FOUND',
}

/**
 * Custom error class for media contact repository errors
 */
export class MediaContactError extends Error {
  type: MediaContactErrorType;
  
  constructor(message: string, type: MediaContactErrorType) {
    super(message);
    this.type = type;
    this.name = 'MediaContactError';
  }
}

/**
 * Get media contacts from the database with optional filtering and pagination
 * 
 * @param filters - Optional filter parameters including pagination
 * @returns Promise resolving to paginated media contacts result
 * @throws MediaContactError when database is not connected or no contacts are found
 */
export async function getMediaContactsFromDb(filters?: MediaContactFilters): Promise<PaginatedMediaContactsResult> {
  try {
    // Test database connection first
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (connectionError) {
      console.error('Database connection error:', connectionError);
      throw new MediaContactError('Database connection failed. Please check your database configuration.', MediaContactErrorType.DB_NOT_CONNECTED);
    }
    
    // Initialize filters with default values if not provided
    const pageNumber = filters?.page || 1;
    const itemsPerPage = filters?.pageSize || 10;
    console.log('Repository received filters:', JSON.stringify(filters));
    
    // Build filter conditions using Prisma's WHERE clause - starting with empty where
    const whereClause: Prisma.MediaContactWhereInput = {};
    
    // Apply filters if provided, following fail-fast validation approach
    if (filters) {
      const conditions: Prisma.MediaContactWhereInput[] = [];
      
      // Search term filter (name, email, outlet name)
      if (filters.searchTerm && filters.searchTerm.trim() !== '') {
        const searchTerm = filters.searchTerm.trim();
        console.log(`Applying search term filter: "${searchTerm}"`);
        // Search across multiple fields with expanded search coverage
        conditions.push({
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { email: { contains: searchTerm, mode: 'insensitive' } },
            { title: { contains: searchTerm, mode: 'insensitive' } },
            { bio: { contains: searchTerm, mode: 'insensitive' } },
            { outlets: { some: { name: { contains: searchTerm, mode: 'insensitive' } } } },
            { beats: { some: { name: { contains: searchTerm, mode: 'insensitive' } } } },
            { countries: { some: { name: { contains: searchTerm, mode: 'insensitive' } } } }
          ]
        });
      }
      
      // Country filter
      if (filters.countryIds && filters.countryIds.length > 0) {
        conditions.push({
          countries: { some: { id: { in: filters.countryIds } } }
        });
      }
      
      // Beat filter
      if (filters.beatIds && filters.beatIds.length > 0) {
        conditions.push({
          beats: { some: { id: { in: filters.beatIds } } }
        });
      }
      
      // Region filter
      if (filters.regionCodes && filters.regionCodes.length > 0) {
        conditions.push({
          countries: {
            some: {
              regions: {
                some: {
                  code: { in: filters.regionCodes }
                }
              }
            }
          }
        });
      }
      
      // Language filter
      if (filters.languageCodes && filters.languageCodes.length > 0) {
        conditions.push({
          countries: {
            some: {
              languages: {
                some: {
                  code: { in: filters.languageCodes }
                }
              }
            }
          }
        });
      }
      
      // Email verification filter
      if (filters.emailVerified && filters.emailVerified !== 'all') {
        conditions.push({
          email_verified_status: filters.emailVerified === 'verified'
        });
      }
      
      // Combine all conditions with AND logic
      if (conditions.length > 0) {
        whereClause.AND = conditions;
      }
    }
    
    // First check if we have any data at all in the table
    const totalAvailable = await prisma.mediaContact.count();
    console.log(`Total available contacts in database: ${totalAvailable}`);
    
    // If we have no contacts at all, throw an error
    if (totalAvailable === 0) {
      console.log('NO CONTACTS IN DATABASE');
      throw new MediaContactError('No media contacts found in the database.', MediaContactErrorType.NO_CONTACTS_FOUND);
    }
    
    // Execute paginated query with built filters
    const contacts = await prisma.mediaContact.findMany({
      where: whereClause,
      select: mediaContactFullSelect,
      orderBy: { updated_at: 'desc' },
      skip: (pageNumber - 1) * itemsPerPage,
      take: itemsPerPage,
    });
    
    console.log(`Query returned ${contacts.length} contacts`);
    
    // Get total count for pagination display
    const totalCount = await prisma.mediaContact.count({
      where: whereClause
    });
    
    // Check if we have any contacts matching the filters
    if (totalCount === 0) {
      throw new MediaContactError('No media contacts found matching your filters.', MediaContactErrorType.NO_CONTACTS_FOUND);
    }
    
    console.log(`Total count of contacts matching filter: ${totalCount}`);
    
    // Map the contacts to include emailVerified property and ensure all required fields are present
    const mappedContacts = contacts.map((contact: any) => {
      // Ensure countries have the required code property
      const countries = contact.countries?.map((country: any) => ({
        ...country,
        code: country.code || `C${country.id.slice(-1)}` // Add code if missing
      }));
      
      return {
        ...contact,
        emailVerified: contact.email_verified_status,
        countries: countries || []
      };
    });
    
    return {
      contacts: mappedContacts as unknown as MediaContactTableItem[],
      totalCount
    };
  } catch (error) {
    console.error('Error fetching media contacts:', error);
    
    // If it's already a MediaContactError, re-throw it
    if (error instanceof MediaContactError) {
      throw error;
    }
    
    // Otherwise, assume it's a database connection issue
    throw new MediaContactError('Error connecting to the database. Please try again later.', MediaContactErrorType.DB_NOT_CONNECTED);
  }
}

/**
 * Upsert a media contact in the database
 * 
 * @param contact - The media contact to upsert
 * @returns The upserted media contact
 * @throws MediaContactError when database is not connected
 */
export async function upsertMediaContactInDb(contact: MediaContactTableItem): Promise<MediaContactTableItem> {
  try {
    // Test database connection first
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (connectionError) {
      console.error('Database connection error:', connectionError);
      throw new MediaContactError('Database connection failed. Please check your database configuration.', MediaContactErrorType.DB_NOT_CONNECTED);
    }

    // Extract relation data for separate handling
    const { outlets, countries, beats, ...contactDataRaw } = contact;
    
    // Transform potentially null array fields to undefined or empty arrays for Prisma compatibility
    const contactData = {
      ...contactDataRaw,
      // Convert null arrays to undefined (Prisma accepts undefined but not null)
      socials: contactDataRaw.socials === null ? undefined : contactDataRaw.socials,
      authorLinks: contactDataRaw.authorLinks === null ? undefined : contactDataRaw.authorLinks,
      languages: contactDataRaw.languages === null ? undefined : contactDataRaw.languages,
    };

    // Prepare the upsert operation for the main contact
    const upsertedContact = await prisma.mediaContact.upsert({
      where: { id: contact.id },
      update: {
        ...contactData,
        email_verified_status: contact.emailVerified,
        // Clear existing relations to avoid duplicates
        outlets: { set: [] },
        countries: { set: [] },
        beats: { set: [] },
      },
      create: {
        ...contactData,
        email_verified_status: contact.emailVerified,
      },
      include: {
        outlets: true,
        countries: true,
        beats: true,
      },
    });

    // Handle relations separately to ensure proper connection
    if (outlets && outlets.length > 0) {
      await Promise.all(outlets.map(outlet => 
        prisma.outlet.upsert({
          where: { id: outlet.id },
          update: { name: outlet.name },
          create: { id: outlet.id, name: outlet.name },
        })
      ));

      // Connect outlets to the contact
      await prisma.mediaContact.update({
        where: { id: upsertedContact.id },
        data: {
          outlets: {
            connect: outlets.map(outlet => ({ id: outlet.id })),
          },
        },
      });
    }

    // Handle countries with proper code property
    if (countries && countries.length > 0) {
      await Promise.all(countries.map(country => 
        prisma.country.upsert({
          where: { id: country.id },
          update: { 
            name: country.name,
            code: country.code || `C${country.id.slice(-1)}` // Ensure code is present
          },
          create: { 
            id: country.id, 
            name: country.name,
            code: country.code || `C${country.id.slice(-1)}` // Ensure code is present
          },
        })
      ));

      // Connect countries to the contact
      await prisma.mediaContact.update({
        where: { id: upsertedContact.id },
        data: {
          countries: {
            connect: countries.map(country => ({ id: country.id })),
          },
        },
      });
    }

    // Handle beats
    if (beats && beats.length > 0) {
      await Promise.all(beats.map(beat => 
        prisma.beat.upsert({
          where: { id: beat.id },
          update: { name: beat.name },
          create: { id: beat.id, name: beat.name },
        })
      ));

      // Connect beats to the contact
      await prisma.mediaContact.update({
        where: { id: upsertedContact.id },
        data: {
          beats: {
            connect: beats.map(beat => ({ id: beat.id })),
          },
        },
      });
    }

    // Fetch the fully updated contact with all relations
    const updatedContact = await prisma.mediaContact.findUnique({
      where: { id: upsertedContact.id },
      select: mediaContactFullSelect,
    });

    if (!updatedContact) {
      throw new Error('Failed to retrieve updated contact');
    }

    // Map the contact to include emailVerified property and ensure all required fields are present
    const mappedContact = {
      ...updatedContact,
      emailVerified: updatedContact.email_verified_status,
      countries: updatedContact.countries?.map(country => ({
        ...country,
        code: country.code || `C${country.id.slice(-1)}` // Ensure code is present
      })) || []
    };

    return mappedContact as unknown as MediaContactTableItem;
  } catch (error) {
    console.error('Error upserting media contact:', error);
    
    // If it's already a MediaContactError, re-throw it
    if (error instanceof MediaContactError) {
      throw error;
    }
    
    // Otherwise, assume it's a database connection issue
    throw new MediaContactError('Error connecting to the database. Please try again later.', MediaContactErrorType.DB_NOT_CONNECTED);
  }
}
