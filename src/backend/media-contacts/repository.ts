import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { MediaContactTableItem } from '@/components/features/media-contacts/types';

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
      code: true
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
    // Remove the explicit connection test as it's causing issues
    // Prisma will handle connection errors automatically

    // Initialize filters with default values if not provided
    const pageNumber = filters?.page || 1;
    const itemsPerPage = filters?.pageSize || 10;
    console.log('Repository received filters:', JSON.stringify(filters));
    // Build filter conditions using Prisma's WHERE clause
    const whereClause: Prisma.MediaContactWhereInput = {};

    // Apply filters if provided
    if (filters) {
      const conditions: Prisma.MediaContactWhereInput[] = [];

      // Search term filter (name, email, outlet name)
      if (filters.searchTerm && filters.searchTerm.trim() !== '') {
        const searchTerm = filters.searchTerm.trim();
        console.log(`Applying search term filter: "${searchTerm}"`);
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

      // Region filter - more efficient query
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

      // Language filter - more efficient query
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

      // Apply conditions only if we have some
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

    // Execute paginated query with built filters - optimized approach
    const contacts = await prisma.mediaContact.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        title: true,
        email_verified_status: true,
        updated_at: true,
        bio: true,
        socials: true,
        authorLinks: true,
      },
      orderBy: { updated_at: 'desc' },
      skip: (pageNumber - 1) * itemsPerPage,
      take: itemsPerPage,
    });

    // Load relationships separately for better performance
    const contactIds = contacts.map(c => c.id);

    const [outlets, countries, beats] = await Promise.all([
      // Load outlets
      prisma.mediaContact.findMany({
        where: { id: { in: contactIds } },
        select: {
          id: true,
          outlets: { select: { id: true, name: true } }
        }
      }),
      // Load countries
      prisma.mediaContact.findMany({
        where: { id: { in: contactIds } },
        select: {
          id: true,
          countries: { select: { id: true, name: true, code: true } }
        }
      }),
      // Load beats
      prisma.mediaContact.findMany({
        where: { id: { in: contactIds } },
        select: {
          id: true,
          beats: { select: { id: true, name: true } }
        }
      })
    ]);

    // Create lookup maps for relationships
    const outletsMap = new Map(outlets.map(o => [o.id, o.outlets]));
    const countriesMap = new Map(countries.map(c => [c.id, c.countries]));
    const beatsMap = new Map(beats.map(b => [b.id, b.beats]));

    // Combine the data
    const contactsWithRelations = contacts.map(contact => ({
      ...contact,
      outlets: outletsMap.get(contact.id) || [],
      countries: countriesMap.get(contact.id) || [],
      beats: beatsMap.get(contact.id) || []
    }));

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
    const mappedContacts = contactsWithRelations.map((contact: any) => {
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
    // Remove the explicit connection test as it's causing issues
    // Prisma will handle connection errors automatically

    // Extract relation data for separate handling
    const { outlets, countries, beats, emailVerified, ...contactDataRaw } = contact;

    // Transform potentially null array fields to undefined or empty arrays for Prisma compatibility
    const contactData = {
      ...contactDataRaw,
      // Convert null arrays to undefined (Prisma accepts undefined but not null)
      socials: contactDataRaw.socials === null ? undefined : contactDataRaw.socials,
      authorLinks: contactDataRaw.authorLinks === null ? undefined : contactDataRaw.authorLinks,
      languages: contactDataRaw.languages === null ? undefined : contactDataRaw.languages,
    };

    // Debug logging
    console.log('Repository: Processing contact with ID:', contact.id);
    console.log('Repository: Contact email:', contact.email);
    console.log('Repository: Contact ID type:', typeof contact.id);
    console.log('Repository: Contact ID length:', contact.id?.length);
    console.log('Repository: ContactData email:', contactData.email);
    console.log('Repository: ContactData has ID:', 'id' in contactData);
    console.log('Repository: ContactData ID:', contactData.id);

    // Prepare the upsert operation for the main contact
    // If contact has an ID, it's an update; otherwise, it's a create
    let upsertedContact;

    if (contact.id) {
      console.log('Repository: Attempting to update existing contact');
      // First check if the contact exists
      console.log('Repository: Looking for existing contact with ID:', contact.id);
      const existingContact = await prisma.mediaContact.findUnique({
        where: { id: contact.id }
      });

      console.log('Repository: Existing contact found:', {
        found: !!existingContact,
        existingId: existingContact?.id,
        existingEmail: existingContact?.email
      });

      if (!existingContact) {
        console.log('Repository: ❌ CRITICAL ERROR - Contact with ID not found!');
        console.log('Repository: This means the frontend is passing an invalid contact ID');
        console.log('Repository: Contact ID:', contact.id);
        console.log('Repository: Contact email:', contact.email);
        console.log('Repository: This will cause a create operation which conflicts with existing email');

        // Contact doesn't exist, create new one
        // Let Prisma handle email uniqueness with its built-in constraint
        // If there's a conflict, it will throw a P2002 error which we handle below

        upsertedContact = await prisma.mediaContact.create({
          data: {
            ...contactData,
            email_verified_status: contact.emailVerified,
          },
          include: {
            outlets: true,
            countries: true,
            beats: true,
          },
        });
      } else {
        console.log('Repository: Contact found, performing update');
        console.log('Repository: Email change check:', {
          existing: existingContact.email,
          new: contact.email,
          changed: existingContact.email !== contact.email
        });

        // Contact exists, update it
        // Let Prisma handle email uniqueness constraints
        console.log('Repository: Proceeding with update, Prisma will handle email uniqueness');

        upsertedContact = await prisma.mediaContact.update({
          where: { id: contact.id },
          data: {
            ...contactData,
            email_verified_status: contact.emailVerified,
            // Clear existing relations to avoid duplicates
            outlets: { set: [] },
            countries: { set: [] },
            beats: { set: [] },
          },
          include: {
            outlets: true,
            countries: true,
            beats: true,
          },
        });
      }
    } else {
      console.log('Repository: No ID provided, creating new contact');
      // No ID provided, create new contact
      // Let Prisma handle email uniqueness with its built-in constraint

      upsertedContact = await prisma.mediaContact.create({
        data: {
          ...contactData,
          email_verified_status: contact.emailVerified,
        },
        include: {
          outlets: true,
          countries: true,
          beats: true,
        },
      });
    }

    // Handle relations separately to ensure proper connection
    if (outlets && outlets.length > 0) {
      // Only process outlets that have valid IDs or names
      const validOutlets = outlets.filter(outlet => outlet.name && outlet.name.trim());

      if (validOutlets.length > 0) {
        // For outlets with names but no IDs, find or create them
        const outletConnections = [];

        for (const outlet of validOutlets) {
          if (outlet.id && outlet.id.trim()) {
            // Has ID, try to connect directly
            outletConnections.push({ id: outlet.id });
          } else if (outlet.name && outlet.name.trim()) {
            // Has name but no ID, find or create by name
            const existingOutlet = await prisma.outlet.upsert({
              where: { name: outlet.name },
              update: {},
              create: { name: outlet.name },
            });
            outletConnections.push({ id: existingOutlet.id });
          }
        }

        // Connect outlets to the contact
        if (outletConnections.length > 0) {
          await prisma.mediaContact.update({
            where: { id: upsertedContact.id },
            data: {
              outlets: {
                connect: outletConnections,
              },
            },
          });
        }
      }
    }

    // Handle countries with proper code property
    if (countries && countries.length > 0) {
      // Only process countries that have valid IDs
      const validCountries = countries.filter(country => country.id && country.id.trim());

      if (validCountries.length > 0) {
        // Connect countries to the contact (countries should already exist)
        await prisma.mediaContact.update({
          where: { id: upsertedContact.id },
          data: {
            countries: {
              connect: validCountries.map(country => ({ id: country.id })),
            },
          },
        });
      }
    }

    // Handle beats
    if (beats && beats.length > 0) {
      // Only process beats that have valid names
      const validBeats = beats.filter(beat => beat.name && beat.name.trim());

      if (validBeats.length > 0) {
        // For beats with names but no IDs, find or create them
        const beatConnections = [];

        for (const beat of validBeats) {
          if (beat.id && beat.id.trim()) {
            // Has ID, try to connect directly
            beatConnections.push({ id: beat.id });
          } else if (beat.name && beat.name.trim()) {
            // Has name but no ID, find or create by name
            const existingBeat = await prisma.beat.upsert({
              where: { name: beat.name },
              update: {},
              create: { name: beat.name },
            });
            beatConnections.push({ id: existingBeat.id });
          }
        }

        // Connect beats to the contact
        if (beatConnections.length > 0) {
          await prisma.mediaContact.update({
            where: { id: upsertedContact.id },
            data: {
              beats: {
                connect: beatConnections,
              },
            },
          });
        }
      }
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

    // Handle specific Prisma errors
    if (error instanceof Error) {
      // Check for specific Prisma error codes
      if ('code' in error) {
        const prismaError = error as any;
        switch (prismaError.code) {
          case 'P2002':
            // Check what field caused the unique constraint violation
            const prismaError = error as any;
            if (prismaError.meta?.target?.includes('email')) {
              throw new Error('A contact with this email already exists.');
            } else {
              // For other unique constraint violations, provide a generic message
              console.log('Repository: P2002 error on field:', prismaError.meta?.target);
              throw new Error('A record with this information already exists.');
            }
          case 'P2025':
            throw new Error('Contact not found.');
          case 'P1001':
          case 'P1008':
          case 'P1017':
            throw new MediaContactError('Database connection failed. Please try again later.', MediaContactErrorType.DB_NOT_CONNECTED);
          default:
            throw new Error(`Database error: ${error.message}`);
        }
      }

      // Generic error handling
      throw new Error(`Failed to save contact: ${error.message}`);
    }

    // Fallback error
    throw new Error('An unexpected error occurred while saving the contact.');
  }
}
