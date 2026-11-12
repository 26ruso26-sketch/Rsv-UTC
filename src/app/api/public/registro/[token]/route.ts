import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseMonterreyDateTime, syncExpiredRequestsAndChanges } from '@/lib/lifecycle';
import {
  createAndSaveQrCredentialImage,
  generateSecureQrToken,
} from '@/lib/qr-service';
import { sendOrResendAttendeeInvitation } from '@/lib/mail-service';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function checkPublicRegistrationAvailability(
  event: {
    date: string;
    startTime: string;
    endTime: string;
    spaceRequest?: { status: string } | null;
    attendanceConfig?: {
      accessMode: string;
      registrationEnabled: boolean;
      registrationStartAt?: Date | null;
      registrationEndAt?: Date | null;
    } | null;
  },
  now: Date = new Date()
): { available: boolean; reason?: string } {
  if (!event.attendanceConfig) {
    return { available: false, reason: 'El evento no tiene configuración de registro público.' };
  }

  // REGLA ESTRICTA SECCIÓN 8 y 13: Un evento RESTRICTED nunca podrá aceptar inscripciones públicas
  if (event.attendanceConfig.accessMode !== 'OPEN') {
    return {
      available: false,
      reason:
        'Este evento es de acceso RESTRINGIDO y no admite inscripciones mediante formulario público. El ingreso es exclusivo por invitación directa del organizador.',
    };
  }

  if (event.spaceRequest?.status !== 'APPROVED') {
    return {
      available: false,
      reason:
        'El registro público aún no está disponible porque el espacio del evento se encuentra pendiente de autorización.',
    };
  }

  if (!event.attendanceConfig.registrationEnabled) {
    return {
      available: false,
      reason: 'El organizador del evento ha cerrado o desactivado las inscripciones públicas.',
    };
  }

  const endAt = parseMonterreyDateTime(event.date, event.endTime);
  if (now.getTime() >= endAt.getTime()) {
    return {
      available: false,
      reason: 'El evento ya concluyó; el periodo de registro ha finalizado.',
    };
  }

  if (
    event.attendanceConfig.registrationStartAt &&
    now.getTime() < new Date(event.attendanceConfig.registrationStartAt).getTime()
  ) {
    return {
      available: false,
      reason: 'El periodo de inscripción pública para este evento aún no inicia.',
    };
  }

  if (
    event.attendanceConfig.registrationEndAt &&
    now.getTime() > new Date(event.attendanceConfig.registrationEndAt).getTime()
  ) {
    return {
      available: false,
      reason: 'El periodo configurado para inscripciones públicas ya concluyó.',
    };
  }

  return { available: true };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { token: string } }
) {
  await syncExpiredRequestsAndChanges();

  const config = await prisma.eventAttendanceConfig.findUnique({
    where: { publicRegistrationToken: params.token },
    include: {
      event: {
        include: {
          space: {
            select: {
              id: true,
              name: true,
              location: true,
              capacity: true,
              building: { select: { name: true } },
            },
          },
          spaceRequest: {
            select: { status: true },
          },
        },
      },
    },
  });

  if (!config || !config.event) {
    return NextResponse.json(
      { error: 'Enlace de registro inválido o evento no encontrado.' },
      { status: 404 }
    );
  }

  const availability = checkPublicRegistrationAvailability({
    ...config.event,
    attendanceConfig: config,
  });

  // Never expose data of other attendees (Section 13 & 23)
  const [careers, academicGrades, departmentAreas] = await Promise.all([
    prisma.career.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
    prisma.academicGrade.findMany({ where: { active: true }, orderBy: { levelOrder: 'asc' } }),
    prisma.departmentArea.findMany({
      where: { active: true },
      orderBy: [{ areaType: 'asc' }, { name: 'asc' }],
    }),
  ]);

  return NextResponse.json({
    event: {
      id: config.event.id,
      name: config.event.name,
      description: config.event.description,
      date: config.event.date,
      startTime: config.event.startTime,
      endTime: config.event.endTime,
      spaceName: config.event.space.name,
      spaceLocation:
        config.event.space.location ||
        config.event.space.building?.name ||
        'Campus Universitario',
      accessMode: config.accessMode,
      institutionalEmailDomain:
        config.institutionalEmailDomain ||
        process.env.INSTITUTIONAL_EMAIL_DOMAIN ||
        'utc.edu.mx',
    },
    registrationAvailability: availability,
    catalogs: {
      careers,
      academicGrades,
      departmentAreas,
    },
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    await syncExpiredRequestsAndChanges();

    const config = await prisma.eventAttendanceConfig.findUnique({
      where: { publicRegistrationToken: params.token },
      include: {
        event: {
          include: {
            space: true,
            spaceRequest: true,
          },
        },
      },
    });

    if (!config || !config.event) {
      return NextResponse.json(
        { error: 'Enlace de registro inválido o inexistente.' },
        { status: 404 }
      );
    }

    const availability = checkPublicRegistrationAvailability({
      ...config.event,
      attendanceConfig: config,
    });

    if (!availability.available) {
      return NextResponse.json(
        { error: availability.reason || 'El registro público no está disponible.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const attendeeType = String(body.attendeeType || '').trim().toUpperCase();
    const fullName = String(body.fullName || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const enrollmentNumber = body.enrollmentNumber
      ? String(body.enrollmentNumber).trim().toUpperCase()
      : null;
    const careerId = body.careerId ? String(body.careerId).trim() : null;
    const academicGradeId = body.academicGradeId ? String(body.academicGradeId).trim() : null;
    const departmentAreaId = body.departmentAreaId ? String(body.departmentAreaId).trim() : null;
    const organization = body.organization ? String(body.organization).trim() : null;
    const privacyAccepted = Boolean(body.privacyAccepted);

    if (!privacyAccepted) {
      return NextResponse.json(
        { error: 'Debe aceptar el aviso de privacidad institucional para completar su registro.' },
        { status: 400 }
      );
    }

    if (!['STUDENT', 'TEACHER', 'ADMIN_STAFF', 'EXTERNAL_GUEST'].includes(attendeeType)) {
      return NextResponse.json(
        { error: 'Categoría de asistente inválida.' },
        { status: 400 }
      );
    }

    if (!fullName || fullName.length < 3) {
      return NextResponse.json(
        { error: 'El nombre completo es obligatorio.' },
        { status: 400 }
      );
    }

    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { error: 'Debe proporcionar un correo electrónico válido.' },
        { status: 400 }
      );
    }

    // Validación de campos según tipo de asistente (Sección 9)
    if (attendeeType === 'STUDENT') {
      if (!enrollmentNumber) {
        return NextResponse.json(
          { error: 'La matrícula es obligatoria para alumnos.' },
          { status: 400 }
        );
      }
      if (!careerId) {
        return NextResponse.json(
          { error: 'Debe seleccionar su carrera universitaria.' },
          { status: 400 }
        );
      }
      if (!academicGradeId) {
        return NextResponse.json(
          { error: 'Debe seleccionar su semestre o grado académico.' },
          { status: 400 }
        );
      }
    } else if (attendeeType === 'TEACHER') {
      if (!departmentAreaId) {
        return NextResponse.json(
          { error: 'Debe seleccionar su departamento o área académica.' },
          { status: 400 }
        );
      }
    } else if (attendeeType === 'ADMIN_STAFF') {
      if (!departmentAreaId) {
        return NextResponse.json(
          { error: 'Debe seleccionar su departamento o área administrativa.' },
          { status: 400 }
        );
      }
    }

    // Prevenir duplicados dentro del evento (Sección 13)
    const dupEmail = await prisma.eventAttendee.findFirst({
      where: {
        eventId: config.event.id,
        email,
        registrationStatus: { not: 'REVOKED' },
      },
    });

    if (dupEmail) {
      return NextResponse.json(
        { error: 'Ya existe un registro activo con este correo electrónico para este evento.' },
        { status: 400 }
      );
    }

    if (attendeeType === 'STUDENT' && enrollmentNumber) {
      const dupEnrollment = await prisma.eventAttendee.findFirst({
        where: {
          eventId: config.event.id,
          enrollmentNumber,
          registrationStatus: { not: 'REVOKED' },
        },
      });
      if (dupEnrollment) {
        return NextResponse.json(
          { error: 'Ya existe un registro activo con esta matrícula para este evento.' },
          { status: 400 }
        );
      }
    }

    const { rawToken, tokenHash } = generateSecureQrToken();
    const now = new Date();

    const created = await prisma.$transaction(async (tx) => {
      const attendee = await tx.eventAttendee.create({
        data: {
          eventId: config.event.id,
          attendeeType,
          fullName,
          email,
          enrollmentNumber: attendeeType === 'STUDENT' ? enrollmentNumber : null,
          careerId: attendeeType === 'STUDENT' ? careerId : null,
          academicGradeId: attendeeType === 'STUDENT' ? academicGradeId : null,
          departmentAreaId:
            attendeeType === 'TEACHER' || attendeeType === 'ADMIN_STAFF'
              ? departmentAreaId
              : null,
          organization: attendeeType === 'EXTERNAL_GUEST' ? organization : null,
          registrationStatus: 'REGISTERED',
          privacyAcceptedAt: now,
          createdById: null,
          isDemo: false,
        },
      });

      const qrCred = await tx.attendeeQrCredential.create({
        data: {
          eventAttendeeId: attendee.id,
          tokenHash,
          qrImagePath: 'pending.png',
          isActive: true,
        },
      });

      const savedImg = createAndSaveQrCredentialImage({
        credentialId: qrCred.id,
        rawToken,
        tokenHash,
      });

      await tx.attendeeQrCredential.update({
        where: { id: qrCred.id },
        data: { qrImagePath: savedImg.qrImagePath },
      });

      await tx.auditLog.create({
        data: {
          userId: config.event.createdById,
          eventId: config.event.id,
          action: 'PUBLIC_ATTENDEE_REGISTERED',
          entityType: 'EventAttendee',
          entityId: attendee.id,
          summary: `Registro público completado en "${config.event.name}": ${fullName} (${attendeeType}, ${email}). Aviso de privacidad aceptado y QR individual generado.`,
          newData: JSON.stringify({
            attendeeId: attendee.id,
            fullName,
            email,
            attendeeType,
            privacyAcceptedAt: now.toISOString(),
          }),
        },
      });

      return { attendee, credentialId: qrCred.id };
    });

    const delivery = await sendOrResendAttendeeInvitation({
      attendeeId: created.attendee.id,
    });

    return NextResponse.json(
      {
        registration: {
          attendeeId: created.attendee.id,
          fullName: created.attendee.fullName,
          email: created.attendee.email,
          attendeeType: created.attendee.attendeeType,
          credentialId: created.credentialId,
          qrPngUrl: `/api/qrs/${created.attendee.id}?format=png&publicToken=${encodeURIComponent(
            params.token
          )}`,
          qrDownloadPngUrl: `/api/qrs/${
            created.attendee.id
          }?format=png&download=1&publicToken=${encodeURIComponent(params.token)}`,
          qrPassPdfUrl: `/api/qrs/${
            created.attendee.id
          }?format=pdf&download=1&publicToken=${encodeURIComponent(params.token)}`,
        },
        delivery,
      },
      { status: 201 }
    );
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : 'Error al procesar su registro al evento.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

