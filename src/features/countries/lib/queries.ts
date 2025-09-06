
"use server";
import { prisma } from "@/lib/database/prisma";

export async function getCountries() {
    return prisma.countries.findMany({
        include: { _count: { select: { media_contacts: true } }, regions: true, languages: true },
        orderBy: { name: 'asc' },
    });
}

export async function getRegionsForForm() {
    return prisma.regions.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } });
}

export async function getLanguagesForForm() {
    return prisma.languages.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } });
}
