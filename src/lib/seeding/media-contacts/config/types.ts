// Configuration types for the media contacts seeding system

export interface SeedingRequirements {
  includeEmail?: boolean;
  includeSocialProfiles?: boolean;
  includeBio?: boolean;
  verifiedEmailsOnly?: boolean;
  activeContactsOnly?: boolean;
}

export interface SeedingConfig {
  region?: string;
  country?: string;
  count: number;
  categories: string[];
  requirements?: SeedingRequirements;
  outletTypes?: ('tech' | 'business' | 'finance' | 'startup' | 'general')[];
  experienceLevel?: 'junior' | 'mid' | 'senior' | 'executive';
  language?: string;
}

export interface MediaContactData {
  name: string;
  email: string;
  title: string;
  outlet: string;
  beats: string[];
  countries: string[];
  twitterHandle?: string;
  instagramHandle?: string;
  linkedinUrl?: string;
  bio?: string;
  notes?: string;
  authorLinks?: string[];
}

export interface ResearchSource {
  name: string;
  url: string;
  reliabilityScore: number; // 1-10 scale
  lastUpdated: Date;
  contactTypes: string[];
}