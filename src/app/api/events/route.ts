import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkSpaceAvailability } from '@/lib/availability';
import { calculateCriticalityLevel } from '@/lib/utils';
import {
  attachEventLifecycle,
  matchesLifecycleFilter,
  syncExpiredRequestsAndChanges,
} from '@/lib/lifecycle';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  await syncExpiredRequestsAndChanges();

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') || '';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';
  const spaceId = searchParams.get('spaceId') || '';
  const status = searchParams.get('status') || '';
  const lifecycleFilter = searchParams.get('lifecycle') || 'ALL';
  const responsible = searchParams.get('responsible') || '';
  const createdById = searchParams.get('createdById') || '';
  const criticalityLevel = searchParams.get('criticalityLevel') || '';
  const scope = searchParams.get('scope') || 'default'; // 'mine' | 'operator' | 'default'

  const where: Prisma.EventWhereInput = {};

  // Control de acceso según rol y alcance
  if (scope === 'operator') {
    if (user.role === 'SUPER_ADMIN') {
      where.spaceRequest = { status: 'APPROVED' };
    } else {
      where.OR = [
        { createdById: user.id },
        { accessOperators: { some: { userId: user.id, active: true } } },
      ];
    }
  } else if (user.role === 'DIRECTOR') {
    if (scope === 'mine') {
      where.createdById = user.id;
    } else {
      where.OR = [
        { createdById: user.id },
        { space: { authorizerUserId: user.id } },
        { accessOperators: { some: { userId: user.id, active: true } } },
      ];
    }
  } else if (user.role === 'EXTENSION') {
    if (scope === 'mine') {
      where.createdById = user.id;
    } else {
      where.OR = [
        { createdById: user.id },
        { space: { authorizerUserId: user.id } },
        { equipmentRequest: { isNot: null } },
        { accessOperators: { some: { userId: user.id, active: true } } },
      ];
    }
  } else if (user.role === 'SUPER_ADMIN' && scope === 'mine') {
    where.createdById = user.id;
  }

  if (date) {
    where.date = date;
  } else if (startDate && endDate) {
    where.date = { gte: startDate, lte: endDate };
  } else if (startDate) {
    where.date = { gte: startDate };
  } else if (endDate) {
    where.date = { lte: endDate };
  }

  if (spaceId && spaceId !== 'ALL') {
    where.spaceId = spaceId;
  }

  if (createdById && createdById !== 'ALL') {
    where.createdById = createdById;
  }

  if (status && status !== 'ALL') {
    where.spaceRequest = { status };
  }

  if (responsible.trim()) {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : []),
      {
        OR: [
          { responsibleName: { contains: responsible.trim() } },
          { responsibleDepartment: { contains: responsible.trim() } },
          { name: { contains: responsible.trim() } },
        ],
      },
    ];
  }

  if (criticalityLevel && criticalityLevel !== 'ALL') {
    const parsed = parseInt(criticalityLevel, 10);
    if (!Number.isNaN(parsed)) {
      where.criticalityLevel = parsed;
    }
  }

  const rawEvents = await prisma.event.findMany({
    where,
    include: {
      space: {
        include: {
          building: { select: { id: true, name: true } },
          authorizer: { select: { id: true, username: true, fullName: true, role: true } },
        },
      },
      createdBy: {
        select: {
          id: true,
          username: true,
          fullName: true,
          role: true,
          departmentLabel: true,
        },
      },
      closedBy: {
        select: { id: true, username: true, fullName: true },
      },
      audiences: {
        include: {
          audienceType: true,
        },
      },
      spaceRequest: {
        include: {
          authorizer: { select: { id: true, username: true, fullName: true } },
        },
      },
      equipmentRequest: {
        include: {
          items: {
            include: { equipmentType: true },
          },
          authorizer: { select: { id: true, username: true, fullName: true } },
        },
      },
      scheduleChangeRequests: {
        orderBy: { requestedAt: 'desc' },
      },
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
      _count: {
        select: {
          attendees: { where: { registrationStatus: { not: 'REVOKED' } } },
          attendances: true,
        },
      },
    },
    orderBy: [{ date: 'asc' }, { startMinutes: 'asc' }],
  });

  const now = new Date();
  const enrichedEvents = rawEvents.map((ev) => attachEventLifecycle(ev, now));

  // Real SQLite-based counters for quick lifecycle filters (Section 7)
  const lifecycleCounts = {
    ALL: enrichedEvents.length,
    PENDING_APPROVAL: enrichedEvents.filter((e) => e.lifecycleStatus === 'PENDING_APPROVAL').length,
    SCHEDULED: enrichedEvents.filter((e) => e.lifecycleStatus === 'SCHEDULED').length,
    IN_PROGRESS: enrichedEvents.filter((e) => e.lifecycleStatus === 'IN_PROGRESS').length,
    CONCLUDED: enrichedEvents.filter(
      (e) =>
        e.lifecycleStatus === 'COMPLETED_PENDING_EVIDENCE' || e.lifecycleStatus === 'CLOSED'
    ).length,
    COMPLETED_PENDING_EVIDENCE: enrichedEvents.filter(
      (e) => e.lifecycleStatus === 'COMPLETED_PENDING_EVIDENCE'
    ).length,
    CLOSED: enrichedEvents.filter((e) => e.lifecycleStatus === 'CLOSED').length,
    REJECTED: enrichedEvents.filter((e) => e.lifecycleStatus === 'REJECTED').length,
    EXPIRED: enrichedEvents.filter((e) => e.lifecycleStatus === 'EXPIRED').length,
  };

  const filteredEvents = enrichedEvents.filter((ev) =>
    matchesLifecycleFilter(ev.lifecycleStatus, lifecycleFilter)
  );

  return NextResponse.json({
    events: filteredEvents,
    lifecycleCounts,
  });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const name = String(body.name || '').trim();
    const description = String(body.description || '').trim();
    const justification = String(body.justification || '').trim();
    const date = String(body.date || '').trim();
    const startTime = String(body.startTime || '').trim();
    const endTime = String(body.endTime || '').trim();
    const spaceId = String(body.spaceId || '').trim();
    const responsibleName = String(body.responsibleName || '').trim();
    const responsibleDepartment = String(body.responsibleDepartment || '').trim();
    const responsibleEmail = body.responsibleEmail ? String(body.responsibleEmail).trim() : null;
    const audienceLevels: number[] = Array.isArray(body.audienceLevels)
      ? body.audienceLevels.map((n: unknown) => Number(n))
      : [];

    const requestEquipment = Boolean(body.requestEquipment);
    const equipmentCodes: string[] = Array.isArray(body.equipmentCodes)
      ? body.equipmentCodes.map((c: unknown) => String(c))
      : [];
    const equipmentDescription = String(body.equipmentDescription || '').trim();

    // Modalidad de asistencia (Sección 8: OPEN o RESTRICTED)
    const accessMode = String(body.accessMode || 'RESTRICTED').toUpperCase() === 'OPEN' ? 'OPEN' : 'RESTRICTED';
    const registrationEnabled = accessMode === 'OPEN' ? Boolean(body.registrationEnabled ?? true) : false;

    if (
      !name ||
      !description ||
      !justification ||
      !date ||
      !startTime ||
      !endTime ||
      !spaceId ||
      !responsibleName ||
      !responsibleDepartment
    ) {
      return NextResponse.json(
        { error: 'Todos los campos obligatorios del evento, espacio y responsable deben completarse.' },
        { status: 400 }
      );
    }

    if (audienceLevels.length === 0) {
      return NextResponse.json(
        { error: 'Debe seleccionar al menos una opción del catálogo de criticidad.' },
        { status: 400 }
      );
    }

    const criticalityLevel = calculateCriticalityLevel(audienceLevels);

    if (requestEquipment) {
      if (equipmentCodes.length === 0) {
        return NextResponse.json(
          { error: 'Seleccione al menos un tipo de equipo (Equipo de sonido y/o Mobiliario).' },
          { status: 400 }
        );
      }
      if (!equipmentDescription || equipmentDescription.length < 5) {
        return NextResponse.json(
          { error: 'Debe incluir una descripción detallada del equipo o mobiliario que necesita.' },
          { status: 400 }
        );
      }
    }

    const createdEvent = await prisma.$transaction(async (tx) => {
      const space = await tx.space.findUnique({
        where: { id: spaceId },
      });

      if (!space || !space.active) {
        throw new Error('El espacio seleccionado no existe o no se encuentra activo.');
      }

      const availability = await checkSpaceAvailability(tx, {
        spaceId: space.id,
        date,
        startTime,
        endTime,
      });

      if (!availability.available) {
        const conflictSummary = availability.conflicts.map((c) => c.message).join(' | ');
        throw new Error(`Horario no disponible: ${conflictSummary}`);
      }

      const audienceTypeRecords = await tx.audienceType.findMany({
        where: { level: { in: audienceLevels } },
      });

      if (audienceTypeRecords.length === 0) {
        throw new Error('No se encontraron los niveles de criticidad seleccionados en el catálogo.');
      }

      const event = await tx.event.create({
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
          spaceId: space.id,
          responsibleName,
          responsibleDepartment,
          responsibleEmail,
          createdById: user.id,
          criticalityLevel,
          isDemo: false,
        },
      });

      for (const aud of audienceTypeRecords) {
        await tx.eventAudience.create({
          data: {
            eventId: event.id,
            audienceTypeId: aud.id,
          },
        });
      }

      // Crear configuración de asistencia 1:1 (Sección 8 y 20)
      await tx.eventAttendanceConfig.create({
        data: {
          eventId: event.id,
          accessMode,
          registrationEnabled,
          publicRegistrationToken: `reg_${crypto.randomBytes(16).toString('hex')}`,
          checkInOpen: false,
          institutionalEmailDomain: process.env.INSTITUTIONAL_EMAIL_DOMAIN || 'utc.edu.mx',
        },
      });

      const spaceReq = await tx.spaceRequest.create({
        data: {
          eventId: event.id,
          spaceId: space.id,
          authorizerId: space.authorizerUserId,
          status: 'PENDING',
        },
      });

      await tx.reservation.create({
        data: {
          eventId: event.id,
          spaceId: space.id,
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

      await tx.notification.create({
        data: {
          userId: space.authorizerUserId,
          eventId: event.id,
          type: 'SPACE_PENDING',
          title: `Nueva solicitud de espacio: ${space.name}`,
          message: `${user.fullName} registró el evento "${name}" (Responsable: ${responsibleName}) para el ${date} de ${startTime} a ${endTime}.`,
          link: `/autorizaciones`,
        },
      });

      if (requestEquipment && equipmentCodes.length > 0) {
        const extUniUser = await tx.user.findFirst({
          where: { role: 'EXTENSION', active: true },
        });

        const eqTypes = await tx.equipmentType.findMany({
          where: { code: { in: equipmentCodes } },
        });

        const eqReq = await tx.equipmentRequest.create({
          data: {
            eventId: event.id,
            status: 'PENDING',
            description: equipmentDescription,
            authorizerId: extUniUser?.id ?? null,
          },
        });

        for (const eqType of eqTypes) {
          await tx.equipmentRequestType.create({
            data: {
              equipmentRequestId: eqReq.id,
              equipmentTypeId: eqType.id,
            },
          });
        }

        if (extUniUser) {
          await tx.notification.create({
            data: {
              userId: extUniUser.id,
              eventId: event.id,
              type: 'EQUIPMENT_PENDING',
              title: `Nueva solicitud de equipo: ${name}`,
              message: `${user.fullName} solicitó equipo (${eqTypes.map((t) => t.name).join(', ')}) para el evento "${name}" en ${space.name}.`,
              link: `/autorizaciones`,
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          userId: user.id,
          eventId: event.id,
          action: 'EVENT_CREATED',
          entityType: 'Event',
          entityId: event.id,
          summary: `Evento "${name}" creado (${accessMode === 'OPEN' ? 'Evento Abierto' : 'Evento Restringido'}) con bloqueo provisional en "${space.name}" para el ${date} (${startTime} a ${endTime}, limpieza ${endTime} a ${availability.cleaningEndTime}).`,
          newData: JSON.stringify({
            name,
            space: space.name,
            date,
            startTime,
            endTime,
            cleaningEndTime: availability.cleaningEndTime,
            responsibleName,
            responsibleDepartment,
            criticalityLevel,
            audienceLevels,
            accessMode,
            spaceRequestId: spaceReq.id,
            equipmentRequested: requestEquipment,
          }),
        },
      });

      return event;
    });

    return NextResponse.json({ event: createdEvent }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al registrar el evento.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
