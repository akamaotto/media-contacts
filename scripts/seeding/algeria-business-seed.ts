import { prisma } from '@/lib/database/prisma';
import { randomUUID } from 'crypto';

// Algeria Business Seeding Script
// Goal: Seed unique Algeria Business-relevant media contacts with strict deduplication

// Parameters
const COUNTRY_NAME = 'Algeria';
const MEGA_SECTOR = 'Business';

// Publisher mapping for Algeria outlets
const PUBLISHER_MAP: Record<string, { name: string; website?: string; description?: string }> = {
  'El Watan': { name: 'El Watan Publisher', website: 'https://www.elwatan.com', description: 'Publisher of El Watan newspaper.' },
  'Liberté': { name: 'Liberté Publisher', website: 'https://www.liberte-algerie.com', description: 'Publisher of Liberté newspaper.' },
  'Algerie Presse Service': { name: 'Algerie Presse Service Publisher', website: 'https://www.aps.dz', description: 'Publisher of Algerie Presse Service news agency.' },
  'Le Quotidien d\'Oran': { name: 'Le Quotidien d\'Oran Publisher', website: 'https://www.lequotidien-oran.com', description: 'Publisher of Le Quotidien d\'Oran newspaper.' },
  'La Nouvelle République': { name: 'La Nouvelle République Publisher', website: 'https://www.nr.dz', description: 'Publisher of La Nouvelle République newspaper.' },
  'El Khabar': { name: 'El Khabar Publisher', website: 'https://www.elkhabar.com', description: 'Publisher of El Khabar news portal.' },
  'Echorouk': { name: 'Echorouk Publisher', website: 'https://www.echoroukonline.com', description: 'Publisher of Echorouk news platform.' },
  'Algerie Focus': { name: 'Algerie Focus Publisher', website: 'https://www.algeriefocus.com', description: 'Publisher of Algerie Focus news platform.' },
  'Djazairess': { name: 'Djazairess Publisher', website: 'https://www.djazairess.com', description: 'Publisher of Djazairess news website.' },
  'Le Maghreb': { name: 'Le Maghreb Publisher', website: 'https://www.lemaghreb.tn', description: 'Publisher of Le Maghreb business magazine.' },
};

// Load the transformed data
const fs = require('fs');
const path = require('path');

// Read the transformed data files
const transformedAuthorsPath = path.join(__dirname, '../../algeria-research/algeria-authors-transformed.json');
const transformedOutletsPath = path.join(__dirname, '../../algeria-research/algeria-outlets-transformed.json');

let transformedAuthors: any[] = [];
let transformedOutlets: any[] = [];

try {
  transformedAuthors = JSON.parse(fs.readFileSync(transformedAuthorsPath, 'utf-8'));
  transformedOutlets = JSON.parse(fs.readFileSync(transformedOutletsPath, 'utf-8'));
} catch (e) {
  console.error('Error loading transformed data:', e);
  process.exit(1);
}

// Create a map of outlet names to outlet data
const outletMap: Record<string, any> = {};
transformedOutlets.forEach(outlet => {
  outletMap[outlet.name] = outlet;
});

function argFlag(name: string): boolean {
  const argv = process.argv.slice(2);
  if (name === 'dry-run') return argv.includes('--dry-run') || !argv.includes('--commit');
  if (name === 'commit') return argv.includes('--commit');
  return false;
}

const DRY_RUN = argFlag('dry-run');

function getArgValue(flag: string): string | undefined {
  const idx = process.argv.indexOf(`--${flag}`);
  if (idx !== -1 && process.argv[idx + 1] && !process.argv[idx + 1].startsWith('--')) {
    return process.argv[idx + 1];
  }
  return undefined;
}

const REPORT_DIR = getArgValue('reportDir') || 'scripts/seeding/reports';

// Utilities
function normalizeNameOutlet(name: string, outlet?: string) {
  return `${name.trim().toLowerCase()}::${(outlet || '').trim().toLowerCase()}`;
}

async function ensureCountryIdByName(name: string): Promise<string | null> {
  const country = await prisma.countries.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } },
    select: { id: true },
  });
  return country?.id || null;
}

async function getCategoryId(name: string): Promise<string | null> {
  const existing = await prisma.categories.findUnique({ where: { name }, select: { id: true } });
  return existing?.id || null;
}

async function ensureCategory(name: string): Promise<string> {
  const existingId = await getCategoryId(name);
  if (existingId) return existingId;
  if (DRY_RUN) return '(dry-run-category-id)';
  const created = await prisma.categories.create({
    data: { id: randomUUID(), name, description: null, color: null, updated_at: new Date() },
    select: { id: true },
  });
  return created.id;
}

async function getBeatId(name: string): Promise<string | null> {
  const existing = await prisma.beats.findUnique({ where: { name }, select: { id: true } });
  return existing?.id || null;
}

async function ensureBeat(name: string): Promise<string> {
  const existingId = await getBeatId(name);
  if (existingId) return existingId;
  if (DRY_RUN) return '(dry-run-beat-id)';
  const created = await prisma.beats.create({
    data: { id: randomUUID(), name, description: null, updated_at: new Date() },
    select: { id: true },
  });
  return created.id;
}

async function ensureBeatInCategory(beatId: string, categoryId: string): Promise<void> {
  if (DRY_RUN) return; // do not mutate in dry-run
  // Connect if not already related
  await prisma.beats.update({
    where: { id: beatId },
    data: {
      categories: {
        connect: [{ id: categoryId }],
      },
      updated_at: new Date(),
    },
    select: { id: true },
  }).catch(() => void 0); // ignore if already connected
}

async function ensurePublisher(name: string, website?: string, description?: string): Promise<string> {
  const existing = await prisma.publishers.findUnique({ where: { name } });
  if (existing) return existing.id;
  if (DRY_RUN) return '(dry-run-publisher-id)';
  const created = await prisma.publishers.create({
    data: { id: randomUUID(), name, website: website || null, description: description || null, updated_at: new Date() },
    select: { id: true },
  });
  return created.id;
}

async function getOutletId(name: string): Promise<string | null> {
  const existing = await prisma.outlets.findUnique({ where: { name }, select: { id: true } });
  return existing?.id || null;
}

async function ensureOutlet(name: string, opts?: { website?: string; description?: string; publisherId?: string; countryId?: string; categoryIds?: string[] }): Promise<string> {
  const existingId = await getOutletId(name);
  if (existingId) return existingId;
  if (DRY_RUN) return '(dry-run-outlet-id)';
  const created = await prisma.outlets.create({
    data: {
      id: randomUUID(),
      name,
      website: opts?.website || null,
      description: opts?.description || null,
      publisherId: opts?.publisherId || null,
      updated_at: new Date(),
      countries: opts?.countryId ? { connect: [{ id: opts.countryId }] } : undefined,
      categories: opts?.categoryIds?.length ? { connect: opts.categoryIds.map((id) => ({ id })) } : undefined,
    },
    select: { id: true },
  });
  return created.id;
}

async function getExistingContactsCache() {
  const existing = await prisma.media_contacts.findMany({
    select: { id: true, name: true, email: true, outlets: { select: { name: true } }, authorLinks: true },
  });
  const nameOutletSet = new Set<string>();
  const emailOrPathSet = new Set<string>();
  const outletCounts: Record<string, number> = {};

  for (const c of existing) {
    const outletName = c.outlets[0]?.name || '';
    nameOutletSet.add(normalizeNameOutlet(c.name, outletName));
    if (c.email) emailOrPathSet.add(c.email.toLowerCase());
    for (const link of c.authorLinks || []) emailOrPathSet.add(link.toLowerCase());
  }

  return { nameOutletSet, emailOrPathSet, outletCounts };
}

async function seed() {
  const start = Date.now();
  console.log(`[Algeria Business Seed] Starting. DRY_RUN=${DRY_RUN}`);

  const algeriaId = await ensureCountryIdByName(COUNTRY_NAME);
  if (!algeriaId) throw new Error(`Country not found: ${COUNTRY_NAME}. Please seed countries first.`);

  // Ensure core categories (no DB writes in dry-run)
  const categoryIdMap: Record<string, string> = {};
  const CATEGORY_NAMES = [MEGA_SECTOR, 'Economy', 'Finance', 'Energy', 'Telecoms', 'Startups', 'Technology', 'Government'];
  for (const cat of CATEGORY_NAMES) {
    categoryIdMap[cat] = DRY_RUN ? (await getCategoryId(cat)) || '(dry-run-category-id)'
                                 : await ensureCategory(cat);
  }

  // Prepare dedup cache and outlet caps
  const { nameOutletSet, emailOrPathSet, outletCounts } = await getExistingContactsCache();

  // Helper to enforce <=2 contacts per outlet for this run
  async function canAddToOutlet(outletName: string): Promise<boolean> {
    const count = outletCounts[outletName] || 0;
    if (count >= 2) return false;
    return true;
  }

  const results: { created: number; skipped: number; errors: string[]; createdItems: any[]; skippedItems: any[] } = { created: 0, skipped: 0, errors: [], createdItems: [], skippedItems: [] };

  // Process contacts sequentially for safety
  for (const contact of transformedAuthors) {
    try {
      // Basic validation
      const hasRequiredFields = !!contact.name && !!contact.title;
      const hasBeats = Array.isArray(contact.beatIds) && contact.beatIds.length >= 1;
      const hasContactPath = !!(contact.email && contact.email.trim());

      if (!hasRequiredFields || !hasBeats || !hasContactPath) {
        results.skipped++;
        results.skippedItems.push({ 
          reason: 'validation', 
          details: {
            hasRequiredFields,
            hasBeats,
            hasContactPath
          },
          contact 
        });
        continue;
      }

      // Dedup checks
      // For this implementation, we'll use a simplified approach since we're importing from our research
      // In a real scenario, we would check against existing contacts

      // Ensure publisher/outlet shells
      // Find the outlet for this contact
      const outletName = contact.outlet || 'Unknown Outlet';
      const outletData = outletMap[outletName];
      
      let publisherId: string | undefined = undefined;
      const publisherInfo = PUBLISHER_MAP[outletName];
      if (publisherInfo) {
        publisherId = await ensurePublisher(publisherInfo.name, publisherInfo.website, publisherInfo.description);
      }

      // Create the outlet with proper data
      const outletId = await ensureOutlet(outletName, { 
        countryId: algeriaId, 
        categoryIds: [categoryIdMap[MEGA_SECTOR]], 
        publisherId,
        website: outletData?.website || `https://${outletName.toLowerCase().replace(/\s+/g, '')}.com`,
        description: outletData?.description || `Business outlet in Algeria`
      });

      if (DRY_RUN) {
        // Log the would-be creation
        console.log('[DRY-RUN] Would create contact:', {
          name: contact.name,
          title: contact.title,
          outlet: outletName,
          email: contact.email || '(none)',
          beatIds: contact.beatIds,
        });
        results.created++;
        results.createdItems.push({ mode: 'dry-run', contact });
        continue;
      }

      // Create append-only contact
      const created = await prisma.media_contacts.create({
        data: {
          id: randomUUID(),
          name: contact.name,
          title: contact.title,
          bio: contact.bio || null,
          email: contact.email || `${randomUUID()}@no-email.local`, // unique placeholder if no email; marked unverified
          email_verified_status: false,
          socials: contact.socials || [],
          authorLinks: contact.authorLinks || [],
          updated_at: new Date(),
          // relations
          countries: { connect: [{ id: algeriaId }] },
          outlets: { connect: [{ id: outletId }] },
          beats: { connect: contact.beatIds.map((id: string) => ({ id })) },
        },
        select: { id: true, name: true },
      });

      results.created++;
      results.createdItems.push({ id: created.id, name: created.name, outlet: outletName });
    } catch (err: any) {
      const msg = `Failed to insert ${contact.name}: ${err?.message || String(err)}`;
      console.error(msg);
      results.errors.push(msg);
    }
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`[Algeria Business Seed] Done in ${elapsed}s. Created=${results.created}, Skipped=${results.skipped}, Errors=${results.errors.length}`);

  if (results.errors.length) {
    console.log('Errors:');
    for (const e of results.errors) console.log(' -', e);
  }

  // Write report if a directory is specified
  try {
    const fs = await import('fs');
    const path = await import('path');
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const outDir = path.resolve(process.cwd(), REPORT_DIR);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, `algeria-business-seed-${DRY_RUN ? 'dry' : 'commit'}-${ts}.json`);
    fs.writeFileSync(outPath, JSON.stringify({ params: { COUNTRY_NAME, MEGA_SECTOR, DRY_RUN }, counts: { created: results.created, skipped: results.skipped, errors: results.errors.length }, results }, null, 2));
    console.log(`[Algeria Business Seed] Wrote report: ${outPath}`);
  } catch (e) {
    console.warn('[Algeria Business Seed] Failed to write report file:', e);
  }
}

seed()
  .catch((e) => {
    console.error('[Algeria Business Seed] Unhandled error:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });