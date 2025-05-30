// Comprehensive list of continents, languages, and countries
// Data follows ISO 3166-1 for countries, ISO 639-1 for languages

// Type for different region categories
type RegionCategory = 'continent' | 'subregion' | 'economic' | 'political' | 'organization' | 'trade_agreement' | 'geographical' | 'other';

interface Region {
  code: string;
  name: string;
  category: RegionCategory;
  parentCode?: string; // For subregions
  description?: string;
}

export const regions: Region[] = [
  // Continents (base level)
  { code: 'AF', name: 'Africa', category: 'continent' },
  { code: 'AN', name: 'Antarctica', category: 'continent' },
  { code: 'AS', name: 'Asia', category: 'continent' },
  { code: 'EU', name: 'Europe', category: 'continent' },
  { code: 'NA', name: 'North America', category: 'continent' },
  { code: 'OC', name: 'Oceania', category: 'continent' },
  { code: 'SA', name: 'South America', category: 'continent' },
  
  // African Subregions
  { code: 'NAF', name: 'North Africa', category: 'subregion', parentCode: 'AF' },
  { code: 'WAF', name: 'West Africa', category: 'subregion', parentCode: 'AF' },
  { code: 'EAF', name: 'East Africa', category: 'subregion', parentCode: 'AF' },
  { code: 'CAF', name: 'Central Africa', category: 'subregion', parentCode: 'AF' },
  { code: 'SAF', name: 'Southern Africa', category: 'subregion', parentCode: 'AF' },
  
  // Asian Subregions
  { code: 'EAS', name: 'East Asia', category: 'subregion', parentCode: 'AS' },
  { code: 'SAS', name: 'South Asia', category: 'subregion', parentCode: 'AS' },
  { code: 'SEA', name: 'Southeast Asia', category: 'subregion', parentCode: 'AS' },
  { code: 'WAS', name: 'Western Asia', category: 'subregion', parentCode: 'AS' },
  { code: 'CAS', name: 'Central Asia', category: 'subregion', parentCode: 'AS' },
  
  // European Subregions
  { code: 'NEU', name: 'Northern Europe', category: 'subregion', parentCode: 'EU' },
  { code: 'SEU', name: 'Southern Europe', category: 'subregion', parentCode: 'EU' },
  { code: 'WEU', name: 'Western Europe', category: 'subregion', parentCode: 'EU' },
  { code: 'EEU', name: 'Eastern Europe', category: 'subregion', parentCode: 'EU' },
  { code: 'CEU', name: 'Central Europe', category: 'subregion', parentCode: 'EU' },
  
  // North American Subregions
  { code: 'NAM', name: 'North America Mainland', category: 'subregion', parentCode: 'NA' },
  { code: 'CAM', name: 'Central America', category: 'subregion', parentCode: 'NA' },
  { code: 'CAR', name: 'Caribbean', category: 'subregion', parentCode: 'NA' },
  
  // Oceania Subregions
  { code: 'AUS', name: 'Australasia', category: 'subregion', parentCode: 'OC' },
  { code: 'MEL', name: 'Melanesia', category: 'subregion', parentCode: 'OC' },
  { code: 'MIC', name: 'Micronesia', category: 'subregion', parentCode: 'OC' },
  { code: 'POL', name: 'Polynesia', category: 'subregion', parentCode: 'OC' },
  
  // South American Subregions
  { code: 'ANDES', name: 'Andean States', category: 'subregion', parentCode: 'SA' },
  { code: 'SOUTH_CONE', name: 'Southern Cone', category: 'subregion', parentCode: 'SA' },
  
  // Political/Economic Organizations
  { code: 'EUNION', name: 'European Union', category: 'organization', description: 'Political and economic union of member states in Europe' },
  { code: 'AU', name: 'African Union', category: 'organization', description: 'Continental union consisting of 55 member states in Africa' },
  { code: 'AL', name: 'Arab League', category: 'organization', description: 'Regional organization of Arab states in North Africa and Western Asia' },
  { code: 'ASEAN', name: 'Association of Southeast Asian Nations', category: 'organization', description: 'Political and economic union of 10 member states in Southeast Asia' },
  { code: 'CARICOM', name: 'Caribbean Community', category: 'organization', description: 'Organization of 15 Caribbean nations and dependencies' },
  { code: 'COMM', name: 'Commonwealth of Nations', category: 'organization', description: 'Political association of 54 member states, mostly former territories of the British Empire' },
  { code: 'CIS', name: 'Commonwealth of Independent States', category: 'organization', description: 'Regional intergovernmental organization of post-Soviet republics in Eurasia' },
  { code: 'GCC', name: 'Gulf Cooperation Council', category: 'organization', description: 'Regional intergovernmental political and economic union of Bahrain, Kuwait, Oman, Qatar, Saudi Arabia, and the UAE' },
  { code: 'MERCOSUR', name: 'Southern Common Market', category: 'organization', description: 'South American trade bloc' },
  
  // Economic Groups
  { code: 'G7', name: 'Group of Seven', category: 'economic', description: 'Group of seven countries with the world\'s largest developed economies' },
  { code: 'G20', name: 'Group of Twenty', category: 'economic', description: 'International forum for the governments and central bank governors from 19 countries and the EU' },
  { code: 'BRICS', name: 'BRICS', category: 'economic', description: 'Association of five major emerging economies: Brazil, Russia, India, China, and South Africa' },
  { code: 'OECD', name: 'Organisation for Economic Co-operation and Development', category: 'economic', description: 'Intergovernmental economic organisation with 38 member countries' },
  { code: 'OPEC', name: 'Organization of the Petroleum Exporting Countries', category: 'economic', description: 'Intergovernmental organization of 13 nations, founded to coordinate petroleum policies' },
  
  // Military Alliances
  { code: 'NATO', name: 'North Atlantic Treaty Organization', category: 'political', description: 'Military alliance between 30 North American and European countries' },
  
  // Other Regional Groups
  { code: 'OIC', name: 'Organisation of Islamic Cooperation', category: 'organization', description: 'International organization of 57 member states with a collective voice of the Muslim world' },
  { code: 'SADC', name: 'Southern African Development Community', category: 'organization', description: 'Inter-governmental organization of 16 member states from Southern Africa' },
  { code: 'NAFTA', name: 'North American Free Trade Agreement', category: 'trade_agreement', description: 'Trade agreement between Canada, Mexico, and the United States' },
  { code: 'AUSNZ', name: 'Australia-New Zealand', category: 'geographical', description: 'Australia and New Zealand region' },
];

// Interface defining the structure of country data
export interface CountryData {
  name: string;
  code: string; // ISO 3166-1 alpha-2 code
  phone_code: string;
  capital: string;
  region: string[]; // Array of region codes that this country belongs to
  subregion: string[]; // Subregion codes
  continent_code: string; // Primary continent code
  languages: string[]; // ISO 639-1 language codes
  flag_emoji: string; // Flag emoji Unicode character
  latitude: number;
  longitude: number;
};

// Import the complete countries list from our modular files
import { allCountriesComplete } from './all-countries';

// Export the complete list of countries
export const countries: CountryData[] = allCountriesComplete;

// Export all utility functions for working with country data
export {
  getCountryByCode,
  getCountryByName,
  getCountriesByRegion,
  getCountriesByLanguage,
  validateCountryData,
  countriesByContinent
} from './all-countries';
