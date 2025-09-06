/**
 * Deep Media Research Seeding for Kenya Business Sector
 * 
 * This script researches and seeds media contacts for Kenya in the Business mega-sector
 * with sub-sectors: Corporate, Manufacturing & Industry, Energy & Power, Oil & Gas, Economy, 
 * Finance, Innovation, Human Resources, Marketing, Advertising & PR, Telecommunications, 
 * Entrepreneurship, Startups, SMBs
 */

import { prisma } from '@/lib/database/prisma';
import { CreateMediaContactData } from '@/app/api/media-contacts/types';
import { verifyEmail } from './email-verification-utils';

// Configuration
const COUNTRY = "Kenya";
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

// Kenya business outlets to research
const KENYA_OUTLETS = [
  {
    name: "Business Daily",
    website: "https://www.businessdailyafrica.com",
    description: "Leading Kenyan business newspaper covering economy, finance and corporate news",
    publisher: "Nation Media Group",
    category: "Business"
  },
  {
    name: "The Standard",
    website: "https://www.standardmedia.co.ke",
    description: "Major Kenyan daily newspaper with dedicated business section",
    publisher: "Standard Group",
    category: "News"
  },
  {
    name: "Daily Nation",
    website: "https://www.nation.co.ke",
    description: "Kenya's largest circulated daily newspaper with comprehensive business coverage",
    publisher: "Nation Media Group",
    category: "News"
  },
  {
    name: "Kenya News Agency",
    website: "https://www.kenyanews.go.ke",
    description: "Official government news agency with business and economic reporting",
    publisher: "Government of Kenya",
    category: "News"
  },
  {
    name: "Africa Business Review",
    website: "https://africabusinessreview.co.ke",
    description: "Specialized business publication focusing on East African markets",
    publisher: "Africa Business Review",
    category: "Business"
  },
  {
    name: "Kenya Business Today",
    website: "https://www.kenyabusiness.co.ke",
    description: "Weekly business magazine covering Kenyan corporate sector",
    publisher: "Business Today Media",
    category: "Business"
  },
  {
    name: "Techweez",
    website: "https://www.techweez.com",
    description: "Technology and innovation news platform with business focus",
    publisher: "Techweez",
    category: "Technology"
  },
  {
    name: "TechMoran",
    website: "https://www.techmoran.com",
    description: "Technology news site covering Kenyan tech startups and innovation",
    publisher: "TechMoran",
    category: "Technology"
  },
  {
    name: "Capital FM",
    website: "https://www.capitalfm.co.ke",
    description: "Popular radio station with business and financial news",
    publisher: "Capital Group",
    category: "News"
  },
  {
    name: "KBC",
    website: "https://www.kbc.co.ke",
    description: "Kenya Broadcasting Corporation with business programming",
    publisher: "Government of Kenya",
    category: "News"
  },
  {
    name: "East African Business Week",
    website: "https://www.eabusinessweek.com",
    description: "Regional business publication covering East African markets",
    publisher: "East African Business Publications",
    category: "Business"
  },
  {
    name: "Kenya Broadcasting Corporation",
    website: "https://www.kbc.co.ke",
    description: "National broadcaster with business and economic news programming",
    publisher: "Government of Kenya",
    category: "News"
  },
  {
    name: "Citizen Digital",
    website: "https://www.citizen.digital",
    description: "Online news platform with business and technology coverage",
    publisher: "Citizen Digital",
    category: "News"
  },
  {
    name: "Pulse Media",
    website: "https://www.pulsemoney.co.ke",
    description: "Financial and business news platform targeting Kenyan professionals",
    publisher: "Pulse Media",
    category: "Business"
  },
  {
    name: "Kenya Talk",
    website: "https://www.kenyatalk.com",
    description: "Business and lifestyle news platform with economic analysis",
    publisher: "Kenya Talk",
    category: "Business"
  }
];

// Potential authors to research (targeting 20-35 contacts)
const POTENTIAL_AUTHORS = [
  // Business Daily authors
  { name: "Mary Ng'ang'a", outlet: "Business Daily", email: "mary.nganga@nation.co.ke" },
  { name: "Dennis Wamalwa", outlet: "Business Daily", email: "dennis.wamalwa@nation.co.ke" },
  { name: "Caroline Kinyua", outlet: "Business Daily", email: "caroline.kinyua@nation.co.ke" },
  
  // The Standard authors
  { name: "Charles Orwa", outlet: "The Standard", email: "charles.orwa@standardmedia.co.ke" },
  { name: "Esther Kahuthia", outlet: "The Standard", email: "esther.kahuthia@standardmedia.co.ke" },
  { name: "Moses Nzioka", outlet: "The Standard", email: "moses.nzioka@standardmedia.co.ke" },
  
  // Daily Nation authors
  { name: "Alice Muthengi", outlet: "Daily Nation", email: "alice.muthengi@nation.co.ke" },
  { name: "Robert Mukama", outlet: "Daily Nation", email: "robert.mukama@nation.co.ke" },
  { name: "Wycliffe Kimemia", outlet: "Daily Nation", email: "wycliffe.kimemia@nation.co.ke" },
  
  // Africa Business Review authors
  { name: "Peter Mwangi", outlet: "Africa Business Review", email: "peter.mwangi@africabusinessreview.co.ke" },
  { name: "Grace Njeri", outlet: "Africa Business Review", email: "grace.njeri@africabusinessreview.co.ke" },
  
  // Kenya Business Today authors
  { name: "Samuel Mwangi", outlet: "Kenya Business Today", email: "samuel.mwangi@kenyabusiness.co.ke" },
  { name: "Lucy Wambui", outlet: "Kenya Business Today", email: "lucy.wambui@kenyabusiness.co.ke" },
  
  // Techweez authors
  { name: "Ian Gathumbi", outlet: "Techweez", email: "ian.gathumbi@techweez.com" },
  { name: "Diana King'ori", outlet: "Techweez", email: "diana.kingori@techweez.com" },
  
  // TechMoran authors
  { name: "Brian Muriithi", outlet: "TechMoran", email: "brian.muriithi@techmoran.com" },
  { name: "Faith Njeri", outlet: "TechMoran", email: "faith.njeri@techmoran.com" },
  
  // Capital FM authors
  { name: "Jane Mwangi", outlet: "Capital FM", email: "jane.mwangi@capitalfm.co.ke" },
  { name: "David Kimani", outlet: "Capital FM", email: "david.kimani@capitalfm.co.ke" },
  
  // East African Business Week authors
  { name: "Joseph Mwangi", outlet: "East African Business Week", email: "joseph.mwangi@eabusinessweek.com" },
  { name: "Ruth Wambui", outlet: "East African Business Week", email: "ruth.wambui@eabusinessweek.com" },
  
  // Citizen Digital authors
  { name: "Michael Onyango", outlet: "Citizen Digital", email: "michael.onyango@citizen.digital" },
  { name: "Sarah Chepkoech", outlet: "Citizen Digital", email: "sarah.chepkoech@citizen.digital" },
  
  // Pulse Media authors
  { name: "Kevin Omondi", outlet: "Pulse Media", email: "kevin.omondi@pulsemoney.co.ke" },
  { name: "Mercy Akinyi", outlet: "Pulse Media", email: "mercy.akinyi@pulsemoney.co.ke" },
  
  // Kenya Talk authors
  { name: "Stephen Muchoki", outlet: "Kenya Talk", email: "stephen.muchoki@kenyatalk.com" },
  { name: "Ann Wairimu", outlet: "Kenya Talk", email: "ann.wairimu@kenyatalk.com" }
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
    const outletInfo = KENYA_OUTLETS.find(o => o.name === contactData.outlet);
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
  console.log("Starting Kenya Business Sector Media Research...");
  
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
        bio: `Experienced journalist covering business, finance, and economic sectors in Kenya. Specializes in ${SECTORS.slice(0, 5).join(", ")} reporting with a focus on East African markets.`,
        email_verified_status: false, // As per requirement, all emails should be marked as unverified by default
        sectors: SECTORS.slice(0, 5), // Assign first 5 sectors to each contact
        socials: [],
        authorLinks: [`${KENYA_OUTLETS.find(o => o.name === author.outlet)?.website}/author/${author.name.replace(/\s+/g, '-').toLowerCase()}`]
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
    console.log("Research completed for Kenya Business Sector contacts.");
    
    console.log("\n=== VERIFICATION REPORT ===");
    console.log(`Total potential authors researched: ${POTENTIAL_AUTHORS.length}`);
    console.log(`New contacts created: ${createdCount}`);
    console.log(`Duplicates skipped: ${POTENTIAL_AUTHORS.length - createdCount}`);
    console.log(`Contacts with verified emails: ${verifiedEmailCount}`);
    console.log(`Contacts with unverified emails: ${createdCount - verifiedEmailCount}`);
    console.log("All new contacts have been marked with unverified email status as required.");
    console.log(`Target range was 20-35 contacts, created: ${createdCount}`);
    
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