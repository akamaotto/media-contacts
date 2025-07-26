"use server";

import { prisma } from "@/lib/prisma";

export interface Beat {
  id: string;
  name: string;
  description?: string | null;
  contactCount?: number;
  countries?: Array<{
    id: string;
    name: string;
    code: string;
    flag_emoji?: string | null;
  }>;
  categories?: Array<{
    id: string;
    name: string;
    description?: string | null;
    color?: string | null;
  }>;
}

/**
 * Server action to fetch all beats from the database with contact counts and countries
 * Following Rust-inspired explicit return type and error handling
 * @returns Array of Beat objects with contact counts and countries, or fallback data if the database query fails
 */
export async function getAllBeats(): Promise<Beat[]> {
  try {
    console.log('Fetching all beats from database with contact counts and countries...');
    
    // Validate Prisma client availability using fail-fast approach
    if (!prisma) {
      throw new Error('Prisma client is not available');
    }
    
    const beats = await prisma.beat.findMany({
      include: {
        mediaContacts: {
          include: {
            countries: {
              select: {
                id: true,
                name: true,
                code: true,
                flag_emoji: true
              }
            }
          }
        },
        categories: {
          select: {
            id: true,
            name: true,
            description: true,
            color: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
    
    // Transform data to include contact counts and unique countries
    const transformedBeats: Beat[] = beats.map(beat => {
      const contactCount = beat.mediaContacts.length;
      
      // Get unique countries from all contacts covering this beat
      const countryMap = new Map();
      beat.mediaContacts.forEach(contact => {
        contact.countries.forEach(country => {
          if (!countryMap.has(country.id)) {
            countryMap.set(country.id, {
              id: country.id,
              name: country.name,
              code: country.code,
              flag_emoji: country.flag_emoji
            });
          }
        });
      });
      
      return {
        id: beat.id,
        name: beat.name,
        description: beat.description,
        contactCount,
        countries: Array.from(countryMap.values())
      };
    });
    
    console.log(`Successfully fetched ${transformedBeats.length} beats from database`);
    return transformedBeats;
  } catch (error) {
    console.error("Failed to fetch beats:", error);
    // Return fallback data to prevent UI breakage
    return generateFallbackBeats();
  }
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use getAllBeats() instead
 */
export async function getBeats(): Promise<Beat[]> {
  return getAllBeats();
}

/**
 * Generate fallback beat data when database query fails
 * @returns Array of sample Beat objects
 */
function generateFallbackBeats(): Beat[] {
  console.log('Generating fallback beats data');
  
  // Return a small set of common beats as fallback
  return [
    { id: 'tech', name: 'Technology', description: 'Technology news and trends' },
    { id: 'business', name: 'Business', description: 'Business and finance news' },
    { id: 'health', name: 'Health', description: 'Health and wellness topics' },
    { id: 'science', name: 'Science', description: 'Scientific discoveries and research' },
    { id: 'politics', name: 'Politics', description: 'Political news and analysis' },
    { id: 'entertainment', name: 'Entertainment', description: 'Entertainment industry news' },
    { id: 'sports', name: 'Sports', description: 'Sports news and coverage' },
  ];
}

/**
 * Search for beats by name
 * @param query The search query string
 * @returns Array of matching beats
 */
export async function searchBeats(query: string): Promise<Beat[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  try {
    const beats = await prisma.beat.findMany({
      where: {
        name: {
          contains: query.trim(),
          mode: 'insensitive', // Case-insensitive search
        },
      },
      select: {
        id: true,
        name: true,
        description: true,
      },
      orderBy: {
        name: 'asc',
      },
      take: 10, // Limit results to 10 for performance
    });

    return beats;
  } catch (error) {
    console.error('Error searching beats:', error);
    return [];
  }
}

/**
 * Get beat by exact name
 * @param name The exact beat name
 * @returns The beat if found, null otherwise
 */
export async function getBeatByName(name: string): Promise<Beat | null> {
  if (!name || name.trim().length === 0) {
    return null;
  }

  try {
    const beat = await prisma.beat.findUnique({
      where: {
        name: name.trim(),
      },
      select: {
        id: true,
        name: true,
        description: true,
      },
    });

    return beat;
  } catch (error) {
    console.error('Error getting beat by name:', error);
    return null;
  }
}

/**
 * Server action to create a new beat in database
 * @param beatData - Beat data to create
 * @returns Created Beat object
 */
export async function createBeat(beatData: { name: string; description?: string }, categoryIds?: string[]): Promise<Beat> {
  try {
    console.log('Creating beat:', beatData, 'with categories:', categoryIds);
    
    const newBeat = await prisma.beat.create({
      data: {
        name: beatData.name.trim(),
        description: beatData.description?.trim() || null,
        categories: categoryIds && categoryIds.length > 0 ? {
          connect: categoryIds.map(id => ({ id }))
        } : undefined,
      },
      include: {
        categories: {
          select: {
            id: true,
            name: true,
            description: true,
            color: true,
          },
        },
      },
    });
    
    console.log('Successfully created beat:', newBeat.id);
    return newBeat;
  } catch (error) {
    console.error('Error creating beat:', error);
    
    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      throw new Error(`Beat with name "${beatData.name}" already exists`);
    }
    
    throw new Error('Failed to create beat');
  }
}

/**
 * Server action to update an existing beat in database
 * @param id - Beat ID to update
 * @param beatData - Updated beat data
 * @returns Updated Beat object
 */
export async function updateBeat(id: string, beatData: { name: string; description?: string }, categoryIds?: string[]): Promise<Beat> {
  try {
    console.log('Updating beat:', id, beatData, 'with categories:', categoryIds);
    
    const updatedBeat = await prisma.beat.update({
      where: { id },
      data: {
        name: beatData.name.trim(),
        description: beatData.description?.trim() || null,
        categories: categoryIds !== undefined ? {
          set: categoryIds.map(id => ({ id }))
        } : undefined,
      },
      include: {
        categories: {
          select: {
            id: true,
            name: true,
            description: true,
            color: true,
          },
        },
      },
    });
    
    console.log('Successfully updated beat:', updatedBeat.id);
    return updatedBeat;
  } catch (error) {
    console.error('Error updating beat:', error);
    
    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      throw new Error(`Beat with name "${beatData.name}" already exists`);
    }
    
    // Handle not found
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      throw new Error('Beat not found');
    }
    
    throw new Error('Failed to update beat');
  }
}

/**
 * Server action to delete a beat from database
 * @param id - Beat ID to delete
 * @returns Success message
 */
export async function deleteBeat(id: string): Promise<{ message: string }> {
  try {
    console.log('Deleting beat:', id);
    
    await prisma.beat.delete({
      where: { id },
    });
    
    console.log('Successfully deleted beat:', id);
    return { message: 'Beat deleted successfully' };
  } catch (error) {
    console.error('Error deleting beat:', error);
    
    // Handle not found
    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      throw new Error('Beat not found');
    }
    
    throw new Error('Failed to delete beat');
  }
}
