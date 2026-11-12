import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Acceso restringido al rol SUPER_ADMIN.' }, { status: 403 });
  }

  const spaces = await prisma.space.findMany({
    include: {
      building: true,
      authorizer: { select: { id: true, username: true, fullName: true, role: true } },
    },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({ spaces });
}

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Acceso restringido al rol SUPER_ADMIN.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const id = String(body.id || '');
    const authorizerUserId = body.authorizerUserId ? String(body.authorizerUserId) : undefined;
    const capacity = body.capacity !== undefined ? Number(body.capacity) : undefined;
    const location = body.location !== undefined ? String(body.location).trim() : undefined;

    if (!id) {
      return NextResponse.json({ error: 'El ID del espacio es obligatorio.' }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const prev = await tx.space.findUnique({ where: { id } });
      if (!prev) {
        throw new Error('Espacio no encontrado.');
      }

      const saved = await tx.space.update({
        where: { id },
        data: {
          ...(authorizerUserId ? { authorizerUserId } : {}),
          ...(capacity && !Number.isNaN(capacity) ? { capacity } : {}),
          ...(location !== undefined ? { location } : {}),
        },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'CATALOG_UPDATED',
          entityType: 'Space',
          entityId: saved.id,
          summary: `Catálogo del espacio "${saved.name}" actualizado por el administrador.`,
          previousData: JSON.stringify({
            authorizerUserId: prev.authorizerUserId,
            capacity: prev.capacity,
            location: prev.location,
          }),
          newData: JSON.stringify({
            authorizerUserId: saved.authorizerUserId,
            capacity: saved.capacity,
            location: saved.location,
          }),
        },
      });

      return saved;
    });

    return NextResponse.json({ space: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al actualizar el espacio.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

