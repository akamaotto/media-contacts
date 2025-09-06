"use server";
import { prisma } from "@/lib/database/prisma";

export async function getOutlets() {
    return prisma.outlets.findMany({
        include: { publishers: true, categories: true, countries: true, _count: { select: { media_contacts: true } } },
        orderBy: { name: 'asc' },
    });
}

export async function searchOutlets(query: string) {
    if (!query || query.trim().length < 2) return [];
    return prisma.outlets.findMany({
        where: { name: { contains: query.trim(), mode: 'insensitive' } },
        select: { id: true, name: true, website: true },
        orderBy: { name: 'asc' },
        take: 10,
    });
}