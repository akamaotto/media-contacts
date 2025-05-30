/*
  Warnings:

  - You are about to drop the column `continent_id` on the `countries` table. All the data in the column will be lost.
  - You are about to drop the column `region` on the `countries` table. All the data in the column will be lost.
  - You are about to drop the `_CountryLanguages` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `continents` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_CountryLanguages" DROP CONSTRAINT "_CountryLanguages_A_fkey";

-- DropForeignKey
ALTER TABLE "_CountryLanguages" DROP CONSTRAINT "_CountryLanguages_B_fkey";

-- DropForeignKey
ALTER TABLE "countries" DROP CONSTRAINT "countries_continent_id_fkey";

-- AlterTable
ALTER TABLE "countries" DROP COLUMN "continent_id",
DROP COLUMN "region",
ADD COLUMN     "region_id" TEXT;

-- DropTable
DROP TABLE "_CountryLanguages";

-- DropTable
DROP TABLE "continents";

-- CreateTable
CREATE TABLE "regions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "parent_code" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "regions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CountryToLanguage" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CountryToLanguage_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "regions_name_key" ON "regions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "regions_code_key" ON "regions"("code");

-- CreateIndex
CREATE INDEX "regions_parent_code_idx" ON "regions"("parent_code");

-- CreateIndex
CREATE INDEX "_CountryToLanguage_B_index" ON "_CountryToLanguage"("B");

-- AddForeignKey
ALTER TABLE "countries" ADD CONSTRAINT "countries_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CountryToLanguage" ADD CONSTRAINT "_CountryToLanguage_A_fkey" FOREIGN KEY ("A") REFERENCES "countries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CountryToLanguage" ADD CONSTRAINT "_CountryToLanguage_B_fkey" FOREIGN KEY ("B") REFERENCES "languages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
