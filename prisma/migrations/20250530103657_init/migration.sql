-- CreateTable
CREATE TABLE "media_contacts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "bio" TEXT,
    "email" TEXT NOT NULL,
    "email_verified_status" BOOLEAN NOT NULL DEFAULT false,
    "socials" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outlets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "website" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outlets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "countries" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beats" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "beats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_MediaContactOutlets" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_MediaContactOutlets_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_MediaContactCountries" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_MediaContactCountries_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_MediaContactBeats" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_MediaContactBeats_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "media_contacts_email_key" ON "media_contacts"("email");

-- CreateIndex
CREATE UNIQUE INDEX "outlets_name_key" ON "outlets"("name");

-- CreateIndex
CREATE UNIQUE INDEX "countries_name_key" ON "countries"("name");

-- CreateIndex
CREATE UNIQUE INDEX "beats_name_key" ON "beats"("name");

-- CreateIndex
CREATE INDEX "_MediaContactOutlets_B_index" ON "_MediaContactOutlets"("B");

-- CreateIndex
CREATE INDEX "_MediaContactCountries_B_index" ON "_MediaContactCountries"("B");

-- CreateIndex
CREATE INDEX "_MediaContactBeats_B_index" ON "_MediaContactBeats"("B");

-- AddForeignKey
ALTER TABLE "_MediaContactOutlets" ADD CONSTRAINT "_MediaContactOutlets_A_fkey" FOREIGN KEY ("A") REFERENCES "media_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MediaContactOutlets" ADD CONSTRAINT "_MediaContactOutlets_B_fkey" FOREIGN KEY ("B") REFERENCES "outlets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MediaContactCountries" ADD CONSTRAINT "_MediaContactCountries_A_fkey" FOREIGN KEY ("A") REFERENCES "countries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MediaContactCountries" ADD CONSTRAINT "_MediaContactCountries_B_fkey" FOREIGN KEY ("B") REFERENCES "media_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MediaContactBeats" ADD CONSTRAINT "_MediaContactBeats_A_fkey" FOREIGN KEY ("A") REFERENCES "beats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MediaContactBeats" ADD CONSTRAINT "_MediaContactBeats_B_fkey" FOREIGN KEY ("B") REFERENCES "media_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
