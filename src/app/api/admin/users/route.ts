import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/crypto';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Acceso restringido al rol SUPER_ADMIN.' }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    include: {
      building: true,
      authorizedSpaces: {
        select: { id: true, name: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      username: u.username,
      fullName: u.fullName,
      email: u.email,
      role: u.role,
      buildingId: u.buildingId,
      buildingName: u.building?.name ?? null,
      departmentLabel: u.departmentLabel,
      active: u.active,
      isDemo: u.isDemo,
      authorizedSpaces: u.authorizedSpaces,
      createdAt: u.createdAt,
    })),
  });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Acceso restringido al rol SUPER_ADMIN.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const username = String(body.username || '').trim();
    const password = String(body.password || '');
    const fullName = String(body.fullName || '').trim();
    const email = body.email ? String(body.email).trim() : null;
    const role = String(body.role || 'DIRECTOR').toUpperCase();
    const buildingId = body.buildingId ? String(body.buildingId) : null;
    const departmentLabel = body.departmentLabel ? String(body.departmentLabel).trim() : null;

    if (!username || !password || !fullName) {
      return NextResponse.json(
        { error: 'Usuario, contraseña y nombre completo son obligatorios.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres.' },
        { status: 400 }
      );
    }

    if (!['SUPER_ADMIN', 'DIRECTOR', 'EXTENSION'].includes(role)) {
      return NextResponse.json({ error: 'Rol inválido.' }, { status: 400 });
    }

    if (role === 'DIRECTOR' && !buildingId) {
      return NextResponse.json(
        { error: 'Un usuario con rol DIRECTOR debe estar asociado a un edificio.' },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json(
        { error: `El nombre de usuario "${username}" ya existe.` },
        { status: 400 }
      );
    }

    const created = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          username,
          passwordHash: hashPassword(password),
          fullName,
          email,
          role,
          buildingId: role === 'DIRECTOR' ? buildingId : null,
          departmentLabel,
          active: true,
          isDemo: false,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'USER_CREATED',
          entityType: 'User',
          entityId: newUser.id,
          summary: `Usuario "${username}" (${role}) creado por el administrador.`,
          newData: JSON.stringify({ username, fullName, role, buildingId }),
        },
      });

      return newUser;
    });

    return NextResponse.json(
      {
        user: {
          id: created.id,
          username: created.username,
          fullName: created.fullName,
          role: created.role,
          buildingId: created.buildingId,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al crear el usuario.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

