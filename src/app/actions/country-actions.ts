"use server";

import { prisma } from "@/lib/prisma";

export interface Country {
  id: string;
  name: string;
  code?: string | null;
}

/**
 * Server action to fetch all countries from the database
 * Following Rust-inspired explicit return type and error handling
 * @returns Array of Country objects, or fallback data if the database query fails
 */
export async function getCountries(): Promise<Country[]> {
  try {
    console.log('Fetching countries from database...');
    
    // Validate Prisma client availability using fail-fast approach
    if (!prisma) {
      throw new Error('Prisma client is not available');
    }
    
    const countries = await prisma.country.findMany({
      select: {
        id: true,
        name: true,
        code: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
    
    console.log(`Successfully fetched ${countries.length} countries from database`);
    
    // Validate the returned data
    if (!countries || !Array.isArray(countries)) {
      console.warn('Country data is not in expected format, using fallback data');
      return generateFallbackCountries();
    }
    
    return countries;
  } catch (error) {
    console.error("Failed to fetch countries:", error);
    // Return fallback data to prevent UI breakage
    return generateFallbackCountries(); 
  }
}

/**
 * Generate fallback country data when database query fails
 * @returns Array of sample Country objects
 */
function generateFallbackCountries(): Country[] {
  console.log('Generating fallback countries data');
  
  // Return a small set of common countries as fallback
  return [
    { id: 'us', name: 'United States', code: 'US' },
    { id: 'ca', name: 'Canada', code: 'CA' },
    { id: 'uk', name: 'United Kingdom', code: 'GB' },
    { id: 'de', name: 'Germany', code: 'DE' },
    { id: 'fr', name: 'France', code: 'FR' },
    { id: 'jp', name: 'Japan', code: 'JP' },
    { id: 'au', name: 'Australia', code: 'AU' },
  ];
}
