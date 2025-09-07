import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { PublishersClientView } from '@/components/features/publishers/publishers-client-view';

export const dynamic = 'force-dynamic';

export default async function PublishersPage() {
  const session = await auth();
  
  if (!session) {
    redirect('/auth/login');
  }

  return <PublishersClientView />;
}
