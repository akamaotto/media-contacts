// Main configuration exports for the media contacts seeding system

import { SeedingConfig } from './types';

export * from './types';

// Default configuration values
export const DEFAULT_SEEDING_CONFIG: SeedingConfig = {
  count: 10,
  categories: ['General'],
  requirements: {
    includeEmail: true,
    includeSocialProfiles: false,
    includeBio: false,
    verifiedEmailsOnly: false,
    activeContactsOnly: true
  },
  outletTypes: ['general'],
  language: 'en'
};

// Supported regions and countries
export const SUPPORTED_REGIONS = [
  'GLOBAL',
  'US',
  'GB',
  'CA',
  'AU',
  'DE',
  'FR',
  'JP',
  'KR',
  'IN',
  'BR',
  'CN'
];

export const SUPPORTED_CATEGORIES = [
  'Technology',
  'Startups',
  'Finance',
  'Business',
  'Economy',
  'AI',
  'Fintech',
  'Venture Capital',
  'Entrepreneurship',
  'Enterprise',
  'Consumer Tech',
  'Cryptocurrency',
  'E-commerce',
  'Health Tech',
  'Clean Energy',
  'Telecom',
  'Media',
  'Automotive',
  'Gaming',
  'Cybersecurity'
];

// Mapping of categories to outlet types
export const CATEGORY_TO_OUTLET_TYPE: Record<string, 'tech' | 'business' | 'finance' | 'startup' | 'general'> = {
  'Technology': 'tech',
  'Startups': 'startup',
  'Finance': 'finance',
  'Business': 'business',
  'Economy': 'business',
  'AI': 'tech',
  'Fintech': 'finance',
  'Venture Capital': 'finance',
  'Entrepreneurship': 'startup',
  'Enterprise': 'business',
  'Consumer Tech': 'tech',
  'Cryptocurrency': 'finance',
  'E-commerce': 'business',
  'Health Tech': 'tech',
  'Clean Energy': 'business',
  'Telecom': 'tech',
  'Media': 'general',
  'Automotive': 'business',
  'Gaming': 'tech',
  'Cybersecurity': 'tech'
};