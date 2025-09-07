import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DashboardLayout as DashboardShell } from '@/components/layout/dashboard-layout';

export const dynamic = 'force-dynamic';

export default async function DashboardRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Ensure user is authenticated for dashboard routes
  const session = await auth();
  
  if (!session?.user) {
    redirect('/login');
  }

  // Wrap all dashboard routes with the client dashboard shell (sidebar, header, etc.)
  return <DashboardShell>{children}</DashboardShell>;
}