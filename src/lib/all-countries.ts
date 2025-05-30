/**
 * Comprehensive consolidated list of all countries in the world
 * Data follows ISO standards with detailed region, language and geographical information
 */

import { CountryData } from './country-data';
import { allCountries as countriesAF } from './country-list';
import { countriesGM } from './country-list-part2';
import { countriesNR } from './country-list-part3';
import { countriesSZ } from './country-list-part4';

/**
 * Complete list of all countries consolidated from modular files
 * - Follows ISO 3166-1 standards
 * - Includes region/subregion affiliations 
 * - Contains language codes (ISO 639-1)
 * - Provides accurate coordinates
 */
export const allCountriesComplete: CountryData[] = [
  ...countriesAF,  // Countries A-F
  ...countriesGM,  // Countries G-M
  ...countriesNR,  // Countries N-R
  ...countriesSZ   // Countries S-Z
];

/**
 * Utility functions for working with country data
 */

/**
 * Lookup a country by its ISO code (case insensitive)
 * @param code ISO 3166-1 alpha-2 country code
 * @returns CountryData object or undefined if not found
 */
export function getCountryByCode(code: string): CountryData | undefined {
  const normalizedCode = code.toUpperCase();
  return allCountriesComplete.find(country => country.code === normalizedCode);
}

/**
 * Lookup a country by name (case insensitive partial match)
 * @param name Full or partial country name
 * @returns CountryData object or undefined if not found
 */
export function getCountryByName(name: string): CountryData | undefined {
  const normalizedName = name.toLowerCase();
  return allCountriesComplete.find(country => 
    country.name.toLowerCase().includes(normalizedName)
  );
}

/**
 * Get all countries belonging to a specific region
 * @param regionCode Region code to filter by
 * @returns Array of countries in the specified region
 */
export function getCountriesByRegion(regionCode: string): CountryData[] {
  const normalizedRegion = regionCode.toUpperCase();
  return allCountriesComplete.filter(country => 
    country.region.includes(normalizedRegion)
  );
}

/**
 * Get all countries with a specific language
 * @param languageCode ISO 639-1 language code
 * @returns Array of countries using the specified language
 */
export function getCountriesByLanguage(languageCode: string): CountryData[] {
  const normalizedLanguage = languageCode.toLowerCase();
  return allCountriesComplete.filter(country => 
    country.languages.includes(normalizedLanguage)
  );
}

/**
 * Verify data integrity across all countries
 * @returns Object containing validation results
 */
export function validateCountryData(): { 
  valid: boolean; 
  countriesCount: number;
  issues: string[];
} {
  const issues: string[] = [];
  
  // Check for duplicate codes
  const codes = new Set<string>();
  allCountriesComplete.forEach(country => {
    if (country.code && codes.has(country.code)) {
      issues.push(`Duplicate country code: ${country.code} (${country.name})`);
    }
    codes.add(country.code || '');
  });
  
  // Check for missing required fields
  allCountriesComplete.forEach(country => {
    if (!country.name) issues.push(`Missing name for country with code ${country.code}`);
    if (!country.code) issues.push(`Missing code for country ${country.name}`);
    if (!country.region || country.region.length === 0) 
      issues.push(`Missing region for country ${country.name}`);
    if (!country.languages || country.languages.length === 0) 
      issues.push(`Missing languages for country ${country.name}`);
  });
  
  return {
    valid: issues.length === 0,
    countriesCount: allCountriesComplete.length,
    issues
  };
}

// Export a summary of country count by continent
export const countriesByContinent = {
  AF: allCountriesComplete.filter(c => c.continent_code === 'AF').length, // Africa
  AS: allCountriesComplete.filter(c => c.continent_code === 'AS').length, // Asia
  EU: allCountriesComplete.filter(c => c.continent_code === 'EU').length, // Europe
  NA: allCountriesComplete.filter(c => c.continent_code === 'NA').length, // North America
  SA: allCountriesComplete.filter(c => c.continent_code === 'SA').length, // South America
  OC: allCountriesComplete.filter(c => c.continent_code === 'OC').length, // Oceania
  AN: allCountriesComplete.filter(c => c.continent_code === 'AN').length, // Antarctica
  total: allCountriesComplete.length
};
