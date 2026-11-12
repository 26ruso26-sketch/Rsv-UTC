import { NextRequest, NextResponse } from 'next/server';
import { canUserManageEventAttendance, getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  try {
    const event = await prisma.event.findUnique({
      where: { id: params.id },
    });

    if (!event) {
      return NextResponse.json({ error: 'Evento no encontrado.' }, { status: 404 });
    }

    if (!canUserManageEventAttendance(user, event)) {
      return NextResponse.json(
        { error: 'Solo el creador del evento o SUPER_ADMIN puede asignar operadores de acceso.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const operatorUserId = String(body.userId || '').trim();

    if (!operatorUserId) {
      return NextResponse.json(
        { error: 'Debe seleccionar un usuario del sistema para asignarlo como operador.' },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: operatorUserId },
    });

    if (!targetUser || !targetUser.active) {
      return NextResponse.json(
        { error: 'El usuario seleccionado no existe o está inactivo.' },
        { status: 400 }
      );
    }

    const operator = await prisma.$transaction(async (tx) => {
      const op = await tx.eventAccessOperator.upsert({
        where: {
          eventId_userId: {
            eventId: event.id,
            userId: targetUser.id,
          },
        },
        update: {
          active: true,
          assignedById: user.id,
          assignedAt: new Date(),
        },
        create: {
          eventId: event.id,
          userId: targetUser.id,
          assignedById: user.id,
          active: true,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              fullName: true,
              role: true,
              departmentLabel: true,
            },
          },
        },
      });

      await tx.notification.create({
        data: {
          userId: targetUser.id,
          eventId: event.id,
          type: 'OPERATOR_ASSIGNED',
          title: `Asignado como operador de acceso: ${event.name}`,
          message: `${user.fullName} te asignó como operador de escáner QR y control de acceso para el evento "${event.name}" (${event.date} ${event.startTime}-${event.endTime}).`,
          link: `/escaner?eventId=${event.id}`,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          eventId: event.id,
          action: 'ACCESS_OPERATOR_ASSIGNED',
          entityType: 'EventAccessOperator',
          entityId: op.id,
          summary: `Operador de acceso asignado: ${targetUser.fullName} (@${targetUser.username}) para "${event.name}".`,
          newData: JSON.stringify({
            operatorUserId: targetUser.id,
            operatorUsername: targetUser.username,
          }),
        },
      });

      return op;
    });

    return NextResponse.json({ operator }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al asignar operador de acceso.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  try {
    const event = await prisma.event.findUnique({
      where: { id: params.id },
    });

    if (!event) {
      return NextResponse.json({ error: 'Evento no encontrado.' }, { status: 404 });
    }

    if (!canUserManageEventAttendance(user, event)) {
      return NextResponse.json(
        { error: 'Solo el creador del evento o SUPER_ADMIN puede gestionar operadores.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const operatorId = String(body.operatorId || '').trim();
    const active = Boolean(body.active);

    const updated = await prisma.$transaction(async (tx) => {
      const op = await tx.eventAccessOperator.update({
        where: { id: operatorId },
        data: { active },
        include: {
          user: { select: { id: true, username: true, fullName: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          eventId: event.id,
          action: active ? 'ACCESS_OPERATOR_ENABLED' : 'ACCESS_OPERATOR_DISABLED',
          entityType: 'EventAccessOperator',
          entityId: op.id,
          summary: `Operador de acceso @${op.user.username} ${
            active ? 'reactivado' : 'desactivado'
          } en "${event.name}".`,
        },
      });

      return op;
    });

    return NextResponse.json({ operator: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al actualizar operador.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

