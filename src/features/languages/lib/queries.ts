
"use server";
import { prisma } from "@/lib/database/prisma";

export async function getLanguages() {
    return prisma.languages.findMany({ orderBy: { name: 'asc' } });
}

export async function searchLanguages(query: string) {
    if (!query || query.trim().length < 2) return [];
    return prisma.languages.findMany({
        where: { name: { contains: query.trim(), mode: 'insensitive' } },
        orderBy: { name: 'asc' },
        take: 10,
    });
}
