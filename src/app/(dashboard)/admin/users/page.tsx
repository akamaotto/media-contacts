import { prisma } from "@/lib/database/prisma";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import UsersClientWrapper from "./users-client-wrapper";


// Force dynamic rendering for pages with session checks
export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  // Server-side admin check
  const session = await auth();
  if (!session || !('role' in session.user) || session.user.role !== "ADMIN") {
    notFound();
  }

  // Fetch all users
  // Use type assertion to work around TypeScript errors
  const users = await prisma.users.findMany({
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
    <UsersClientWrapper users={users} />
  );
}
