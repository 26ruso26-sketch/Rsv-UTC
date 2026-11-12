import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/crypto';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Acceso restringido al rol SUPER_ADMIN.' }, { status: 403 });
  }

  try {
    const body = await request.json();

    const updated = await prisma.$transaction(async (tx) => {
      const targetUser = await tx.user.findUnique({ where: { id: params.id } });
      if (!targetUser) {
        throw new Error('Usuario no encontrado.');
      }

      const fullName = body.fullName !== undefined ? String(body.fullName).trim() : targetUser.fullName;
      const email =
        body.email !== undefined ? (body.email ? String(body.email).trim() : null) : targetUser.email;
      const role = body.role !== undefined ? String(body.role).toUpperCase() : targetUser.role;
      const buildingId =
        body.buildingId !== undefined
          ? body.buildingId
            ? String(body.buildingId)
            : null
          : targetUser.buildingId;
      const departmentLabel =
        body.departmentLabel !== undefined
          ? body.departmentLabel
            ? String(body.departmentLabel).trim()
            : null
          : targetUser.departmentLabel;
      const active = body.active !== undefined ? Boolean(body.active) : targetUser.active;

      const updateData: Record<string, unknown> = {
        fullName,
        email,
        role,
        buildingId: role === 'DIRECTOR' ? buildingId : null,
        departmentLabel,
        active,
      };

      if (body.password && String(body.password).trim().length >= 6) {
        updateData.passwordHash = hashPassword(String(body.password).trim());
      }

      const saved = await tx.user.update({
        where: { id: targetUser.id },
        data: updateData,
      });

      // Si es DIRECTOR y tiene un edificio asignado, actualizar el autorizador del auditorio de ese edificio
      if (role === 'DIRECTOR' && buildingId) {
        await tx.space.updateMany({
          where: { buildingId, authorizerType: 'DIRECTOR' },
          data: { authorizerUserId: saved.id },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'USER_UPDATED',
          entityType: 'User',
          entityId: saved.id,
          summary: `Usuario "${saved.username}" actualizado por el administrador.`,
          previousData: JSON.stringify({
            fullName: targetUser.fullName,
            role: targetUser.role,
            buildingId: targetUser.buildingId,
            active: targetUser.active,
          }),
          newData: JSON.stringify({
            fullName: saved.fullName,
            role: saved.role,
            buildingId: saved.buildingId,
            active: saved.active,
          }),
        },
      });

      return saved;
    });

    return NextResponse.json({
      user: {
        id: updated.id,
        username: updated.username,
        fullName: updated.fullName,
        role: updated.role,
        buildingId: updated.buildingId,
        active: updated.active,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al actualizar el usuario.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

