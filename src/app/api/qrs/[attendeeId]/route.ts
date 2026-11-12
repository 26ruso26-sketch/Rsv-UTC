import { NextRequest, NextResponse } from 'next/server';
import {
  canUserManageEventAttendance,
  canUserOperateEventScanner,
  getCurrentUser,
} from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  generateAttendeePassPdfBuffer,
  readStoredQrPngBuffer,
} from '@/lib/qr-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { attendeeId: string } }
) {
  const { searchParams } = new URL(request.url);
  const format = (searchParams.get('format') || 'png').toLowerCase(); // 'png' | 'pdf'
  const download = searchParams.get('download') === '1';
  const publicToken = (searchParams.get('publicToken') || '').trim();

  const attendee = await prisma.eventAttendee.findUnique({
    where: { id: params.attendeeId },
    include: {
      career: true,
      academicGrade: true,
      departmentArea: true,
      event: {
        include: {
          space: true,
          attendanceConfig: true,
          accessOperators: true,
        },
      },
      qrCredentials: {
        where: { isActive: true, revokedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!attendee) {
    return NextResponse.json({ error: 'Asistente no encontrado.' }, { status: 404 });
  }

  // Authorize either via authenticated organizer/operator/admin OR via matching publicRegistrationToken right after self-registration
  const user = await getCurrentUser();
  let authorized = false;

  if (user) {
    authorized =
      canUserManageEventAttendance(user, attendee.event) ||
      canUserOperateEventScanner(user, attendee.event);
  } else if (
    publicToken &&
    attendee.event.attendanceConfig?.accessMode === 'OPEN' &&
    attendee.event.attendanceConfig?.publicRegistrationToken === publicToken
  ) {
    authorized = true;
  }

  if (!authorized) {
    return NextResponse.json(
      { error: 'No autorizado para descargar este código QR.' },
      { status: 403 }
    );
  }

  if (attendee.registrationStatus === 'REVOKED') {
    return NextResponse.json(
      { error: 'La invitación y credencial QR de este registro fueron revocadas.' },
      { status: 410 }
    );
  }

  const activeQr = attendee.qrCredentials[0];
  if (!activeQr) {
    return NextResponse.json(
      { error: 'No existe una credencial QR activa para este asistente.' },
      { status: 404 }
    );
  }

  const qrPngBuffer = readStoredQrPngBuffer(activeQr.qrImagePath);
  if (!qrPngBuffer) {
    return NextResponse.json(
      { error: 'La imagen QR no se encuentra en el almacenamiento privado.' },
      { status: 404 }
    );
  }

  const safeSlug = attendee.fullName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 40);

  if (format === 'pdf') {
    const attendeeTypeLabel =
      attendee.attendeeType === 'STUDENT'
        ? 'Alumno'
        : attendee.attendeeType === 'TEACHER'
        ? 'Docente'
        : attendee.attendeeType === 'ADMIN_STAFF'
        ? 'Personal administrativo'
        : 'Invitado externo';

    const detailLine =
      attendee.attendeeType === 'STUDENT'
        ? `Matricula: ${attendee.enrollmentNumber || '-'} | Carrera: ${
            attendee.career?.name || '-'
          } | Grado: ${attendee.academicGrade?.name || '-'}`
        : attendee.attendeeType === 'TEACHER' || attendee.attendeeType === 'ADMIN_STAFF'
        ? `Departamento / Area: ${attendee.departmentArea?.name || '-'}`
        : `Organizacion: ${attendee.organization || 'Invitado externo'}`;

    const pdfBuffer = generateAttendeePassPdfBuffer({
      eventName: attendee.event.name,
      eventCode: attendee.event.id.slice(0, 8),
      eventDate: attendee.event.date,
      eventStartTime: attendee.event.startTime,
      eventEndTime: attendee.event.endTime,
      spaceName: attendee.event.space.name,
      accessMode: attendee.event.attendanceConfig?.accessMode || 'RESTRICTED',
      attendeeName: attendee.fullName,
      attendeeEmail: attendee.email,
      attendeeTypeLabel,
      detailLine,
      credentialId: activeQr.id,
      qrPngBuffer,
    });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${
          download ? 'attachment' : 'inline'
        }; filename="pase-qr-${safeSlug}.pdf"`,
        'Content-Length': String(pdfBuffer.length),
        'Cache-Control': 'private, no-store',
      },
    });
  }

  return new NextResponse(new Uint8Array(qrPngBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': `${
        download ? 'attachment' : 'inline'
      }; filename="qr-${safeSlug}.png"`,
      'Content-Length': String(qrPngBuffer.length),
      'Cache-Control': 'private, no-store',
    },
  });
}

