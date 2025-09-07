import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { LanguagesClientView } from '@/components/features/languages/languages-client-view';

export const dynamic = 'force-dynamic';

export default async function LanguagesPage() {
  const session = await auth();
  
  if (!session) {
    redirect('/login');
  }

  return <LanguagesClientView />;
}
