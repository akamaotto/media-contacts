// Data validation utilities for the media contacts seeding system

import { MediaContactData } from '../config';

/**
 * Validate a media contact object
 * @param contact Media contact data to validate
 * @returns Validation result with any errors found
 */
export function validateContact(contact: MediaContactData): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Validate required fields
  if (!contact.name || contact.name.trim() === '') {
    errors.push('Name is required');
  }
  
  if (!contact.email || contact.email.trim() === '') {
    errors.push('Email is required');
  } else if (!isValidEmail(contact.email)) {
    errors.push('Email format is invalid');
  }
  
  if (!contact.title || contact.title.trim() === '') {
    errors.push('Title is required');
  }
  
  if (!contact.outlet || contact.outlet.trim() === '') {
    errors.push('Outlet is required');
  }
  
  if (!contact.beats || contact.beats.length === 0) {
    errors.push('At least one beat is required');
  }
  
  if (!contact.countries || contact.countries.length === 0) {
    errors.push('At least one country is required');
  }
  
  // Validate social handles if provided
  if (contact.twitterHandle && !contact.twitterHandle.startsWith('@')) {
    errors.push('Twitter handle must start with @');
  }
  
  if (contact.linkedinUrl && !isValidUrl(contact.linkedinUrl)) {
    errors.push('LinkedIn URL is invalid');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate multiple media contacts
 * @param contacts Array of media contact data to validate
 * @returns Validation results for all contacts
 */
export function validateContacts(contacts: MediaContactData[]): { 
  validContacts: MediaContactData[]; 
  invalidContacts: { contact: MediaContactData; errors: string[] }[] 
} {
  const validContacts: MediaContactData[] = [];
  const invalidContacts: { contact: MediaContactData; errors: string[] }[] = [];
  
  for (const contact of contacts) {
    const validation = validateContact(contact);
    if (validation.isValid) {
      validContacts.push(contact);
    } else {
      invalidContacts.push({ contact, errors: validation.errors });
    }
  }
  
  return { validContacts, invalidContacts };
}

/**
 * Check if an email is valid
 * @param email Email to validate
 * @returns True if email is valid, false otherwise
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Check if a URL is valid
 * @param url URL to validate
 * @returns True if URL is valid, false otherwise
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Normalize contact data
 * @param contact Media contact data to normalize
 * @returns Normalized contact data
 */
export function normalizeContact(contact: MediaContactData): MediaContactData {
  return {
    ...contact,
    name: contact.name.trim(),
    email: contact.email.trim().toLowerCase(),
    title: contact.title.trim(),
    outlet: contact.outlet.trim(),
    beats: contact.beats.map(beat => beat.trim()),
    countries: contact.countries.map(country => country.trim()),
    twitterHandle: contact.twitterHandle ? contact.twitterHandle.trim() : undefined,
    instagramHandle: contact.instagramHandle ? contact.instagramHandle.trim() : undefined,
    linkedinUrl: contact.linkedinUrl ? contact.linkedinUrl.trim() : undefined,
    bio: contact.bio ? contact.bio.trim() : undefined,
    notes: contact.notes ? contact.notes.trim() : undefined,
    authorLinks: contact.authorLinks ? contact.authorLinks.map(link => link.trim()) : undefined
  };
}