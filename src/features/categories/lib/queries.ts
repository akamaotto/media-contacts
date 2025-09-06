
"use server";
import { prisma } from "@/lib/database/prisma";

export async function getCategories() {
    return prisma.categories.findMany({
        include: { _count: { select: { beats: true, outlets: true } } },
        orderBy: { name: 'asc' },
    });
}

export async function searchCategories(query: string) {
    if (!query || query.trim().length < 2) return [];
    return prisma.categories.findMany({
        where: { name: { contains: query.trim(), mode: 'insensitive' } },
        orderBy: { name: 'asc' },
        take: 10,
    });
}
