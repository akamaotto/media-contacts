"use server";

import { regions, Region } from "@/lib/country-data";

/**
 * Server action to fetch all available regions
 * Following Rust-inspired explicit return type and error handling
 * @returns Array of Region objects or fallback data if fetching fails
 */
export async function getAllRegions(): Promise<Region[]> {
  try {
    console.log('Fetching all regions...');
    
    // Validate region data availability using fail-fast approach
    if (!regions || !Array.isArray(regions) || regions.length === 0) {
      console.warn('Region data is unavailable, using fallback data');
      return generateFallbackRegions();
    }
    
    console.log(`Successfully fetched ${regions.length} regions`);
    return regions;
  } catch (error) {
    console.error("Error fetching regions:", error);
    // Return fallback data to prevent UI breakage
    return generateFallbackRegions();
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
