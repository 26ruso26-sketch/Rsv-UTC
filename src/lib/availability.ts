import { Prisma, PrismaClient } from '@prisma/client';
import { AvailabilityCheckResult, AvailabilityConflict } from '@/types';
import { addOneHourForCleaning, timeToMinutes } from './utils';

type PrismaTransactionOrClient = PrismaClient | Prisma.TransactionClient;

export interface CheckAvailabilityParams {
  spaceId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  excludeEventId?: string;
  excludeReservationId?: string;
}

/**
 * Validates that the requested time range is well-formed.
 */
export function validateScheduleWindow(date: string, startTime: string, endTime: string): {
  valid: boolean;
  error?: string;
  startMinutes: number;
  endMinutes: number;
  cleaningEndMinutes: number;
  cleaningEndTime: string;
} {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return {
      valid: false,
      error: 'La fecha debe tener el formato YYYY-MM-DD.',
      startMinutes: 0,
      endMinutes: 0,
      cleaningEndMinutes: 0,
      cleaningEndTime: '00:00',
    };
  }

  let startMinutes = 0;
  let endMinutes = 0;
  let cleaningEndMinutes = 0;
  let cleaningEndTime = '00:00';

  try {
    startMinutes = timeToMinutes(startTime);
    const cleaning = addOneHourForCleaning(endTime);
    endMinutes = cleaning.endMinutes;
    cleaningEndMinutes = cleaning.cleaningEndMinutes;
    cleaningEndTime = cleaning.cleaningEndTime;
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : 'Formato de horario inválido.',
      startMinutes: 0,
      endMinutes: 0,
      cleaningEndMinutes: 0,
      cleaningEndTime: '00:00',
    };
  }

  if (endMinutes <= startMinutes) {
    return {
      valid: false,
      error: 'La hora de finalización debe ser posterior a la hora de inicio.',
      startMinutes,
      endMinutes,
      cleaningEndMinutes,
      cleaningEndTime,
    };
  }

  if (endMinutes - startMinutes < 30) {
    return {
      valid: false,
      error: 'La duración mínima de un evento es de 30 minutos.',
      startMinutes,
      endMinutes,
      cleaningEndMinutes,
      cleaningEndTime,
    };
  }

  if (startMinutes < 7 * 60 || endMinutes > 22 * 60) {
    return {
      valid: false,
      error: 'El horario institucional permitido para eventos es de 07:00 a 22:00 hrs.',
      startMinutes,
      endMinutes,
      cleaningEndMinutes,
      cleaningEndTime,
    };
  }

  return {
    valid: true,
    startMinutes,
    endMinutes,
    cleaningEndMinutes,
    cleaningEndTime,
  };
}

/**
 * Centralized availability verification function.
 * Enforces:
 * 1. Direct schedule overlap check.
 * 2. Mandatory 1-hour cleaning period AFTER existing events (anterior -> nuevo).
 * 3. Mandatory 1-hour cleaning period AFTER the requested event (nuevo -> posterior).
 * 4. Provisional blocks (PENDING space requests & PENDING schedule change proposals).
 *
 * Safe to run inside `prisma.$transaction(...)` right before committing any reservation.
 */
export async function checkSpaceAvailability(
  db: PrismaTransactionOrClient,
  params: CheckAvailabilityParams
): Promise<AvailabilityCheckResult> {
  const windowCheck = validateScheduleWindow(params.date, params.startTime, params.endTime);
  if (!windowCheck.valid) {
    throw new Error(windowCheck.error);
  }

  const { startMinutes, endMinutes, cleaningEndMinutes, cleaningEndTime } = windowCheck;

  // Fetch all active reservations (APPROVED or PROVISIONAL) for this space and date.
  // Two intervals [S_A, E_A + 60) and [S_B, E_B + 60) overlap iff:
  // S_A < (E_B + 60) AND S_B < (E_A + 60)
  const whereClause: Prisma.ReservationWhereInput = {
    spaceId: params.spaceId,
    date: params.date,
    status: {
      in: ['APPROVED', 'PROVISIONAL'],
    },
    startMinutes: {
      lt: cleaningEndMinutes,
    },
    cleaningEndMinutes: {
      gt: startMinutes,
    },
  };

  if (params.excludeEventId) {
    whereClause.eventId = { not: params.excludeEventId };
  }

  if (params.excludeReservationId) {
    whereClause.id = { not: params.excludeReservationId };
  }

  const activeReservations = await db.reservation.findMany({
    where: whereClause,
    include: {
      event: {
        select: {
          id: true,
          name: true,
          demoCode: true,
        },
      },
    },
    orderBy: {
      startMinutes: 'asc',
    },
  });

  const conflicts: AvailabilityConflict[] = activeReservations.map((res) => {
    let conflictKind: AvailabilityConflict['conflictKind'] = 'DIRECT_OVERLAP';
    let message = '';

    const stateLabel =
      res.status === 'APPROVED'
        ? 'reservación aprobada'
        : res.reservationType === 'SCHEDULE_CHANGE'
        ? 'propuesta de cambio de horario pendiente'
        : 'solicitud pendiente (bloqueo provisional)';

    if (startMinutes < res.endMinutes && res.startMinutes < endMinutes) {
      conflictKind = 'DIRECT_OVERLAP';
      message = `Traslape directo con "${res.event.name}" (${res.startTime} a ${res.endTime}, ${stateLabel}).`;
    } else if (startMinutes >= res.endMinutes && startMinutes < res.cleaningEndMinutes) {
      conflictKind = 'INVADES_PREVIOUS_CLEANING';
      message = `Invade la hora obligatoria de limpieza (${res.endTime} a ${res.cleaningEndTime}) posterior al evento "${res.event.name}" (${res.startTime} a ${res.endTime}). El siguiente evento puede iniciar a partir de las ${res.cleaningEndTime}.`;
    } else {
      conflictKind = 'CLEANING_INVADES_NEXT_EVENT';
      message = `La hora obligatoria de limpieza de su evento (${ params.endTime } a ${cleaningEndTime}) invadiría el inicio del evento posterior "${res.event.name}" (${res.startTime} a ${res.endTime}). Su evento debe finalizar a más tardar a las ${minutesToTimeSafe(res.startMinutes - 60)}.`;
    }

    return {
      reservationId: res.id,
      eventId: res.eventId,
      eventName: res.event.name,
      demoCode: res.event.demoCode,
      reservationType: res.reservationType as 'ORIGINAL' | 'SCHEDULE_CHANGE',
      status: res.status as 'PROVISIONAL' | 'APPROVED',
      date: res.date,
      startTime: res.startTime,
      endTime: res.endTime,
      cleaningEndTime: res.cleaningEndTime,
      conflictKind,
      message,
    };
  });

  return {
    available: conflicts.length === 0,
    date: params.date,
    startTime: params.startTime,
    endTime: params.endTime,
    cleaningEndTime,
    startMinutes,
    endMinutes,
    cleaningEndMinutes,
    conflicts,
  };
}

function minutesToTimeSafe(mins: number): string {
  const clamped = Math.max(0, Math.min(1440, mins));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

