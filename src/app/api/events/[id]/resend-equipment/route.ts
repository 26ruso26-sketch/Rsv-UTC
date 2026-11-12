import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const equipmentCodes: string[] = Array.isArray(body.equipmentCodes)
      ? body.equipmentCodes.map((c: unknown) => String(c))
      : [];
    const description = String(body.description || '').trim();

    if (equipmentCodes.length === 0) {
      return NextResponse.json(
        { error: 'Seleccione al menos un tipo de equipo (Equipo de sonido y/o Mobiliario).' },
        { status: 400 }
      );
    }

    if (!description || description.length < 5) {
      return NextResponse.json(
        { error: 'Debe proporcionar una descripción detallada del equipo requerido.' },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const event = await tx.event.findUnique({
        where: { id: params.id },
        include: {
          equipmentRequest: {
            include: {
              items: { include: { equipmentType: true } },
            },
          },
        },
      });

      if (!event) {
        throw new Error('Evento no encontrado.');
      }

      if (event.createdById !== user.id && user.role !== 'SUPER_ADMIN') {
        throw new Error('Solo el usuario que registró el evento puede modificar y reenviar la solicitud de equipo.');
      }

      if (!event.equipmentRequest) {
        throw new Error('Este evento no cuenta con una solicitud de equipo previa.');
      }

      if (event.equipmentRequest.status !== 'REJECTED') {
        throw new Error('Solo se pueden corregir y reenviar solicitudes de equipo rechazadas.');
      }

      const extUniUser = await tx.user.findFirst({
        where: { role: 'EXTENSION', active: true },
      });

      const eqTypes = await tx.equipmentType.findMany({
        where: { code: { in: equipmentCodes } },
      });

      const prevData = {
        description: event.equipmentRequest.description,
        items: event.equipmentRequest.items.map((i) => i.equipmentType.name),
        rejectionReason: event.equipmentRequest.rejectionReason,
      };

      const updatedEq = await tx.equipmentRequest.update({
        where: { id: event.equipmentRequest.id },
        data: {
          status: 'PENDING',
          description,
          rejectionReason: null,
          resolvedAt: null,
          authorizerId: extUniUser?.id ?? event.equipmentRequest.authorizerId,
          revisionCount: { increment: 1 },
          requestedAt: new Date(),
        },
      });

      await tx.equipmentRequestType.deleteMany({
        where: { equipmentRequestId: updatedEq.id },
      });

      for (const t of eqTypes) {
        await tx.equipmentRequestType.create({
          data: {
            equipmentRequestId: updatedEq.id,
            equipmentTypeId: t.id,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: user.id,
          eventId: event.id,
          action: 'EQUIPMENT_RESENT',
          entityType: 'EquipmentRequest',
          entityId: updatedEq.id,
          summary: `Solicitud de equipo corregida y reenviada a Extensión Universitaria (${eqTypes
            .map((t) => t.name)
            .join(', ')}).`,
          previousData: JSON.stringify(prevData),
          newData: JSON.stringify({
            description,
            items: eqTypes.map((t) => t.name),
            status: 'PENDING',
          }),
        },
      });

      if (extUniUser) {
        await tx.notification.create({
          data: {
            userId: extUniUser.id,
            eventId: event.id,
            type: 'REQUEST_RESENT',
            title: `Solicitud de equipo reenviada: ${event.name}`,
            message: `${user.fullName} corrigió y reenvió la solicitud de equipo para el evento "${event.name}".`,
            link: `/autorizaciones`,
          },
        });
      }

      return updatedEq;
    });

    return NextResponse.json({ equipmentRequest: result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al reenviar la solicitud de equipo.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

