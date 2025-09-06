
"use server";
import { prisma } from "@/lib/database/prisma";

export async function getRegions() {
    return prisma.regions.findMany({
        include: { _count: { select: { countries: true } } },
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
}

export async function getRegionsByCategory(category: string) {
    return prisma.regions.findMany({
        where: { category },
        orderBy: { name: 'asc' },
    });
}
