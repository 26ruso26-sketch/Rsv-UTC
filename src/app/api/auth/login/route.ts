import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/crypto';
import { attachSessionCookie } from '@/lib/auth';
import { ensureDatabaseSeeded } from '@/lib/bootstrap';

export async function POST(request: NextRequest) {
  try {
    await ensureDatabaseSeeded();

    const body = await request.json();
    const username = String(body.username || '').trim();
    const password = String(body.password || '');

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Por favor ingrese su nombre de usuario y contraseña.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        building: {
          select: { id: true, name: true },
        },
      },
    });

    if (!user || !user.active) {
      return NextResponse.json(
        { error: 'Credenciales inválidas o cuenta inactiva.' },
        { status: 401 }
      );
    }

    const isValid = verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Credenciales inválidas. Verifique su usuario y contraseña.' },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        buildingId: user.buildingId,
        buildingName: user.building?.name ?? null,
        departmentLabel: user.departmentLabel,
        isDemo: user.isDemo,
      },
    });

    attachSessionCookie(response, {
      id: user.id,
      username: user.username,
      role: user.role,
    });

    return response;
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json(
      { error: 'Error interno al procesar el inicio de sesión.' },
      { status: 500 }
    );
  }
}

