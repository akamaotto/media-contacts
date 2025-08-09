import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Ensure user is authenticated for dashboard routes
  const session = await auth();
  
  if (!session?.user) {
    redirect('/login');
  }

  // The main layout.tsx already handles the DashboardLayout wrapper
  // This just ensures authentication for dashboard routes
  return <>{children}</>;
}