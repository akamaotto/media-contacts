
"use server";
import { prisma } from "@/lib/database/prisma";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

// Simplified actions. The complex logic with activity tracking will be handled
// in a dedicated, cross-feature service later.

export async function createBeat(name: string, description?: string) {
    const newBeat = await prisma.beats.create({
        data: { id: randomUUID(), name, description, updated_at: new Date() },
    });
    revalidatePath('/dashboard/beats'); // Assuming a path
    return newBeat;
}

export async function updateBeat(id: string, name: string, description?: string) {
    const updatedBeat = await prisma.beats.update({
        where: { id },
        data: { name, description, updated_at: new Date() },
    });
    revalidatePath('/dashboard/beats');
    return updatedBeat;
}

export async function deleteBeat(id: string) {
    await prisma.beats.delete({ where: { id } });
    revalidatePath('/dashboard/beats');
}
