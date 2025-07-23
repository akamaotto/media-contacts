"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

// Check if user is admin
async function checkAdminPermission() {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function upsertUser(prevState: any, formData: FormData) {
  await checkAdminPermission();

  const id = formData.get("id") as string | null;
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string | null;
  const role = (formData.get("role") as string) || "USER";

  // Create data object for user
  const data: any = { 
    name, 
    email, 
    role
  };
  
  if (password) {
    data.hashedPassword = await bcrypt.hash(password, 10);
  }

  try {
    if (id) {
      // @ts-ignore - Prisma types issue
      await prisma.user.update({ 
        where: { id }, 
        data
      });
    } else {
      // @ts-ignore - Prisma types issue
      await prisma.user.create({ 
        data
      });
    }
  } catch (error) {
    console.error('Error updating/creating user:', error);
    return { success: false, error: 'Failed to save user' };
  }

  revalidatePath("/admin/users");
  return { success: true };
}

export async function deleteUser(prevState: any, formData: FormData) {
  await checkAdminPermission();
  
  const id = formData.get("id") as string;
  const email = formData.get("email") as string;
  
  // Don't allow deleting super admin
  if (email === "akamaotto@gmail.com") {
    return { success: false, error: "Cannot delete super admin user" };
  }
  
  try {
    // Use direct SQL queries to avoid TypeScript errors with Prisma model access
    // Delete sessions first
    await prisma.$executeRaw`DELETE FROM sessions WHERE "userId" = ${id}`;
    
    // Delete accounts
    await prisma.$executeRaw`DELETE FROM accounts WHERE "userId" = ${id}`;
    
    // Finally delete the user
    await prisma.$executeRaw`DELETE FROM users WHERE id = ${id}`;
    
    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    console.error('Error deleting user:', error);
    // Return more specific error message
    return { 
      success: false, 
      error: error instanceof Error ? 
        `Failed to delete user: ${error.message}` : 
        'Failed to delete user' 
    };
  }
}
