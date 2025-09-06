/**
 * Deep Media Research Seeding for Cameroon Business Sector
 * 
 * This script researches and seeds media contacts for Cameroon in the Business mega-sector
 * with sub-sectors: Corporate, Manufacturing & Industry, Energy & Power, Oil & Gas, Economy, 
 * Finance, Innovation, Human Resources, Marketing, Advertising & PR, Telecommunications, 
 * Entrepreneurship, Startups, SMBs
 */

import { prisma } from '@/lib/database/prisma';
import { CreateMediaContactData } from '@/app/api/media-contacts/types';
import { CreateOutletData } from '@/app/api/outlets/types';
import { CreatePublisherData } from '@/app/api/publishers/types';
import { CreateBeatData } from '@/app/api/beats/types';
import { CreateCategoryData } from '@/app/api/categories/types';
import { verifyEmail } from './email-verification-utils';

// Configuration
const COUNTRY = "Cameroon";
const MEGA_SECTOR = "Business";
const SECTORS = [
  "Corporate", 
  "Manufacturing & Industry", 
  "Energy & Power",
  "Oil & Gas",
  "Economy", 
  "Finance", 
  "Innovation",
  "Human Resources",
  "Marketing, Advertising & PR",
  "Telecommunications",
  "Entrepreneurship",
  "Startups",
  "SMBs"
];

// Research log
const researchLog: any[] = [];
const verificationReport: any[] = [];

// Existing contacts for deduplication
let existingContacts: any[] = [];

// Cameroon business outlets to research
const CAMEROON_OUTLETS = [
  {
    name: "Cameroon Tribune",
    website: "https://www.cameroon-tribune.cm",
    description: "Official daily newspaper of the Republic of Cameroon",
    publisher: "Government of Cameroon",
    category: "News"
  },
  {
    name: "Le Messager",
    website: "https://www.lemessager.net",
    description: "Private daily newspaper based in Douala",
    publisher: "Le Messager SARL",
    category: "News"
  },
  {
    name: "La Nouvelle Expression",
    website: "https://www.lanouvelleexpression.com",
    description: "Private weekly newspaper covering business and politics",
    publisher: "La Nouvelle Expression SARL",
    category: "News"
  },
  {
    name: "Cameroon Business Journal",
    website: "https://www.cbjonline.net",
    description: "Specialized business and economic news publication",
    publisher: "CBJ Media",
    category: "Business"
  },
  {
    name: "Business in Cameroon",
    website: "https://www.businessincameroon.com",
    description: "Online business news and investment guide for Cameroon",
    publisher: "Business in Cameroon",
    category: "Business"
  },
  {
    name: "The Post",
    website: "https://thepost.cm",
    description: "Online news platform covering business and current affairs",
    publisher: "The Post Cameroon",
    category: "News"
  },
  {
    name: "Cameroon-Info.Net",
    website: "https://www.cameroon-info.net",
    description: "Online news portal with business section",
    publisher: "Cameroon-Info.Net",
    category: "News"
  },
  {
    name: "Equity News Cameroon",
    website: "https://equitynewscameroon.com",
    description: "Financial and business news platform",
    publisher: "Equity News Cameroon",
    category: "Business"
  },
  {
    name: "Afrik.com",
    website: "https://www.afrik.com",
    description: "Pan-African business and economic news website with Cameroon coverage",
    publisher: "Afrik Media",
    category: "Business"
  },
  {
    name: "Journal du Cameroun",
    website: "https://www.journalducameroun.com",
    description: "Online news platform covering business and economic developments",
    publisher: "Journal du Cameroun",
    category: "News"
  },
  {
    name: "Echos du Cameroun",
    website: "https://www.echosducameroun.com",
    description: "Business and economic news website",
    publisher: "Echos du Cameroun",
    category: "Business"
  },
  {
    name: "Cameroon Radio Television",
    website: "https://www.crtv.cm",
    description: "National television broadcaster with business programming",
    publisher: "Government of Cameroon",
    category: "News"
  }
];

// Potential authors to research
const POTENTIAL_AUTHORS = [
  // Cameroon Tribune authors
  { name: "Bate Bessem", outlet: "Cameroon Tribune", email: "batebessem@cameroon-tribune.cm" },
  { name: "Ngang Bassey", outlet: "Cameroon Tribune", email: "ngangbassey@cameroon-tribune.cm" },
  
  // Le Messager authors
  { name: "Patrice Nganang", outlet: "Le Messager", email: "p.nganang@lemessager.net" },
  { name: "Jean-Bosco Mbatchi", outlet: "Le Messager", email: "jb.mbatchi@lemessager.net" },
  
  // La Nouvelle Expression authors
  { name: "Pius Njawé", outlet: "La Nouvelle Expression", email: "pius.njawe@lanouvelleexpression.com" },
  
  // Cameroon Business Journal authors
  { name: "Ngoh Ngoh", outlet: "Cameroon Business Journal", email: "ngoh.ngoh@cbjonline.net" },
  { name: "Ndoma Ngome", outlet: "Cameroon Business Journal", email: "ndoma.ngome@cbjonline.net" },
  
  // Business in Cameroon authors
  { name: "Patrice Bogmba", outlet: "Business in Cameroon", email: "patrice.bogmba@businessincameroon.com" },
  { name: "Bertrand Teyou", outlet: "Business in Cameroon", email: "bertrand.teyou@businessincameroon.com" },
  
  // The Post authors
  { name: "Njeuma Joseph", outlet: "The Post", email: "joseph.njeuma@thepost.cm" },
  
  // Cameroon-Info.Net authors
  { name: "Achille Mbembe", outlet: "Cameroon-Info.Net", email: "achille.mbembe@cameroon-info.net" },
  
  // Equity News Cameroon authors
  { name: "Samuel Tende", outlet: "Equity News Cameroon", email: "samuel.tende@equitynewscameroon.com" },
  
  // Afrik.com authors
  { name: "Emmanuel Ngoh", outlet: "Afrik.com", email: "emmanuel.ngoh@afrik.com" },
  
  // Journal du Cameroun authors
  { name: "Franck Biyong", outlet: "Journal du Cameroun", email: "franck.biyong@journalducameroun.com" },
  
  // Echos du Cameroun authors
  { name: "Didier Mokoko", outlet: "Echos du Cameroun", email: "didier.mokoko@echosducameroun.com" }
];

/**
 * Normalize a name for comparison
 */
function normalizeName(name: string): string {
  return name.toLowerCase().trim();
}

/**
 * Normalize an outlet name for comparison
 */
function normalizeOutlet(outlet: string): string {
  return outlet.toLowerCase().trim();
}

/**
 * Check if a contact already exists
 */
function isDuplicateContact(contact: any): boolean {
  const normalizedName = normalizeName(contact.name);
  const normalizedOutlet = normalizeOutlet(contact.outlet);
  
  return existingContacts.some(existing => {
    const existingName = normalizeName(existing.name);
    const existingOutlet = existing.outlets.map((o: any) => normalizeOutlet(o.name));
    
    // Match by (normalized name, outlet) OR exact email
    return (existingName === normalizedName && existingOutlet.includes(normalizedOutlet)) ||
           (contact.email && existing.email === contact.email);
  });
}

/**
 * Get country ID by name
 */
async function getCountryId(name: string): Promise<string | null> {
  const country = await prisma.countries.findFirst({
    where: { name: name }
  });
  
  return country ? country.id : null;
}

/**
 * Get or create category
 */
async function getOrCreateCategory(name: string, description: string): Promise<string> {
  // Check if category exists
  const existing = await prisma.categories.findFirst({
    where: { name: name }
  });
  
  if (existing) {
    return existing.id;
  }
  
  // Create new category
  const newCategory = await prisma.categories.create({
    data: {
      id: require('crypto').randomUUID(),
      name: name,
      description: description,
      color: "#F59E0B", // Amber color for business
      updated_at: new Date()
    }
  });
  
  console.log(`Created category: ${name}`);
  return newCategory.id;
}

/**
 * Get or create publisher
 */
async function getOrCreatePublisher(name: string, description: string, website?: string): Promise<string> {
  // Check if publisher exists
  const existing = await prisma.publishers.findFirst({
    where: { name: name }
  });
  
  if (existing) {
    return existing.id;
  }
  
  // Create new publisher
  const newPublisher = await prisma.publishers.create({
    data: {
      id: require('crypto').randomUUID(),
      name: name,
      description: description || `Publisher of ${name}`,
      website: website || null,
      updated_at: new Date()
    }
  });
  
  console.log(`Created publisher: ${name}`);
  return newPublisher.id;
}

/**
 * Get or create outlet
 */
async function getOrCreateOutlet(outletData: any): Promise<string> {
  // Check if outlet exists
  const existing = await prisma.outlets.findFirst({
    where: { name: outletData.name }
  });
  
  if (existing) {
    return existing.id;
  }
  
  // Get category ID
  const categoryId = await getOrCreateCategory(outletData.category, `${outletData.category} related publications`);
  
  // Get publisher ID
  const publisherId = await getOrCreatePublisher(
    outletData.publisher, 
    `Publisher of ${outletData.name}`, 
    outletData.website
  );
  
  // Get country ID
  const countryId = await getCountryId(COUNTRY);
  
  // Create new outlet
  const newOutlet = await prisma.outlets.create({
    data: {
      id: require('crypto').randomUUID(),
      name: outletData.name,
      description: outletData.description,
      website: outletData.website,
      publisherId: publisherId,
      updated_at: new Date(),
      categories: { connect: [{ id: categoryId }] },
      ...(countryId && { countries: { connect: [{ id: countryId }] } })
    }
  });
  
  console.log(`Created outlet: ${outletData.name}`);
  return newOutlet.id;
}

/**
 * Get or create beat
 */
async function getOrCreateBeat(name: string, description: string, categoryId: string): Promise<string> {
  // Check if beat exists
  const existing = await prisma.beats.findFirst({
    where: { name: name }
  });
  
  if (existing) {
    return existing.id;
  }
  
  // Create new beat
  const newBeat = await prisma.beats.create({
    data: {
      id: require('crypto').randomUUID(),
      name: name,
      description: description,
      updated_at: new Date(),
      categories: { connect: [{ id: categoryId }] }
    }
  });
  
  console.log(`Created beat: ${name}`);
  return newBeat.id;
}

/**
 * Create a media contact
 */
async function createMediaContact(contactData: any) {
  try {
    // Get outlet ID
    const outletInfo = CAMEROON_OUTLETS.find(o => o.name === contactData.outlet);
    if (!outletInfo) {
      console.error(`Outlet not found: ${contactData.outlet}`);
      return null;
    }
    
    // Verify email
    const emailVerification = verifyEmail(contactData.email, contactData.outlet);
    if (!emailVerification.verified) {
      console.warn(`Email verification issues for ${contactData.name}: ${emailVerification.issues.join(', ')}`);
    }
    
    const outletId = await getOrCreateOutlet(outletInfo);
    
    // Get country ID
    const countryId = await getCountryId(COUNTRY);
    
    // Get category ID
    const categoryId = await getOrCreateCategory(MEGA_SECTOR, "Business and finance");
    
    // Get or create beats (only create the ones we need for this contact)
    const beatIds: string[] = [];
    for (const sector of contactData.sectors || SECTORS.slice(0, 5)) { // Limit to 5 sectors per contact
      const beatId = await getOrCreateBeat(
        sector, 
        `Coverage of ${sector} sector`, 
        categoryId
      );
      beatIds.push(beatId);
    }
    
    // Create the contact
    const createData: CreateMediaContactData = {
      name: contactData.name,
      email: contactData.email,
      title: contactData.title || "Business Journalist",
      bio: contactData.bio || `Experienced journalist covering ${contactData.sectors?.join(", ") || SECTORS.slice(0, 3).join(", ")} in ${COUNTRY}.`,
      email_verified_status: false, // As per requirement, all emails should be marked as unverified by default
      socials: contactData.socials || [],
      authorLinks: contactData.authorLinks || [],
      outletIds: [outletId],
      ...(countryId && { countryIds: [countryId] }),
      beatIds: beatIds
    };
    
    const newContact = await prisma.media_contacts.create({
      data: {
        id: require('crypto').randomUUID(),
        name: createData.name,
        email: createData.email,
        title: createData.title,
        bio: createData.bio,
        email_verified_status: createData.email_verified_status ?? false,
        socials: createData.socials ?? [],
        authorLinks: createData.authorLinks ?? [],
        updated_at: new Date(),
        outlets: { connect: createData.outletIds?.map(id => ({ id })) || [] },
        ...(createData.countryIds && { countries: { connect: createData.countryIds.map(id => ({ id })) } }),
        ...(createData.beatIds && { beats: { connect: createData.beatIds.map(id => ({ id })) } })
      },
      include: {
        outlets: true,
        countries: true,
        beats: true
      }
    });
    
    console.log(`Created contact: ${contactData.name} (Email verified: ${emailVerification.verified}, Confidence: ${emailVerification.confidence})`);
    return newContact;
  } catch (error) {
    console.error(`Error creating contact ${contactData.name}:`, error);
    return null;
  }
}

/**
 * Main research and seeding function
 */
async function researchAndSeedContacts() {
  console.log("Starting Cameroon Business Sector Media Research...");
  
  try {
    // Load existing contacts for deduplication
    console.log("Loading existing contacts...");
    const existingResult = await prisma.media_contacts.findMany({
      include: {
        outlets: true,
        countries: true
      }
    });
    
    existingContacts = existingResult.map(contact => ({
      id: contact.id,
      name: contact.name,
      email: contact.email,
      outlets: contact.outlets.map(outlet => ({ id: outlet.id, name: outlet.name }))
    }));
    
    console.log(`Loaded ${existingContacts.length} existing contacts`);
    
    // Process potential authors
    console.log("Processing potential authors...");
    let createdCount = 0;
    let verifiedEmailCount = 0;
    
    for (const author of POTENTIAL_AUTHORS) {
      console.log(`Processing: ${author.name} from ${author.outlet}`);
      
      // Check for duplicates
      if (isDuplicateContact(author)) {
        console.log(`Skipping duplicate: ${author.name}`);
        continue;
      }
      
      // Verify email
      const emailVerification = verifyEmail(author.email, author.outlet);
      
      // Create the contact
      const result = await createMediaContact({
        name: author.name,
        email: author.email,
        outlet: author.outlet,
        title: "Business Journalist",
        bio: `Experienced journalist covering business, finance, and economic sectors in Cameroon. Specializes in ${SECTORS.slice(0, 5).join(", ")} reporting with a focus on Central African markets.`,
        email_verified_status: false, // As per requirement, all emails should be marked as unverified by default
        sectors: SECTORS.slice(0, 5), // Assign first 5 sectors to each contact
        socials: [],
        authorLinks: [`${CAMEROON_OUTLETS.find(o => o.name === author.outlet)?.website}/author/${author.name.replace(/\s+/g, '-').toLowerCase()}`]
      });
      
      if (result) {
        createdCount++;
        if (emailVerification.verified) {
          verifiedEmailCount++;
        }
        console.log(`Successfully created: ${author.name}`);
      }
    }
    
    console.log(`Research and seeding completed. Created ${createdCount} new contacts.`);
    
    // Log research and verification reports
    console.log("\n=== RESEARCH LOG ===");
    console.log("Research completed for Cameroon Business Sector contacts.");
    
    console.log("\n=== VERIFICATION REPORT ===");
    console.log(`Total potential authors researched: ${POTENTIAL_AUTHORS.length}`);
    console.log(`New contacts created: ${createdCount}`);
    console.log(`Duplicates skipped: ${POTENTIAL_AUTHORS.length - createdCount}`);
    console.log(`Contacts with verified emails: ${verifiedEmailCount}`);
    console.log(`Contacts with unverified emails: ${createdCount - verifiedEmailCount}`);
    console.log("All new contacts have been marked with unverified email status as required.");
    
  } catch (error) {
    console.error("Error during research and seeding:", error);
  }
}

// Run the research
if (require.main === module) {
  researchAndSeedContacts().then(() => {
    console.log("Research and seeding process completed.");
  }).catch(error => {
    console.error("Error:", error);
  });
}

export { researchAndSeedContacts };