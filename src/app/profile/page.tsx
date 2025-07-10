import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import ProfileFormClient from "./profile-form-client";

export default async function ProfilePage() {
  // Server-side session check
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Profile</h1>
      <div className="mt-6">
        <ProfileFormClient />
      </div>
    </div>
  );
}
