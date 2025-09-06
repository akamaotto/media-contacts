#!/usr/bin/env tsx

/**
 * Deduplicate Senegal Contacts Script
 * 
 * This script will compare the enriched author profiles against existing contacts
 * in the database to ensure uniqueness.
 */

import fs from 'fs';
import path from 'path';

// Load the enriched authors
const enrichedAuthors = JSON.parse(fs.readFileSync(path.join(__dirname, 'senegal-authors-enriched.json'), 'utf-8'));

// Load existing contacts (properly formatted JSON array)
const existingContacts = JSON.parse(fs.readFileSync(path.join(__dirname, 'existing_contacts_array.json'), 'utf-8'));

// Research log
const researchLog: any[] = [];

// Function to log research activities
function logResearch(activity: string, details: any) {
  researchLog.push({
    timestamp: new Date().toISOString(),
    activity,
    details
  });
  console.log(`[${new Date().toISOString()}] ${activity}`, JSON.stringify(details, null, 2));
}

// Function to save research log
function saveResearchLog() {
  fs.writeFileSync(
    path.join(__dirname, 'senegal-deduplication-log.json'),
    JSON.stringify(researchLog, null, 2)
  );
  console.log('Deduplication log saved to senegal-deduplication-log.json');
}

// Function to normalize a name for comparison
function normalizeName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, ' ').trim();
}

// Function to normalize an outlet name for comparison
function normalizeOutlet(outlet: string): string {
  return outlet.toLowerCase().replace(/\s+/g, ' ').trim();
}

// Function to check if an author is a duplicate
function isDuplicate(author: any, existingContacts: any[]): boolean {
  const normalizedName = normalizeName(author.name);
  const normalizedOutlet = normalizeOutlet(author.outlet);
  
  // Check for matches based on (normalized_full_name, outlet)
  for (const contact of existingContacts) {
    const contactNormalizedName = normalizeName(contact.name);
    if (contact.outlets && contact.outlets.length > 0) {
      for (const contactOutlet of contact.outlets) {
        const contactNormalizedOutlet = normalizeOutlet(contactOutlet.name || contactOutlet);
        if (normalizedName === contactNormalizedName && normalizedOutlet === contactNormalizedOutlet) {
          return true;
        }
      }
    }
  }
  
  // Check for matches based on email
  if (author.email) {
    for (const contact of existingContacts) {
      if (contact.email && contact.email === author.email) {
        return true;
      }
    }
  }
  
  return false;
}

// Main deduplication function
async function deduplicateContacts() {
  logResearch('START_DEDUPLICATION', { 
    enrichedCount: enrichedAuthors.length, 
    existingCount: existingContacts.length 
  });
  
  const uniqueAuthors: any[] = [];
  const duplicates: any[] = [];
  
  for (const author of enrichedAuthors) {
    if (isDuplicate(author, existingContacts)) {
      duplicates.push(author);
      logResearch('DUPLICATE_FOUND', { 
        name: author.name, 
        outlet: author.outlet,
        email: author.email
      });
    } else {
      uniqueAuthors.push(author);
      logResearch('UNIQUE_AUTHOR', { 
        name: author.name, 
        outlet: author.outlet,
        email: author.email
      });
    }
  }
  
  logResearch('DEDUPLICATION_COMPLETED', { 
    uniqueCount: uniqueAuthors.length, 
    duplicateCount: duplicates.length 
  });
  
  // Save unique authors
  fs.writeFileSync(
    path.join(__dirname, 'senegal-authors-unique.json'),
    JSON.stringify(uniqueAuthors, null, 2)
  );
  
  // Save duplicates
  fs.writeFileSync(
    path.join(__dirname, 'senegal-authors-duplicates.json'),
    JSON.stringify(duplicates, null, 2)
  );
  
  saveResearchLog();
  
  console.log(`Deduplication completed. Found ${uniqueAuthors.length} unique authors and ${duplicates.length} duplicates.`);
  return uniqueAuthors;
}

// Run the deduplication
deduplicateContacts().catch(console.error);