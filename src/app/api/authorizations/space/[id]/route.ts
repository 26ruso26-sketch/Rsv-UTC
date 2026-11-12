import { NextRequest, NextResponse } from 'next/server';
import { canUserAuthorizeSpace, getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkSpaceAvailability } from '@/lib/availability';
import { parseMonterreyDateTime, syncExpiredRequestsAndChanges } from '@/lib/lifecycle';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  await syncExpiredRequestsAndChanges();

  try {
    const body = await request.json();
    const decision = String(body.decision || '').toUpperCase();
    const rejectionReason = String(body.rejectionReason || '').trim();
    const decisionNotes = body.decisionNotes ? String(body.decisionNotes).trim() : null;

    if (decision !== 'APPROVED' && decision !== 'REJECTED') {
      return NextResponse.json(
        { error: 'Decisión inválida. Debe ser APPROVED o REJECTED.' },
        { status: 400 }
      );
    }

    if (decision === 'REJECTED' && (!rejectionReason || rejectionReason.length < 5)) {
      return NextResponse.json(
        { error: 'El rechazo de una solicitud de espacio exige indicar un motivo obligatorio.' },
        { status: 400 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const spaceReq = await tx.spaceRequest.findUnique({
        where: { id: params.id },
        include: {
          space: true,
          event: true,
        },
      });

      if (!spaceReq) {
        throw new Error('Solicitud de espacio no encontrada.');
      }

      if (!canUserAuthorizeSpace(user, spaceReq.space)) {
        throw new Error(
          `Permiso denegado: usted (${user.username}) no es el autorizador asignado al espacio "${spaceReq.space.name}".`
        );
      }

      if (spaceReq.status === 'EXPIRED') {
        throw new Error(
          'Esta solicitud de espacio ya venció porque la fecha y hora de inicio del evento llegaron sin recibir autorización. No puede aprobarse.'
        );
      }

      if (spaceReq.status !== 'PENDING') {
        throw new Error(`Esta solicitud ya fue procesada (${spaceReq.status}).`);
      }

      // Verificar hora de inicio real (Sección 4.2: Una solicitud vencida ya no podrá aprobarse)
      const now = new Date();
      const startAt = parseMonterreyDateTime(spaceReq.event.date, spaceReq.event.startTime);
      if (now.getTime() >= startAt.getTime()) {
        throw new Error(
          'No es posible procesar esta solicitud: la fecha y hora de inicio del evento ya llegaron y la solicitud ha vencido.'
        );
      }

      if (decision === 'APPROVED') {
        const availability = await checkSpaceAvailability(tx, {
          spaceId: spaceReq.spaceId,
          date: spaceReq.event.date,
          startTime: spaceReq.event.startTime,
          endTime: spaceReq.event.endTime,
          excludeEventId: spaceReq.eventId,
        });

        if (!availability.available) {
          throw new Error(
            `No es posible aprobar: existe conflicto de disponibilidad (${availability.conflicts
              .map((c) => c.message)
              .join(' | ')}).`
          );
        }

        const resReq = await tx.spaceRequest.update({
          where: { id: spaceReq.id },
          data: {
            status: 'APPROVED',
            rejectionReason: null,
            decisionNotes,
            resolvedAt: new Date(),
          },
        });

        await tx.reservation.updateMany({
          where: {
            eventId: spaceReq.eventId,
            reservationType: 'ORIGINAL',
            status: 'PROVISIONAL',
          },
          data: {
            status: 'APPROVED',
          },
        });

        await tx.auditLog.create({
          data: {
            userId: user.id,
            eventId: spaceReq.eventId,
            action: 'SPACE_APPROVED',
            entityType: 'SpaceRequest',
            entityId: spaceReq.id,
            summary: `Solicitud del espacio "${spaceReq.space.name}" APROBADA por ${user.fullName}. Reservación confirmada (${spaceReq.event.date}, ${spaceReq.event.startTime}-${spaceReq.event.endTime}, limpieza hasta ${spaceReq.event.cleaningEndTime}).`,
            previousData: JSON.stringify({ status: 'PENDING' }),
            newData: JSON.stringify({ status: 'APPROVED', decisionNotes }),
          },
        });

        await tx.notification.create({
          data: {
            userId: spaceReq.event.createdById,
            eventId: spaceReq.eventId,
            type: 'SPACE_APPROVED',
            title: `Solicitud de espacio aprobada: ${spaceReq.event.name}`,
            message: `${user.fullName} aprobó el uso de "${spaceReq.space.name}" para "${spaceReq.event.name}" el ${spaceReq.event.date} (${spaceReq.event.startTime}-${spaceReq.event.endTime}).`,
            link: `/eventos/${spaceReq.eventId}`,
          },
        });

        return resReq;
      } else {
        const resReq = await tx.spaceRequest.update({
          where: { id: spaceReq.id },
          data: {
            status: 'REJECTED',
            rejectionReason,
            decisionNotes,
            resolvedAt: new Date(),
          },
        });

        await tx.reservation.updateMany({
          where: {
            eventId: spaceReq.eventId,
            reservationType: 'ORIGINAL',
            status: { in: ['PROVISIONAL', 'APPROVED'] },
          },
          data: {
            status: 'RELEASED',
          },
        });

        await tx.auditLog.create({
          data: {
            userId: user.id,
            eventId: spaceReq.eventId,
            action: 'SPACE_REJECTED',
            entityType: 'SpaceRequest',
            entityId: spaceReq.id,
            summary: `Solicitud del espacio "${spaceReq.space.name}" RECHAZADA por ${user.fullName}. Bloqueo provisional liberado.`,
            reason: rejectionReason,
            previousData: JSON.stringify({ status: 'PENDING' }),
            newData: JSON.stringify({ status: 'REJECTED', rejectionReason }),
          },
        });

        await tx.notification.create({
          data: {
            userId: spaceReq.event.createdById,
            eventId: spaceReq.eventId,
            type: 'SPACE_REJECTED',
            title: `Solicitud de espacio rechazada: ${spaceReq.event.name}`,
            message: `Tu solicitud para "${spaceReq.space.name}" fue rechazada. Motivo: ${rejectionReason}`,
            link: `/eventos/${spaceReq.eventId}`,
          },
        });

        return resReq;
      }
    });

    return NextResponse.json({ spaceRequest: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al procesar la autorización de espacio.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
