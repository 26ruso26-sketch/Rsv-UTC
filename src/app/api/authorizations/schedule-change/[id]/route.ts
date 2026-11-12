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

    if (decision !== 'APPROVED' && decision !== 'REJECTED') {
      return NextResponse.json(
        { error: 'Decisión inválida. Debe ser APPROVED o REJECTED.' },
        { status: 400 }
      );
    }

    if (decision === 'REJECTED' && (!rejectionReason || rejectionReason.length < 5)) {
      return NextResponse.json(
        { error: 'El rechazo de una modificación de horario exige indicar un motivo obligatorio.' },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const changeReq = await tx.scheduleChangeRequest.findUnique({
        where: { id: params.id },
        include: {
          space: true,
          event: true,
          reservation: true,
        },
      });

      if (!changeReq) {
        throw new Error('Solicitud de modificación de horario no encontrada.');
      }

      if (!canUserAuthorizeSpace(user, changeReq.space)) {
        throw new Error(
          `Permiso denegado: usted (${user.username}) no es el autorizador asignado al espacio "${changeReq.space.name}".`
        );
      }

      if (changeReq.status === 'EXPIRED') {
        throw new Error(
          'Esta solicitud de modificación de horario venció porque llegó la hora de inicio original del evento. El horario original se conserva y ya no puede aprobarse.'
        );
      }

      if (changeReq.status !== 'PENDING') {
        throw new Error(`Esta modificación de horario ya fue procesada (${changeReq.status}).`);
      }

      // Verificar en tiempo real que no haya llegado la hora original de inicio (Sección 5)
      const now = new Date();
      const originalStartAt = parseMonterreyDateTime(
        changeReq.originalDate,
        changeReq.originalStartTime
      );
      if (now.getTime() >= originalStartAt.getTime()) {
        throw new Error(
          'La hora de inicio original del evento ya llegó; la modificación de horario ha expirado y ya no puede aprobarse.'
        );
      }

      if (decision === 'APPROVED') {
        const availability = await checkSpaceAvailability(tx, {
          spaceId: changeReq.spaceId,
          date: changeReq.proposedDate,
          startTime: changeReq.proposedStartTime,
          endTime: changeReq.proposedEndTime,
          excludeEventId: changeReq.eventId,
        });

        if (!availability.available) {
          throw new Error(
            `No es posible aprobar el cambio de horario: existe conflicto de disponibilidad (${availability.conflicts
              .map((c) => c.message)
              .join(' | ')}).`
          );
        }

        await tx.event.update({
          where: { id: changeReq.eventId },
          data: {
            date: changeReq.proposedDate,
            startTime: changeReq.proposedStartTime,
            endTime: changeReq.proposedEndTime,
            cleaningEndTime: changeReq.proposedCleaningEndTime,
            startMinutes: changeReq.proposedStartMinutes,
            endMinutes: changeReq.proposedEndMinutes,
            cleaningEndMinutes: changeReq.proposedCleaningEndMinutes,
          },
        });

        await tx.reservation.updateMany({
          where: {
            eventId: changeReq.eventId,
            reservationType: 'ORIGINAL',
            status: 'APPROVED',
          },
          data: {
            status: 'RELEASED',
          },
        });

        if (changeReq.reservation) {
          await tx.reservation.update({
            where: { id: changeReq.reservation.id },
            data: {
              reservationType: 'ORIGINAL',
              status: 'APPROVED',
              scheduleChangeRequestId: null,
            },
          });
        } else {
          await tx.reservation.create({
            data: {
              eventId: changeReq.eventId,
              spaceId: changeReq.spaceId,
              reservationType: 'ORIGINAL',
              status: 'APPROVED',
              date: changeReq.proposedDate,
              startTime: changeReq.proposedStartTime,
              endTime: changeReq.proposedEndTime,
              cleaningEndTime: changeReq.proposedCleaningEndTime,
              startMinutes: changeReq.proposedStartMinutes,
              endMinutes: changeReq.proposedEndMinutes,
              cleaningEndMinutes: changeReq.proposedCleaningEndMinutes,
            },
          });
        }

        const updatedChange = await tx.scheduleChangeRequest.update({
          where: { id: changeReq.id },
          data: {
            status: 'APPROVED',
            resolvedAt: new Date(),
          },
        });

        await tx.auditLog.create({
          data: {
            userId: user.id,
            eventId: changeReq.eventId,
            action: 'SCHEDULE_CHANGE_APPROVED',
            entityType: 'ScheduleChangeRequest',
            entityId: changeReq.id,
            summary: `Modificación de horario APROBADA. Horario original (${changeReq.originalDate} ${changeReq.originalStartTime}-${changeReq.originalEndTime}) liberado y nuevo horario (${changeReq.proposedDate} ${changeReq.proposedStartTime}-${changeReq.proposedEndTime}) confirmado.`,
            previousData: JSON.stringify({
              date: changeReq.originalDate,
              startTime: changeReq.originalStartTime,
              endTime: changeReq.originalEndTime,
            }),
            newData: JSON.stringify({
              date: changeReq.proposedDate,
              startTime: changeReq.proposedStartTime,
              endTime: changeReq.proposedEndTime,
              cleaningEndTime: changeReq.proposedCleaningEndTime,
            }),
          },
        });

        await tx.notification.create({
          data: {
            userId: changeReq.requestedById,
            eventId: changeReq.eventId,
            type: 'SCHEDULE_CHANGE_APPROVED',
            title: `Cambio de horario aprobado: ${changeReq.event.name}`,
            message: `Tu solicitud para cambiar el horario de "${changeReq.event.name}" a ${changeReq.proposedDate} (${changeReq.proposedStartTime}-${changeReq.proposedEndTime}) fue aprobada.`,
            link: `/eventos/${changeReq.eventId}`,
          },
        });

        return updatedChange;
      } else {
        if (changeReq.reservation) {
          await tx.reservation.update({
            where: { id: changeReq.reservation.id },
            data: {
              status: 'RELEASED',
            },
          });
        }

        const updatedChange = await tx.scheduleChangeRequest.update({
          where: { id: changeReq.id },
          data: {
            status: 'REJECTED',
            rejectionReason,
            resolvedAt: new Date(),
          },
        });

        await tx.auditLog.create({
          data: {
            userId: user.id,
            eventId: changeReq.eventId,
            action: 'SCHEDULE_CHANGE_REJECTED',
            entityType: 'ScheduleChangeRequest',
            entityId: changeReq.id,
            summary: `Modificación de horario RECHAZADA. Se conserva el horario original (${changeReq.originalDate} ${changeReq.originalStartTime}-${changeReq.originalEndTime}) y se libera el horario propuesto (${changeReq.proposedStartTime}-${changeReq.proposedEndTime}).`,
            reason: rejectionReason,
            previousData: JSON.stringify({
              proposedDate: changeReq.proposedDate,
              proposedStartTime: changeReq.proposedStartTime,
              proposedEndTime: changeReq.proposedEndTime,
            }),
            newData: JSON.stringify({
              status: 'REJECTED',
              rejectionReason,
              keptSchedule: `${changeReq.originalDate} ${changeReq.originalStartTime}-${changeReq.originalEndTime}`,
            }),
          },
        });

        await tx.notification.create({
          data: {
            userId: changeReq.requestedById,
            eventId: changeReq.eventId,
            type: 'SCHEDULE_CHANGE_REJECTED',
            title: `Cambio de horario rechazado: ${changeReq.event.name}`,
            message: `El cambio de horario propuesto fue rechazado (tu reservación original ${changeReq.originalStartTime}-${changeReq.originalEndTime} sigue vigente). Motivo: ${rejectionReason}`,
            link: `/eventos/${changeReq.eventId}`,
          },
        });

        return updatedChange;
      }
    });

    return NextResponse.json({ scheduleChangeRequest: result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al procesar la modificación de horario.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
