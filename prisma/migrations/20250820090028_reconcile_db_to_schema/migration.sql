-- AlterTable
ALTER TABLE "media_contacts" ADD COLUMN     "ai_beats" TEXT[],
ADD COLUMN     "beatVector" JSONB,
ADD COLUMN     "channels" JSONB,
ADD COLUMN     "contactPolicy" JSONB,
ADD COLUMN     "dataDump" JSONB,
ADD COLUMN     "freshness" TIMESTAMP(3),
ADD COLUMN     "geoVector" JSONB,
ADD COLUMN     "lastVerified" TIMESTAMP(3),
ADD COLUMN     "outletId" TEXT,
ADD COLUMN     "provenance" JSONB,
ADD COLUMN     "score" INTEGER,
ADD COLUMN     "socialProfiles" JSONB;

-- CreateTable
CREATE TABLE "research_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "parameters" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "mode" TEXT NOT NULL,
    "progress" JSONB,
    "results" JSONB,
    "memory" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "research_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_candidates" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "mediaContactId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "outlet" TEXT,
    "title" TEXT,
    "beats" TEXT[],
    "channels" JSONB,
    "score" INTEGER NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "reasoning" TEXT,
    "sources" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "research_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_sources" (
    "id" TEXT NOT NULL,
    "mediaContactId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "extractedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confidence" DOUBLE PRECISION NOT NULL,
    "metadata" JSONB,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "contact_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_outcomes" (
    "id" TEXT NOT NULL,
    "mediaContactId" TEXT NOT NULL,
    "outcomeType" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "campaignId" TEXT,
    "replyTimeMinutes" INTEGER,
    "bounceReason" TEXT,
    "coverageUrl" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_outcomes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchlist" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contactId" TEXT,
    "outletId" TEXT,
    "watchType" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "nextRefresh" TIMESTAMP(3) NOT NULL,
    "lastRefresh" TIMESTAMP(3),
    "refreshCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "watchlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_OutletCountries" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_OutletCountries_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "research_sessions_userId_status_idx" ON "research_sessions"("userId", "status");

-- CreateIndex
CREATE INDEX "research_sessions_createdAt_idx" ON "research_sessions"("createdAt");

-- CreateIndex
CREATE INDEX "research_candidates_sessionId_status_idx" ON "research_candidates"("sessionId", "status");

-- CreateIndex
CREATE INDEX "research_candidates_score_idx" ON "research_candidates"("score" DESC);

-- CreateIndex
CREATE INDEX "research_candidates_beats_idx" ON "research_candidates" USING GIN ("beats");

-- CreateIndex
CREATE INDEX "contact_sources_mediaContactId_idx" ON "contact_sources"("mediaContactId");

-- CreateIndex
CREATE INDEX "contact_sources_sourceType_idx" ON "contact_sources"("sourceType");

-- CreateIndex
CREATE INDEX "contact_sources_extractedAt_idx" ON "contact_sources"("extractedAt");

-- CreateIndex
CREATE INDEX "contact_outcomes_mediaContactId_timestamp_idx" ON "contact_outcomes"("mediaContactId", "timestamp");

-- CreateIndex
CREATE INDEX "contact_outcomes_outcomeType_idx" ON "contact_outcomes"("outcomeType");

-- CreateIndex
CREATE INDEX "contact_outcomes_timestamp_idx" ON "contact_outcomes"("timestamp");

-- CreateIndex
CREATE INDEX "watchlist_userId_isActive_idx" ON "watchlist"("userId", "isActive");

-- CreateIndex
CREATE INDEX "watchlist_nextRefresh_isActive_idx" ON "watchlist"("nextRefresh", "isActive");

-- CreateIndex
CREATE INDEX "watchlist_watchType_idx" ON "watchlist"("watchType");

-- CreateIndex
CREATE INDEX "_OutletCountries_B_index" ON "_OutletCountries"("B");

-- CreateIndex
CREATE INDEX "media_contacts_email_verified_status_idx" ON "media_contacts"("email_verified_status");

-- CreateIndex
CREATE INDEX "media_contacts_name_idx" ON "media_contacts"("name");

-- CreateIndex
CREATE INDEX "media_contacts_updated_at_idx" ON "media_contacts"("updated_at");

-- CreateIndex
CREATE INDEX "media_contacts_ai_beats_idx" ON "media_contacts" USING GIN ("ai_beats");

-- CreateIndex
CREATE INDEX "media_contacts_score_idx" ON "media_contacts"("score" DESC);

-- CreateIndex
CREATE INDEX "media_contacts_freshness_idx" ON "media_contacts"("freshness");

-- CreateIndex
CREATE INDEX "media_contacts_outletId_score_idx" ON "media_contacts"("outletId", "score" DESC);

-- AddForeignKey
ALTER TABLE "research_sessions" ADD CONSTRAINT "research_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_candidates" ADD CONSTRAINT "research_candidates_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "research_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_candidates" ADD CONSTRAINT "research_candidates_mediaContactId_fkey" FOREIGN KEY ("mediaContactId") REFERENCES "media_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_sources" ADD CONSTRAINT "contact_sources_mediaContactId_fkey" FOREIGN KEY ("mediaContactId") REFERENCES "media_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_outcomes" ADD CONSTRAINT "contact_outcomes_mediaContactId_fkey" FOREIGN KEY ("mediaContactId") REFERENCES "media_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlist" ADD CONSTRAINT "watchlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlist" ADD CONSTRAINT "watchlist_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "media_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_OutletCountries" ADD CONSTRAINT "_OutletCountries_A_fkey" FOREIGN KEY ("A") REFERENCES "countries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_OutletCountries" ADD CONSTRAINT "_OutletCountries_B_fkey" FOREIGN KEY ("B") REFERENCES "outlets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
