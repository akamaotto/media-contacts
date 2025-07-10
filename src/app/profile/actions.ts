"use server";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function updateProfile(prevState: any, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    throw new Error("Unauthorized");
  }

  const name = formData.get("name") as string;
  const currentPassword = formData.get("currentPassword") as string;
  const newPassword = formData.get("newPassword") as string;
  
  // Get current user
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, hashedPassword: true },
  });
  
  if (!user) {
    throw new Error("User not found");
  }

  // Prepare update data
  const data: any = { name };
  
  // If changing password, verify current password first
  if (newPassword) {
    if (!currentPassword) {
      return { success: false, error: "Current password is required" };
    }
    
    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.hashedPassword || "");
    if (!isValid) {
      return { success: false, error: "Current password is incorrect" };
    }
    
    // Hash and set new password
    data.hashedPassword = await bcrypt.hash(newPassword, 10);
  }

  // Update user
  await prisma.user.update({
    where: { id: user.id },
    data,
  });

  revalidatePath("/profile");
  return { success: true };
}
