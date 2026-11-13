import { prisma } from '@/lib/prisma';
import { attachEventLifecycle, syncExpiredRequestsAndChanges } from '@/lib/lifecycle';
import { SessionUser } from '@/types';

/**
 * Servicio compartido de reportes.
 *
 * Centraliza los filtros y el cálculo de métricas para que la vista JSON
 * (/api/reports), la exportación de archivos (/api/reports/export) y la vista
 * imprimible de la plantilla institucional usen exactamente los mismos datos.
 */

export interface ReportFilters {
  startDate: string;
  endDate: string;
  spaceId: string;
  buildingId: string;
  lifecycle: string;
  careerId: string;
  academicGradeId: string;
  departmentAreaId: string;
  attendeeType: string;
  accessMode: string;
}

export function parseReportFilters(searchParams: URLSearchParams): ReportFilters {
  return {
    startDate: searchParams.get('startDate') || '',
    endDate: searchParams.get('endDate') || '',
    spaceId: searchParams.get('spaceId') || 'ALL',
    buildingId: searchParams.get('buildingId') || 'ALL',
    lifecycle: searchParams.get('lifecycle') || 'ALL',
    careerId: searchParams.get('careerId') || 'ALL',
    academicGradeId: searchParams.get('academicGradeId') || 'ALL',
    departmentAreaId: searchParams.get('departmentAreaId') || 'ALL',
    attendeeType: searchParams.get('attendeeType') || 'ALL',
    accessMode: searchParams.get('accessMode') || 'ALL',
  };
}

export async function buildReportData(user: SessionUser, filters: ReportFilters) {
  await syncExpiredRequestsAndChanges();

  const {
    startDate,
    endDate,
    spaceId,
    buildingId,
    lifecycle: lifecycleFilter,
    careerId,
    academicGradeId,
    departmentAreaId,
    attendeeType: attendeeTypeFilter,
    accessMode: accessModeFilter,
  } = filters;

  const events = await prisma.event.findMany({
    where: {
      ...(startDate && endDate
        ? { date: { gte: startDate, lte: endDate } }
        : startDate
          ? { date: { gte: startDate } }
          : endDate
            ? { date: { lte: endDate } }
            : {}),
      ...(spaceId !== 'ALL' ? { spaceId } : {}),
      ...(buildingId !== 'ALL' ? { space: { buildingId } } : {}),
    },
    include: {
      space: {
        include: {
          building: { select: { id: true, name: true, code: true } },
          authorizer: { select: { id: true, username: true, fullName: true, role: true } },
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
      spaceRequest: {
        include: {
          authorizer: { select: { id: true, username: true, fullName: true } },
        },
      },
      equipmentRequest: {
        include: {
          items: { include: { equipmentType: true } },
          authorizer: { select: { id: true, username: true, fullName: true } },
        },
      },
      scheduleChangeRequests: true,
      evidences: {
        select: {
          id: true,
          fileName: true,
          fileSize: true,
          category: true,
          isArchived: true,
          uploadedAt: true,
        },
      },
      attendanceConfig: true,
      attendees: {
        include: {
          career: true,
          academicGrade: true,
          departmentArea: true,
          qrCredentials: {
            orderBy: { createdAt: 'desc' },
            select: { id: true, isActive: true, revokedAt: true },
          },
          attendance: {
            include: {
              checkedInBy: { select: { id: true, username: true, fullName: true } },
            },
          },
          invitationDeliveries: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      },
      scanLogs: {
        orderBy: { attemptedAt: 'desc' },
        take: 100,
        include: {
          operator: { select: { id: true, username: true, fullName: true } },
        },
      },
      accessOperators: {
        select: { userId: true, active: true },
      },
    },
    orderBy: [{ date: 'desc' }, { startMinutes: 'asc' }],
  });

  // Scope visibility by role
  const roleScoped = events.filter((ev) => {
    if (user.role === 'SUPER_ADMIN') return true;
    if (ev.createdById === user.id) return true;
    if (ev.space.authorizerUserId === user.id) return true;
    if (user.role === 'EXTENSION' && ev.equipmentRequest) return true;
    if (ev.accessOperators.some((op) => op.userId === user.id && op.active)) return true;
    return false;
  });

  const now = new Date();
  const enrichedAll = roleScoped.map((ev) => attachEventLifecycle(ev, now));

  const filteredEvents = enrichedAll.filter((ev) => {
    if (lifecycleFilter !== 'ALL') {
      if (lifecycleFilter === 'CONCLUDED') {
        if (
          ev.lifecycleStatus !== 'COMPLETED_PENDING_EVIDENCE' &&
          ev.lifecycleStatus !== 'CLOSED'
        ) {
          return false;
        }
      } else if (ev.lifecycleStatus !== lifecycleFilter) {
        return false;
      }
    }

    if (accessModeFilter !== 'ALL') {
      const mode = ev.attendanceConfig?.accessMode || 'RESTRICTED';
      if (mode !== accessModeFilter) return false;
    }

    return true;
  });

  // Per-event metrics and global aggregations (Sections 21 & 22)
  const bySpace: Record<
    string,
    {
      spaceName: string;
      buildingName: string;
      capacity: number;
      total: number;
      approved: number;
      pending: number;
      rejected: number;
      closed: number;
      pendingEvidence: number;
      registeredAttendees: number;
      checkedInAttendees: number;
    }
  > = {};

  const byBuilding: Record<
    string,
    {
      buildingName: string;
      totalEvents: number;
      approvedEvents: number;
      closedEvents: number;
      pendingEvidenceEvents: number;
      registeredAttendees: number;
      checkedInAttendees: number;
    }
  > = {};

  const byCareer: Record<
    string,
    { code: string; name: string; registered: number; checkedIn: number; attendancePct: number }
  > = {};

  const byAcademicGrade: Record<
    string,
    { code: string; name: string; levelOrder: number; registered: number; checkedIn: number; attendancePct: number }
  > = {};

  const byDepartmentArea: Record<
    string,
    { code: string; name: string; areaType: string; registered: number; checkedIn: number; attendancePct: number }
  > = {};

  const byAttendeeType: Record<
    string,
    { type: string; label: string; registered: number; checkedIn: number; qrMethod: number; manualMethod: number }
  > = {
    STUDENT: { type: 'STUDENT', label: 'Alumnos', registered: 0, checkedIn: 0, qrMethod: 0, manualMethod: 0 },
    TEACHER: { type: 'TEACHER', label: 'Docentes', registered: 0, checkedIn: 0, qrMethod: 0, manualMethod: 0 },
    ADMIN_STAFF: {
      type: 'ADMIN_STAFF',
      label: 'Personal Administrativo',
      registered: 0,
      checkedIn: 0,
      qrMethod: 0,
      manualMethod: 0,
    },
    EXTERNAL_GUEST: {
      type: 'EXTERNAL_GUEST',
      label: 'Invitados Externos',
      registered: 0,
      checkedIn: 0,
      qrMethod: 0,
      manualMethod: 0,
    },
  };

  const byCheckInHour: Record<string, number> = {};

  let totalRegisteredActive = 0;
  let totalRevoked = 0;
  let totalQrGenerated = 0;
  let totalInvitationsSent = 0;
  let totalInvitationsFailed = 0;
  let totalInvitationsPending = 0;
  let totalCheckedIn = 0;
  let totalCheckedInQr = 0;
  let totalCheckedInManual = 0;
  let totalScanAttempts = 0;
  let totalScanRejected = 0;
  let totalCapacitySum = 0;

  const eventRows = filteredEvents.map((ev) => {
    // Filter attendees inside the event by optional report filters
    const matchingAttendees = ev.attendees.filter((att) => {
      if (attendeeTypeFilter !== 'ALL' && att.attendeeType !== attendeeTypeFilter) return false;
      if (careerId !== 'ALL' && att.careerId !== careerId) return false;
      if (academicGradeId !== 'ALL' && att.academicGradeId !== academicGradeId) return false;
      if (departmentAreaId !== 'ALL' && att.departmentAreaId !== departmentAreaId) return false;
      return true;
    });

    const activeAttendees = matchingAttendees.filter((a) => a.registrationStatus !== 'REVOKED');
    const revokedAttendees = matchingAttendees.filter((a) => a.registrationStatus === 'REVOKED');
    const checkedInAttendees = activeAttendees.filter((a) => Boolean(a.attendance));
    const qrGenerated = activeAttendees.filter((a) =>
      a.qrCredentials.some((q) => q.isActive && !q.revokedAt)
    ).length;

    let sentCount = 0;
    let failedCount = 0;
    let pendingInvCount = 0;

    for (const att of activeAttendees) {
      const latestInv = att.invitationDeliveries[0];
      if (!latestInv || latestInv.status === 'PENDING') pendingInvCount++;
      else if (latestInv.status === 'SENT') sentCount++;
      else if (latestInv.status === 'FAILED') failedCount++;

      // Global breakdowns
      const typeBucket = byAttendeeType[att.attendeeType] || byAttendeeType.EXTERNAL_GUEST;
      typeBucket.registered++;
      if (att.attendance) {
        typeBucket.checkedIn++;
        if (att.attendance.registrationMethod === 'QR') {
          typeBucket.qrMethod++;
          totalCheckedInQr++;
        } else {
          typeBucket.manualMethod++;
          totalCheckedInManual++;
        }

        const dt = new Date(att.attendance.checkedInAt);
        const hourLabel = `${String(dt.getHours()).padStart(2, '0')}:00`;
        byCheckInHour[hourLabel] = (byCheckInHour[hourLabel] || 0) + 1;
      }

      if (att.attendeeType === 'STUDENT' && att.career) {
        if (!byCareer[att.career.id]) {
          byCareer[att.career.id] = {
            code: att.career.code,
            name: att.career.name,
            registered: 0,
            checkedIn: 0,
            attendancePct: 0,
          };
        }
        byCareer[att.career.id].registered++;
        if (att.attendance) byCareer[att.career.id].checkedIn++;
      }

      if (att.attendeeType === 'STUDENT' && att.academicGrade) {
        if (!byAcademicGrade[att.academicGrade.id]) {
          byAcademicGrade[att.academicGrade.id] = {
            code: att.academicGrade.code,
            name: att.academicGrade.name,
            levelOrder: att.academicGrade.levelOrder,
            registered: 0,
            checkedIn: 0,
            attendancePct: 0,
          };
        }
        byAcademicGrade[att.academicGrade.id].registered++;
        if (att.attendance) byAcademicGrade[att.academicGrade.id].checkedIn++;
      }

      if (att.departmentArea) {
        if (!byDepartmentArea[att.departmentArea.id]) {
          byDepartmentArea[att.departmentArea.id] = {
            code: att.departmentArea.code,
            name: att.departmentArea.name,
            areaType: att.departmentArea.areaType,
            registered: 0,
            checkedIn: 0,
            attendancePct: 0,
          };
        }
        byDepartmentArea[att.departmentArea.id].registered++;
        if (att.attendance) byDepartmentArea[att.departmentArea.id].checkedIn++;
      }
    }

    const rejectedScans = ev.scanLogs.filter((l) => l.result !== 'AUTHORIZED').length;
    totalScanAttempts += ev.scanLogs.length;
    totalScanRejected += rejectedScans;

    totalRegisteredActive += activeAttendees.length;
    totalRevoked += revokedAttendees.length;
    totalQrGenerated += qrGenerated;
    totalInvitationsSent += sentCount;
    totalInvitationsFailed += failedCount;
    totalInvitationsPending += pendingInvCount;
    totalCheckedIn += checkedInAttendees.length;
    if (activeAttendees.length > 0) {
      totalCapacitySum += ev.space.capacity;
    }

    const attendancePct =
      activeAttendees.length > 0
        ? Math.round((checkedInAttendees.length / activeAttendees.length) * 1000) / 10
        : 0;
    const occupancyPct =
      ev.space.capacity > 0
        ? Math.round((checkedInAttendees.length / ev.space.capacity) * 1000) / 10
        : 0;

    // Aggregate by space
    if (!bySpace[ev.space.id]) {
      bySpace[ev.space.id] = {
        spaceName: ev.space.name,
        buildingName: ev.space.building?.name || 'Extensión Universitaria / Áreas Abiertas',
        capacity: ev.space.capacity,
        total: 0,
        approved: 0,
        pending: 0,
        rejected: 0,
        closed: 0,
        pendingEvidence: 0,
        registeredAttendees: 0,
        checkedInAttendees: 0,
      };
    }
    bySpace[ev.space.id].total++;
    if (ev.spaceRequest?.status === 'APPROVED') bySpace[ev.space.id].approved++;
    if (ev.spaceRequest?.status === 'PENDING') bySpace[ev.space.id].pending++;
    if (ev.spaceRequest?.status === 'REJECTED') bySpace[ev.space.id].rejected++;
    if (ev.lifecycleStatus === 'CLOSED') bySpace[ev.space.id].closed++;
    if (ev.lifecycleStatus === 'COMPLETED_PENDING_EVIDENCE') {
      bySpace[ev.space.id].pendingEvidence++;
    }
    bySpace[ev.space.id].registeredAttendees += activeAttendees.length;
    bySpace[ev.space.id].checkedInAttendees += checkedInAttendees.length;

    // Aggregate by building
    const bKey = ev.space.building?.id || 'EXTENSION_ABIERTOS';
    const bName = ev.space.building?.name || 'Extensión Universitaria y Canchas/Explanada';
    if (!byBuilding[bKey]) {
      byBuilding[bKey] = {
        buildingName: bName,
        totalEvents: 0,
        approvedEvents: 0,
        closedEvents: 0,
        pendingEvidenceEvents: 0,
        registeredAttendees: 0,
        checkedInAttendees: 0,
      };
    }
    byBuilding[bKey].totalEvents++;
    if (ev.spaceRequest?.status === 'APPROVED') byBuilding[bKey].approvedEvents++;
    if (ev.lifecycleStatus === 'CLOSED') byBuilding[bKey].closedEvents++;
    if (ev.lifecycleStatus === 'COMPLETED_PENDING_EVIDENCE') {
      byBuilding[bKey].pendingEvidenceEvents++;
    }
    byBuilding[bKey].registeredAttendees += activeAttendees.length;
    byBuilding[bKey].checkedInAttendees += checkedInAttendees.length;

    return {
      ...ev,
      attendanceStats: {
        accessMode: ev.attendanceConfig?.accessMode || 'RESTRICTED',
        checkInOpen: ev.attendanceConfig?.checkInOpen ?? false,
        checkInClosedAt: ev.attendanceConfig?.checkInClosedAt ?? null,
        registeredActive: activeAttendees.length,
        revoked: revokedAttendees.length,
        qrGenerated,
        invitationsSent: sentCount,
        invitationsFailed: failedCount,
        invitationsPending: pendingInvCount,
        checkedIn: checkedInAttendees.length,
        pendingCheckIn: Math.max(0, activeAttendees.length - checkedInAttendees.length),
        attendancePct,
        spaceCapacity: ev.space.capacity,
        occupancyPct,
        rejectedScans,
      },
      filteredAttendees: matchingAttendees.map((a) => ({
        id: a.id,
        fullName: a.fullName,
        email: a.email,
        attendeeType: a.attendeeType,
        enrollmentNumber: a.enrollmentNumber,
        careerName: a.career?.name || null,
        academicGradeName: a.academicGrade?.name || null,
        departmentAreaName: a.departmentArea?.name || null,
        organization: a.organization || null,
        registrationStatus: a.registrationStatus,
        checkedInAt: a.attendance?.checkedInAt || null,
        checkInMethod: a.attendance?.registrationMethod || null,
        checkedInByName: a.attendance?.checkedInBy?.fullName || null,
        invitationStatus: a.invitationDeliveries[0]?.status || 'PENDING',
      })),
    };
  });

  // Finalize percentages in career, grade, department maps
  for (const item of Object.values(byCareer)) {
    item.attendancePct =
      item.registered > 0 ? Math.round((item.checkedIn / item.registered) * 1000) / 10 : 0;
  }
  for (const item of Object.values(byAcademicGrade)) {
    item.attendancePct =
      item.registered > 0 ? Math.round((item.checkedIn / item.registered) * 1000) / 10 : 0;
  }
  for (const item of Object.values(byDepartmentArea)) {
    item.attendancePct =
      item.registered > 0 ? Math.round((item.checkedIn / item.registered) * 1000) / 10 : 0;
  }

  const globalAttendancePct =
    totalRegisteredActive > 0
      ? Math.round((totalCheckedIn / totalRegisteredActive) * 1000) / 10
      : 0;
  const globalOccupancyPct =
    totalCapacitySum > 0 ? Math.round((totalCheckedIn / totalCapacitySum) * 1000) / 10 : 0;


  return {
    summary: {
      totalEvents: eventRows.length,
      pendingApproval: eventRows.filter((e) => e.lifecycleStatus === 'PENDING_APPROVAL').length,
      scheduled: eventRows.filter((e) => e.lifecycleStatus === 'SCHEDULED').length,
      inProgress: eventRows.filter((e) => e.lifecycleStatus === 'IN_PROGRESS').length,
      completedPendingEvidence: eventRows.filter(
        (e) => e.lifecycleStatus === 'COMPLETED_PENDING_EVIDENCE'
      ).length,
      closed: eventRows.filter((e) => e.lifecycleStatus === 'CLOSED').length,
      rejected: eventRows.filter((e) => e.lifecycleStatus === 'REJECTED').length,
      expired: eventRows.filter((e) => e.lifecycleStatus === 'EXPIRED').length,
      openEvents: eventRows.filter((e) => e.attendanceConfig?.accessMode === 'OPEN').length,
      restrictedEvents: eventRows.filter(
        (e) => (e.attendanceConfig?.accessMode || 'RESTRICTED') === 'RESTRICTED'
      ).length,
      totalRegisteredActive,
      totalRevoked,
      totalQrGenerated,
      totalInvitationsSent,
      totalInvitationsFailed,
      totalInvitationsPending,
      totalCheckedIn,
      totalCheckedInQr,
      totalCheckedInManual,
      totalPendingCheckIn: Math.max(0, totalRegisteredActive - totalCheckedIn),
      globalAttendancePct,
      globalOccupancyPct,
      totalScanAttempts,
      totalScanRejected,
    },
    bySpace: Object.values(bySpace).sort((a, b) => b.total - a.total),
    byBuilding: Object.values(byBuilding).sort((a, b) => b.totalEvents - a.totalEvents),
    byCareer: Object.values(byCareer).sort((a, b) => b.checkedIn - a.checkedIn),
    byAcademicGrade: Object.values(byAcademicGrade).sort((a, b) => a.levelOrder - b.levelOrder),
    byDepartmentArea: Object.values(byDepartmentArea).sort((a, b) => b.checkedIn - a.checkedIn),
    byAttendeeType: Object.values(byAttendeeType),
    peakCheckInHours: Object.entries(byCheckInHour)
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour.localeCompare(b.hour)),
    events: eventRows,
  };
}

export type ReportData = Awaited<ReturnType<typeof buildReportData>>;
