import { Suspense } from 'react';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DashboardContent } from '@/components/dashboard/dashboard-content';
import { DashboardSkeleton } from '@/components/dashboard/dashboard-skeleton';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';

// Use force-static to avoid Vercel deployment issues with server components
export const dynamic = 'force-static';

export default async function DashboardPage() {
  // Check authentication
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  return (
    <div className="flex-1 space-y-2 p-2 md:p-8">
      <DashboardHeader session={session} />
      
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}