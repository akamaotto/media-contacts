import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { OutletsClientView } from '@/components/features/outlets/outlets-client-view';

export const dynamic = 'force-dynamic';

export default async function OutletsPage() {
  const session = await auth();
  
  if (!session) {
    redirect('/auth/login');
  }

  return <OutletsClientView />;
}
