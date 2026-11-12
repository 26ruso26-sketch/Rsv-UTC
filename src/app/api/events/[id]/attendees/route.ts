import { NextRequest, NextResponse } from 'next/server';
import {
  canUserManageEventAttendance,
  canUserOperateEventScanner,
  getCurrentUser,
} from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  createAndSaveQrCredentialImage,
  generateSecureQrToken,
} from '@/lib/qr-service';
import { sendOrResendAttendeeInvitation } from '@/lib/mail-service';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  const event = await prisma.event.findUnique({
    where: { id: params.id },
    include: { accessOperators: true },
  });

  if (!event) {
    return NextResponse.json({ error: 'Evento no encontrado.' }, { status: 404 });
  }

  const canAccess =
    canUserManageEventAttendance(user, event) || canUserOperateEventScanner(user, event);

  if (!canAccess) {
    return NextResponse.json(
      { error: 'No tiene permisos para consultar la lista de invitados/asistentes de este evento.' },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get('q') || '').trim().toLowerCase();
  const attendeeType = searchParams.get('attendeeType') || 'ALL';
  const statusFilter = searchParams.get('status') || 'ALL';

  const attendees = await prisma.eventAttendee.findMany({
    where: {
      eventId: event.id,
      ...(attendeeType !== 'ALL' ? { attendeeType } : {}),
    },
    include: {
      career: true,
      academicGrade: true,
      departmentArea: true,
      qrCredentials: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          isActive: true,
          qrImagePath: true,
          createdAt: true,
          revokedAt: true,
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
  });

  const filtered = attendees.filter((a) => {
    if (statusFilter === 'ACTIVE' && a.registrationStatus === 'REVOKED') return false;
    if (statusFilter === 'REVOKED' && a.registrationStatus !== 'REVOKED') return false;
    if (statusFilter === 'CHECKED_IN' && !a.attendance) return false;
    if (
      statusFilter === 'WITHOUT_CHECKIN' &&
      (Boolean(a.attendance) || a.registrationStatus === 'REVOKED')
    ) {
      return false;
    }

    if (query) {
      const matchName = a.fullName.toLowerCase().includes(query);
      const matchEmail = a.email.toLowerCase().includes(query);
      const matchEnrollment = (a.enrollmentNumber || '').toLowerCase().includes(query);
      if (!matchName && !matchEmail && !matchEnrollment) return false;
    }

    return true;
  });

  return NextResponse.json({ attendees: filtered });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  try {
    const event = await prisma.event.findUnique({
      where: { id: params.id },
    });

    if (!event) {
      return NextResponse.json({ error: 'Evento no encontrado.' }, { status: 404 });
    }

    if (!canUserManageEventAttendance(user, event)) {
      return NextResponse.json(
        { error: 'Solo el responsable del evento o SUPER_ADMIN puede agregar invitados.' },
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

    if (!['STUDENT', 'TEACHER', 'ADMIN_STAFF', 'EXTERNAL_GUEST'].includes(attendeeType)) {
      return NextResponse.json(
        { error: 'Categoría de asistente inválida.' },
        { status: 400 }
      );
    }

    if (!fullName || fullName.length < 3) {
      return NextResponse.json(
        { error: 'El nombre completo del asistente es obligatorio.' },
        { status: 400 }
      );
    }

    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { error: 'Debe proporcionar un correo electrónico válido.' },
        { status: 400 }
      );
    }

    // Validación condicional por tipo de asistente (Sección 9)
    if (attendeeType === 'STUDENT') {
      if (!enrollmentNumber) {
        return NextResponse.json(
          { error: 'La matrícula es obligatoria para alumnos.' },
          { status: 400 }
        );
      }
      if (!careerId) {
        return NextResponse.json(
          { error: 'La carrera universitaria es obligatoria para alumnos.' },
          { status: 400 }
        );
      }
      if (!academicGradeId) {
        return NextResponse.json(
          { error: 'El semestre o grado académico es obligatorio para alumnos.' },
          { status: 400 }
        );
      }
    } else if (attendeeType === 'TEACHER') {
      if (!departmentAreaId) {
        return NextResponse.json(
          { error: 'El departamento o área académica es obligatorio para docentes.' },
          { status: 400 }
        );
      }
      const dept = await prisma.departmentArea.findUnique({ where: { id: departmentAreaId } });
      if (!dept || dept.areaType !== 'ACADEMIC') {
        return NextResponse.json(
          { error: 'Seleccione un departamento o área académica válida para el docente.' },
          { status: 400 }
        );
      }
    } else if (attendeeType === 'ADMIN_STAFF') {
      if (!departmentAreaId) {
        return NextResponse.json(
          { error: 'El departamento o área administrativa es obligatorio para personal administrativo.' },
          { status: 400 }
        );
      }
      const dept = await prisma.departmentArea.findUnique({ where: { id: departmentAreaId } });
      if (!dept || dept.areaType !== 'ADMINISTRATIVE') {
        return NextResponse.json(
          { error: 'Seleccione un departamento o área administrativa válida.' },
          { status: 400 }
        );
      }
    }

    // Comprobar duplicados dentro del evento (correo o matrícula activa)
    const duplicateByEmail = await prisma.eventAttendee.findFirst({
      where: {
        eventId: event.id,
        email,
        registrationStatus: { not: 'REVOKED' },
      },
    });

    if (duplicateByEmail) {
      return NextResponse.json(
        {
          error: `Ya existe un asistente/invitado activo con el correo "${email}" en este evento.`,
        },
        { status: 400 }
      );
    }

    if (attendeeType === 'STUDENT' && enrollmentNumber) {
      const duplicateByEnrollment = await prisma.eventAttendee.findFirst({
        where: {
          eventId: event.id,
          enrollmentNumber,
          registrationStatus: { not: 'REVOKED' },
        },
      });
      if (duplicateByEnrollment) {
        return NextResponse.json(
          {
            error: `Ya existe un alumno activo con la matrícula "${enrollmentNumber}" en este evento.`,
          },
          { status: 400 }
        );
      }
    }

    const { rawToken, tokenHash } = generateSecureQrToken();

    const createdAttendee = await prisma.$transaction(async (tx) => {
      const attendee = await tx.eventAttendee.create({
        data: {
          eventId: event.id,
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
          registrationStatus: 'INVITED',
          createdById: user.id,
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
          userId: user.id,
          eventId: event.id,
          action: 'ATTENDEE_ADDED',
          entityType: 'EventAttendee',
          entityId: attendee.id,
          summary: `Invitado agregado a "${event.name}": ${fullName} (${attendeeType}, ${email}). Credencial QR individual generada.`,
          newData: JSON.stringify({
            attendeeId: attendee.id,
            fullName,
            email,
            attendeeType,
            enrollmentNumber: attendeeType === 'STUDENT' ? enrollmentNumber : null,
            credentialId: qrCred.id,
          }),
        },
      });

      return attendee;
    });

    // Preparar e intentar envío de invitación por correo (sin perder el registro si SMTP no está configurado)
    const deliveryResult = await sendOrResendAttendeeInvitation({
      attendeeId: createdAttendee.id,
    });

    const fullRecord = await prisma.eventAttendee.findUnique({
      where: { id: createdAttendee.id },
      include: {
        career: true,
        academicGrade: true,
        departmentArea: true,
        qrCredentials: {
          orderBy: { createdAt: 'desc' },
          select: { id: true, isActive: true, qrImagePath: true, createdAt: true },
        },
        invitationDeliveries: {
          orderBy: { createdAt: 'desc' },
        },
        attendance: true,
      },
    });

    return NextResponse.json(
      {
        attendee: fullRecord,
        delivery: deliveryResult,
      },
      { status: 201 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al registrar invitado.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  try {
    const event = await prisma.event.findUnique({
      where: { id: params.id },
    });

    if (!event) {
      return NextResponse.json({ error: 'Evento no encontrado.' }, { status: 404 });
    }

    if (!canUserManageEventAttendance(user, event)) {
      return NextResponse.json(
        { error: 'Solo el responsable del evento o SUPER_ADMIN puede administrar invitados.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const action = String(body.action || 'EDIT').toUpperCase(); // EDIT | REVOKE | RESEND_INVITATION
    const attendeeId = String(body.attendeeId || '').trim();

    if (!attendeeId) {
      return NextResponse.json({ error: 'El ID del invitado es obligatorio.' }, { status: 400 });
    }

    const existing = await prisma.eventAttendee.findUnique({
      where: { id: attendeeId },
      include: {
        qrCredentials: {
          orderBy: { createdAt: 'desc' },
        },
        attendance: true,
      },
    });

    if (!existing || existing.eventId !== event.id) {
      return NextResponse.json({ error: 'Invitado no encontrado en este evento.' }, { status: 404 });
    }

    // 1. REVOCACIÓN (Sección 11: Nunca eliminar físicamente; cambiar a REVOKED e invalidar QR inmediatamente)
    if (action === 'REVOKE') {
      const reason = String(body.reason || 'Revocación solicitada por el organizador del evento').trim();
      const now = new Date();

      const revoked = await prisma.$transaction(async (tx) => {
        const updated = await tx.eventAttendee.update({
          where: { id: existing.id },
          data: {
            registrationStatus: 'REVOKED',
            revokedAt: now,
            revokedById: user.id,
            revocationReason: reason,
          },
        });

        await tx.attendeeQrCredential.updateMany({
          where: {
            eventAttendeeId: existing.id,
            isActive: true,
          },
          data: {
            isActive: false,
            revokedAt: now,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: user.id,
            eventId: event.id,
            action: 'ATTENDEE_REVOKED',
            entityType: 'EventAttendee',
            entityId: existing.id,
            summary: `Invitación de "${existing.fullName}" (${existing.email}) REVOCADA e invalidada su credencial QR.${
              existing.attendance
                ? ' Su entrada previamente registrada se conserva como hecho histórico.'
                : ''
            }`,
            reason,
            previousData: JSON.stringify({
              registrationStatus: existing.registrationStatus,
            }),
            newData: JSON.stringify({
              registrationStatus: 'REVOKED',
              revokedAt: now.toISOString(),
              preservedHistoricalAttendance: Boolean(existing.attendance),
            }),
          },
        });

        return updated;
      });

      return NextResponse.json({
        attendee: revoked,
        message: 'Invitación revocada y credencial QR invalidada inmediatamente.',
      });
    }

    // 2. REENVIAR INVITACIÓN (Sección 14: Utiliza el QR vigente sin duplicar credenciales ni registros)
    if (action === 'RESEND_INVITATION') {
      if (existing.registrationStatus === 'REVOKED') {
        return NextResponse.json(
          { error: 'No se puede reenviar invitación a un registro revocado.' },
          { status: 400 }
        );
      }

      const deliveryResult = await sendOrResendAttendeeInvitation({
        attendeeId: existing.id,
      });

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          eventId: event.id,
          action: 'INVITATION_RESENT',
          entityType: 'EventAttendee',
          entityId: existing.id,
          summary: `Reenvío de invitación con QR vigente para "${existing.fullName}" (${existing.email}). Resultado: ${deliveryResult.status}.`,
        },
      });

      return NextResponse.json({
        delivery: deliveryResult,
        message: deliveryResult.message,
      });
    }

    // 3. EDICIÓN DE INVITADO (Sección 11)
    if (existing.registrationStatus === 'REVOKED') {
      return NextResponse.json(
        { error: 'No se puede editar un registro revocado.' },
        { status: 400 }
      );
    }

    const attendeeType = body.attendeeType
      ? String(body.attendeeType).trim().toUpperCase()
      : existing.attendeeType;
    const fullName = body.fullName !== undefined ? String(body.fullName).trim() : existing.fullName;
    const newEmail =
      body.email !== undefined ? String(body.email).trim().toLowerCase() : existing.email;
    const enrollmentNumber =
      body.enrollmentNumber !== undefined
        ? body.enrollmentNumber
          ? String(body.enrollmentNumber).trim().toUpperCase()
          : null
        : existing.enrollmentNumber;
    const careerId =
      body.careerId !== undefined ? (body.careerId ? String(body.careerId) : null) : existing.careerId;
    const academicGradeId =
      body.academicGradeId !== undefined
        ? body.academicGradeId
          ? String(body.academicGradeId)
          : null
        : existing.academicGradeId;
    const departmentAreaId =
      body.departmentAreaId !== undefined
        ? body.departmentAreaId
          ? String(body.departmentAreaId)
          : null
        : existing.departmentAreaId;
    const organization =
      body.organization !== undefined
        ? body.organization
          ? String(body.organization).trim()
          : null
        : existing.organization;

    if (!fullName || fullName.length < 3) {
      return NextResponse.json(
        { error: 'El nombre completo es obligatorio.' },
        { status: 400 }
      );
    }

    if (!newEmail || !EMAIL_REGEX.test(newEmail)) {
      return NextResponse.json(
        { error: 'Debe proporcionar un correo electrónico válido.' },
        { status: 400 }
      );
    }

    if (attendeeType === 'STUDENT') {
      if (!enrollmentNumber || !careerId || !academicGradeId) {
        return NextResponse.json(
          { error: 'Matrícula, carrera y semestre son obligatorios para alumnos.' },
          { status: 400 }
        );
      }
    } else if (attendeeType === 'TEACHER' || attendeeType === 'ADMIN_STAFF') {
      if (!departmentAreaId) {
        return NextResponse.json(
          { error: 'El departamento o área es obligatorio.' },
          { status: 400 }
        );
      }
    }

    // Check duplicate email in event
    if (newEmail !== existing.email) {
      const dupEmail = await prisma.eventAttendee.findFirst({
        where: {
          eventId: event.id,
          email: newEmail,
          id: { not: existing.id },
          registrationStatus: { not: 'REVOKED' },
        },
      });
      if (dupEmail) {
        return NextResponse.json(
          { error: `El correo "${newEmail}" ya está asignado a otro asistente en este evento.` },
          { status: 400 }
        );
      }
    }

    const emailChangedBeforeCheckIn =
      newEmail !== existing.email && !existing.attendance;

    const updatedAttendee = await prisma.$transaction(async (tx) => {
      const updated = await tx.eventAttendee.update({
        where: { id: existing.id },
        data: {
          attendeeType,
          fullName,
          email: newEmail,
          enrollmentNumber: attendeeType === 'STUDENT' ? enrollmentNumber : null,
          careerId: attendeeType === 'STUDENT' ? careerId : null,
          academicGradeId: attendeeType === 'STUDENT' ? academicGradeId : null,
          departmentAreaId:
            attendeeType === 'TEACHER' || attendeeType === 'ADMIN_STAFF'
              ? departmentAreaId
              : null,
          organization: attendeeType === 'EXTERNAL_GUEST' ? organization : null,
        },
      });

      if (emailChangedBeforeCheckIn) {
        // Sección 11: Si se cambia el correo antes del ingreso:
        // 1. Revocar el QR anterior (conservar historial)
        // 2. Generar nueva credencial y nueva imagen QR
        // 3. Enviar invitación al nuevo correo
        const now = new Date();
        await tx.attendeeQrCredential.updateMany({
          where: {
            eventAttendeeId: existing.id,
            isActive: true,
          },
          data: {
            isActive: false,
            revokedAt: now,
          },
        });

        const { rawToken, tokenHash } = generateSecureQrToken();
        const newCred = await tx.attendeeQrCredential.create({
          data: {
            eventAttendeeId: existing.id,
            tokenHash,
            qrImagePath: 'pending.png',
            isActive: true,
          },
        });

        const savedImg = createAndSaveQrCredentialImage({
          credentialId: newCred.id,
          rawToken,
          tokenHash,
        });

        await tx.attendeeQrCredential.update({
          where: { id: newCred.id },
          data: { qrImagePath: savedImg.qrImagePath },
        });

        await tx.auditLog.create({
          data: {
            userId: user.id,
            eventId: event.id,
            action: 'ATTENDEE_EMAIL_CHANGED_QR_REGENERATED',
            entityType: 'EventAttendee',
            entityId: existing.id,
            summary: `Correo de invitado "${fullName}" modificado antes del ingreso (${existing.email} → ${newEmail}). Credencial QR anterior revocada en historial y nueva credencial QR generada.`,
            previousData: JSON.stringify({
              fullName: existing.fullName,
              email: existing.email,
            }),
            newData: JSON.stringify({
              fullName,
              email: newEmail,
              newCredentialId: newCred.id,
            }),
          },
        });
      } else {
        // Se conserva el QR vigente y la entrada histórica si ya existía (Sección 11)
        await tx.auditLog.create({
          data: {
            userId: user.id,
            eventId: event.id,
            action: 'ATTENDEE_UPDATED',
            entityType: 'EventAttendee',
            entityId: existing.id,
            summary: `Datos del invitado "${fullName}" actualizados conservando su credencial QR vigente${
              existing.attendance ? ' y su registro de entrada histórico' : ''
            }.`,
            previousData: JSON.stringify({
              fullName: existing.fullName,
              email: existing.email,
              attendeeType: existing.attendeeType,
              enrollmentNumber: existing.enrollmentNumber,
              careerId: existing.careerId,
              academicGradeId: existing.academicGradeId,
              departmentAreaId: existing.departmentAreaId,
            }),
            newData: JSON.stringify({
              fullName,
              email: newEmail,
              attendeeType,
              enrollmentNumber: updated.enrollmentNumber,
              careerId: updated.careerId,
              academicGradeId: updated.academicGradeId,
              departmentAreaId: updated.departmentAreaId,
            }),
          },
        });
      }

      return updated;
    });

    let delivery = null;
    if (emailChangedBeforeCheckIn) {
      delivery = await sendOrResendAttendeeInvitation({
        attendeeId: updatedAttendee.id,
      });
    }

    return NextResponse.json({
      attendee: updatedAttendee,
      emailChangedBeforeCheckIn,
      delivery,
      message: emailChangedBeforeCheckIn
        ? 'Datos actualizados. Al cambiar el correo antes del ingreso, se revocó el QR anterior, se generó una nueva credencial QR y se procesó la invitación al nuevo correo.'
        : 'Datos del invitado actualizados conservando su QR vigente y trazabilidad.',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al actualizar invitado.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

