-- Remove AI-related columns from media_contacts
ALTER TABLE "media_contacts"
  DROP COLUMN IF EXISTS "channels",
  DROP COLUMN IF EXISTS "ai_beats",
  DROP COLUMN IF EXISTS "outletId",
  DROP COLUMN IF EXISTS "score",
  DROP COLUMN IF EXISTS "provenance",
  DROP COLUMN IF EXISTS "dataDump",
  DROP COLUMN IF EXISTS "freshness",
  DROP COLUMN IF EXISTS "lastVerified",
  DROP COLUMN IF EXISTS "geoVector",
  DROP COLUMN IF EXISTS "beatVector",
  DROP COLUMN IF EXISTS "socialProfiles",
  DROP COLUMN IF EXISTS "contactPolicy";

-- Drop AI-related tables (if present)
DROP TABLE IF EXISTS "research_candidates" CASCADE;
DROP TABLE IF EXISTS "research_sessions" CASCADE;
DROP TABLE IF EXISTS "contact_sources" CASCADE;
DROP TABLE IF EXISTS "contact_outcomes" CASCADE;
DROP TABLE IF EXISTS "watchlist" CASCADE;

