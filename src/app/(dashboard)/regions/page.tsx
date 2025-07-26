import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { RegionsClientView } from '@/components/features/regions/regions-client-view';

export const dynamic = 'force-dynamic';

export default async function RegionsPage() {
  const session = await auth();
  
  if (!session) {
    redirect('/login');
  }

  return <RegionsClientView />;
}
