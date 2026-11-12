import { NextRequest, NextResponse } from 'next/server';
import { canUserAuthorizeEquipment, getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  // Sección 11: Únicamente Extensión Universitaria puede autorizar solicitudes de equipo
  if (!canUserAuthorizeEquipment(user)) {
    return NextResponse.json(
      { error: 'Permiso denegado: únicamente Extensión Universitaria puede autorizar o rechazar solicitudes de equipo.' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const decision = String(body.decision || '').toUpperCase();
    const rejectionReason = String(body.rejectionReason || '').trim();
    const decisionNotes = body.decisionNotes ? String(body.decisionNotes).trim() : null;

    if (decision !== 'APPROVED' && decision !== 'REJECTED') {
      return NextResponse.json(
        { error: 'Decisión inválida. Debe ser APPROVED o REJECTED.' },
        { status: 400 }
      );
    }

    if (decision === 'REJECTED' && (!rejectionReason || rejectionReason.length < 5)) {
      return NextResponse.json(
        { error: 'El rechazo de una solicitud de equipo exige indicar un motivo obligatorio.' },
        { status: 400 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const eqReq = await tx.equipmentRequest.findUnique({
        where: { id: params.id },
        include: {
          event: {
            include: { space: true },
          },
          items: {
            include: { equipmentType: true },
          },
        },
      });

      if (!eqReq) {
        throw new Error('Solicitud de equipo no encontrada.');
      }

      if (eqReq.status !== 'PENDING') {
        throw new Error(`Esta solicitud de equipo ya fue procesada (${eqReq.status}).`);
      }

      const itemsNames = eqReq.items.map((i) => i.equipmentType.name).join(', ');

      if (decision === 'APPROVED') {
        const resEq = await tx.equipmentRequest.update({
          where: { id: eqReq.id },
          data: {
            status: 'APPROVED',
            authorizerId: user.id,
            rejectionReason: null,
            decisionNotes,
            resolvedAt: new Date(),
          },
        });

        await tx.auditLog.create({
          data: {
            userId: user.id,
            eventId: eqReq.eventId,
            action: 'EQUIPMENT_APPROVED',
            entityType: 'EquipmentRequest',
            entityId: eqReq.id,
            summary: `Solicitud de equipo (${itemsNames}) APROBADA por Extensión Universitaria (${user.fullName}).`,
            previousData: JSON.stringify({ status: 'PENDING' }),
            newData: JSON.stringify({ status: 'APPROVED', decisionNotes }),
          },
        });

        await tx.notification.create({
          data: {
            userId: eqReq.event.createdById,
            eventId: eqReq.eventId,
            type: 'EQUIPMENT_APPROVED',
            title: `Solicitud de equipo aprobada: ${eqReq.event.name}`,
            message: `Extensión Universitaria aprobó el equipo (${itemsNames}) para el evento "${eqReq.event.name}".`,
            link: `/eventos/${eqReq.eventId}`,
          },
        });

        return resEq;
      } else {
        // El rechazo de equipo es independiente y NO cancela la reservación del espacio
        const resEq = await tx.equipmentRequest.update({
          where: { id: eqReq.id },
          data: {
            status: 'REJECTED',
            authorizerId: user.id,
            rejectionReason,
            decisionNotes,
            resolvedAt: new Date(),
          },
        });

        await tx.auditLog.create({
          data: {
            userId: user.id,
            eventId: eqReq.eventId,
            action: 'EQUIPMENT_REJECTED',
            entityType: 'EquipmentRequest',
            entityId: eqReq.id,
            summary: `Solicitud de equipo (${itemsNames}) RECHAZADA por Extensión Universitaria. La reservación del espacio NO se ve afectada.`,
            reason: rejectionReason,
            previousData: JSON.stringify({ status: 'PENDING' }),
            newData: JSON.stringify({ status: 'REJECTED', rejectionReason }),
          },
        });

        await tx.notification.create({
          data: {
            userId: eqReq.event.createdById,
            eventId: eqReq.eventId,
            type: 'EQUIPMENT_REJECTED',
            title: `Solicitud de equipo rechazada: ${eqReq.event.name}`,
            message: `Tu solicitud de equipo (${itemsNames}) fue rechazada (el espacio continúa vigente). Motivo: ${rejectionReason}`,
            link: `/eventos/${eqReq.eventId}`,
          },
        });

        return resEq;
      }
    });

    return NextResponse.json({ equipmentRequest: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al procesar la solicitud de equipo.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

