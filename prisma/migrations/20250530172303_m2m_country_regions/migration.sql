/*
  Warnings:

  - You are about to drop the column `region_id` on the `countries` table. All the data in the column will be lost.
  - You are about to drop the column `subregion` on the `countries` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "countries" DROP CONSTRAINT "countries_region_id_fkey";

-- AlterTable
ALTER TABLE "countries" DROP COLUMN "region_id",
DROP COLUMN "subregion";

-- CreateTable
CREATE TABLE "_CountryRegions" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CountryRegions_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_CountryRegions_B_index" ON "_CountryRegions"("B");

-- AddForeignKey
ALTER TABLE "_CountryRegions" ADD CONSTRAINT "_CountryRegions_A_fkey" FOREIGN KEY ("A") REFERENCES "countries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CountryRegions" ADD CONSTRAINT "_CountryRegions_B_fkey" FOREIGN KEY ("B") REFERENCES "regions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
