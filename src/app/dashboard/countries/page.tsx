import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CountriesClientView } from "@/components/features/countries/countries-client-view";

// Force dynamic rendering for pages with session checks
export const dynamic = 'force-dynamic';

export default async function CountriesPage() {
  const session = await auth();
  
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto py-6">
      <CountriesClientView />
    </div>
  );
}
