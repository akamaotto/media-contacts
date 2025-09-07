
"use server";
import { prisma } from "@/lib/database/prisma";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

export async function createCategory(name: string, description?: string, color?: string) {
    const newCategory = await prisma.categories.create({
        data: { id: randomUUID(), name, description, color, updated_at: new Date() },
    });
    revalidatePath('/dashboard/categories');
    return newCategory;
}

export async function updateCategory(id: string, name: string, description?: string, color?: string) {
    const updatedCategory = await prisma.categories.update({
        where: { id },
        data: { name, description, color, updated_at: new Date() },
    });
    revalidatePath('/dashboard/categories');
    return updatedCategory;
}

export async function deleteCategory(id: string) {
    await prisma.categories.delete({ where: { id } });
    revalidatePath('/dashboard/categories');
}
