
"use server";
import { prisma } from "@/lib/database/prisma";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

export async function createOutlet(data: any) {
    const newOutlet = await prisma.outlets.create({
        data: {
            id: randomUUID(),
            name: data.name,
            description: data.description,
            website: data.website,
            publisherId: data.publisherId,
            updated_at: new Date(),
            categories: { connect: (data.categoryIds || []).map((id: string) => ({ id })) },
            countries: { connect: (data.countryIds || []).map((id: string) => ({ id })) },
        }
    });
    revalidatePath('/dashboard/outlets');
    return newOutlet;
}

export async function updateOutlet(id: string, data: any) {
    // Ensure publisherId is properly handled when null
    const updateData: any = {
        name: data.name,
        description: data.description,
        website: data.website,
        updated_at: new Date(),
        categories: { set: (data.categoryIds || []).map((id: string) => ({ id })) },
        countries: { set: (data.countryIds || []).map((id: string) => ({ id })) },
    };
    
    // Handle publisherId properly - if null, explicitly set it to disconnect
    if (data.publisherId === null || data.publisherId === undefined) {
        updateData.publisherId = null;
    } else if (data.publisherId) {
        updateData.publisherId = data.publisherId;
    }

    const updatedOutlet = await prisma.outlets.update({
        where: { id },
        data: updateData
    });
    revalidatePath('/dashboard/outlets');
    return updatedOutlet;
}

export async function deleteOutlet(id: string) {
    await prisma.outlets.delete({ where: { id } });
    revalidatePath('/dashboard/outlets');
}
