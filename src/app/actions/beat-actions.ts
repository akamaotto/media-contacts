"use server";

import { prisma } from "@/lib/prisma";

export interface Beat {
  id: string;
  name: string;
  description?: string | null;
}

/**
 * Server action to fetch all beats from the database
 * Following Rust-inspired explicit return type and error handling
 * @returns Array of Beat objects, or fallback data if the database query fails
 */
export async function getBeats(): Promise<Beat[]> {
  try {
    console.log('Fetching beats from database...');
    
    // Validate Prisma client availability using fail-fast approach
    if (!prisma) {
      throw new Error('Prisma client is not available');
    }
    
    const beats = await prisma.beat.findMany({
      select: {
        id: true,
        name: true,
        description: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
    
    console.log(`Successfully fetched ${beats.length} beats from database`);
    
    // Validate the returned data
    if (!beats || !Array.isArray(beats)) {
      console.warn('Beat data is not in expected format, using fallback data');
      return generateFallbackBeats();
    }
    
    return beats;
  } catch (error) {
    console.error("Failed to fetch beats:", error);
    // Return fallback data to prevent UI breakage
    return generateFallbackBeats();
  }
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
