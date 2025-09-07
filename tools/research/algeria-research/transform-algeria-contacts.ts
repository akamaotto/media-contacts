#!/usr/bin/env tsx

/**
 * Transform Algeria Contacts Script
 * 
 * This script will transform the enriched author profiles into the platform schema
 * and prepare them for storage in the database.
 */

import fs from 'fs';
import path from 'path';
import { prisma } from '../src/lib/database/prisma';

// Load the enriched authors
const enrichedAuthors = JSON.parse(fs.readFileSync(path.join(__dirname, 'algeria-authors-enriched.json'), 'utf-8'));

// Load outlet data
const outletsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'algeria-outlets.json'), 'utf-8'));

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
    path.join(__dirname, 'algeria-transform-log.json'),
    JSON.stringify(researchLog, null, 2)
  );
  console.log('Transform log saved to algeria-transform-log.json');
}

// Function to get Algeria country ID
async function getAlgeriaCountryId(): Promise<string> {
  const country = await prisma.countries.findFirst({
    where: { name: { equals: 'Algeria', mode: 'insensitive' } },
    select: { id: true }
  });
  return country?.id || '87d4bca9-7c20-40d6-9b37-65b8c0ba7eda'; // Default to the ID we found earlier
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
    'Manufacturing & Industry': 'c5e35db1-3c5c-488e-b258-687fabda55c8',
    'Technology': '5a2828df-915a-43e9-bff3-98fb754f4d26',
    'Government': '1ffacf68-0bf0-4161-bc80-1b419dcb7b22',
    'Politics': '15a253ef-673e-490a-b607-f93e94763272',
    'Society': '3ef12366-b725-47c7-812f-cf19ca90d9bb',
    'Food': '180f1b1d-afae-467e-8c03-ada4129d2ab2',
    'Insurance': '9cbff0ae-a904-474f-84e4-a35a000d96f1',
    'Education': '7ca39d21-e6d2-498e-b267-b1ccf4448cb6',
    'Fintech': 'a2fcec14-aa49-4bde-96ff-63942aab589f',
    'Safety': '38492de3-e741-408c-9416-3c3636123717',
    'Science': '9239ff23-f207-4ace-ae05-fb51eba59597',
    'Gardening': 'aba6c0a6-3ac7-4533-b128-5d1a5e336ef4',
    'Interior Design': '68a0999a-0c33-4f66-8e14-694e596234f1',
    'Weddings': '9f2741fc-790b-4cd5-8c1b-4644eeea9b1e',
    'Photography': '24be51ef-e219-4232-9559-f6b813d59672',
    'Art': '871194a5-0b49-4dda-9fb6-9bde1f84c12c',
    'Non-Profit': '3d7cf7fb-1a01-40e9-a44f-f9c53f4a1f42',
    'Philanthropy': '4fa9c788-cffc-4b8f-987c-3a28d6c16aac',
    'International Organisations': '8a933e95-33b8-4415-b6b1-885f30cc1052',
    'Fashion': '36236995-0606-4e54-bcd9-e99200f693b3',
    'Music': '349ad9e0-40c5-47ff-bcae-8c267f9b0cde',
    'Movies': 'd9ae16cd-7a9b-4191-b07d-6b2510e2e576',
    'Entertainment': 'cea9b12a-9fe6-4f1f-8784-828ed3e3d165',
    'Comics': '36dfbdcd-a81f-4fb4-adca-b3ac7d89b11c',
    'Storytelling': 'a7f09f5f-e69b-4c92-9c6d-5d94229ca8fc',
    'Books': '349ad9e0-40c5-47ff-bcae-8c267f9b0cde'
  };
  
  // Map each beat to its ID, filtering out undefined ones
  return beats.map(beat => beatMap[beat]).filter(id => id !== undefined);
}

// Function to get category IDs
async function getCategoryIds(categories: string[]): Promise<string[]> {
  // Map to actual category IDs from the database
  const categoryMap: Record<string, string> = {
    'Business': '893a13ac-cee4-4b6b-8504-9db35dcd9dd4',
    'Economy': 'ede87816-99b9-475d-9cd4-2dbd7b439cb0',
    'Energy': '67ffac31-6830-4084-85e4-3683e5eefec0',
    'Finance': '706f3a85-6445-431f-8fd3-cdfcf163bbe9',
    'Technology': '5a2828df-915a-43e9-bff3-98fb754f4d26',
    'Government': '1ffacf68-0bf0-4161-bc80-1b419dcb7b22'
  };
  
  // For now, we'll default to Business category for all
  return categories.map(category => categoryMap[category] || categoryMap['Business'] || '893a13ac-cee4-4b6b-8504-9db35dcd9dd4');
}

// Function to transform an author to the platform schema
async function transformAuthor(author: any): Promise<any> {
  logResearch('TRANSFORMING_AUTHOR', { name: author.name, outlet: author.outlet });
  
  // Get Algeria country ID
  const countryId = await getAlgeriaCountryId();
  
  // Get beat IDs
  const beatIds = await getBeatIds(author.beats);
  
  // Transform to platform schema
  const transformedAuthor = {
    name: author.name,
    email: author.email,
    title: author.title,
    bio: author.bio,
    email_verified_status: author.email_verified_status || false,
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
    
    // Get Algeria country ID
    const countryId = await getAlgeriaCountryId();
    
    const transformedOutlet = {
      name: outlet.name,
      description: outlet.description,
      website: outlet.website,
      publisher: `${outlet.name} Publisher`,
      publisherDescription: `Publisher of ${outlet.name} and other media properties`,
      publisherWebsite: outlet.website,
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
    const publisherName = `${outlet.name} Publisher`;
    
    if (!publishersMap[publisherName]) {
      publishersMap[publisherName] = {
        name: publisherName,
        description: `Publisher of ${outlet.name} and other media properties`,
        website: outlet.website,
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
  logResearch('START_TRANSFORMATION', { authorCount: enrichedAuthors.length });
  
  // Transform authors
  const transformedAuthors: any[] = [];
  
  for (const author of enrichedAuthors) {
    const transformedAuthor = await transformAuthor(author);
    transformedAuthors.push(transformedAuthor);
  }
  
  // Transform outlets
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
    path.join(__dirname, 'algeria-authors-transformed.json'),
    JSON.stringify(transformedAuthors, null, 2)
  );
  
  fs.writeFileSync(
    path.join(__dirname, 'algeria-outlets-transformed.json'),
    JSON.stringify(transformedOutlets, null, 2)
  );
  
  fs.writeFileSync(
    path.join(__dirname, 'algeria-publishers-transformed.json'),
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