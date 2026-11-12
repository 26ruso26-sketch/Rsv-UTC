import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { ensureDatabaseSeeded } from '@/lib/bootstrap';

export default async function HomePage() {
  await ensureDatabaseSeeded();
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  redirect('/dashboard');
}

