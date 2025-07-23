"use server";

import { prisma } from '@/lib/prisma';

export type Outlet = {
  id: string;
  name: string;
};

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
      },
    });

    return outlet;
  } catch (error) {
    console.error('Error getting outlet by name:', error);
    return null;
  }
}
