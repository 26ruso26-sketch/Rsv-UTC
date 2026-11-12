import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { prisma } from './prisma';
import { signSessionToken, verifySessionToken } from './crypto';
import { SessionUser, UserRole } from '@/types';

export const SESSION_COOKIE_NAME = 'sreu_session';

export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = verifySessionToken(token);
    if (!payload) return null;

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        building: {
          select: { id: true, name: true },
        },
      },
    });

    if (!user || !user.active) return null;

    return {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      role: user.role as UserRole,
      buildingId: user.buildingId,
      buildingName: user.building?.name ?? null,
      departmentLabel: user.departmentLabel,
      isDemo: user.isDemo,
    };
  } catch {
    return null;
  }
}

export function attachSessionCookie(response: NextResponse, user: { id: string; username: string; role: string }) {
  const token = signSessionToken({
    userId: user.id,
    username: user.username,
    role: user.role,
  });

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 12,
    secure: process.env.NODE_ENV === 'production',
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

/**
 * Checks whether a user can authorize a specific space request or schedule change for that space.
 * Strict rule from Section 3:
 * - A DIRECTOR can ONLY authorize requests for the auditorium of their own building (where space.authorizerUserId === user.id).
 * - EXTENSION can ONLY authorize requests for spaces assigned to Extensión Universitaria (where space.authorizerUserId === user.id).
 */
export function canUserAuthorizeSpace(
  user: SessionUser,
  space: { authorizerUserId: string; buildingId?: string | null }
): boolean {
  if (user.role === 'DIRECTOR') {
    if (space.authorizerUserId !== user.id) return false;
    if (space.buildingId && user.buildingId && space.buildingId !== user.buildingId) return false;
    return true;
  }
  if (user.role === 'EXTENSION') {
    return space.authorizerUserId === user.id;
  }
  return false;
}

/**
 * Checks whether a user can authorize equipment requests.
 * Section 11: "Únicamente Extensión Universitaria puede autorizarla."
 */
export function canUserAuthorizeEquipment(user: SessionUser): boolean {
  return user.role === 'EXTENSION';
}

/**
 * Checks whether a user is the organizer/creator of an event or SUPER_ADMIN.
 * Used for managing attendance configuration, permanent guest lists, access operators,
 * opening/closing check-in, and uploading closure evidence.
 */
export function canUserManageEventAttendance(
  user: SessionUser,
  event: { createdById: string }
): boolean {
  if (user.role === 'SUPER_ADMIN') return true;
  return event.createdById === user.id;
}

/**
 * Checks whether a user can operate the QR scanner & manual check-in for an event (Section 15).
 * Permitted for:
 * - SUPER_ADMIN
 * - Event creator (organizer)
 * - Active assigned EventAccessOperator for this specific event
 */
export function canUserOperateEventScanner(
  user: SessionUser,
  event: {
    createdById: string;
    accessOperators?: { userId: string; active: boolean }[] | null;
  }
): boolean {
  if (user.role === 'SUPER_ADMIN') return true;
  if (event.createdById === user.id) return true;
  if (
    event.accessOperators &&
    event.accessOperators.some((op) => op.userId === user.id && op.active)
  ) {
    return true;
  }
  return false;
}

/**
 * Checks whether a user can view full private details & PDF evidences of an event.
 * Permitted for:
 * - SUPER_ADMIN
 * - The user who registered the event (event.createdById === user.id)
 * - The assigned space authorizer (space.authorizerUserId === user.id)
 * - EXTENSION if the event has an equipment request or is in an EXTENSION space
 * - Assigned active access operator for the event
 */
export function canUserAccessEventPrivateData(
  user: SessionUser,
  event: {
    createdById: string;
    space?: { authorizerUserId: string; buildingId?: string | null } | null;
    spaceRequest?: { authorizerId: string } | null;
    equipmentRequest?: { id: string } | null;
    accessOperators?: { userId: string; active: boolean }[] | null;
  }
): boolean {
  if (user.role === 'SUPER_ADMIN') return true;
  if (event.createdById === user.id) return true;
  if (event.space?.authorizerUserId === user.id) return true;
  if (event.spaceRequest?.authorizerId === user.id) return true;
  if (user.role === 'EXTENSION' && event.equipmentRequest) return true;
  if (
    event.accessOperators &&
    event.accessOperators.some((op) => op.userId === user.id && op.active)
  ) {
    return true;
  }
  return false;
}
