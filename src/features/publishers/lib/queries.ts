
"use server";
import { prisma } from "@/lib/database/prisma";
import type { Publisher } from "./types";

export async function getPublishers() {
    return prisma.publishers.findMany({
        include: { _count: { select: { outlets: true } } },
        orderBy: { name: 'asc' },
    });
}

export async function searchPublishers(query: string): Promise<Publisher[]> {
    if (!query || query.trim().length < 2) return [];
    return prisma.publishers.findMany({
        where: { name: { contains: query.trim(), mode: 'insensitive' } },
        orderBy: { name: 'asc' },
        take: 10,
    });
}
