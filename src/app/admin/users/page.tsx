import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { notFound } from "next/navigation";
import { Toaster } from "@/components/ui/sonner";
import UserTable from "./user-table";
import { PageHeader } from "@/components/page-header";
import { PrismaClient } from "@prisma/client";

export default async function AdminUsersPage() {
  // Server-side admin check
  const session = await getServerSession(authOptions);
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
    <div className="flex flex-col items-center justify-center w-full">
      <Toaster />
      <div className="w-full max-w-7xl px-4 py-10 mx-auto">
        <PageHeader title="User Management" />
        <div className="w-full bg-white dark:bg-zinc-900 rounded-md border shadow-sm p-6">
          <UserTable users={users} />
        </div>
      </div>
    </div>
  );
}
