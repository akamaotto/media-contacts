#!/usr/bin/env tsx

/**
 * Deduplicate Algeria Contacts Script
 * 
 * This script will deduplicate the Algeria author profiles against existing contacts
 * in the database to ensure we don't add duplicates.
 */

import fs from 'fs';
import path from 'path';
import { prisma } from '../src/lib/database/prisma';

// Load the authors
const authors = JSON.parse(fs.readFileSync(path.join(__dirname, 'algeria-authors.json'), 'utf-8'));

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
    path.join(__dirname, 'algeria-deduplication-log.json'),
    JSON.stringify(researchLog, null, 2)
  );
  console.log('Deduplication log saved to algeria-deduplication-log.json');
}

// Function to normalize name and outlet for comparison
function normalizeNameOutlet(name: string, outlet: string): string {
  return `${name.trim().toLowerCase()}::${outlet.trim().toLowerCase()}`;
}

// Function to fetch existing contacts from the database
async function fetchExistingContacts(): Promise<any[]> {
  logResearch('FETCHING_EXISTING_CONTACTS', { message: 'Fetching all existing contacts from database' });
  
  const existingContacts = await prisma.media_contacts.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      outlets: {
        select: {
          name: true
        }
      }
    }
  });
  
  logResearch('EXISTING_CONTACTS_FETCHED', { count: existingContacts.length });
  return existingContacts;
}

// Function to check if a contact already exists
function contactExists(contact: any, existingContacts: any[], existingNameOutletSet: Set<string>, existingEmailSet: Set<string>): boolean {
  // Check by normalized name and outlet
  const nameOutletKey = normalizeNameOutlet(contact.name, contact.outlet);
  if (existingNameOutletSet.has(nameOutletKey)) {
    return true;
  }
  
  // Check by email
  if (contact.email && existingEmailSet.has(contact.email.toLowerCase())) {
    return true;
  }
  
  return false;
}

// Main deduplication function
async function deduplicateContacts() {
  logResearch('START_DEDUPLICATION', { totalAuthors: authors.length });
  
  // Fetch existing contacts
  const existingContacts = await fetchExistingContacts();
  
  // Create sets for fast lookup
  const existingNameOutletSet = new Set<string>();
  const existingEmailSet = new Set<string>();
  
  for (const contact of existingContacts) {
    const outletName = contact.outlets[0]?.name || '';
    existingNameOutletSet.add(normalizeNameOutlet(contact.name, outletName));
    if (contact.email) {
      existingEmailSet.add(contact.email.toLowerCase());
    }
  }
  
  logResearch('EXISTING_SETS_CREATED', { 
    nameOutletSetSize: existingNameOutletSet.size, 
    emailSetSize: existingEmailSet.size 
  });
  
  // Filter out duplicates
  const uniqueAuthors = authors.filter((author: any) => {
    const isDuplicate = contactExists(author, existingContacts, existingNameOutletSet, existingEmailSet);
    if (isDuplicate) {
      logResearch('DUPLICATE_FOUND', { 
        name: author.name, 
        outlet: author.outlet,
        email: author.email
      });
    }
    return !isDuplicate;
  });
  
  logResearch('DEDUPLICATION_COMPLETED', { 
    originalCount: authors.length,
    uniqueCount: uniqueAuthors.length,
    duplicatesRemoved: authors.length - uniqueAuthors.length
  });
  
  // Save unique authors
  fs.writeFileSync(
    path.join(__dirname, 'algeria-authors-unique.json'),
    JSON.stringify(uniqueAuthors, null, 2)
  );
  
  saveResearchLog();
  
  console.log(`Deduplication completed. ${uniqueAuthors.length} unique authors identified from ${authors.length} total.`);
  return uniqueAuthors;
}

// Run the deduplication
deduplicateContacts().catch(console.error);