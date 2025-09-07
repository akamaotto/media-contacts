
"use server";
import { prisma } from "@/lib/database/prisma";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

export async function createRegion(code: string, name: string, category: string, parentCode?: string) {
    const newRegion = await prisma.regions.create({
        data: { id: randomUUID(), code, name, category, parent_code: parentCode, updated_at: new Date() },
    });
    revalidatePath('/dashboard/regions');
    return newRegion;
}

export async function updateRegion(code: string, name: string, category: string, parentCode?: string) {
    const updatedRegion = await prisma.regions.update({
        where: { code },
        data: { name, category, parent_code: parentCode, updated_at: new Date() },
    });
    revalidatePath('/dashboard/regions');
    return updatedRegion;
}

export async function deleteRegion(code: string) {
    // Add check for countries using this region before deleting
    const countries = await prisma.countries.count({ where: { regions: { some: { code } } } });
    if (countries > 0) {
        throw new Error('Cannot delete region that is in use by countries.');
    }
    await prisma.regions.delete({ where: { code } });
    revalidatePath('/dashboard/regions');
}
