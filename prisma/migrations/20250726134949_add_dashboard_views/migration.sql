-- Reconciliation migration to align local history with production
-- This migration intentionally recreates the dashboard views that exist in production.
-- It should NOT be applied to production again. It's here so Prisma stops reporting
-- a migration that is applied in DB but missing locally.

-- If you ever need to re-run these on a new environment, it's safe because we use
-- CREATE OR REPLACE VIEW.

-- Database views for optimized chart data queries

-- View for contact country statistics
CREATE OR REPLACE VIEW contact_country_stats AS
SELECT 
  c.id as country_id,
  c.name as country_name,
  c.code as country_code,
  c.flag_emoji,
  COUNT(mc.id) as contact_count
FROM countries c
LEFT JOIN "_MediaContactCountries" mcc ON c.id = mcc."B"
LEFT JOIN media_contacts mc ON mcc."A" = mc.id
GROUP BY c.id, c.name, c.code, c.flag_emoji;

-- View for beat contact statistics
CREATE OR REPLACE VIEW beat_contact_stats AS
SELECT 
  b.id as beat_id,
  b.name as beat_name,
  b.description,
  COUNT(mc.id) as contact_count
FROM beats b
LEFT JOIN "_MediaContactBeats" mcb ON b.id = mcb."B"
LEFT JOIN media_contacts mc ON mcb."A" = mc.id
GROUP BY b.id, b.name, b.description;

-- View for publisher outlet statistics
CREATE OR REPLACE VIEW publisher_outlet_stats AS
SELECT 
  p.id as publisher_id,
  p.name as publisher_name,
  p.description as publisher_description,
  COUNT(o.id) as outlet_count,
  COUNT(DISTINCT mc.id) as total_contacts
FROM publishers p
LEFT JOIN outlets o ON p.id = o."publisherId"
LEFT JOIN "_MediaContactOutlets" mco ON o.id = mco."B"
LEFT JOIN media_contacts mc ON mco."A" = mc.id
LEFT JOIN "_OutletCategories" oc ON o.id = oc."A"
LEFT JOIN categories cat ON oc."B" = cat.id
GROUP BY p.id, p.name, p.description;

-- View for category statistics
CREATE OR REPLACE VIEW category_stats AS
SELECT 
  cat.id as category_id,
  cat.name as category_name,
  cat.description as category_description,
  cat.color,
  COUNT(DISTINCT b.id) as beat_count,
  COUNT(DISTINCT o.id) as outlet_count
FROM categories cat
LEFT JOIN "_BeatCategories" bc ON cat.id = bc."B"
LEFT JOIN beats b ON bc."A" = b.id
LEFT JOIN "_OutletCategories" oc ON cat.id = oc."B"
LEFT JOIN outlets o ON oc."A" = o.id
GROUP BY cat.id, cat.name, cat.description, cat.color;

-- View for geographic distribution with region information
CREATE OR REPLACE VIEW geographic_distribution AS
SELECT 
  c.id as country_id,
  c.name as country_name,
  c.code as country_code,
  c.latitude,
  c.longitude,
  c.flag_emoji,
  COUNT(mc.id) as contact_count,
  STRING_AGG(DISTINCT r.name, ', ') as regions
FROM countries c
LEFT JOIN "_MediaContactCountries" mcc ON c.id = mcc."B"
LEFT JOIN media_contacts mc ON mcc."A" = mc.id
LEFT JOIN "_CountryRegions" cr ON c.id = cr."A"
LEFT JOIN regions r ON cr."B" = r.id
GROUP BY c.id, c.name, c.code, c.latitude, c.longitude, c.flag_emoji;

-- View for outlet contact statistics
CREATE OR REPLACE VIEW outlet_contact_stats AS
SELECT 
  o.id as outlet_id,
  o.name as outlet_name,
  o.description as outlet_description,
  o.website,
  p.name as publisher_name,
  COUNT(mc.id) as contact_count,
  STRING_AGG(DISTINCT cat.name, ', ') as categories
FROM outlets o
LEFT JOIN publishers p ON o."publisherId" = p.id
LEFT JOIN "_MediaContactOutlets" mco ON o.id = mco."B"
LEFT JOIN media_contacts mc ON mco."A" = mc.id
LEFT JOIN "_OutletCategories" oc ON o.id = oc."A"
LEFT JOIN categories cat ON oc."B" = cat.id
GROUP BY o.id, o.name, o.description, o.website, p.name;

-- View for language statistics
CREATE OR REPLACE VIEW language_stats AS
SELECT 
  l.id as language_id,
  l.name as language_name,
  l.code as language_code,
  COUNT(DISTINCT c.id) as country_count,
  COUNT(DISTINCT mc.id) as contact_count
FROM languages l
LEFT JOIN "_CountryToLanguage" ctl ON l.id = ctl."B"
LEFT JOIN countries c ON ctl."A" = c.id
LEFT JOIN "_MediaContactCountries" mcc ON c.id = mcc."B"
LEFT JOIN media_contacts mc ON mcc."A" = mc.id
GROUP BY l.id, l.name, l.code;

-- View for email verification statistics
CREATE OR REPLACE VIEW email_verification_stats AS
SELECT 
  COUNT(*) as total_contacts,
  COUNT(CASE WHEN email_verified_status = true THEN 1 END) as verified_contacts,
  COUNT(CASE WHEN email_verified_status = false THEN 1 END) as unverified_contacts,
  ROUND(
    (COUNT(CASE WHEN email_verified_status = true THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL) * 100, 
    2
  ) as verification_rate
FROM media_contacts;
