import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ensureDatabaseSeeded } from '@/lib/bootstrap';
import { AppShell } from '@/components/layout/AppShell';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await ensureDatabaseSeeded();
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const unreadNotifications = await prisma.notification.count({
    where: { userId: user.id, isRead: false },
  });

  let pendingAuthorizationsCount = 0;
  if (user.role === 'DIRECTOR') {
    const [sp, sc] = await Promise.all([
      prisma.spaceRequest.count({ where: { authorizerId: user.id, status: 'PENDING' } }),
      prisma.scheduleChangeRequest.count({ where: { authorizerId: user.id, status: 'PENDING' } }),
    ]);
    pendingAuthorizationsCount = sp + sc;
  } else if (user.role === 'EXTENSION') {
    const [sp, eq, sc] = await Promise.all([
      prisma.spaceRequest.count({ where: { authorizerId: user.id, status: 'PENDING' } }),
      prisma.equipmentRequest.count({ where: { status: 'PENDING' } }),
      prisma.scheduleChangeRequest.count({ where: { authorizerId: user.id, status: 'PENDING' } }),
    ]);
    pendingAuthorizationsCount = sp + eq + sc;
  } else if (user.role === 'SUPER_ADMIN') {
    const [sp, eq, sc] = await Promise.all([
      prisma.spaceRequest.count({ where: { status: 'PENDING' } }),
      prisma.equipmentRequest.count({ where: { status: 'PENDING' } }),
      prisma.scheduleChangeRequest.count({ where: { status: 'PENDING' } }),
    ]);
    pendingAuthorizationsCount = sp + eq + sc;
  }

  return (
    <AppShell
      user={user}
      unreadNotifications={unreadNotifications}
      pendingAuthorizationsCount={pendingAuthorizationsCount}
    >
      {children}
    </AppShell>
  );
}

