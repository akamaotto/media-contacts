import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { Toaster } from "@/components/ui/sonner";
import { PageHeader } from "@/components/page-header";
import ProfileFormClient from "./profile-form-client";

export default async function ProfilePage() {
  // Server-side session check
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto py-6">
      <Toaster />
      <PageHeader title="Profile" />
      <div className="mt-6">
        <ProfileFormClient />
      </div>
    </div>
  );
}
