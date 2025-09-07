import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { BeatsClientView } from '@/components/features/beats/beats-client-view';

export const dynamic = 'force-dynamic';

export default async function BeatsPage() {
  const session = await auth();
  
  if (!session) {
    redirect('/auth/login');
  }

  return <BeatsClientView />;
}
