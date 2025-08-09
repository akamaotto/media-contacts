/**
 * Geography-related type definitions
 * 
 * 🎯 Purpose: Provides clean type definitions for geography data without static arrays
 * 📦 Extracted from: Previous static data files during static content cleanup
 * 🔄 Usage: Import these types instead of the old static data file types
 * 
 * These types are used throughout the application for:
 * - Database operations
 * - API responses  
 * - Component props
 * - Utility functions
 * 
 * All geography data should now come from the database via backend actions.
 */

/**
 * Language interface definition following ISO 639 standards
 */
export interface Language {
  id?: string;        // Database ID (optional for compatibility with static data)
  code: string;       // ISO 639-1 two-letter code
  name: string;       // English name of the language
  native?: string;    // Native name of the language
  rtl?: boolean;      // Right-to-left script
  countries?: any[];  // Associated countries (for database version)
}

/**
 * Type for different region categories
 */
export type RegionCategory = 'continent' | 'subregion' | 'economic' | 'political' | 'organization' | 'trade_agreement' | 'geographical' | 'other';

/**
 * Region interface definition
 */
export interface Region {
  code: string;
  name: string;
  category: RegionCategory;
  parentCode?: string; // For subregions
  description?: string;
  countries?: Array<{
    id: string;
    name: string;
    code: string;
    flag_emoji?: string;
  }>; // Associated countries for flag display
}

/**
 * Country data interface definition following ISO 3166-1 standards
 */
export interface CountryData {
  id?: string;        // Database ID (optional)
  name: string;
  code: string;       // ISO 3166-1 alpha-2 code
  phone_code?: string;
  capital?: string;
  region?: string[];  // Array of region codes that this country belongs to
  subregion?: string[]; // Subregion codes
  continent_code?: string; // Primary continent code
  languages?: string[]; // ISO 639-1 language codes
  flag_emoji?: string; // Flag emoji Unicode character
  latitude?: number;
  longitude?: number;
}

/**
 * Extended country interface for database operations
 * Includes additional fields that may be present in database records
 */
export interface Country extends CountryData {
  id: string;         // Required for database records
  created_at?: Date;
  updated_at?: Date;
  regions?: Region[];
  languageRecords?: Language[];
}