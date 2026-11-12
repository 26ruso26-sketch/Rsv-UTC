import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { formatDateKey } from '@/lib/utils';
import { attachEventLifecycle, syncExpiredRequestsAndChanges } from '@/lib/lifecycle';

const ALLOWED_DASHBOARD_ROLES = ['SUPER_ADMIN', 'DIRECTOR', 'EXTENSION'];

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    if (!ALLOWED_DASHBOARD_ROLES.includes(user.role)) {
      return NextResponse.json(
        { error: 'No tiene permisos para consultar los indicadores del dashboard.' },
        { status: 403 }
      );
    }

    await syncExpiredRequestsAndChanges();

    const today = formatDateKey(new Date());
    const now = new Date();

  const [
    allEvents,
    pendingSpaceRequests,
    pendingEquipmentRequests,
    pendingScheduleChanges,
    unreadNotifications,
  ] = await Promise.all([
    prisma.event.findMany({
      include: {
        space: {
          include: {
            building: { select: { id: true, name: true, code: true } },
            authorizer: { select: { id: true, username: true, fullName: true } },
          },
        },
        createdBy: {
          select: { id: true, username: true, fullName: true, role: true, departmentLabel: true },
        },
        closedBy: {
          select: { id: true, username: true, fullName: true },
        },
        audiences: {
          include: { audienceType: true },
        },
        spaceRequest: true,
        equipmentRequest: {
          include: { items: { include: { equipmentType: true } } },
        },
        evidences: {
          select: {
            id: true,
            fileName: true,
            category: true,
            isArchived: true,
            uploadedAt: true,
          },
        },
        attendanceConfig: true,
        attendees: {
          select: {
            id: true,
            attendeeType: true,
            registrationStatus: true,
            career: { select: { id: true, code: true, name: true } },
            academicGrade: { select: { id: true, code: true, name: true } },
            departmentArea: { select: { id: true, code: true, name: true, areaType: true } },
            attendance: {
              select: {
                id: true,
                checkedInAt: true,
                registrationMethod: true,
              },
            },
          },
        },
        accessOperators: {
          select: { userId: true, active: true },
        },
      },
      orderBy: [{ date: 'asc' }, { startMinutes: 'asc' }],
    }),
    prisma.spaceRequest.findMany({
      where: {
        status: 'PENDING',
        ...(user.role === 'SUPER_ADMIN' ? {} : { authorizerId: user.id }),
      },
      include: {
        event: {
          include: {
            space: true,
            createdBy: { select: { id: true, username: true, fullName: true } },
          },
        },
      },
      orderBy: { requestedAt: 'asc' },
    }),
    prisma.equipmentRequest.findMany({
      where: {
        status: 'PENDING',
        ...(user.role === 'SUPER_ADMIN'
          ? {}
          : user.role === 'EXTENSION'
          ? {}
          : { id: '__none__' }),
      },
      include: {
        items: { include: { equipmentType: true } },
        event: {
          include: {
            space: true,
            createdBy: { select: { id: true, username: true, fullName: true } },
          },
        },
      },
      orderBy: { requestedAt: 'asc' },
    }),
    prisma.scheduleChangeRequest.findMany({
      where: {
        status: 'PENDING',
        ...(user.role === 'SUPER_ADMIN' ? {} : { authorizerId: user.id }),
      },
      include: {
        event: {
          include: {
            space: true,
            createdBy: { select: { id: true, username: true, fullName: true } },
          },
        },
      },
      orderBy: { requestedAt: 'asc' },
    }),
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 15,
    }),
  ]);

  // Scope events visible to the current role
  const scopedRawEvents = allEvents.filter((ev) => {
    if (user.role === 'SUPER_ADMIN') return true;
    if (ev.createdById === user.id) return true;
    if (ev.space.authorizerUserId === user.id) return true;
    if (user.role === 'EXTENSION' && ev.equipmentRequest) return true;
    if (ev.accessOperators.some((op) => op.userId === user.id && op.active)) return true;
    return false;
  });

  const enrichedEvents = scopedRawEvents.map((ev) => attachEventLifecycle(ev, now));

  const todayEvents = enrichedEvents.filter((ev) => ev.date === today);
  const upcomingEvents = enrichedEvents
    .filter((ev) => ev.date >= today && ev.spaceRequest?.status !== 'REJECTED')
    .slice(0, 8);
  const myRecentEvents = enrichedEvents
    .filter((ev) => ev.createdById === user.id)
    .slice(-6)
    .reverse();

  // Contadores de Ciclo de Vida (Sección 4 y 7)
  const lifecycleCounts = {
    PENDING_APPROVAL: enrichedEvents.filter((e) => e.lifecycleStatus === 'PENDING_APPROVAL').length,
    SCHEDULED: enrichedEvents.filter((e) => e.lifecycleStatus === 'SCHEDULED').length,
    IN_PROGRESS: enrichedEvents.filter((e) => e.lifecycleStatus === 'IN_PROGRESS').length,
    COMPLETED_PENDING_EVIDENCE: enrichedEvents.filter(
      (e) => e.lifecycleStatus === 'COMPLETED_PENDING_EVIDENCE'
    ).length,
    CLOSED: enrichedEvents.filter((e) => e.lifecycleStatus === 'CLOSED').length,
    REJECTED: enrichedEvents.filter((e) => e.lifecycleStatus === 'REJECTED').length,
    EXPIRED: enrichedEvents.filter((e) => e.lifecycleStatus === 'EXPIRED').length,
  };

  // Métricas Globales de Asistencia y Participación (Sección 21)
  let totalRegisteredActive = 0;
  let totalRevoked = 0;
  let totalCheckedIn = 0;
  let totalCapacityWithAttendance = 0;
  let eventsWithAttendanceCount = 0;
  let openEventsCount = 0;
  let restrictedEventsCount = 0;

  const byAttendeeType: Record<string, { registered: number; checkedIn: number }> = {
    STUDENT: { registered: 0, checkedIn: 0 },
    TEACHER: { registered: 0, checkedIn: 0 },
    ADMIN_STAFF: { registered: 0, checkedIn: 0 },
    EXTERNAL_GUEST: { registered: 0, checkedIn: 0 },
  };

  const careerStatsMap: Record<string, { name: string; registered: number; checkedIn: number }> = {};

  for (const ev of enrichedEvents) {
    if (ev.attendanceConfig?.accessMode === 'OPEN') {
      openEventsCount++;
    } else {
      restrictedEventsCount++;
    }

    const activeAttendees = ev.attendees.filter((a) => a.registrationStatus !== 'REVOKED');
    const revokedAttendees = ev.attendees.filter((a) => a.registrationStatus === 'REVOKED');
    const checkedInAttendees = activeAttendees.filter((a) => Boolean(a.attendance));

    totalRegisteredActive += activeAttendees.length;
    totalRevoked += revokedAttendees.length;
    totalCheckedIn += checkedInAttendees.length;

    if (activeAttendees.length > 0) {
      eventsWithAttendanceCount++;
      totalCapacityWithAttendance += ev.space.capacity;
    }

    for (const att of activeAttendees) {
      const t = att.attendeeType in byAttendeeType ? att.attendeeType : 'EXTERNAL_GUEST';
      byAttendeeType[t].registered++;
      if (att.attendance) {
        byAttendeeType[t].checkedIn++;
      }

      if (att.attendeeType === 'STUDENT' && att.career) {
        if (!careerStatsMap[att.career.code]) {
          careerStatsMap[att.career.code] = {
            name: att.career.name,
            registered: 0,
            checkedIn: 0,
          };
        }
        careerStatsMap[att.career.code].registered++;
        if (att.attendance) {
          careerStatsMap[att.career.code].checkedIn++;
        }
      }
    }
  }

  const globalAttendancePct =
    totalRegisteredActive > 0
      ? Math.round((totalCheckedIn / totalRegisteredActive) * 1000) / 10
      : 0;
  const globalOccupancyPct =
    totalCapacityWithAttendance > 0
      ? Math.round((totalCheckedIn / totalCapacityWithAttendance) * 1000) / 10
      : 0;

  return NextResponse.json({
    stats: {
      totalEvents: enrichedEvents.length,
      approvedEvents: enrichedEvents.filter((e) => e.spaceRequest?.status === 'APPROVED').length,
      pendingEvents: enrichedEvents.filter((e) => e.spaceRequest?.status === 'PENDING').length,
      rejectedEvents: enrichedEvents.filter((e) => e.spaceRequest?.status === 'REJECTED').length,
      expiredEvents: lifecycleCounts.EXPIRED,
      pendingEvidenceClosureCount: lifecycleCounts.COMPLETED_PENDING_EVIDENCE,
      closedEventsCount: lifecycleCounts.CLOSED,
      inProgressEventsCount: lifecycleCounts.IN_PROGRESS,
      scheduledEventsCount: lifecycleCounts.SCHEDULED,
      todayEventsCount: todayEvents.length,
      pendingAuthorizationsForMe:
        pendingSpaceRequests.length +
        pendingEquipmentRequests.length +
        pendingScheduleChanges.length,
      pendingSpaceForMe: pendingSpaceRequests.length,
      pendingEquipmentForMe: pendingEquipmentRequests.length,
      pendingScheduleForMe: pendingScheduleChanges.length,
      lifecycleCounts,
      attendanceSummary: {
        totalRegisteredActive,
        totalRevoked,
        totalCheckedIn,
        totalPendingCheckIn: Math.max(0, totalRegisteredActive - totalCheckedIn),
        globalAttendancePct,
        globalOccupancyPct,
        eventsWithAttendanceCount,
        openEventsCount,
        restrictedEventsCount,
        byAttendeeType,
        topCareers: Object.values(careerStatsMap).sort((a, b) => b.checkedIn - a.checkedIn),
      },
    },
    todayEvents,
    upcomingEvents,
    myRecentEvents,
    pendingSpaceRequests: pendingSpaceRequests.slice(0, 6),
    pendingEquipmentRequests: pendingEquipmentRequests.slice(0, 6),
    pendingScheduleChanges: pendingScheduleChanges.slice(0, 6),
    notifications: unreadNotifications,
  });
  } catch (error) {
    console.error('[API /api/dashboard] Error al cargar indicadores:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al consultar los indicadores del dashboard.' },
      { status: 500 }
    );
  }
}
