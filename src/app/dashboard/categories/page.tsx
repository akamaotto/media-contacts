import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { CategoriesClientView } from '@/components/features/categories/categories-client-view';

export const dynamic = 'force-dynamic';

export default async function CategoriesPage() {
  const session = await auth();
  
  if (!session) {
    redirect('/login');
  }

  return <CategoriesClientView />;
}
