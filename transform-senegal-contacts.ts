#!/usr/bin/env tsx

/**
 * Transform Senegal Contacts Script
 * 
 * This script will transform the unique author profiles into the platform schema
 * and prepare them for storage in the database.
 */

import fs from 'fs';
import path from 'path';

// Load the unique authors
const uniqueAuthors = JSON.parse(fs.readFileSync(path.join(__dirname, 'senegal-authors-unique.json'), 'utf-8'));

// Load existing data to get IDs for relationships (if available)
let existingCountries: any[] = [];
let existingBeats: any[] = [];
let existingCategories: any[] = [];
let existingOutlets: any[] = [];

try {
  existingCountries = JSON.parse(fs.readFileSync(path.join(__dirname, 'senegal-countries.json'), 'utf-8') || '[]');
} catch (e) {
  // File doesn't exist, that's okay
}

try {
  existingBeats = JSON.parse(fs.readFileSync(path.join(__dirname, 'senegal-beats.json'), 'utf-8') || '[]');
} catch (e) {
  // File doesn't exist, that's okay
}

try {
  existingCategories = JSON.parse(fs.readFileSync(path.join(__dirname, 'senegal-categories.json'), 'utf-8') || '[]');
} catch (e) {
  // File doesn't exist, that's okay
}

try {
  existingOutlets = JSON.parse(fs.readFileSync(path.join(__dirname, 'senegal-outlets-transformed.json'), 'utf-8') || '[]');
} catch (e) {
  // File doesn't exist, that's okay
}

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
    path.join(__dirname, 'senegal-transform-log.json'),
    JSON.stringify(researchLog, null, 2)
  );
  console.log('Transform log saved to senegal-transform-log.json');
}

// Function to get Senegal country ID
async function getSenegalCountryId(): Promise<string> {
  // In a real implementation, we would fetch this from the API
  // For now, we'll use the ID we found earlier
  return '05003410-33de-4ceb-bd2f-b1bb8310ab21';
}

// Function to get beat IDs with correct IDs from the database
async function getBeatIds(beats: string[]): Promise<string[]> {
  // Map to actual beat IDs from the database
  const beatMap: Record<string, string> = {
    'Economy': '336e635a-51aa-4b60-b1ae-3863ea22cd20',
    'Finance': '6a20c268-4ac9-4454-ae67-3ce4c4eb3db0',
    'Corporate': '8885239a-f82a-46d2-aab2-59f032ce7605',
    'Energy & Power': '30ab611b-3fbd-48bc-8e5a-e1459ee8045a',
    'Oil & Gas': 'fa082481-01ad-4940-af8e-10c9b6afece4',
    'Innovation': 'dac2c9c7-56e4-4928-81b7-b8f92fe229e8',
    'Human Resources': 'd2573d45-0682-456d-bf78-a4f2583bf762',
    'Marketing': 'c3d7113a-af19-4f39-b8f2-f3c710b616a3',
    'Advertising & PR': 'e4489fce-26fa-479f-97cc-2a37011a4ded',
    'Telecommunications': '4d018234-5119-4807-8b33-5c19b2823270',
    'Entrepreneurship': '76cad423-eb95-4f22-8d20-78882b5707e5',
    'Startups': 'bfe6b9c5-1da2-4336-a85d-c14d15344a39',
    'SMBs': 'c4329c5c-0852-465a-8c9d-19faebe3e28f',
    'Manufacturing & Industry': 'c5e35db1-3c5c-488e-b258-687fabda55c8'
  };
  
  // Map each beat to its ID, filtering out undefined ones
  return beats.map(beat => beatMap[beat]).filter(id => id !== undefined);
}

// Function to get category IDs
async function getCategoryIds(categories: string[]): Promise<string[]> {
  // In a real implementation, we would fetch these from the API
  // For now, we'll map to known category IDs
  const categoryMap: Record<string, string> = {
    'Business': '893a13ac-cee4-4b6b-8504-9db35dcd9dd4',
    'Economy': 'ede87816-99b9-475d-9cd4-2dbd7b439cb0',
    'Energy': '67ffac31-6830-4084-85e4-3683e5eefec0',
    'Finance': '706f3a85-6445-431f-8fd3-cdfcf163bbe9'
  };
  
  return categories.map(category => categoryMap[category] || categoryMap['Business'] || 'default-category-id');
}

// Function to transform an author to the platform schema
async function transformAuthor(author: any): Promise<any> {
  logResearch('TRANSFORMING_AUTHOR', { name: author.name, outlet: author.outlet });
  
  // Get Senegal country ID
  const countryId = await getSenegalCountryId();
  
  // Get beat IDs
  const beatIds = await getBeatIds(author.beats);
  
  // Transform to platform schema
  const transformedAuthor = {
    name: author.name,
    email: author.email,
    title: author.title,
    bio: author.bio,
    email_verified_status: false, // Mark as unverified by default
    socials: author.socials || [],
    authorLinks: author.authorLinks || [],
    outlet: author.outlet, // Add outlet name for reference
    outletIds: [], // We'll populate this after creating outlets
    countryIds: [countryId],
    beatIds: beatIds
  };
  
  logResearch('AUTHOR_TRANSFORMED', { name: author.name });
  
  return transformedAuthor;
}

// Function to transform outlets to the platform schema
async function transformOutlets(outlets: any[]): Promise<any[]> {
  logResearch('TRANSFORMING_OUTLETS', { count: outlets.length });
  
  const transformedOutlets: any[] = [];
  
  for (const outlet of outlets) {
    // Get category IDs for this outlet
    const categoryIds = await getCategoryIds(outlet.sectors);
    
    // Get Senegal country ID
    const countryId = await getSenegalCountryId();
    
    const transformedOutlet = {
      name: outlet.name,
      description: outlet.description,
      website: outlet.website,
      publisherId: null, // We'll populate this after creating publishers
      categoryIds: categoryIds,
      countryIds: [countryId]
    };
    
    transformedOutlets.push(transformedOutlet);
    logResearch('OUTLET_TRANSFORMED', { name: outlet.name });
  }
  
  return transformedOutlets;
}

// Function to transform publishers to the platform schema
async function transformPublishers(outlets: any[]): Promise<any[]> {
  logResearch('TRANSFORMING_PUBLISHERS', { outletCount: outlets.length });
  
  // Create unique publishers from outlets
  const publishersMap: Record<string, any> = {};
  
  for (const outlet of outlets) {
    const publisherName = outlet.publisher || `${outlet.name} Publisher`;
    
    if (!publishersMap[publisherName]) {
      publishersMap[publisherName] = {
        name: publisherName,
        description: `Publisher of ${outlet.name} and other media properties`,
        website: outlet.website ? new URL(outlet.website).origin : null,
        outletIds: []
      };
    }
    
    // Add this outlet to the publisher
    publishersMap[publisherName].outletIds.push(outlet.name);
  }
  
  const transformedPublishers = Object.values(publishersMap).map((publisher: any) => ({
    name: publisher.name,
    description: publisher.description,
    website: publisher.website,
    outletIds: publisher.outletIds
  }));
  
  logResearch('PUBLISHERS_TRANSFORMED', { count: transformedPublishers.length });
  
  return transformedPublishers;
}

// Main transformation function
async function transformContacts() {
  logResearch('START_TRANSFORMATION', { authorCount: uniqueAuthors.length });
  
  // Transform authors
  const transformedAuthors: any[] = [];
  
  for (const author of uniqueAuthors) {
    const transformedAuthor = await transformAuthor(author);
    transformedAuthors.push(transformedAuthor);
  }
  
  // Transform outlets
  const outletsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'senegal-outlets-real.json'), 'utf-8'));
  const transformedOutlets = await transformOutlets(outletsData);
  
  // Transform publishers
  const transformedPublishers = await transformPublishers(outletsData);
  
  logResearch('TRANSFORMATION_COMPLETED', { 
    authors: transformedAuthors.length,
    outlets: transformedOutlets.length,
    publishers: transformedPublishers.length
  });
  
  // Save transformed data
  fs.writeFileSync(
    path.join(__dirname, 'senegal-authors-transformed.json'),
    JSON.stringify(transformedAuthors, null, 2)
  );
  
  fs.writeFileSync(
    path.join(__dirname, 'senegal-outlets-transformed.json'),
    JSON.stringify(transformedOutlets, null, 2)
  );
  
  fs.writeFileSync(
    path.join(__dirname, 'senegal-publishers-transformed.json'),
    JSON.stringify(transformedPublishers, null, 2)
  );
  
  saveResearchLog();
  
  console.log(`Transformation completed.`);
  console.log(`- Transformed ${transformedAuthors.length} authors`);
  console.log(`- Transformed ${transformedOutlets.length} outlets`);
  console.log(`- Transformed ${transformedPublishers.length} publishers`);
  
  return { authors: transformedAuthors, outlets: transformedOutlets, publishers: transformedPublishers };
}

// Run the transformation
transformContacts().catch(console.error);