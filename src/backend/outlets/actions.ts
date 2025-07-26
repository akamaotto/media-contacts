"use server";

import { prisma } from '@/lib/prisma';

export interface Outlet {
  id: string;
  name: string;
  description?: string | null;
  website?: string | null;
  publisher?: {
    id: string;
    name: string;
  } | null;
  categories?: Array<{
    id: string;
    name: string;
    description?: string | null;
    color?: string | null;
  }>;
  contactCount?: number;
  countries?: Array<{
    id: string;
    name: string;
    code: string;
    flag_emoji?: string | null;
  }>;
}

/**
 * Get all outlets with full relationships
 * @returns Array of outlets with categories, publisher, and contact counts
 */
export async function getAllOutlets(): Promise<Outlet[]> {
  try {
    // First, get outlets with basic relationships
    const outletsWithRelations = await prisma.outlet.findMany({
      include: {
        publisher: {
          select: {
            id: true,
            name: true,
          },
        },
        categories: {
          select: {
            id: true,
            name: true,
            description: true,
            color: true,
          },
        },
        _count: {
          select: {
            mediaContacts: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Get unique countries for each outlet through media contacts
    const outletsWithCountries = await Promise.all(
      outletsWithRelations.map(async (outlet) => {
        // Get countries for this outlet through its media contacts
        const mediaContactsWithCountries = await prisma.mediaContact.findMany({
          where: {
            outlets: {
              some: {
                id: outlet.id,
              },
            },
          },
          include: {
            countries: {
              select: {
                id: true,
                name: true,
                code: true,
                flag_emoji: true,
              },
            },
          },
        });

        // Extract unique countries
        const allCountries = mediaContactsWithCountries.flatMap((contact: any) => contact.countries);
        const uniqueCountries = allCountries.filter((country: any, index: number, self: any[]) => 
          index === self.findIndex((c: any) => c.id === country.id)
        );

        return {
          id: outlet.id,
          name: outlet.name,
          description: outlet.description,
          website: outlet.website,
          publisher: (outlet as any).publisher,
          categories: (outlet as any).categories,
          contactCount: (outlet as any)._count.mediaContacts,
          countries: uniqueCountries,
        } as Outlet;
      })
    );

    return outletsWithCountries;
  } catch (error) {
    console.error('Error fetching outlets:', error);
    throw new Error('Failed to fetch outlets');
  }
}

/**
 * Search for outlets by name
 * @param query The search query string
 * @returns Array of matching outlets
 */
export async function searchOutlets(query: string): Promise<Outlet[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  try {
    const outlets = await prisma.outlet.findMany({
      where: {
        name: {
          contains: query.trim(),
          mode: 'insensitive', // Case-insensitive search
        },
      },
      select: {
        id: true,
        name: true,
        website: true,
      },
      orderBy: {
        name: 'asc',
      },
      take: 10, // Limit results to 10 for performance
    });

    return outlets;
  } catch (error) {
    console.error('Error searching outlets:', error);
    return [];
  }
}

/**
 * Get outlet by exact name
 * @param name The exact outlet name
 * @returns The outlet if found, null otherwise
 */
export async function getOutletByName(name: string): Promise<Outlet | null> {
  if (!name || name.trim().length === 0) {
    return null;
  }

  try {
    const outlet = await prisma.outlet.findUnique({
      where: {
        name: name.trim(),
      },
      select: {
        id: true,
        name: true,
        description: true,
        website: true,
      },
    });

    return outlet;
  } catch (error) {
    console.error('Error getting outlet by name:', error);
    return null;
  }
}

/**
 * Create a new outlet
 * @param outletData Outlet data to create
 * @param categoryIds Optional array of category IDs to assign
 * @returns Created outlet
 */
export async function createOutlet(
  outletData: { name: string; description?: string; website?: string; publisherId?: string },
  categoryIds?: string[]
): Promise<Outlet> {
  try {
    console.log('Creating outlet:', outletData, 'with categories:', categoryIds);
    
    const newOutlet = await prisma.outlet.create({
      data: {
        name: outletData.name.trim(),
        description: outletData.description?.trim() || null,
        website: outletData.website?.trim() || null,
        publisherId: outletData.publisherId || null,
        categories: categoryIds && categoryIds.length > 0 ? {
          connect: categoryIds.map(id => ({ id }))
        } : undefined,
      },
      include: {
        publisher: {
          select: {
            id: true,
            name: true,
          },
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
    });
    
    console.log('Successfully created outlet:', newOutlet.id);
    return { ...newOutlet, contactCount: 0, countries: [] };
  } catch (error) {
    console.error('Error creating outlet:', error);
    
    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      throw new Error(`Outlet with name "${outletData.name}" already exists`);
    }
    
    throw new Error('Failed to create outlet');
  }
}

/**
 * Update an existing outlet
 * @param id Outlet ID to update
 * @param outletData Updated outlet data
 * @param categoryIds Optional array of category IDs to assign
 * @returns Updated outlet
 */
export async function updateOutlet(
  id: string,
  outletData: { name: string; description?: string; website?: string; publisherId?: string },
  categoryIds?: string[]
): Promise<Outlet> {
  try {
    console.log('Updating outlet:', id, outletData, 'with categories:', categoryIds);
    
    const updatedOutlet = await prisma.outlet.update({
      where: { id },
      data: {
        name: outletData.name.trim(),
        description: outletData.description?.trim() || null,
        website: outletData.website?.trim() || null,
        publisherId: outletData.publisherId || null,
        categories: categoryIds !== undefined ? {
          set: categoryIds.map(id => ({ id }))
        } : undefined,
      },
      include: {
        publisher: {
          select: {
            id: true,
            name: true,
          },
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
    });
    
    console.log('Successfully updated outlet:', updatedOutlet.id);
    return { ...updatedOutlet, contactCount: 0, countries: [] };
  } catch (error) {
    console.error('Error updating outlet:', error);
    
    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      throw new Error(`Outlet with name "${outletData.name}" already exists`);
    }
    
    // Handle not found
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      throw new Error('Outlet not found');
    }
    
    throw new Error('Failed to update outlet');
  }
}

/**
 * Delete an outlet
 * @param id Outlet ID to delete
 * @returns Success message
 */
export async function deleteOutlet(id: string): Promise<{ message: string }> {
  try {
    console.log('Deleting outlet:', id);
    
    await prisma.outlet.delete({
      where: { id },
    });
    
    console.log('Successfully deleted outlet:', id);
    return { message: 'Outlet deleted successfully' };
  } catch (error) {
    console.error('Error deleting outlet:', error);
    
    // Handle not found
    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      throw new Error('Outlet not found');
    }
    
    throw new Error('Failed to delete outlet');
  }
}
