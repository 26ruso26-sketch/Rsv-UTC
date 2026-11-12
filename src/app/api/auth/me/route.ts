import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ensureDatabaseSeeded } from '@/lib/bootstrap';

export async function GET() {
  await ensureDatabaseSeeded();
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const unreadNotifications = await prisma.notification.count({
    where: { userId: user.id, isRead: false },
  });

  let pendingAuthorizationsCount = 0;
  if (user.role === 'DIRECTOR') {
    const [spacePending, schedulePending] = await Promise.all([
      prisma.spaceRequest.count({
        where: { authorizerId: user.id, status: 'PENDING' },
      }),
      prisma.scheduleChangeRequest.count({
        where: { authorizerId: user.id, status: 'PENDING' },
      }),
    ]);
    pendingAuthorizationsCount = spacePending + schedulePending;
  } else if (user.role === 'EXTENSION') {
    const [spacePending, equipPending, schedulePending] = await Promise.all([
      prisma.spaceRequest.count({
        where: { authorizerId: user.id, status: 'PENDING' },
      }),
      prisma.equipmentRequest.count({
        where: { status: 'PENDING' },
      }),
      prisma.scheduleChangeRequest.count({
        where: { authorizerId: user.id, status: 'PENDING' },
      }),
    ]);
    pendingAuthorizationsCount = spacePending + equipPending + schedulePending;
  } else if (user.role === 'SUPER_ADMIN') {
    const [spacePending, equipPending, schedulePending] = await Promise.all([
      prisma.spaceRequest.count({ where: { status: 'PENDING' } }),
      prisma.equipmentRequest.count({ where: { status: 'PENDING' } }),
      prisma.scheduleChangeRequest.count({ where: { status: 'PENDING' } }),
    ]);
    pendingAuthorizationsCount = spacePending + equipPending + schedulePending;
  }

  return NextResponse.json({
    user,
    unreadNotifications,
    pendingAuthorizationsCount,
    demoEnvironment: process.env.DEMO_MODE !== 'false',
  });
}

