"use server";

import { prisma } from "@/lib/prisma";

export interface Publisher {
  id: string;
  name: string;
  description?: string | null;
  website?: string | null;
  outletCount?: number;
  outlets?: Array<{
    id: string;
    name: string;
    description?: string | null;
    website?: string | null;
  }>;
  countries?: Array<{
    id: string;
    name: string;
    code: string;
    flag_emoji: string;
  }>;
}

/**
 * Server action to fetch all publishers from the database with outlet counts
 * @returns Array of Publisher objects with counts and relationships
 */
export async function getAllPublishers(): Promise<Publisher[]> {
  try {
    console.log('Fetching all publishers from database with outlet counts...');
    
    // Validate Prisma client availability
    if (!prisma) {
      throw new Error('Prisma client is not available');
    }
    
    const publishers = await prisma.publisher.findMany({
      include: {
        outlets: {
          select: {
            id: true,
            name: true,
            description: true,
            website: true,
            mediaContacts: {
              select: {
                countries: {
                  select: {
                    id: true,
                    name: true,
                    code: true,
                    flag_emoji: true,
                  },
                },
              },
            },
          }
        }
      },
      orderBy: {
        name: 'asc',
      },
    });
    
    // Transform data to include counts and countries
    const transformedPublishers: Publisher[] = publishers.map(publisher => {
      // Extract unique countries from all outlets' media contacts
      const allCountries = publisher.outlets.flatMap((outlet: any) => 
        outlet.mediaContacts.flatMap((contact: any) => contact.countries)
      );
      
      // Remove duplicates based on country ID
      const uniqueCountries = allCountries.filter((country: any, index: number, self: any[]) => 
        index === self.findIndex((c: any) => c.id === country.id)
      );

      return {
        id: publisher.id,
        name: publisher.name,
        description: publisher.description,
        website: publisher.website,
        outletCount: publisher.outlets.length,
        outlets: publisher.outlets.map((outlet: any) => ({
          id: outlet.id,
          name: outlet.name,
          description: outlet.description,
          website: outlet.website,
        })),
        countries: uniqueCountries,
      };
    });
    
    console.log(`Successfully fetched ${transformedPublishers.length} publishers from database`);
    return transformedPublishers;
  } catch (error) {
    console.error("Failed to fetch publishers:", error);
    // Return empty array as fallback
    return [];
  }
}

/**
 * Server action to create a new publisher in database
 * @param publisherData - Publisher data to create
 * @returns Created Publisher object
 */
export async function createPublisher(publisherData: { 
  name: string; 
  description?: string; 
  website?: string; 
}): Promise<Publisher> {
  try {
    console.log('Creating publisher:', publisherData);
    
    const newPublisher = await prisma.publisher.create({
      data: {
        name: publisherData.name.trim(),
        description: publisherData.description?.trim() || null,
        website: publisherData.website?.trim() || null,
      },
      include: {
        outlets: {
          select: {
            id: true,
            name: true,
            description: true,
            website: true,
          }
        }
      },
    });
    
    const transformedPublisher: Publisher = {
      id: newPublisher.id,
      name: newPublisher.name,
      description: newPublisher.description,
      website: newPublisher.website,
      outletCount: newPublisher.outlets.length,
      outlets: newPublisher.outlets,
    };
    
    console.log('Successfully created publisher:', newPublisher.id);
    return transformedPublisher;
  } catch (error) {
    console.error('Error creating publisher:', error);
    
    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      throw new Error(`Publisher with name "${publisherData.name}" already exists`);
    }
    
    throw new Error('Failed to create publisher');
  }
}

/**
 * Server action to update an existing publisher in database
 * @param id - Publisher ID to update
 * @param publisherData - Updated publisher data
 * @returns Updated Publisher object
 */
export async function updatePublisher(
  id: string, 
  publisherData: { name: string; description?: string; website?: string; }
): Promise<Publisher> {
  try {
    console.log('Updating publisher:', id, publisherData);
    
    const updatedPublisher = await prisma.publisher.update({
      where: { id },
      data: {
        name: publisherData.name.trim(),
        description: publisherData.description?.trim() || null,
        website: publisherData.website?.trim() || null,
      },
      include: {
        outlets: {
          select: {
            id: true,
            name: true,
            description: true,
            website: true,
          }
        }
      },
    });
    
    const transformedPublisher: Publisher = {
      id: updatedPublisher.id,
      name: updatedPublisher.name,
      description: updatedPublisher.description,
      website: updatedPublisher.website,
      outletCount: updatedPublisher.outlets.length,
      outlets: updatedPublisher.outlets,
    };
    
    console.log('Successfully updated publisher:', updatedPublisher.id);
    return transformedPublisher;
  } catch (error) {
    console.error('Error updating publisher:', error);
    
    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      throw new Error(`Publisher with name "${publisherData.name}" already exists`);
    }
    
    // Handle not found
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      throw new Error('Publisher not found');
    }
    
    throw new Error('Failed to update publisher');
  }
}

/**
 * Server action to delete a publisher from database
 * @param id - Publisher ID to delete
 * @returns Success message
 */
export async function deletePublisher(id: string): Promise<{ message: string }> {
  try {
    console.log('Deleting publisher:', id);
    
    await prisma.publisher.delete({
      where: { id },
    });
    
    console.log('Successfully deleted publisher:', id);
    return { message: 'Publisher deleted successfully' };
  } catch (error) {
    console.error('Error deleting publisher:', error);
    
    // Handle not found
    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      throw new Error('Publisher not found');
    }
    
    throw new Error('Failed to delete publisher');
  }
}

/**
 * Search for publishers by name
 * @param query The search query string
 * @returns Array of matching publishers
 */
export async function searchPublishers(query: string): Promise<Publisher[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  try {
    const publishers = await prisma.publisher.findMany({
      where: {
        OR: [
          {
            name: {
              contains: query.trim(),
              mode: 'insensitive',
            },
          },
          {
            description: {
              contains: query.trim(),
              mode: 'insensitive',
            },
          },
        ],
      },
      include: {
        outlets: {
          select: {
            id: true,
            name: true,
            description: true,
            website: true,
          }
        }
      },
      orderBy: {
        name: 'asc',
      },
      take: 10,
    });

    return publishers.map(publisher => ({
      id: publisher.id,
      name: publisher.name,
      description: publisher.description,
      website: publisher.website,
      outletCount: publisher.outlets.length,
      outlets: publisher.outlets,
    }));
  } catch (error) {
    console.error('Error searching publishers:', error);
    return [];
  }
}
