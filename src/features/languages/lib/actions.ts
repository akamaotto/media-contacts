
"use server";
import { prisma } from "@/lib/database/prisma";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

export async function createLanguage(name: string, code: string) {
    const newLang = await prisma.languages.create({ data: { id: randomUUID(), name, code, updated_at: new Date() } });
    revalidatePath('/languages');
    return newLang;
}

export async function updateLanguage(id: string, name: string, code: string) {
    const updatedLang = await prisma.languages.update({ where: { id }, data: { name, code, updated_at: new Date() } });
    revalidatePath('/languages');
    return updatedLang;
}

export async function deleteLanguage(id: string) {
    await prisma.languages.delete({ where: { id } });
    revalidatePath('/languages');
}
