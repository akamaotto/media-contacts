import { prisma } from '@/lib/database/prisma';
import { randomUUID } from 'crypto';

// Ghana Business Seeding Script (Dry-run friendly, append-only)
// Goal: Seed 20–35 unique Ghana Business-relevant media contacts with strict deduplication
// Success rules implemented:
// - Append-only: never overwrite existing contacts
// - Dedup keys: (normalized name + outlet) OR email/editorial form URL match
// - Relevance: Tag beats/categories from provided sector list; country fixed to Ghana
// - Verification defaults: email_verified_status = false
// - Diversity: Max 2 contacts per outlet during this run
// - Freshness, inbox verification, and enrichment are hooks (requires live research)

// IMPORTANT: This script DOES NOT fetch the web. It provides a safe framework.
// To execute real research, plug in the `candidates` array with validated entries
// gathered externally (or wire up a research agent to populate it), then run with
// DRY_RUN=false.

// How to run:
//   ts-node scripts/seeding/ghana-business-seed.ts --dry-run
//   ts-node scripts/seeding/ghana-business-seed.ts --commit

// Parameters
const COUNTRY_NAME = 'Ghana';
const MEGA_SECTOR = 'Business';
const SECTORS = [
  'Corporate',
  'Manufacturing & Industry',
  'Energy & Power',
  'Oil & Gas',
  'Economy',
  'Finance',
  'Innovation',
  'Human Resources',
  'Marketing',
  'Advertising & PR',
  'Telecommunications',
  'Entrepreneurship',
  'Startups',
  'SMBs',
];

// Map sectors to internal beats/categories
// We ensure categories exist, and create beats as needed, then associate beat↔category.
const CATEGORY_NAMES = [MEGA_SECTOR, 'Economy', 'Finance', 'Energy', 'Telecoms', 'Startups'];

// Optional: known publisher mapping for Ghana outlets.
// Fill when VERIFIED (avoid hallucinations). If provided, we ensure publisher and link outlet.publisherId.
const PUBLISHER_MAP: Record<string, { name: string; website?: string; description?: string }> = {
  // 'Business & Financial Times': { name: 'B&FT Media', website: 'https://thebftonline.com', description: 'Ghanaian business news publisher.' },
};

// Candidate input type
export type CandidateContact = {
  name: string; // full name
  title: string;
  outlet: string; // outlet name
  email?: string; // named inbox preferred; leave undefined if unknown
  contactFormUrl?: string; // editorial/pitch page URL for dedup and contact path
  bio?: string; // 3–5 sentence bio (curated)
  beats: string[]; // at least one from SECTORS mapping
  authorLinks: string[]; // 3–5 recent bylines
  socials?: string[]; // include LinkedIn/Twitter etc.
};

// Hook: provide candidates here (manually curated or produced by a research agent)
// For safety, start empty; paste validated candidates before committing OR pass --input path/to/candidates.json
let candidates: CandidateContact[] = [
  // Example template (do not commit guesses):
  // {
  //   name: 'First Last',
  //   title: 'Business Reporter',
  //   outlet: 'Business & Financial Times',
  //   email: 'newsroom@thebftonline.com', // if public named inbox; otherwise omit
  //   contactFormUrl: 'https://example.com/pitch-us',
  //   bio: '...',
  //   beats: ['Economy', 'Finance'],
  //   authorLinks: [
  //     'https://example.com/author/first-last/article-1',
  //     'https://example.com/author/first-last/article-2',
  //   ],
  //   socials: ['https://twitter.com/firstlast', 'https://www.linkedin.com/in/first-last/'],
  // },
];

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

const INPUT_PATH = getArgValue('input'); // JSON file with CandidateContact[]
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
  console.log(`[Ghana Business Seed] Starting. DRY_RUN=${DRY_RUN}`);

  // Load candidates from --input if provided
  if (INPUT_PATH) {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const fullPath = path.resolve(process.cwd(), INPUT_PATH);
      const raw = fs.readFileSync(fullPath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        candidates = parsed as CandidateContact[];
        console.log(`[Ghana Business Seed] Loaded ${candidates.length} candidates from ${INPUT_PATH}`);
      } else if (Array.isArray(parsed?.candidates)) {
        candidates = parsed.candidates as CandidateContact[];
        console.log(`[Ghana Business Seed] Loaded ${candidates.length} candidates from ${INPUT_PATH} (candidates field)`);
      } else {
        console.warn(`[Ghana Business Seed] Input file does not contain an array or { candidates: [] } structure.`);
      }
    } catch (e) {
      console.error(`[Ghana Business Seed] Failed to load input file: ${INPUT_PATH}`, e);
    }
  }

  const ghanaId = await ensureCountryIdByName(COUNTRY_NAME);
  if (!ghanaId) throw new Error(`Country not found: ${COUNTRY_NAME}. Please seed countries first.`);

  // Ensure core categories (no DB writes in dry-run)
  const categoryIdMap: Record<string, string> = {};
  for (const cat of CATEGORY_NAMES) {
    categoryIdMap[cat] = DRY_RUN ? (await getCategoryId(cat)) || '(dry-run-category-id)'
                                 : await ensureCategory(cat);
  }

  // Ensure beats and attach to categories (no DB writes in dry-run)
  const beatIdMap: Record<string, string> = {};
  for (const sector of SECTORS) {
    const beatId = DRY_RUN ? (await getBeatId(sector)) || '(dry-run-beat-id)'
                           : await ensureBeat(sector);
    beatIdMap[sector] = beatId;
    // Attach to best-fit category buckets
    const bucket = sector.match(/(Finance|Econom|Energy|Telecom|Startup|SMB|Corporate)/i)?.[0] || MEGA_SECTOR;
    const bucketKey = bucket.startsWith('Econom') ? 'Economy' : bucket.startsWith('Telecom') ? 'Telecoms' : bucket.startsWith('Startup') ? 'Startups' : bucket.startsWith('SMB') ? MEGA_SECTOR : bucket;
    if (!DRY_RUN) {
      await ensureBeatInCategory(beatId, categoryIdMap[bucketKey] || categoryIdMap[MEGA_SECTOR]);
    }
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

  // Process candidates sequentially for safety
  for (const candidate of candidates) {
    try {
      // Basic validation + evidence gating
      const hasRequiredFields = !!candidate.name && !!candidate.title && !!candidate.outlet;
      const hasBeats = Array.isArray(candidate.beats) && candidate.beats.length >= 1;
      const hasEvidenceLinks = Array.isArray(candidate.authorLinks) && candidate.authorLinks.length >= 3; // require 3+ bylines
      const hasContactPath = !!(candidate.email && candidate.email.trim()) || !!(candidate.contactFormUrl && candidate.contactFormUrl.trim());

      if (!hasRequiredFields || !hasBeats || !hasEvidenceLinks || !hasContactPath) {
        results.skipped++;
        results.skippedItems.push({ 
          reason: 'validation', 
          details: {
            hasRequiredFields,
            hasBeats,
            hasEvidenceLinks,
            hasContactPath
          },
          candidate 
        });
        continue;
      }

      // Dedup checks
      const nameOutletKey = normalizeNameOutlet(candidate.name, candidate.outlet);
      if (nameOutletSet.has(nameOutletKey)) {
        results.skipped++;
        continue;
      }

      if (candidate.email) {
        const key = candidate.email.trim().toLowerCase();
        if (emailOrPathSet.has(key)) {
          results.skipped++;
          results.skippedItems.push({ reason: 'email-dup', candidate });
          continue;
        }
      }
      if (candidate.contactFormUrl) {
        const key = candidate.contactFormUrl.trim().toLowerCase();
        if (emailOrPathSet.has(key)) {
          results.skipped++;
          results.skippedItems.push({ reason: 'contact-path-dup', candidate });
          continue;
        }
      }

      if (!(await canAddToOutlet(candidate.outlet))) {
        results.skipped++;
        continue;
      }

      // Ensure publisher/outlet shells
      // Use verified mapping if provided; otherwise omit publisher link to avoid hallucination
      let publisherId: string | undefined = undefined;
      const publisherInfo = PUBLISHER_MAP[candidate.outlet];
      if (publisherInfo) {
        publisherId = await ensurePublisher(publisherInfo.name, publisherInfo.website, publisherInfo.description);
      }

      const outletId = await ensureOutlet(candidate.outlet, { countryId: ghanaId, categoryIds: [categoryIdMap[MEGA_SECTOR]], publisherId });

      // Map beats
      const beatConnect = candidate.beats
        .map((b) => beatIdMap[b])
        .filter(Boolean)
        .map((id) => ({ id }));

      if (DRY_RUN) {
        // Log the would-be creation
        console.log('[DRY-RUN] Would create contact:', {
          name: candidate.name,
          title: candidate.title,
          outlet: candidate.outlet,
          email: candidate.email || '(none)',
          beats: candidate.beats,
          authorLinksCount: candidate.authorLinks.length,
        });
        results.created++;
        results.createdItems.push({ mode: 'dry-run', candidate });
        // Reserve caps in memory to reflect effect
        nameOutletSet.add(nameOutletKey);
        if (candidate.email) emailOrPathSet.add(candidate.email.trim().toLowerCase());
        if (candidate.contactFormUrl) emailOrPathSet.add(candidate.contactFormUrl.trim().toLowerCase());
        outletCounts[candidate.outlet] = (outletCounts[candidate.outlet] || 0) + 1;
        continue;
      }

      // Create append-only contact
      const created = await prisma.media_contacts.create({
        data: {
          id: randomUUID(),
          name: candidate.name,
          title: candidate.title,
          bio: candidate.bio || null,
          email: candidate.email || `${randomUUID()}@no-email.local`, // unique placeholder if no email; marked unverified
          email_verified_status: false,
          socials: candidate.socials || [],
          authorLinks: candidate.authorLinks,
          updated_at: new Date(),
          // relations
          countries: { connect: [{ id: ghanaId }] },
          outlets: { connect: [{ id: outletId }] },
          beats: { connect: beatConnect },
        },
        select: { id: true, name: true },
      });

      // Update caches and counters
      nameOutletSet.add(nameOutletKey);
      if (candidate.email) emailOrPathSet.add(candidate.email.trim().toLowerCase());
      if (candidate.contactFormUrl) emailOrPathSet.add(candidate.contactFormUrl.trim().toLowerCase());
      outletCounts[candidate.outlet] = (outletCounts[candidate.outlet] || 0) + 1;
      results.created++;
      results.createdItems.push({ id: created.id, name: created.name, outlet: candidate.outlet });
    } catch (err: any) {
      const msg = `Failed to insert ${candidate.name} @ ${candidate.outlet}: ${err?.message || String(err)}`;
      console.error(msg);
      results.errors.push(msg);
    }
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`[Ghana Business Seed] Done in ${elapsed}s. Created=${results.created}, Skipped=${results.skipped}, Errors=${results.errors.length}`);

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
    const outPath = path.join(outDir, `ghana-business-seed-${DRY_RUN ? 'dry' : 'commit'}-${ts}.json`);
    fs.writeFileSync(outPath, JSON.stringify({ params: { COUNTRY_NAME, MEGA_SECTOR, SECTORS, DRY_RUN }, counts: { created: results.created, skipped: results.skipped, errors: results.errors.length }, results }, null, 2));
    console.log(`[Ghana Business Seed] Wrote report: ${outPath}`);
  } catch (e) {
    console.warn('[Ghana Business Seed] Failed to write report file:', e);
  }
}

seed()
  .catch((e) => {
    console.error('[Ghana Business Seed] Unhandled error:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
