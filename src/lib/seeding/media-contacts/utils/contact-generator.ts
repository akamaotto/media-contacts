// Contact generation utilities for the media contacts seeding system

import { SeedingConfig, MediaContactData } from '../config';
import { SUPPORTED_CATEGORIES, CATEGORY_TO_OUTLET_TYPE } from '../config';

// Sample data for generating contacts
const SAMPLE_OUTLETS = [
  'TechCrunch', 'Forbes', 'The Economist', 'Reuters', 'Bloomberg', 
  'VentureBeat', 'Inc.', 'Entrepreneur', 'Wall Street Journal', 'Financial Times'
];

const SAMPLE_TITLES = [
  'Reporter', 'Senior Reporter', 'Correspondent', 'Editor', 'Senior Editor',
  'Contributor', 'Staff Writer', 'Freelance Journalist', 'Columnist', 'Anchor'
];

const SAMPLE_BEATS = [
  'Technology', 'Startups', 'Finance', 'Business', 'Economy', 'AI', 
  'Fintech', 'Venture Capital', 'Entrepreneurship', 'Enterprise'
];

const SAMPLE_COUNTRIES = [
  'United States', 'United Kingdom', 'Canada', 'Germany', 'France', 
  'Japan', 'South Korea', 'India', 'Brazil', 'China', 'Nigeria'
];

const SAMPLE_BIOS = [
  'Experienced journalist with a focus on technology and innovation.',
  'Award-winning reporter covering finance and business trends.',
  'Specialized in startup ecosystems and venture capital funding.',
  'Technology correspondent with expertise in artificial intelligence.',
  'Business editor focusing on global economic developments.'
];

/**
 * Generate a random media contact based on the provided configuration
 * @param config Seeding configuration
 * @returns Generated media contact data
 */
export function generateRandomContact(config: SeedingConfig): MediaContactData {
  // Generate a random name
  const firstName = getRandomElement(['John', 'Jane', 'Robert', 'Emily', 'Michael', 'Sarah', 'David', 'Lisa', 'James', 'Jennifer']);
  const lastName = getRandomElement(['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez']);
  const name = `${firstName} ${lastName}`;
  
  // Generate email based on name and outlet
  const outlet = getRandomElement(SAMPLE_OUTLETS);
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${outlet.toLowerCase().replace(/\s+/g, '')}.com`;
  
  // Generate title
  const title = getRandomElement(SAMPLE_TITLES);
  
  // Select beats based on configuration
  const beats = config.categories.length > 0 
    ? config.categories 
    : [getRandomElement(SAMPLE_BEATS)];
  
  // Select countries based on configuration
  const countries = config.country 
    ? [config.country] 
    : [getRandomElement(SAMPLE_COUNTRIES)];
  
  // Generate social handles
  const twitterHandle = `@${firstName.toLowerCase()}${lastName.toLowerCase()}`;
  const linkedinUrl = `https://www.linkedin.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}`;
  
  // Generate bio
  const bio = getRandomElement(SAMPLE_BIOS);
  
  // Generate author links
  const authorLinks = [`https://${outlet.toLowerCase().replace(/\s+/g, '')}.com/author/${firstName.toLowerCase()}-${lastName.toLowerCase()}`];
  
  return {
    name,
    email,
    title,
    outlet,
    beats,
    countries,
    twitterHandle,
    linkedinUrl,
    bio,
    authorLinks
  };
}

/**
 * Generate multiple random contacts based on the provided configuration
 * @param config Seeding configuration
 * @param count Number of contacts to generate
 * @returns Array of generated media contact data
 */
export function generateRandomContacts(config: SeedingConfig, count: number): MediaContactData[] {
  return Array.from({ length: count }, () => generateRandomContact(config));
}

/**
 * Get a random element from an array
 * @param array Array to select from
 * @returns Random element from the array
 */
function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Filter contacts based on configuration requirements
 * @param contacts Array of contacts to filter
 * @param config Seeding configuration
 * @returns Filtered array of contacts
 */
export function filterContacts(contacts: MediaContactData[], config: SeedingConfig): MediaContactData[] {
  // For now, we'll just return all contacts
  // In a real implementation, this would filter based on requirements
  return contacts;
}

/**
 * Enrich contacts with additional data
 * @param contacts Array of contacts to enrich
 * @returns Enriched array of contacts
 */
export function enrichContacts(contacts: MediaContactData[]): MediaContactData[] {
  // For now, we'll just return the contacts as-is
  // In a real implementation, this would add more detailed information
  return contacts;
}