import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  canUserAccessEventPrivateData,
  canUserManageEventAttendance,
  canUserOperateEventScanner,
  getCurrentUser,
} from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { attachEventLifecycle, syncExpiredRequestsAndChanges } from '@/lib/lifecycle';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  await syncExpiredRequestsAndChanges();

  let event = await prisma.event.findUnique({
    where: { id: params.id },
    include: {
      space: {
        include: {
          building: true,
          authorizer: {
            select: {
              id: true,
              username: true,
              fullName: true,
              role: true,
              departmentLabel: true,
            },
          },
        },
      },
      createdBy: {
        select: {
          id: true,
          username: true,
          fullName: true,
          role: true,
          departmentLabel: true,
          email: true,
        },
      },
      closedBy: {
        select: {
          id: true,
          username: true,
          fullName: true,
          role: true,
        },
      },
      audiences: {
        include: { audienceType: true },
        orderBy: { audienceType: { level: 'asc' } },
      },
      spaceRequest: {
        include: {
          authorizer: {
            select: {
              id: true,
              username: true,
              fullName: true,
              role: true,
              departmentLabel: true,
            },
          },
        },
      },
      equipmentRequest: {
        include: {
          items: {
            include: { equipmentType: true },
          },
          authorizer: {
            select: {
              id: true,
              username: true,
              fullName: true,
              role: true,
              departmentLabel: true,
            },
          },
        },
      },
      scheduleChangeRequests: {
        include: {
          requestedBy: { select: { id: true, username: true, fullName: true } },
          authorizer: { select: { id: true, username: true, fullName: true } },
        },
        orderBy: { requestedAt: 'desc' },
      },
      reservations: {
        orderBy: { createdAt: 'asc' },
      },
      evidences: {
        include: {
          uploadedBy: { select: { id: true, username: true, fullName: true } },
        },
        orderBy: { uploadedAt: 'desc' },
      },
      attendanceConfig: true,
      attendees: {
        include: {
          career: true,
          academicGrade: true,
          departmentArea: true,
          createdBy: { select: { id: true, username: true, fullName: true } },
          revokedBy: { select: { id: true, username: true, fullName: true } },
          qrCredentials: {
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              isActive: true,
              qrImagePath: true,
              createdAt: true,
              revokedAt: true,
              expiresAt: true,
            },
          },
          attendance: {
            include: {
              checkedInBy: { select: { id: true, username: true, fullName: true } },
            },
          },
          invitationDeliveries: {
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      accessOperators: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              fullName: true,
              role: true,
              departmentLabel: true,
              email: true,
            },
          },
          assignedBy: {
            select: { id: true, username: true, fullName: true },
          },
        },
        orderBy: { assignedAt: 'asc' },
      },
      scanLogs: {
        include: {
          operator: { select: { id: true, username: true, fullName: true } },
          attendee: { select: { id: true, fullName: true, email: true, attendeeType: true } },
        },
        orderBy: { attemptedAt: 'desc' },
        take: 100,
      },
      auditLogs: {
        include: {
          user: { select: { id: true, username: true, fullName: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!event) {
    return NextResponse.json({ error: 'Evento no encontrado.' }, { status: 404 });
  }

  const hasAccess = canUserAccessEventPrivateData(user, {
    createdById: event.createdById,
    space: event.space,
    spaceRequest: event.spaceRequest,
    equipmentRequest: event.equipmentRequest,
    accessOperators: event.accessOperators,
  });

  if (!hasAccess) {
    return NextResponse.json(
      { error: 'No tiene permisos para consultar el detalle privado de este evento.' },
      { status: 403 }
    );
  }

  // Ensure every event has a 1:1 EventAttendanceConfig record
  if (!event.attendanceConfig) {
    const createdCfg = await prisma.eventAttendanceConfig.create({
      data: {
        eventId: event.id,
        accessMode: 'RESTRICTED',
        registrationEnabled: false,
        publicRegistrationToken: `reg_${crypto.randomBytes(16).toString('hex')}`,
        checkInOpen: false,
        institutionalEmailDomain: process.env.INSTITUTIONAL_EMAIL_DOMAIN || 'utc.edu.mx',
      },
    });
    event = {
      ...event,
      attendanceConfig: createdCfg,
    };
  }

  const enriched = attachEventLifecycle(event);

  // Compute per-event attendance KPIs (Section 21)
  const activeAttendees = event.attendees.filter((a) => a.registrationStatus !== 'REVOKED');
  const revokedAttendees = event.attendees.filter((a) => a.registrationStatus === 'REVOKED');

  const activeRegisteredCount = activeAttendees.length;
  const revokedCount = revokedAttendees.length;

  const qrGeneratedCount = activeAttendees.filter((a) =>
    a.qrCredentials.some((q) => q.isActive && !q.revokedAt)
  ).length;

  const invitationsSentCount = activeAttendees.filter(
    (a) => a.invitationDeliveries[0]?.status === 'SENT'
  ).length;
  const invitationsFailedCount = activeAttendees.filter(
    (a) => a.invitationDeliveries[0]?.status === 'FAILED'
  ).length;
  const invitationsPendingCount = activeAttendees.filter(
    (a) => !a.invitationDeliveries[0] || a.invitationDeliveries[0]?.status === 'PENDING'
  ).length;

  // Only count check-ins of active attendees for the active attendance % formula, while keeping historical attendance records
  const activeCheckedInCount = activeAttendees.filter((a) => Boolean(a.attendance)).length;
  const totalCheckedInHistorical = event.attendees.filter((a) => Boolean(a.attendance)).length;
  const withoutCheckInCount = Math.max(0, activeRegisteredCount - activeCheckedInCount);

  const attendancePercentage =
    activeRegisteredCount > 0
      ? Number(((activeCheckedInCount / activeRegisteredCount) * 100).toFixed(1))
      : 0;

  const spaceCapacity = event.space.capacity || 0;
  const occupancyPercentage =
    spaceCapacity > 0
      ? Number(((totalCheckedInHistorical / spaceCapacity) * 100).toFixed(1))
      : 0;

  const rejectedScansCount = event.scanLogs.filter((s) => s.result !== 'AUTHORIZED').length;

  const attendanceMetrics = {
    activeRegisteredCount,
    revokedCount,
    qrGeneratedCount,
    invitationsSentCount,
    invitationsFailedCount,
    invitationsPendingCount,
    checkedInCount: activeCheckedInCount,
    totalCheckedInHistorical,
    withoutCheckInCount,
    checkInStillOpen: Boolean(event.attendanceConfig?.checkInOpen),
    checkInClosedAt: event.attendanceConfig?.checkInClosedAt || null,
    attendancePercentage,
    spaceCapacity,
    occupancyPercentage,
    rejectedScansCount,
  };

  const permissions = {
    canManageAttendance: canUserManageEventAttendance(user, event),
    canOperateScanner: canUserOperateEventScanner(user, event),
    isSuperAdmin: user.role === 'SUPER_ADMIN',
  };

  return NextResponse.json({
    event: {
      ...enriched,
      attendanceMetrics,
      permissions,
    },
  });
}
