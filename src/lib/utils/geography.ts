/**
 * Database-compatible utility functions for geography data
 * 
 * 🎯 Purpose: Provides database-aware utility functions that replace static data operations
 * 🔄 Migration: These functions replace the old static array-based utilities
 * 💾 Database: All functions require a Prisma client instance and query the database
 * 
 * Key differences from old static functions:
 * - Async operations (database queries)
 * - Require Prisma client parameter
 * - Return promises
 * - Include proper error handling
 * - No static data fallbacks
 * 
 * Usage: Import these functions when you need to work with geography data
 * and have access to a Prisma client instance.
 */

import { PrismaClient } from '@prisma/client';
import { CountryData, Language, Region } from '../types/geography';

/**
 * Lookup a country by its ISO code (case insensitive)
 * @param code ISO 3166-1 alpha-2 country code
 * @param prisma Prisma client instance
 * @returns CountryData object or null if not found
 */
export async function getCountryByCode(code: string, prisma: PrismaClient): Promise<CountryData | null> {
  try {
    const normalizedCode = code.toUpperCase();
    
    const country = await prisma.country.findFirst({
      where: {
        code: {
          equals: normalizedCode,
          mode: 'insensitive'
        }
      },
      include: {
        regions: true,
        languages: true
      }
    });

    if (!country) return null;

    return {
      id: country.id,
      name: country.name,
      code: country.code || '',
      phone_code: country.phone_code || undefined,
      capital: country.capital || undefined,
      region: country.regions?.map(r => r.code) || [],
      continent_code: country.regions?.find(r => r.category === 'continent')?.code || undefined,
      languages: country.languages?.map(l => l.code) || [],
      flag_emoji: country.flag_emoji || undefined,
      latitude: country.latitude || undefined,
      longitude: country.longitude || undefined
    };
  } catch (error) {
    console.error('Error fetching country by code:', error);
    return null;
  }
}

/**
 * Lookup a country by name (case insensitive partial match)
 * @param name Full or partial country name
 * @param prisma Prisma client instance
 * @returns CountryData object or null if not found
 */
export async function getCountryByName(name: string, prisma: PrismaClient): Promise<CountryData | null> {
  try {
    const country = await prisma.country.findFirst({
      where: {
        name: {
          contains: name,
          mode: 'insensitive'
        }
      },
      include: {
        regions: true,
        languages: true
      }
    });

    if (!country) return null;

    return {
      id: country.id,
      name: country.name,
      code: country.code || '',
      phone_code: country.phone_code || undefined,
      capital: country.capital || undefined,
      region: country.regions?.map(r => r.code) || [],
      continent_code: country.regions?.find(r => r.category === 'continent')?.code || undefined,
      languages: country.languages?.map(l => l.code) || [],
      flag_emoji: country.flag_emoji || undefined,
      latitude: country.latitude || undefined,
      longitude: country.longitude || undefined
    };
  } catch (error) {
    console.error('Error fetching country by name:', error);
    return null;
  }
}

/**
 * Get all countries belonging to a specific region
 * @param regionCode Region code to filter by
 * @param prisma Prisma client instance
 * @returns Array of countries in the specified region
 */
export async function getCountriesByRegion(regionCode: string, prisma: PrismaClient): Promise<CountryData[]> {
  try {
    const normalizedRegion = regionCode.toUpperCase();
    
    const countries = await prisma.country.findMany({
      where: {
        regions: {
          some: {
            code: {
              equals: normalizedRegion,
              mode: 'insensitive'
            }
          }
        }
      },
      include: {
        regions: true,
        languages: true
      }
    });

    return countries.map(country => ({
      id: country.id,
      name: country.name,
      code: country.code || '',
      phone_code: country.phone_code || undefined,
      capital: country.capital || undefined,
      region: country.regions?.map(r => r.code) || [],
      continent_code: country.regions?.find(r => r.category === 'continent')?.code || undefined,
      languages: country.languages?.map(l => l.code) || [],
      flag_emoji: country.flag_emoji || undefined,
      latitude: country.latitude || undefined,
      longitude: country.longitude || undefined
    }));
  } catch (error) {
    console.error('Error fetching countries by region:', error);
    return [];
  }
}

/**
 * Get all countries with a specific language
 * @param languageCode ISO 639-1 language code
 * @param prisma Prisma client instance
 * @returns Array of countries using the specified language
 */
export async function getCountriesByLanguage(languageCode: string, prisma: PrismaClient): Promise<CountryData[]> {
  try {
    const normalizedLanguage = languageCode.toLowerCase();
    
    const countries = await prisma.country.findMany({
      where: {
        languages: {
          some: {
            code: {
              equals: normalizedLanguage,
              mode: 'insensitive'
            }
          }
        }
      },
      include: {
        regions: true,
        languages: true
      }
    });

    return countries.map(country => ({
      id: country.id,
      name: country.name,
      code: country.code || '',
      phone_code: country.phone_code || undefined,
      capital: country.capital || undefined,
      region: country.regions?.map(r => r.code) || [],
      continent_code: country.regions?.find(r => r.category === 'continent')?.code || undefined,
      languages: country.languages?.map(l => l.code) || [],
      flag_emoji: country.flag_emoji || undefined,
      latitude: country.latitude || undefined,
      longitude: country.longitude || undefined
    }));
  } catch (error) {
    console.error('Error fetching countries by language:', error);
    return [];
  }
}

/**
 * Get all countries from database
 * @param prisma Prisma client instance
 * @returns Array of all countries
 */
export async function getAllCountries(prisma: PrismaClient): Promise<CountryData[]> {
  try {
    const countries = await prisma.country.findMany({
      include: {
        regions: true,
        languages: true
      }
    });

    return countries.map(country => ({
      id: country.id,
      name: country.name,
      code: country.code || '',
      phone_code: country.phone_code || undefined,
      capital: country.capital || undefined,
      region: country.regions?.map(r => r.code) || [],
      continent_code: country.regions?.find(r => r.category === 'continent')?.code || undefined,
      languages: country.languages?.map(l => l.code) || [],
      flag_emoji: country.flag_emoji || undefined,
      latitude: country.latitude || undefined,
      longitude: country.longitude || undefined
    }));
  } catch (error) {
    console.error('Error fetching all countries:', error);
    return [];
  }
}

/**
 * Validate database connectivity and basic data integrity
 * @param prisma Prisma client instance
 * @returns Object containing validation results
 */
export async function validateGeographyData(prisma: PrismaClient): Promise<{ 
  valid: boolean; 
  countriesCount: number;
  languagesCount: number;
  regionsCount: number;
  issues: string[];
}> {
  const issues: string[] = [];
  let countriesCount = 0;
  let languagesCount = 0;
  let regionsCount = 0;

  try {
    // Check countries
    countriesCount = await prisma.country.count();
    if (countriesCount === 0) {
      issues.push('No countries found in database');
    }

    // Check languages
    languagesCount = await prisma.language.count();
    if (languagesCount === 0) {
      issues.push('No languages found in database');
    }

    // Check regions
    regionsCount = await prisma.region.count();
    if (regionsCount === 0) {
      issues.push('No regions found in database');
    }

    // Check for countries without codes
    const countriesWithoutCodes = await prisma.country.count({
      where: {
        OR: [
          { code: null },
          { code: '' }
        ]
      }
    });

    if (countriesWithoutCodes > 0) {
      issues.push(`${countriesWithoutCodes} countries missing ISO codes`);
    }

  } catch (error) {
    issues.push(`Database connection error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return {
    valid: issues.length === 0,
    countriesCount,
    languagesCount,
    regionsCount,
    issues
  };
}