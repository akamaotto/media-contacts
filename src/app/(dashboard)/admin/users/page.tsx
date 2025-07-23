import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import UserTable from "./user-table";
import { PrismaClient } from "@prisma/client";

// Force dynamic rendering for pages with session checks
export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  // Server-side admin check
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    notFound();
  }

  // Fetch all users
  // Use type assertion to work around TypeScript errors
  const users = await (prisma as unknown as PrismaClient & { user: any }).user.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">User Management</h1>
      <div className="w-full bg-white dark:bg-zinc-900 rounded-md border shadow-sm p-6">
        <UserTable users={users} />
      </div>
    </div>
  );
}
