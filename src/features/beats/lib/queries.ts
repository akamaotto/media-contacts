
"use server";
import { prisma } from "@/lib/database/prisma";

export async function getBeats() {
    return prisma.beats.findMany({ orderBy: { name: 'asc' } });
}

export async function searchBeats(query: string) {
    if (!query || query.trim().length < 2) return [];
    return prisma.beats.findMany({
        where: { name: { contains: query.trim(), mode: 'insensitive' } },
        orderBy: { name: 'asc' },
        take: 10,
    });
}
