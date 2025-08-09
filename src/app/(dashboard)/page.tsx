import { Suspense } from 'react';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DashboardContent } from '@/components/dashboard/dashboard-content';
import { DashboardSkeleton } from '@/components/dashboard/dashboard-skeleton';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  // Check authentication
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  return (
    <div className="flex-1 space-y-2 p-2 md:p-8">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <div className="flex items-center space-x-2">
          <p className="text-sm text-muted-foreground">
            Welcome back, {session.user.name || session.user.email}
          </p>
        </div>
      </div>
      
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}
