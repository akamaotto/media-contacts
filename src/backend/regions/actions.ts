"use server";

import { prisma } from "@/lib/prisma";
import { regions, Region } from "@/lib/country-data";
import type { Region as PrismaRegion } from "@prisma/client";

/**
 * Server action to fetch all available regions from database
 * Following Rust-inspired explicit return type and error handling
 * @returns Array of Region objects from database, with static fallback
 */
export async function getAllRegions(): Promise<Region[]> {
  try {
    console.log('Fetching all regions from database...');
    
    // Fetch regions from database with associated countries for flag display
    const dbRegions = await prisma.region.findMany({
      include: {
        countries: {
          select: {
            id: true,
            name: true,
            code: true,
            flag_emoji: true,
          }
        }
      },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    });
    
    // Convert Prisma regions to Region interface format
    const formattedRegions: Region[] = dbRegions.map(region => ({
      code: region.code,
      name: region.name,
      category: region.category as any, // Type assertion for category
      parentCode: region.parent_code || undefined,
      description: region.description || undefined,
      // Include countries data for flag display in table
      countries: region.countries.map(country => ({
        id: country.id,
        name: country.name,
        code: country.code || '', // Handle nullable code
        flag_emoji: country.flag_emoji || undefined,
      })) || [],
    }));
    
    // If no database regions exist, seed with static data
    if (formattedRegions.length === 0) {
      console.log('No regions in database, seeding with static data...');
      await seedRegionsFromStaticData();
      // Recursively call to get the seeded data
      return getAllRegions();
    }
    
    console.log(`Successfully fetched ${formattedRegions.length} regions from database`);
    return formattedRegions;
  } catch (error) {
    console.error("Error fetching regions from database:", error);
    // Return static data as fallback
    console.log('Falling back to static region data');
    return regions || generateFallbackRegions();
  }
}

/**
 * Generate fallback region data when static data is unavailable
 * @returns Array of common Region objects
 */
function generateFallbackRegions(): Region[] {
  console.log('Generating fallback regions data');
  
  // Return a set of common regions as fallback
  return [
    { code: 'na', name: 'North America', category: 'continent' },
    { code: 'eu', name: 'Europe', category: 'continent' },
    { code: 'as', name: 'Asia', category: 'continent' },
    { code: 'af', name: 'Africa', category: 'continent' },
    { code: 'oc', name: 'Oceania', category: 'continent' },
    { code: 'sa', name: 'South America', category: 'continent' },
    { code: 'an', name: 'Antarctica', category: 'continent' },
  ];
}

/**
 * Server action to fetch regions by category
 * Following Rust-inspired explicit return type and error handling
 * @param category - The region category to filter by
 * @returns Filtered array of Region objects
 */
export async function getRegionsByCategory(category: string): Promise<Region[]> {
  try {
    console.log(`Fetching regions by category: ${category}`);
    
    // Validate input parameter with fail-fast approach
    if (!category || typeof category !== 'string') {
      console.warn('Invalid category provided to getRegionsByCategory:', category);
      return generateFallbackRegionsByCategory(category);
    }
    
    // Validate region data availability
    if (!regions || !Array.isArray(regions) || regions.length === 0) {
      console.warn('Region data is unavailable for category filtering');
      return generateFallbackRegionsByCategory(category);
    }
    
    const filteredRegions = regions.filter(region => region.category === category);
    console.log(`Found ${filteredRegions.length} regions with category ${category}`);
    
    return filteredRegions;
  } catch (error) {
    console.error(`Error fetching regions by category ${category}:`, error);
    return generateFallbackRegionsByCategory(category);
  }
}

/**
 * Generate fallback regions for a specific category
 * @param category - The region category to generate fallbacks for
 * @returns Array of Region objects for the given category
 */
function generateFallbackRegionsByCategory(category: string): Region[] {
  console.log(`Generating fallback regions for category: ${category}`);
  
  // If category is continent, return the same continents as in generateFallbackRegions
  if (category === 'continent') {
    return [
      { code: 'na', name: 'North America', category: 'continent' },
      { code: 'eu', name: 'Europe', category: 'continent' },
      { code: 'as', name: 'Asia', category: 'continent' },
      { code: 'af', name: 'Africa', category: 'continent' },
      { code: 'oc', name: 'Oceania', category: 'continent' },
      { code: 'sa', name: 'South America', category: 'continent' },
      { code: 'an', name: 'Antarctica', category: 'continent' },
    ];
  }
  
  // Return empty array for other categories, or enhance with specific fallbacks if needed
  return [];
}

/**
 * Get regions by parent code (for subregions)
 * Following Rust-inspired explicit return type and error handling
 * @param parentCode - The parent region code
 * @returns Filtered array of Region objects or fallback data if fetching fails
 */
export async function getRegionsByParent(parentCode: string): Promise<Region[]> {
  try {
    console.log(`Fetching regions by parent code: ${parentCode}`);
    
    // Validate input parameter with fail-fast approach
    if (!parentCode || typeof parentCode !== 'string') {
      console.warn('Invalid parent code provided to getRegionsByParent:', parentCode);
      return generateFallbackRegionsByParent(parentCode);
    }
    
    // Validate region data availability
    if (!regions || !Array.isArray(regions) || regions.length === 0) {
      console.warn('Region data is unavailable for parent code filtering');
      return generateFallbackRegionsByParent(parentCode);
    }
    
    // Filter regions by parent code
    const filteredRegions = regions.filter(region => region.parentCode === parentCode);
    
    // Log results for debugging
    console.log(`Found ${filteredRegions.length} regions with parent code ${parentCode}`);
    
    return filteredRegions;
  } catch (error) {
    console.error(`Error fetching regions by parent code ${parentCode}:`, error);
    return generateFallbackRegionsByParent(parentCode);
  }
}

/**
 * Generate fallback regions for a specific parent code
 * @param parentCode - The parent region code to generate fallbacks for
 * @returns Array of Region objects for the given parent code
 */
function generateFallbackRegionsByParent(parentCode: string): Region[] {
  console.log(`Generating fallback regions for parent code: ${parentCode}`);
  
  // Common subregions for North America (as an example)
  if (parentCode === 'na') {
    return [
      { code: 'us', name: 'United States', category: 'subregion', parentCode: 'na' },
      { code: 'ca', name: 'Canada', category: 'subregion', parentCode: 'na' },
      { code: 'mx', name: 'Mexico', category: 'subregion', parentCode: 'na' },
    ];
  }
  
  // Common subregions for Europe
  if (parentCode === 'eu') {
    return [
      { code: 'we', name: 'Western Europe', category: 'subregion', parentCode: 'eu' },
      { code: 'ee', name: 'Eastern Europe', category: 'subregion', parentCode: 'eu' },
      { code: 'se', name: 'Southern Europe', category: 'subregion', parentCode: 'eu' },
      { code: 'ne', name: 'Northern Europe', category: 'subregion', parentCode: 'eu' },
    ];
  }
  
  // Return empty array for other parent codes
  return [];
}

/**
 * Seed database with static region data
 * @returns Promise that resolves when seeding is complete
 */
async function seedRegionsFromStaticData(): Promise<void> {
  try {
    console.log('Seeding database with static region data...');
    
    if (!regions || regions.length === 0) {
      console.warn('No static region data available for seeding');
      return;
    }
    
    // Insert static regions into database
    for (const region of regions) {
      await prisma.region.upsert({
        where: { code: region.code },
        update: {
          name: region.name,
          category: region.category,
          parent_code: region.parentCode || null,
          description: region.description || null,
        },
        create: {
          code: region.code,
          name: region.name,
          category: region.category,
          parent_code: region.parentCode || null,
          description: region.description || null,
        },
      });
    }
    
    console.log(`Seeded ${regions.length} regions into database`);
  } catch (error) {
    console.error('Error seeding regions:', error);
    throw error;
  }
}

/**
 * Create a new region in the database
 * @param regionData - The region data to create
 * @returns Promise that resolves to the created region
 */
export async function createRegion(regionData: {
  code: string;
  name: string;
  category: string;
  parentCode?: string;
  description?: string;
}): Promise<Region> {
  try {
    console.log('Creating new region:', regionData);
    
    const newRegion = await prisma.region.create({
      data: {
        code: regionData.code,
        name: regionData.name,
        category: regionData.category,
        parent_code: regionData.parentCode || null,
        description: regionData.description || null,
      },
    });
    
    console.log('Successfully created region:', newRegion.code);
    
    return {
      code: newRegion.code,
      name: newRegion.name,
      category: newRegion.category as any,
      parentCode: newRegion.parent_code || undefined,
      description: newRegion.description || undefined,
    };
  } catch (error) {
    console.error('Error creating region:', error);
    throw error;
  }
}

/**
 * Update an existing region in the database
 * @param code - The region code to update
 * @param updateData - The data to update
 * @returns Promise that resolves to the updated region
 */
export async function updateRegion(
  code: string,
  updateData: {
    name?: string;
    category?: string;
    parentCode?: string;
    description?: string;
  }
): Promise<Region> {
  try {
    console.log('Updating region:', code, updateData);
    
    const updatedRegion = await prisma.region.update({
      where: { code },
      data: {
        ...(updateData.name && { name: updateData.name }),
        ...(updateData.category && { category: updateData.category }),
        parent_code: updateData.parentCode || null,
        description: updateData.description || null,
      },
    });
    
    console.log('Successfully updated region:', updatedRegion.code);
    
    return {
      code: updatedRegion.code,
      name: updatedRegion.name,
      category: updatedRegion.category as any,
      parentCode: updatedRegion.parent_code || undefined,
      description: updatedRegion.description || undefined,
    };
  } catch (error) {
    console.error('Error updating region:', error);
    throw error;
  }
}

/**
 * Delete a region from the database
 * @param code - The region code to delete
 * @returns Promise that resolves when deletion is complete
 */
export async function deleteRegion(code: string): Promise<void> {
  try {
    console.log('Deleting region:', code);
    
    // Check if any countries are using this region
    const countriesUsingRegion = await prisma.country.findMany({
      where: {
        regions: {
          some: {
            code: code
          }
        }
      },
      select: {
        name: true,
        code: true
      }
    });
    
    if (countriesUsingRegion.length > 0) {
      const countryNames = countriesUsingRegion.map(c => c.name).join(', ');
      throw new Error(`Cannot delete region ${code}. It is being used by countries: ${countryNames}`);
    }
    
    await prisma.region.delete({
      where: { code },
    });
    
    console.log('Successfully deleted region:', code);
  } catch (error) {
    console.error('Error deleting region:', error);
    throw error;
  }
}

/**
 * Get countries assigned to a specific region
 * @param regionCode - The region code to get countries for
 * @returns Promise that resolves to array of countries
 */
export async function getCountriesForRegion(regionCode: string): Promise<any[]> {
  try {
    console.log('Getting countries for region:', regionCode);
    
    const region = await prisma.region.findUnique({
      where: { code: regionCode },
      include: {
        countries: {
          select: {
            id: true,
            name: true,
            code: true,
            flag_emoji: true,
          },
          orderBy: {
            name: 'asc'
          }
        }
      }
    });
    
    if (!region) {
      throw new Error(`Region ${regionCode} not found`);
    }
    
    console.log(`Found ${region.countries.length} countries for region ${regionCode}`);
    return region.countries;
  } catch (error) {
    console.error('Error getting countries for region:', error);
    throw error;
  }
}

/**
 * Add countries to a region
 * @param regionCode - The region code to add countries to
 * @param countryIds - Array of country IDs to add
 * @returns Promise that resolves when assignment is complete
 */
export async function addCountriesToRegion(
  regionCode: string,
  countryIds: string[]
): Promise<void> {
  try {
    console.log('Adding countries to region:', regionCode, countryIds);
    
    await prisma.region.update({
      where: { code: regionCode },
      data: {
        countries: {
          connect: countryIds.map(id => ({ id }))
        }
      }
    });
    
    console.log(`Successfully added ${countryIds.length} countries to region ${regionCode}`);
  } catch (error) {
    console.error('Error adding countries to region:', error);
    throw error;
  }
}

/**
 * Remove countries from a region
 * @param regionCode - The region code to remove countries from
 * @param countryIds - Array of country IDs to remove
 * @returns Promise that resolves when removal is complete
 */
export async function removeCountriesFromRegion(
  regionCode: string,
  countryIds: string[]
): Promise<void> {
  try {
    console.log('Removing countries from region:', regionCode, countryIds);
    
    await prisma.region.update({
      where: { code: regionCode },
      data: {
        countries: {
          disconnect: countryIds.map(id => ({ id }))
        }
      }
    });
    
    console.log(`Successfully removed ${countryIds.length} countries from region ${regionCode}`);
  } catch (error) {
    console.error('Error removing countries from region:', error);
    throw error;
  }
}

/**
 * Set countries for a region (replaces all existing assignments)
 * @param regionCode - The region code to set countries for
 * @param countryIds - Array of country IDs to assign
 * @returns Promise that resolves when assignment is complete
 */
export async function setCountriesForRegion(
  regionCode: string,
  countryIds: string[]
): Promise<void> {
  try {
    console.log('Setting countries for region:', regionCode, countryIds);
    
    // Get current countries to disconnect all first
    const currentRegion = await prisma.region.findUnique({
      where: { code: regionCode },
      include: {
        countries: {
          select: { id: true }
        }
      }
    });
    
    if (!currentRegion) {
      throw new Error(`Region ${regionCode} not found`);
    }
    
    // Update with new country assignments
    await prisma.region.update({
      where: { code: regionCode },
      data: {
        countries: {
          disconnect: currentRegion.countries.map(c => ({ id: c.id })),
          connect: countryIds.map(id => ({ id }))
        }
      }
    });
    
    console.log(`Successfully set ${countryIds.length} countries for region ${regionCode}`);
  } catch (error) {
    console.error('Error setting countries for region:', error);
    throw error;
  }
}
