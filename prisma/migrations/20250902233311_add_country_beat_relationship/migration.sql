-- CreateTable
CREATE TABLE "_CountryToBeats" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CountryToBeats_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_CountryToBeats_B_index" ON "_CountryToBeats"("B");

-- AddForeignKey
ALTER TABLE "_CountryToBeats" ADD CONSTRAINT "_CountryToBeats_A_fkey" FOREIGN KEY ("A") REFERENCES "beats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CountryToBeats" ADD CONSTRAINT "_CountryToBeats_B_fkey" FOREIGN KEY ("B") REFERENCES "countries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
