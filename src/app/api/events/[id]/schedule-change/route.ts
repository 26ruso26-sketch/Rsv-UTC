import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
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
    const proposedDate = String(body.proposedDate || '').trim();
    const proposedStartTime = String(body.proposedStartTime || '').trim();
    const proposedEndTime = String(body.proposedEndTime || '').trim();
    const reason = String(body.reason || '').trim();

    if (!proposedDate || !proposedStartTime || !proposedEndTime || !reason) {
      return NextResponse.json(
        { error: 'Debe indicar la nueva fecha, hora de inicio, hora de fin y el motivo del cambio.' },
        { status: 400 }
      );
    }

    const changeRequest = await prisma.$transaction(async (tx) => {
      const event = await tx.event.findUnique({
        where: { id: params.id },
        include: {
          space: true,
          spaceRequest: true,
          scheduleChangeRequests: {
            where: { status: 'PENDING' },
          },
        },
      });

      if (!event || !event.spaceRequest) {
        throw new Error('Evento no encontrado.');
      }

      if (event.createdById !== user.id && user.role !== 'SUPER_ADMIN') {
        throw new Error('Solo el usuario que registró el evento puede solicitar una modificación de horario.');
      }

      if (event.spaceRequest.status !== 'APPROVED') {
        throw new Error(
          'Solo se puede solicitar una modificación de horario para eventos cuya reservación de espacio ya está APROBADA.'
        );
      }

      // REGLA OBLIGATORIA SECCIÓN 5:
      // Si fechaHoraActual >= fechaHoraInicio, bloquear cualquier modificación de fecha u horario.
      const now = new Date();
      const startAt = parseMonterreyDateTime(event.date, event.startTime);
      const endAt = parseMonterreyDateTime(event.date, event.endTime);

      if (now.getTime() >= endAt.getTime()) {
        throw new Error(
          'No se permiten cambios de fecha ni horario porque el evento ya concluyó.'
        );
      }

      if (now.getTime() >= startAt.getTime()) {
        throw new Error(
          'No se permiten cambios de fecha ni horario porque la fecha y hora programada de inicio del evento ya llegó.'
        );
      }

      // Verificar también que el nuevo horario propuesto sea futuro
      const proposedStartAt = parseMonterreyDateTime(proposedDate, proposedStartTime);
      if (now.getTime() >= proposedStartAt.getTime()) {
        throw new Error(
          'La nueva fecha y hora de inicio propuestas deben ser posteriores a la fecha y hora actuales.'
        );
      }

      if (event.scheduleChangeRequests.length > 0) {
        throw new Error(
          'Ya existe una solicitud de modificación de horario PENDIENTE para este evento. No se permiten modificaciones pendientes simultáneas.'
        );
      }

      if (
        proposedDate === event.date &&
        proposedStartTime === event.startTime &&
        proposedEndTime === event.endTime
      ) {
        throw new Error('El horario propuesto es idéntico al horario vigente actual.');
      }

      const availability = await checkSpaceAvailability(tx, {
        spaceId: event.spaceId,
        date: proposedDate,
        startTime: proposedStartTime,
        endTime: proposedEndTime,
        excludeEventId: event.id,
      });

      if (!availability.available) {
        throw new Error(
          `El nuevo horario propuesto no está disponible: ${availability.conflicts
            .map((c) => c.message)
            .join(' | ')}`
        );
      }

      const createdChange = await tx.scheduleChangeRequest.create({
        data: {
          eventId: event.id,
          spaceId: event.spaceId,
          requestedById: user.id,
          authorizerId: event.space.authorizerUserId,
          originalDate: event.date,
          originalStartTime: event.startTime,
          originalEndTime: event.endTime,
          originalCleaningEndTime: event.cleaningEndTime,
          proposedDate,
          proposedStartTime,
          proposedEndTime,
          proposedCleaningEndTime: availability.cleaningEndTime,
          proposedStartMinutes: availability.startMinutes,
          proposedEndMinutes: availability.endMinutes,
          proposedCleaningEndMinutes: availability.cleaningEndMinutes,
          reason,
          status: 'PENDING',
        },
      });

      await tx.reservation.create({
        data: {
          eventId: event.id,
          spaceId: event.spaceId,
          scheduleChangeRequestId: createdChange.id,
          reservationType: 'SCHEDULE_CHANGE',
          status: 'PROVISIONAL',
          date: proposedDate,
          startTime: proposedStartTime,
          endTime: proposedEndTime,
          cleaningEndTime: availability.cleaningEndTime,
          startMinutes: availability.startMinutes,
          endMinutes: availability.endMinutes,
          cleaningEndMinutes: availability.cleaningEndMinutes,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          eventId: event.id,
          action: 'SCHEDULE_CHANGE_REQUESTED',
          entityType: 'ScheduleChangeRequest',
          entityId: createdChange.id,
          summary: `Modificación de horario solicitada: de ${event.date} (${event.startTime}-${event.endTime}) a ${proposedDate} (${proposedStartTime}-${proposedEndTime}). Horario original se mantiene vigente y nuevo horario queda bloqueado provisionalmente.`,
          reason,
          previousData: JSON.stringify({
            date: event.date,
            startTime: event.startTime,
            endTime: event.endTime,
            cleaningEndTime: event.cleaningEndTime,
          }),
          newData: JSON.stringify({
            proposedDate,
            proposedStartTime,
            proposedEndTime,
            proposedCleaningEndTime: availability.cleaningEndTime,
          }),
        },
      });

      await tx.notification.create({
        data: {
          userId: event.space.authorizerUserId,
          eventId: event.id,
          type: 'SCHEDULE_CHANGE_PENDING',
          title: `Modificación de horario pendiente: ${event.name}`,
          message: `${user.fullName} solicitó cambiar el horario de "${event.name}" en ${event.space.name} a ${proposedDate} (${proposedStartTime}-${proposedEndTime}).`,
          link: `/autorizaciones`,
        },
      });

      return createdChange;
    });

    return NextResponse.json({ scheduleChangeRequest: changeRequest }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al solicitar modificación de horario.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
