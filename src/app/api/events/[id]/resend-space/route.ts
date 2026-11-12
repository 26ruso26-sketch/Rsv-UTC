import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkSpaceAvailability } from '@/lib/availability';
import { calculateCriticalityLevel } from '@/lib/utils';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  try {
    const body = await request.json();

    const updatedEvent = await prisma.$transaction(async (tx) => {
      const event = await tx.event.findUnique({
        where: { id: params.id },
        include: {
          space: true,
          spaceRequest: true,
          audiences: { include: { audienceType: true } },
        },
      });

      if (!event || !event.spaceRequest) {
        throw new Error('Evento o solicitud de espacio no encontrada.');
      }

      if (event.createdById !== user.id && user.role !== 'SUPER_ADMIN') {
        throw new Error('Solo el usuario que registró el evento puede modificar y reenviar la solicitud.');
      }

      if (event.spaceRequest.status !== 'REJECTED') {
        throw new Error('Solo se pueden reenviar solicitudes de espacio que hayan sido rechazadas.');
      }

      const name = String(body.name || event.name).trim();
      const description = String(body.description || event.description).trim();
      const justification = String(body.justification || event.justification).trim();
      const date = String(body.date || event.date).trim();
      const startTime = String(body.startTime || event.startTime).trim();
      const endTime = String(body.endTime || event.endTime).trim();
      const spaceId = String(body.spaceId || event.spaceId).trim();
      const responsibleName = String(body.responsibleName || event.responsibleName).trim();
      const responsibleDepartment = String(body.responsibleDepartment || event.responsibleDepartment).trim();
      const responsibleEmail =
        body.responsibleEmail !== undefined
          ? body.responsibleEmail
            ? String(body.responsibleEmail).trim()
            : null
          : event.responsibleEmail;

      const audienceLevels: number[] = Array.isArray(body.audienceLevels)
        ? body.audienceLevels.map((n: unknown) => Number(n))
        : event.audiences.map((a) => a.audienceType.level);

      const criticalityLevel = calculateCriticalityLevel(audienceLevels);

      const targetSpace = await tx.space.findUnique({
        where: { id: spaceId },
      });

      if (!targetSpace || !targetSpace.active) {
        throw new Error('El espacio seleccionado no es válido.');
      }

      // Validar disponibilidad en el nuevo horario/espacio antes de bloquear provisionalmente
      const availability = await checkSpaceAvailability(tx, {
        spaceId: targetSpace.id,
        date,
        startTime,
        endTime,
        excludeEventId: event.id,
      });

      if (!availability.available) {
        throw new Error(
          `El horario seleccionado no está disponible: ${availability.conflicts
            .map((c) => c.message)
            .join(' | ')}`
        );
      }

      const previousSnapshot = {
        name: event.name,
        justification: event.justification,
        spaceId: event.spaceId,
        date: event.date,
        startTime: event.startTime,
        endTime: event.endTime,
        rejectionReason: event.spaceRequest.rejectionReason,
      };

      const updated = await tx.event.update({
        where: { id: event.id },
        data: {
          name,
          description,
          justification,
          date,
          startTime,
          endTime,
          cleaningEndTime: availability.cleaningEndTime,
          startMinutes: availability.startMinutes,
          endMinutes: availability.endMinutes,
          cleaningEndMinutes: availability.cleaningEndMinutes,
          spaceId: targetSpace.id,
          responsibleName,
          responsibleDepartment,
          responsibleEmail,
          criticalityLevel,
        },
      });

      // Actualizar audiencias si cambiaron
      if (Array.isArray(body.audienceLevels)) {
        await tx.eventAudience.deleteMany({ where: { eventId: event.id } });
        const audTypes = await tx.audienceType.findMany({
          where: { level: { in: audienceLevels } },
        });
        for (const a of audTypes) {
          await tx.eventAudience.create({
            data: { eventId: event.id, audienceTypeId: a.id },
          });
        }
      }

      // Actualizar SpaceRequest a PENDING e incrementar revisionCount
      await tx.spaceRequest.update({
        where: { id: event.spaceRequest.id },
        data: {
          spaceId: targetSpace.id,
          authorizerId: targetSpace.authorizerUserId,
          status: 'PENDING',
          rejectionReason: null,
          resolvedAt: null,
          revisionCount: { increment: 1 },
          requestedAt: new Date(),
        },
      });

      // Crear nuevo bloqueo provisional para el horario reenviado
      await tx.reservation.updateMany({
        where: { eventId: event.id, reservationType: 'ORIGINAL' },
        data: { status: 'RELEASED' },
      });

      await tx.reservation.create({
        data: {
          eventId: event.id,
          spaceId: targetSpace.id,
          reservationType: 'ORIGINAL',
          status: 'PROVISIONAL',
          date,
          startTime,
          endTime,
          cleaningEndTime: availability.cleaningEndTime,
          startMinutes: availability.startMinutes,
          endMinutes: availability.endMinutes,
          cleaningEndMinutes: availability.cleaningEndMinutes,
        },
      });

      // Auditoría
      await tx.auditLog.create({
        data: {
          userId: user.id,
          eventId: event.id,
          action: 'SPACE_RESENT',
          entityType: 'SpaceRequest',
          entityId: event.spaceRequest.id,
          summary: `Solicitud de espacio modificada y reenviada para "${targetSpace.name}" el ${date} (${startTime}-${endTime}).`,
          previousData: JSON.stringify(previousSnapshot),
          newData: JSON.stringify({
            name,
            justification,
            space: targetSpace.name,
            date,
            startTime,
            endTime,
            cleaningEndTime: availability.cleaningEndTime,
          }),
        },
      });

      // Notificación al autorizador
      await tx.notification.create({
        data: {
          userId: targetSpace.authorizerUserId,
          eventId: event.id,
          type: 'REQUEST_RESENT',
          title: `Solicitud de espacio reenviada: ${name}`,
          message: `${user.fullName} corrigió y reenvió la solicitud de espacio "${targetSpace.name}" para el ${date} (${startTime}-${endTime}).`,
          link: `/autorizaciones`,
        },
      });

      return updated;
    });

    return NextResponse.json({ event: updatedEvent });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al reenviar la solicitud de espacio.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

