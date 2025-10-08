-- CreateEnum
CREATE TYPE "DiscoverySource" AS ENUM ('MANUAL', 'AI_SEARCH', 'CSV_IMPORT', 'API', 'OTHER');

-- CreateEnum
CREATE TYPE "SearchStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DuplicateType" AS ENUM ('EMAIL', 'NAME_OUTLET', 'NAME_TITLE', 'OUTLET_TITLE', 'SIMILAR_BIO', 'SOCIAL_MEDIA');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED', 'MANUAL_REVIEW');

-- AlterTable
ALTER TABLE "media_contacts" ADD COLUMN     "ai_confidence_score" INTEGER,
ADD COLUMN     "ai_search_id" TEXT,
ADD COLUMN     "discovered_at" TIMESTAMP(3),
ADD COLUMN     "discovery_metadata" JSONB,
ADD COLUMN     "discovery_method" TEXT,
ADD COLUMN     "discovery_source" "DiscoverySource" NOT NULL DEFAULT 'MANUAL';

-- CreateTable
CREATE TABLE "ai_searches" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "SearchStatus" NOT NULL DEFAULT 'PENDING',
    "configuration" JSONB NOT NULL,
    "contacts_found" INTEGER NOT NULL DEFAULT 0,
    "contacts_imported" INTEGER NOT NULL DEFAULT 0,
    "duration_seconds" INTEGER,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_searches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_search_sources" (
    "id" TEXT NOT NULL,
    "searchId" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "domain" TEXT,
    "title" TEXT,
    "confidenceScore" DECIMAL(3,2) NOT NULL,
    "contactCount" INTEGER NOT NULL DEFAULT 0,
    "processingTimeMs" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_search_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_performance_logs" (
    "id" TEXT NOT NULL,
    "searchId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "durationMs" INTEGER,
    "status" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_performance_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_search_cache" (
    "id" TEXT NOT NULL,
    "queryHash" TEXT NOT NULL,
    "searchConfiguration" JSONB NOT NULL,
    "results" JSONB NOT NULL,
    "contactCount" INTEGER NOT NULL DEFAULT 0,
    "averageConfidence" DECIMAL(3,2),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "lastAccessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "searchId" TEXT,

    CONSTRAINT "ai_search_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_contact_duplicates" (
    "id" TEXT NOT NULL,
    "originalContactId" TEXT NOT NULL,
    "duplicateContactId" TEXT NOT NULL,
    "similarityScore" DECIMAL(3,2) NOT NULL,
    "duplicateType" "DuplicateType" NOT NULL,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_contact_duplicates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_searches_status_idx" ON "ai_searches"("status");

-- CreateIndex
CREATE INDEX "ai_searches_created_at_idx" ON "ai_searches"("created_at");

-- CreateIndex
CREATE INDEX "ai_searches_userId_idx" ON "ai_searches"("userId");

-- CreateIndex
CREATE INDEX "ai_searches_started_at_idx" ON "ai_searches"("started_at");

-- CreateIndex
CREATE INDEX "ai_searches_completed_at_idx" ON "ai_searches"("completed_at");

-- CreateIndex
CREATE UNIQUE INDEX "ai_searches_userId_status_key" ON "ai_searches"("userId", "status");

-- CreateIndex
CREATE INDEX "ai_search_sources_searchId_idx" ON "ai_search_sources"("searchId");

-- CreateIndex
CREATE INDEX "ai_search_sources_sourceType_idx" ON "ai_search_sources"("sourceType");

-- CreateIndex
CREATE INDEX "ai_search_sources_domain_idx" ON "ai_search_sources"("domain");

-- CreateIndex
CREATE INDEX "ai_search_sources_confidenceScore_idx" ON "ai_search_sources"("confidenceScore");

-- CreateIndex
CREATE INDEX "ai_search_sources_created_at_idx" ON "ai_search_sources"("created_at");

-- CreateIndex
CREATE INDEX "ai_performance_logs_searchId_idx" ON "ai_performance_logs"("searchId");

-- CreateIndex
CREATE INDEX "ai_performance_logs_operation_idx" ON "ai_performance_logs"("operation");

-- CreateIndex
CREATE INDEX "ai_performance_logs_status_idx" ON "ai_performance_logs"("status");

-- CreateIndex
CREATE INDEX "ai_performance_logs_startTime_idx" ON "ai_performance_logs"("startTime");

-- CreateIndex
CREATE INDEX "ai_performance_logs_durationMs_idx" ON "ai_performance_logs"("durationMs");

-- CreateIndex
CREATE UNIQUE INDEX "ai_search_cache_queryHash_key" ON "ai_search_cache"("queryHash");

-- CreateIndex
CREATE UNIQUE INDEX "ai_search_cache_searchId_key" ON "ai_search_cache"("searchId");

-- CreateIndex
CREATE INDEX "ai_search_cache_queryHash_idx" ON "ai_search_cache"("queryHash");

-- CreateIndex
CREATE INDEX "ai_search_cache_expiresAt_idx" ON "ai_search_cache"("expiresAt");

-- CreateIndex
CREATE INDEX "ai_search_cache_accessCount_idx" ON "ai_search_cache"("accessCount");

-- CreateIndex
CREATE INDEX "ai_search_cache_lastAccessedAt_idx" ON "ai_search_cache"("lastAccessedAt");

-- CreateIndex
CREATE INDEX "ai_search_cache_created_at_idx" ON "ai_search_cache"("created_at");

-- CreateIndex
CREATE INDEX "ai_contact_duplicates_similarityScore_idx" ON "ai_contact_duplicates"("similarityScore");

-- CreateIndex
CREATE INDEX "ai_contact_duplicates_duplicateType_idx" ON "ai_contact_duplicates"("duplicateType");

-- CreateIndex
CREATE INDEX "ai_contact_duplicates_verificationStatus_idx" ON "ai_contact_duplicates"("verificationStatus");

-- CreateIndex
CREATE INDEX "ai_contact_duplicates_created_at_idx" ON "ai_contact_duplicates"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "ai_contact_duplicates_originalContactId_duplicateContactId_key" ON "ai_contact_duplicates"("originalContactId", "duplicateContactId");

-- CreateIndex
CREATE INDEX "media_contacts_discovery_source_idx" ON "media_contacts"("discovery_source");

-- CreateIndex
CREATE INDEX "media_contacts_ai_confidence_score_idx" ON "media_contacts"("ai_confidence_score");

-- CreateIndex
CREATE INDEX "media_contacts_discovered_at_idx" ON "media_contacts"("discovered_at");

-- CreateIndex
CREATE INDEX "media_contacts_ai_search_id_idx" ON "media_contacts"("ai_search_id");

-- AddForeignKey
ALTER TABLE "media_contacts" ADD CONSTRAINT "media_contacts_ai_search_id_fkey" FOREIGN KEY ("ai_search_id") REFERENCES "ai_searches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_searches" ADD CONSTRAINT "ai_searches_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_search_sources" ADD CONSTRAINT "ai_search_sources_searchId_fkey" FOREIGN KEY ("searchId") REFERENCES "ai_searches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_performance_logs" ADD CONSTRAINT "ai_performance_logs_searchId_fkey" FOREIGN KEY ("searchId") REFERENCES "ai_searches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_search_cache" ADD CONSTRAINT "ai_search_cache_searchId_fkey" FOREIGN KEY ("searchId") REFERENCES "ai_searches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_contact_duplicates" ADD CONSTRAINT "ai_contact_duplicates_originalContactId_fkey" FOREIGN KEY ("originalContactId") REFERENCES "media_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_contact_duplicates" ADD CONSTRAINT "ai_contact_duplicates_duplicateContactId_fkey" FOREIGN KEY ("duplicateContactId") REFERENCES "media_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
