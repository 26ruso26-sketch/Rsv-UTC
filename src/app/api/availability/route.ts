import { NextRequest, NextResponse } from 'next/server';
import { canUserAccessEventPrivateData, getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkSpaceAvailability } from '@/lib/availability';
import { CalendarSlotBlock } from '@/types';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode') || 'calendar';

  // Mode 1: Check specific schedule slot availability
  if (mode === 'check') {
    const spaceId = searchParams.get('spaceId') || '';
    const date = searchParams.get('date') || '';
    const startTime = searchParams.get('startTime') || '';
    const endTime = searchParams.get('endTime') || '';
    const excludeEventId = searchParams.get('excludeEventId') || undefined;

    if (!spaceId || !date || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Faltan parámetros para validar disponibilidad (spaceId, date, startTime, endTime).' },
        { status: 400 }
      );
    }

    try {
      const result = await checkSpaceAvailability(prisma, {
        spaceId,
        date,
        startTime,
        endTime,
        excludeEventId,
      });
      return NextResponse.json(result);
    } catch (err) {
      return NextResponse.json(
        {
          available: false,
          error: err instanceof Error ? err.message : 'Horario inválido.',
          conflicts: [],
        },
        { status: 400 }
      );
    }
  }

  // Mode 2: Fetch calendar blocks for a date range and optional spaceId
  const spaceId = searchParams.get('spaceId') || undefined;
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';

  const whereReservation: Record<string, unknown> = {
    status: { in: ['APPROVED', 'PROVISIONAL'] },
  };

  if (spaceId && spaceId !== 'ALL') {
    whereReservation.spaceId = spaceId;
  }

  if (startDate && endDate) {
    whereReservation.date = {
      gte: startDate,
      lte: endDate,
    };
  } else if (startDate) {
    whereReservation.date = startDate;
  }

  const reservations = await prisma.reservation.findMany({
    where: whereReservation,
    include: {
      space: {
        select: {
          id: true,
          name: true,
          authorizerUserId: true,
          buildingId: true,
        },
      },
      event: {
        include: {
          spaceRequest: {
            select: { id: true, status: true, authorizerId: true },
          },
          equipmentRequest: {
            select: { id: true, status: true },
          },
          scheduleChangeRequests: {
            where: { status: 'PENDING' },
            select: { id: true, proposedDate: true, proposedStartTime: true, proposedEndTime: true },
          },
        },
      },
    },
    orderBy: [{ date: 'asc' }, { startMinutes: 'asc' }],
  });

  const blocks: CalendarSlotBlock[] = [];

  for (const res of reservations) {
    const canViewPrivate = canUserAccessEventPrivateData(user, {
      createdById: res.event.createdById,
      space: res.space,
      spaceRequest: res.event.spaceRequest,
      equipmentRequest: res.event.equipmentRequest,
    });

    const isScheduleChange = res.reservationType === 'SCHEDULE_CHANGE';
    const isApproved = res.status === 'APPROVED' && !isScheduleChange;
    const hasPendingChange = res.event.scheduleChangeRequests.length > 0;

    // 1. Bloque principal del evento (Rojo si APROBADO, Naranja si PENDIENTE o CAMBIO DE HORARIO PROPUESTO)
    blocks.push({
      id: `res-${res.id}`,
      eventId: res.eventId,
      demoCode: res.event.demoCode,
      eventName: canViewPrivate
        ? res.event.name
        : `${res.event.name} (${res.event.responsibleDepartment})`,
      spaceId: res.spaceId,
      spaceName: res.space.name,
      date: res.date,
      startTime: res.startTime,
      endTime: res.endTime,
      cleaningEndTime: res.cleaningEndTime,
      startMinutes: res.startMinutes,
      endMinutes: res.endMinutes,
      cleaningEndMinutes: res.cleaningEndMinutes,
      blockCategory: isScheduleChange
        ? 'SCHEDULE_CHANGE_PROPOSED'
        : isApproved
        ? 'APPROVED'
        : 'PENDING',
      colorCode: isApproved ? 'RED' : 'ORANGE',
      responsibleName: canViewPrivate ? res.event.responsibleName : undefined,
      responsibleDepartment: res.event.responsibleDepartment,
      criticalityLevel: res.event.criticalityLevel,
      hasPendingScheduleChange: hasPendingChange,
      canViewPrivateDetails: canViewPrivate,
    });

    // 2. Bloque de hora obligatoria de limpieza (Amarillo) inmediatamente posterior al evento
    blocks.push({
      id: `clean-${res.id}`,
      eventId: res.eventId,
      demoCode: res.event.demoCode,
      eventName: `Limpieza obligatoria (${res.event.name})`,
      spaceId: res.spaceId,
      spaceName: res.space.name,
      date: res.date,
      startTime: res.endTime,
      endTime: res.cleaningEndTime,
      cleaningEndTime: res.cleaningEndTime,
      startMinutes: res.endMinutes,
      endMinutes: res.cleaningEndMinutes,
      cleaningEndMinutes: res.cleaningEndMinutes,
      blockCategory: 'CLEANING',
      colorCode: 'YELLOW',
      responsibleDepartment: res.event.responsibleDepartment,
      criticalityLevel: res.event.criticalityLevel,
      hasPendingScheduleChange: hasPendingChange,
      canViewPrivateDetails: canViewPrivate,
    });
  }

  return NextResponse.json({ blocks });
}

