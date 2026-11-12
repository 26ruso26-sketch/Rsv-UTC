import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { canUserManageEventAttendance, getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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
      include: { attendanceConfig: true, spaceRequest: true },
    });

    if (!event) {
      return NextResponse.json({ error: 'Evento no encontrado.' }, { status: 404 });
    }

    if (!canUserManageEventAttendance(user, event)) {
      return NextResponse.json(
        { error: 'Solo el responsable que registró el evento o SUPER_ADMIN puede configurar el control de asistencia.' },
        { status: 403 }
      );
    }

    const body = await request.json();

    const currentConfig =
      event.attendanceConfig ||
      (await prisma.eventAttendanceConfig.create({
        data: {
          eventId: event.id,
          accessMode: 'RESTRICTED',
          registrationEnabled: false,
          publicRegistrationToken: `reg_${crypto.randomBytes(16).toString('hex')}`,
          checkInOpen: false,
          institutionalEmailDomain: process.env.INSTITUTIONAL_EMAIL_DOMAIN || 'utc.edu.mx',
        },
      }));

    const accessMode =
      body.accessMode !== undefined
        ? String(body.accessMode).toUpperCase() === 'OPEN'
          ? 'OPEN'
          : 'RESTRICTED'
        : currentConfig.accessMode;

    const registrationEnabled =
      accessMode === 'RESTRICTED'
        ? false
        : body.registrationEnabled !== undefined
        ? Boolean(body.registrationEnabled)
        : currentConfig.registrationEnabled;

    const registrationStartAt =
      body.registrationStartAt !== undefined
        ? body.registrationStartAt
          ? new Date(body.registrationStartAt)
          : null
        : currentConfig.registrationStartAt;

    const registrationEndAt =
      body.registrationEndAt !== undefined
        ? body.registrationEndAt
          ? new Date(body.registrationEndAt)
          : null
        : currentConfig.registrationEndAt;

    const institutionalEmailDomain =
      body.institutionalEmailDomain !== undefined
        ? String(body.institutionalEmailDomain || '').trim() || null
        : currentConfig.institutionalEmailDomain;

    let checkInOpen = currentConfig.checkInOpen;
    let checkInClosedAt = currentConfig.checkInClosedAt;

    if (body.checkInOpen !== undefined) {
      const nextOpen = Boolean(body.checkInOpen);
      if (nextOpen && event.spaceRequest?.status !== 'APPROVED') {
        return NextResponse.json(
          {
            error:
              'Solo se puede habilitar el escaneo de entradas cuando la solicitud del espacio está APROBADA.',
          },
          { status: 400 }
        );
      }
      checkInOpen = nextOpen;
      if (!nextOpen && currentConfig.checkInOpen) {
        checkInClosedAt = new Date();
      } else if (nextOpen) {
        checkInClosedAt = null;
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const cfg = await tx.eventAttendanceConfig.update({
        where: { id: currentConfig.id },
        data: {
          accessMode,
          registrationEnabled,
          registrationStartAt,
          registrationEndAt,
          checkInOpen,
          checkInClosedAt,
          institutionalEmailDomain,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          eventId: event.id,
          action:
            body.checkInOpen !== undefined
              ? checkInOpen
                ? 'CHECKIN_OPENED'
                : 'CHECKIN_CLOSED'
              : 'ATTENDANCE_CONFIG_UPDATED',
          entityType: 'EventAttendanceConfig',
          entityId: cfg.id,
          summary:
            body.checkInOpen !== undefined
              ? checkInOpen
                ? `Control de acceso y escaneo QR HABILITADO para "${event.name}".`
                : `Control de acceso y registro de entradas CERRADO para "${event.name}" (independiente del cierre documental).`
              : `Configuración de asistencia actualizada: modalidad ${accessMode}, inscripciones públicas ${
                  registrationEnabled ? 'activas' : 'inactivas'
                }.`,
          previousData: JSON.stringify({
            accessMode: currentConfig.accessMode,
            registrationEnabled: currentConfig.registrationEnabled,
            checkInOpen: currentConfig.checkInOpen,
          }),
          newData: JSON.stringify({
            accessMode: cfg.accessMode,
            registrationEnabled: cfg.registrationEnabled,
            checkInOpen: cfg.checkInOpen,
            checkInClosedAt: cfg.checkInClosedAt,
          }),
        },
      });

      return cfg;
    });

    return NextResponse.json({ attendanceConfig: updated });
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : 'Error al actualizar configuración de asistencia.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

