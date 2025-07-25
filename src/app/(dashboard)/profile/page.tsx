import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ProfileFormClient from "./profile-form-client";

// Force dynamic rendering for pages with session checks
export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  // Server-side session check
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto py-6">
      <ProfileFormClient />
    </div>
  );
}
