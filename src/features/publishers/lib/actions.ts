
"use server";
import { prisma } from "@/lib/database/prisma";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

export async function createPublisher(name: string, description?: string, website?: string) {
    const newPublisher = await prisma.publishers.create({
        data: { id: randomUUID(), name, description, website, updated_at: new Date() },
    });
    revalidatePath('/dashboard/publishers');
    return newPublisher;
}

export async function updatePublisher(id: string, name: string, description?: string, website?: string) {
    const updatedPublisher = await prisma.publishers.update({
        where: { id },
        data: { name, description, website, updated_at: new Date() },
    });
    revalidatePath('/dashboard/publishers');
    return updatedPublisher;
}

export async function deletePublisher(id: string): Promise<void> {
    await prisma.publishers.delete({ where: { id } });
    revalidatePath('/dashboard/publishers');
}
