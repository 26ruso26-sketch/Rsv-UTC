import { NextRequest, NextResponse } from 'next/server';
import { canUserOperateEventScanner, getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hashQrToken } from '@/lib/qr-service';

function formatAttendeeSummaryForScanner(attendee: {
  id: string;
  fullName: string;
  email: string;
  attendeeType: string;
  enrollmentNumber?: string | null;
  organization?: string | null;
  career?: { name: string; code: string } | null;
  academicGrade?: { name: string } | null;
  departmentArea?: { name: string; areaType: string } | null;
}) {
  const typeLabel =
    attendee.attendeeType === 'STUDENT'
      ? 'Alumno'
      : attendee.attendeeType === 'TEACHER'
      ? 'Docente'
      : attendee.attendeeType === 'ADMIN_STAFF'
      ? 'Personal administrativo'
      : 'Invitado externo';

  const careerOrDept =
    attendee.attendeeType === 'STUDENT'
      ? attendee.career?.name || 'Carrera no especificada'
      : attendee.attendeeType === 'TEACHER' || attendee.attendeeType === 'ADMIN_STAFF'
      ? attendee.departmentArea?.name || 'Departamento no especificado'
      : attendee.organization || 'Invitado externo';

  const gradeLabel =
    attendee.attendeeType === 'STUDENT'
      ? attendee.academicGrade?.name || '—'
      : 'No aplica';

  return {
    id: attendee.id,
    fullName: attendee.fullName,
    email: attendee.email,
    attendeeType: attendee.attendeeType,
    attendeeTypeLabel: typeLabel,
    enrollmentNumber: attendee.enrollmentNumber || null,
    careerOrDepartment: careerOrDept,
    semesterOrGrade: gradeLabel,
  };
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
      include: {
        space: true,
        attendanceConfig: true,
        accessOperators: true,
      },
    });

    if (!event) {
      return NextResponse.json({ error: 'Evento no encontrado.' }, { status: 404 });
    }

    if (!canUserOperateEventScanner(user, event)) {
      return NextResponse.json(
        {
          error:
            'No tiene permisos como operador de acceso asignado para validar entradas en este evento.',
        },
        { status: 403 }
      );
    }

    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return NextResponse.json(
        {
          error:
            'Método no permitido. El control de acceso acepta únicamente lecturas QR en tiempo real desde la cámara.',
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const requestedMethod = String(body.method || 'QR').toUpperCase();

    if (requestedMethod !== 'QR') {
      return NextResponse.json(
        {
          error:
            'El registro manual ha sido deshabilitado. Los nuevos registros de asistencia deben realizarse exclusivamente mediante escaneo QR con cámara.',
        },
        { status: 400 }
      );
    }

    const rawQrToken = String(body.qrToken || '').trim();

    // ========================================================================
    // ESCANEO QR INDIVIDUAL EXCLUSIVO CON CÁMARA
    // ========================================================================
    const tokenHash = rawQrToken ? hashQrToken(rawQrToken) : '';

      if (!tokenHash) {
        await prisma.attendanceScanLog.create({
          data: {
            eventId: event.id,
            operatorId: user.id,
            result: 'INVALID_TOKEN',
            method: 'QR',
            details: 'Intento de escaneo sin token válido.',
          },
        });

        return NextResponse.json(
          {
            result: 'INVALID_TOKEN',
            title: 'QR inválido',
            message: 'El código QR no pudo leerse o no contiene un token institucional válido.',
          },
          { status: 200 }
        );
      }

      const credential = await prisma.attendeeQrCredential.findUnique({
        where: { tokenHash },
        include: {
          attendee: {
            include: {
              career: true,
              academicGrade: true,
              departmentArea: true,
              attendance: {
                include: {
                  checkedInBy: { select: { id: true, username: true, fullName: true } },
                },
              },
            },
          },
        },
      });

      // 1 & 2. Validar que la credencial exista
      if (!credential || !credential.attendee) {
        await prisma.attendanceScanLog.create({
          data: {
            eventId: event.id,
            operatorId: user.id,
            result: 'INVALID_TOKEN',
            method: 'QR',
            details: 'Credencial QR inexistente en base de datos.',
          },
        });

        return NextResponse.json(
          {
            result: 'INVALID_TOKEN',
            title: 'QR inválido',
            message: 'La credencial QR escaneada no existe en el sistema.',
          },
          { status: 200 }
        );
      }

      const attendee = credential.attendee;
      const attendeeSummary = formatAttendeeSummaryForScanner(attendee);

      // 4. Verificar que pertenezca al evento seleccionado
      if (attendee.eventId !== event.id) {
        await prisma.attendanceScanLog.create({
          data: {
            eventId: event.id,
            attendeeId: attendee.id,
            operatorId: user.id,
            result: 'WRONG_EVENT',
            method: 'QR',
            details: 'Se intentó utilizar una credencial perteneciente a otro evento.',
          },
        });

        return NextResponse.json(
          {
            result: 'WRONG_EVENT',
            title: 'QR correspondiente a otro evento',
            message:
              'Este código QR fue emitido para un evento distinto y no autoriza el acceso a este recinto.',
            attendee: attendeeSummary,
          },
          { status: 200 }
        );
      }

      // 3 & 5. Verificar que la credencial no esté revocada y que el asistente esté activo
      if (
        !credential.isActive ||
        Boolean(credential.revokedAt) ||
        attendee.registrationStatus === 'REVOKED'
      ) {
        await prisma.attendanceScanLog.create({
          data: {
            eventId: event.id,
            attendeeId: attendee.id,
            operatorId: user.id,
            result: 'REVOKED',
            method: 'QR',
            details:
              attendee.registrationStatus === 'REVOKED'
                ? 'Invitación del asistente revocada.'
                : 'Credencial QR sustituida o revocada.',
          },
        });

        return NextResponse.json(
          {
            result: 'REVOKED',
            title: 'Invitación revocada',
            message:
              attendee.registrationStatus === 'REVOKED'
                ? 'La invitación de esta persona fue revocada por el organizador. Acceso denegado.'
                : 'Este código QR fue invalidado o sustituido por uno más reciente. Solicite presentar el QR vigente.',
            attendee: attendeeSummary,
          },
          { status: 200 }
        );
      }

      // 6. Verificar que el registro de acceso esté abierto
      if (!event.attendanceConfig?.checkInOpen) {
        await prisma.attendanceScanLog.create({
          data: {
            eventId: event.id,
            attendeeId: attendee.id,
            operatorId: user.id,
            result: 'CHECKIN_CLOSED',
            method: 'QR',
            details: 'Intento de escaneo con el control de acceso cerrado.',
          },
        });

        return NextResponse.json(
          {
            result: 'CHECKIN_CLOSED',
            title: 'Evento sin acceso habilitado',
            message:
              'El registro de entradas para este evento se encuentra cerrado o aún no ha sido habilitado por el responsable.',
            attendee: attendeeSummary,
          },
          { status: 200 }
        );
      }

      // 7. Prevención transaccional y concurrente de duplicados en SQLite (Sección 17)
      const txOutcome = await prisma.$transaction(async (tx) => {
        const existingAttendance = await tx.eventAttendance.findUnique({
          where: { eventAttendeeId: attendee.id },
          include: {
            checkedInBy: { select: { id: true, username: true, fullName: true } },
          },
        });

        if (existingAttendance) {
          await tx.attendanceScanLog.create({
            data: {
              eventId: event.id,
              attendeeId: attendee.id,
              operatorId: user.id,
              result: 'DUPLICATE',
              method: 'QR',
              details: `Intento de entrada duplicada. Primera entrada: ${existingAttendance.checkedInAt.toISOString()}.`,
            },
          });

          return {
            duplicate: true,
            attendance: existingAttendance,
          };
        }

        const createdAttendance = await tx.eventAttendance.create({
          data: {
            eventId: event.id,
            eventAttendeeId: attendee.id,
            checkedInById: user.id,
            registrationMethod: 'QR',
          },
          include: {
            checkedInBy: { select: { id: true, username: true, fullName: true } },
          },
        });

        await tx.attendanceScanLog.create({
          data: {
            eventId: event.id,
            attendeeId: attendee.id,
            operatorId: user.id,
            result: 'AUTHORIZED',
            method: 'QR',
            details: 'Acceso autorizado mediante escaneo QR.',
          },
        });

        await tx.auditLog.create({
          data: {
            userId: user.id,
            eventId: event.id,
            action: 'ATTENDANCE_CHECKIN_QR',
            entityType: 'EventAttendance',
            entityId: createdAttendance.id,
            summary: `Entrada registrada por QR: ${attendee.fullName} (${attendeeSummary.attendeeTypeLabel}) validada por operador @${user.username}.`,
          },
        });

        return {
          duplicate: false,
          attendance: createdAttendance,
        };
      });

      if (txOutcome.duplicate) {
        return NextResponse.json(
          {
            result: 'DUPLICATE',
            title: 'ASISTENCIA YA REGISTRADA',
            message: `Esta persona ya registró su ingreso previamente. No se permite una segunda entrada.`,
            attendee: attendeeSummary,
            firstCheckInAt: txOutcome.attendance.checkedInAt,
            firstCheckInMethod: txOutcome.attendance.registrationMethod,
            firstCheckInOperator: txOutcome.attendance.checkedInBy?.fullName || null,
          },
          { status: 200 }
        );
      }

      return NextResponse.json(
        {
          result: 'AUTHORIZED',
          title: 'ACCESO AUTORIZADO',
          message: 'Entrada registrada exitosamente.',
          attendee: attendeeSummary,
          checkedInAt: txOutcome.attendance.checkedInAt,
          method: 'QR',
          operatorName: user.fullName,
        },
        { status: 200 }
      );
  } catch (err) {
    // Handle SQLite unique constraint race condition gracefully as DUPLICATE
    if (err && typeof err === 'object' && 'code' in err && (err as { code?: string }).code === 'P2002') {
      return NextResponse.json(
        {
          result: 'DUPLICATE',
          title: 'ASISTENCIA YA REGISTRADA',
          message: 'Operación concurrente detectada: la entrada de este asistente acaba de ser registrada por otro operador.',
        },
        { status: 200 }
      );
    }
    const msg = err instanceof Error ? err.message : 'Error al validar acceso.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

