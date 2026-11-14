import { prisma } from './prisma';
import { EventLifecycleStatus } from '@/types';
import { MONTERREY_TIMEZONE } from './utils';

/**
 * Converts a YYYY-MM-DD date and HH:mm time in America/Monterrey timezone
 * into a real JavaScript Date object (epoch timestamp).
 * Does NOT compare times as strings (Section 4.3).
 */
export function parseMonterreyDateTime(dateStr: string, timeStr: string): Date {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec((dateStr || '').trim());
  const timeMatch = /^(\d{2}):(\d{2})$/.exec((timeStr || '00:00').trim());

  if (!dateMatch) {
    return new Date(NaN);
  }

  const year = parseInt(dateMatch[1], 10);
  const month = parseInt(dateMatch[2], 10);
  const day = parseInt(dateMatch[3], 10);
  const hour = timeMatch ? parseInt(timeMatch[1], 10) : 0;
  const minute = timeMatch ? parseInt(timeMatch[2], 10) : 0;

  // Initial UTC guess for the wall-clock components
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0, 0);

  // Determine exact America/Monterrey offset at that moment using Intl.DateTimeFormat
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: MONTERREY_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(new Date(utcGuess));
  const partMap: Record<string, number> = {};
  for (const p of parts) {
    if (p.type !== 'literal') {
      partMap[p.type] = parseInt(p.value, 10);
    }
  }

  const tzHour = partMap.hour === 24 ? 0 : partMap.hour;
  const wallAsUtc = Date.UTC(
    partMap.year,
    partMap.month - 1,
    partMap.day,
    tzHour,
    partMap.minute,
    partMap.second || 0,
    0
  );

  const offsetMs = wallAsUtc - utcGuess;
  return new Date(utcGuess - offsetMs);
}

export interface EventLifecycleComputation {
  lifecycleStatus: EventLifecycleStatus;
  lifecycleLabel: string;
  documentaryStatus: 'NOT_APPLICABLE' | 'PENDING_CLOSURE_PDF' | 'CLOSED_WITH_PDF';
  documentaryLabel: string;
  attendanceControlStatus: 'NOT_CONFIGURED' | 'AWAITING_OPEN' | 'OPEN_CHECKIN' | 'CLOSED_CHECKIN';
  attendanceControlLabel: string;
  hasStarted: boolean;
  hasEnded: boolean;
  canModifySchedule: boolean;
  scheduleModificationBlockReason: string | null;
  canCloseWithEvidence: boolean;
  supportingEvidencesCount: number;
  closureEvidencesCount: number;
  startAtIso: string;
  endAtIso: string;
}

export function getLifecycleMeta(status: EventLifecycleStatus): {
  status: EventLifecycleStatus;
  label: string;
  badgeClass: string;
  dotClass: string;
} {
  switch (status) {
    case 'PENDING_APPROVAL':
      return {
        status,
        label: 'Pendiente de autorización',
        badgeClass: 'bg-warn-soft text-warn border-warn/30',
        dotClass: 'bg-warn',
      };
    case 'SCHEDULED':
      return {
        status,
        label: 'Programado',
        badgeClass: 'bg-sunk text-ink border-line-strong',
        dotClass: 'bg-ink',
      };
    case 'IN_PROGRESS':
      return {
        status,
        label: 'En curso',
        badgeClass: 'bg-accent-soft text-accent border-accent',
        dotClass: 'bg-accent',
      };
    case 'COMPLETED_PENDING_EVIDENCE':
      return {
        status,
        label: 'Concluido - pendiente de evidencia',
        badgeClass: 'bg-warn-soft text-warn border-warn/30',
        dotClass: 'bg-warn',
      };
    case 'CLOSED':
      return {
        status,
        label: 'Cerrado',
        badgeClass: 'bg-accent-soft text-accent border-accent/30',
        dotClass: 'bg-accent',
      };
    case 'REJECTED':
      return {
        status,
        label: 'Rechazado',
        badgeClass: 'bg-bad-soft text-bad border-bad/30',
        dotClass: 'bg-bad',
      };
    case 'EXPIRED':
      return {
        status,
        label: 'Vencido',
        badgeClass: 'bg-sunk text-ink border-line-strong',
        dotClass: 'bg-ink-3',
      };
  }
}

/**
 * Centralized backend function that calculates the formal lifecycle state of an event
 * and its independent documentary & attendance states (Sections 4, 5, 6, 7, 19).
 */
export function computeEventLifecycleState(
  event: {
    date: string;
    startTime: string;
    endTime: string;
    closedAt?: Date | string | null;
    spaceRequest?: { status: string } | null;
    evidences?: { category?: string; isArchived?: boolean }[] | null;
    attendanceConfig?: {
      accessMode?: string;
      checkInOpen?: boolean;
      checkInClosedAt?: Date | string | null;
    } | null;
  },
  referenceDate: Date = new Date()
): EventLifecycleComputation {
  const nowMs = referenceDate.getTime();
  const startAt = parseMonterreyDateTime(event.date, event.startTime);
  const endAt = parseMonterreyDateTime(event.date, event.endTime);

  const startMs = startAt.getTime();
  const endMs = endAt.getTime();

  const hasStarted = nowMs >= startMs;
  const hasEnded = nowMs >= endMs;

  const evidencesList = event.evidences || [];
  const activeEvidences = evidencesList.filter((ev) => !ev.isArchived);
  const supportingEvidencesCount = activeEvidences.filter(
    (ev) => !ev.category || ev.category === 'SUPPORTING_DOCUMENT'
  ).length;
  const closureEvidencesCount = activeEvidences.filter(
    (ev) => ev.category === 'CLOSURE_EVIDENCE'
  ).length;

  const spaceStatus = event.spaceRequest?.status || 'PENDING';

  let lifecycleStatus: EventLifecycleStatus;

  if (spaceStatus === 'REJECTED') {
    lifecycleStatus = 'REJECTED';
  } else if (spaceStatus === 'EXPIRED' || (spaceStatus === 'PENDING' && hasStarted)) {
    lifecycleStatus = 'EXPIRED';
  } else if (spaceStatus === 'PENDING') {
    lifecycleStatus = 'PENDING_APPROVAL';
  } else {
    // spaceStatus === 'APPROVED'
    if (!hasStarted) {
      lifecycleStatus = 'SCHEDULED';
    } else if (nowMs >= startMs && nowMs < endMs) {
      lifecycleStatus = 'IN_PROGRESS';
    } else {
      // Event has ended (nowMs >= endMs)
      if (closureEvidencesCount > 0) {
        lifecycleStatus = 'CLOSED';
      } else {
        lifecycleStatus = 'COMPLETED_PENDING_EVIDENCE';
      }
    }
  }

  const meta = getLifecycleMeta(lifecycleStatus);

  // Documentary state (independent concept, Section 4 & 6)
  let documentaryStatus: 'NOT_APPLICABLE' | 'PENDING_CLOSURE_PDF' | 'CLOSED_WITH_PDF' =
    'NOT_APPLICABLE';
  let documentaryLabel = 'En espera de conclusión del evento';

  if (spaceStatus === 'REJECTED' || lifecycleStatus === 'EXPIRED') {
    documentaryStatus = 'NOT_APPLICABLE';
    documentaryLabel = 'No aplica (evento no realizado)';
  } else if (closureEvidencesCount > 0 && hasEnded && spaceStatus === 'APPROVED') {
    documentaryStatus = 'CLOSED_WITH_PDF';
    documentaryLabel = `Cerrado con evidencia PDF (${closureEvidencesCount})`;
  } else if (hasEnded && spaceStatus === 'APPROVED') {
    documentaryStatus = 'PENDING_CLOSURE_PDF';
    documentaryLabel = 'Pendiente de evidencia PDF de cierre';
  } else if (supportingEvidencesCount > 0) {
    documentaryLabel = `${supportingEvidencesCount} doc(s) de soporte previos (cierre al concluir)`;
  }

  // Attendance control state (independent from documentary closure, Section 19)
  let attendanceControlStatus:
    | 'NOT_CONFIGURED'
    | 'AWAITING_OPEN'
    | 'OPEN_CHECKIN'
    | 'CLOSED_CHECKIN' = 'NOT_CONFIGURED';
  let attendanceControlLabel = 'Sin configurar';

  if (event.attendanceConfig) {
    if (event.attendanceConfig.checkInOpen) {
      attendanceControlStatus = 'OPEN_CHECKIN';
      attendanceControlLabel = 'Acceso / Escaneo Abierto';
    } else if (event.attendanceConfig.checkInClosedAt) {
      attendanceControlStatus = 'CLOSED_CHECKIN';
      attendanceControlLabel = 'Control de Acceso Cerrado';
    } else {
      attendanceControlStatus = 'AWAITING_OPEN';
      attendanceControlLabel = `Configurado (${
        event.attendanceConfig.accessMode === 'OPEN' ? 'Abierto' : 'Restringido'
      }) · Escaneo en espera`;
    }
  }

  // Schedule modification rule (Section 5: only before scheduled start time)
  let canModifySchedule = false;
  let scheduleModificationBlockReason: string | null = null;

  if (spaceStatus !== 'APPROVED') {
    scheduleModificationBlockReason =
      'Solo los eventos con solicitud de espacio APROBADA pueden solicitar modificación de horario.';
  } else if (hasEnded) {
    scheduleModificationBlockReason =
      'El evento ya concluyó. No se permiten cambios de fecha ni horario en eventos concluidos.';
  } else if (hasStarted) {
    scheduleModificationBlockReason =
      'El evento ya inició. Por regla institucional, los cambios de fecha u horario están bloqueados una vez alcanzada la hora programada de inicio.';
  } else {
    canModifySchedule = true;
  }

  const canCloseWithEvidence = spaceStatus === 'APPROVED' && hasEnded;

  return {
    lifecycleStatus,
    lifecycleLabel: meta.label,
    documentaryStatus,
    documentaryLabel,
    attendanceControlStatus,
    attendanceControlLabel,
    hasStarted,
    hasEnded,
    canModifySchedule,
    scheduleModificationBlockReason,
    canCloseWithEvidence,
    supportingEvidencesCount,
    closureEvidencesCount,
    startAtIso: startAt.toISOString(),
    endAtIso: endAt.toISOString(),
  };
}

/**
 * Enriches an event object with computed lifecycle properties.
 */
export function attachEventLifecycle<
  T extends {
    date: string;
    startTime: string;
    endTime: string;
    closedAt?: Date | string | null;
    spaceRequest?: { status: string } | null;
    evidences?: { category?: string; isArchived?: boolean }[] | null;
    attendanceConfig?: {
      accessMode?: string;
      checkInOpen?: boolean;
      checkInClosedAt?: Date | string | null;
    } | null;
  }
>(event: T, referenceDate: Date = new Date()) {
  const lifecycle = computeEventLifecycleState(event, referenceDate);
  return {
    ...event,
    lifecycle,
    lifecycleStatus: lifecycle.lifecycleStatus,
    lifecycleLabel: lifecycle.lifecycleLabel,
  };
}

/**
 * Checks whether an event matches a quick filter from Section 7:
 * ALL | PENDING_APPROVAL | SCHEDULED | IN_PROGRESS | CONCLUDED | COMPLETED_PENDING_EVIDENCE | CLOSED | REJECTED | EXPIRED
 * Note: CONCLUDED groups COMPLETED_PENDING_EVIDENCE and CLOSED (Section 7).
 */
export function matchesLifecycleFilter(
  lifecycleStatus: EventLifecycleStatus,
  filterValue: string
): boolean {
  if (!filterValue || filterValue === 'ALL') return true;
  if (filterValue === 'CONCLUDED') {
    return (
      lifecycleStatus === 'COMPLETED_PENDING_EVIDENCE' || lifecycleStatus === 'CLOSED'
    );
  }
  return lifecycleStatus === filterValue;
}

/**
 * Safe automatic synchronization of overdue pending SpaceRequests and overdue pending ScheduleChangeRequests.
 * - Section 4.2 & 4.3: When start time arrives without SpaceRequest authorization, mark EXPIRED,
 *   release provisional reservation, notify creator, and log audit.
 * - Section 5: When original start time arrives while a ScheduleChangeRequest is PENDING, mark it EXPIRED,
 *   keep original reservation intact, release proposed reservation, notify requester, and log audit.
 */
export async function syncExpiredRequestsAndChanges(referenceDate: Date = new Date()): Promise<void> {
  const nowMs = referenceDate.getTime();

  try {
    // 1. Check pending SpaceRequests
    const pendingSpaceRequests = await prisma.spaceRequest.findMany({
      where: { status: 'PENDING' },
      include: {
        event: true,
        space: true,
      },
    });

    for (const spReq of pendingSpaceRequests) {
      const startAt = parseMonterreyDateTime(spReq.event.date, spReq.event.startTime);
      if (nowMs >= startAt.getTime()) {
        await prisma.$transaction(async (tx) => {
          const fresh = await tx.spaceRequest.findUnique({ where: { id: spReq.id } });
          if (!fresh || fresh.status !== 'PENDING') return;

          const reason =
            'Solicitud vencida automáticamente: la fecha y hora programada de inicio llegaron sin haberse emitido autorización del espacio.';

          await tx.spaceRequest.update({
            where: { id: spReq.id },
            data: {
              status: 'EXPIRED',
              rejectionReason: reason,
              resolvedAt: referenceDate,
            },
          });

          await tx.reservation.updateMany({
            where: {
              eventId: spReq.eventId,
              reservationType: 'ORIGINAL',
              status: 'PROVISIONAL',
            },
            data: {
              status: 'RELEASED',
            },
          });

          await tx.notification.create({
            data: {
              userId: spReq.event.createdById,
              eventId: spReq.eventId,
              type: 'SPACE_EXPIRED',
              title: `Solicitud de espacio vencida: ${spReq.event.name}`,
              message: `La solicitud para "${spReq.space.name}" (${spReq.event.date} ${spReq.event.startTime}) venció porque llegó la hora de inicio sin recibir autorización. El bloqueo provisional fue liberado.`,
              link: `/eventos/${spReq.eventId}`,
            },
          });

          await tx.auditLog.create({
            data: {
              userId: spReq.authorizerId,
              eventId: spReq.eventId,
              action: 'SPACE_REQUEST_EXPIRED',
              entityType: 'SpaceRequest',
              entityId: spReq.id,
              summary: `Solicitud de espacio en "${spReq.space.name}" marcada como VENCIDA (EXPIRED) al alcanzarse la hora de inicio (${spReq.event.date} ${spReq.event.startTime}) sin autorización. Bloqueo provisional liberado.`,
              reason,
              previousData: JSON.stringify({ status: 'PENDING' }),
              newData: JSON.stringify({ status: 'EXPIRED', releasedProvisional: true }),
            },
          });
        });
      }
    }

    // 2. Check pending ScheduleChangeRequests (Section 5)
    const pendingChanges = await prisma.scheduleChangeRequest.findMany({
      where: { status: 'PENDING' },
      include: {
        event: true,
        space: true,
        reservation: true,
      },
    });

    for (const chg of pendingChanges) {
      const originalStartAt = parseMonterreyDateTime(chg.originalDate, chg.originalStartTime);
      if (nowMs >= originalStartAt.getTime()) {
        await prisma.$transaction(async (tx) => {
          const fresh = await tx.scheduleChangeRequest.findUnique({ where: { id: chg.id } });
          if (!fresh || fresh.status !== 'PENDING') return;

          const reason =
            'Modificación de horario vencida automáticamente: llegó la fecha y hora de inicio original del evento sin recibir autorización. Se conserva el horario original y se libera el horario propuesto.';

          await tx.scheduleChangeRequest.update({
            where: { id: chg.id },
            data: {
              status: 'EXPIRED',
              rejectionReason: reason,
              resolvedAt: referenceDate,
            },
          });

          if (chg.reservation) {
            await tx.reservation.update({
              where: { id: chg.reservation.id },
              data: {
                status: 'RELEASED',
              },
            });
          } else {
            await tx.reservation.updateMany({
              where: {
                scheduleChangeRequestId: chg.id,
                reservationType: 'SCHEDULE_CHANGE',
                status: 'PROVISIONAL',
              },
              data: {
                status: 'RELEASED',
              },
            });
          }

          await tx.notification.create({
            data: {
              userId: chg.requestedById,
              eventId: chg.eventId,
              type: 'SCHEDULE_CHANGE_EXPIRED',
              title: `Modificación de horario vencida: ${chg.event.name}`,
              message: `La solicitud para cambiar el horario a ${chg.proposedDate} (${chg.proposedStartTime}-${chg.proposedEndTime}) expiró al llegar la hora de inicio original (${chg.originalDate} ${chg.originalStartTime}). El horario original se conserva.`,
              link: `/eventos/${chg.eventId}`,
            },
          });

          await tx.auditLog.create({
            data: {
              userId: chg.requestedById,
              eventId: chg.eventId,
              action: 'SCHEDULE_CHANGE_EXPIRED',
              entityType: 'ScheduleChangeRequest',
              entityId: chg.id,
              summary: `Modificación de horario marcada como VENCIDA (EXPIRED) al llegar la hora de inicio original (${chg.originalDate} ${chg.originalStartTime}). Se conserva la reservación original y se libera el horario propuesto (${chg.proposedDate} ${chg.proposedStartTime}-${chg.proposedEndTime}).`,
              reason,
              previousData: JSON.stringify({
                status: 'PENDING',
                proposedDate: chg.proposedDate,
                proposedStartTime: chg.proposedStartTime,
                proposedEndTime: chg.proposedEndTime,
              }),
              newData: JSON.stringify({
                status: 'EXPIRED',
                keptOriginalDate: chg.originalDate,
                keptOriginalStartTime: chg.originalStartTime,
                keptOriginalEndTime: chg.originalEndTime,
              }),
            },
          });
        });
      }
    }
  } catch (err) {
    console.error('Error syncing expired requests:', err);
  }
}

