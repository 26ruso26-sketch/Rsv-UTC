import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Acceso restringido al rol SUPER_ADMIN.' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'ALL';
  const query = searchParams.get('q') || '';

  const where: Record<string, unknown> = {};
  if (action !== 'ALL') {
    where.action = action;
  }
  if (query.trim()) {
    where.summary = { contains: query.trim() };
  }

  const logs = await prisma.auditLog.findMany({
    where,
    include: {
      user: { select: { id: true, username: true, fullName: true, role: true } },
      event: { select: { id: true, demoCode: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 150,
  });

  return NextResponse.json({ logs });
}

