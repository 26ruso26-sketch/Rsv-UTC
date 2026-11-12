import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Acceso restringido al rol SUPER_ADMIN.' }, { status: 403 });
  }

  const buildings = await prisma.building.findMany({
    include: {
      directors: { select: { id: true, username: true, fullName: true } },
      spaces: { select: { id: true, name: true } },
    },
    orderBy: { code: 'asc' },
  });

  return NextResponse.json({ buildings });
}

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Acceso restringido al rol SUPER_ADMIN.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const id = String(body.id || '');
    const name = String(body.name || '').trim();
    const description = body.description !== undefined ? String(body.description).trim() : undefined;

    if (!id || !name) {
      return NextResponse.json({ error: 'El ID y el nombre del edificio son obligatorios.' }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const prev = await tx.building.findUnique({ where: { id } });
      if (!prev) {
        throw new Error('Edificio no encontrado.');
      }

      const saved = await tx.building.update({
        where: { id },
        data: {
          name,
          ...(description !== undefined ? { description } : {}),
        },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'CATALOG_UPDATED',
          entityType: 'Building',
          entityId: saved.id,
          summary: `Edificio actualizado de "${prev.name}" a "${saved.name}".`,
          previousData: JSON.stringify({ name: prev.name, description: prev.description }),
          newData: JSON.stringify({ name: saved.name, description: saved.description }),
        },
      });

      return saved;
    });

    return NextResponse.json({ building: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al actualizar el edificio.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

