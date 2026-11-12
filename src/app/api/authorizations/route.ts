import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { syncExpiredRequestsAndChanges } from '@/lib/lifecycle';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  await syncExpiredRequestsAndChanges();

  const { searchParams } = new URL(request.url);
  const filterStatus = searchParams.get('status') || 'ALL';

  const statusWhere = filterStatus !== 'ALL' ? { status: filterStatus } : {};

  if (user.role === 'DIRECTOR') {
    const [spaceRequests, scheduleChangeRequests] = await Promise.all([
      prisma.spaceRequest.findMany({
        where: {
          authorizerId: user.id,
          ...statusWhere,
        },
        include: {
          space: { include: { building: true } },
          authorizer: { select: { id: true, username: true, fullName: true } },
          event: {
            include: {
              createdBy: { select: { id: true, username: true, fullName: true, departmentLabel: true } },
              audiences: { include: { audienceType: true } },
              equipmentRequest: {
                include: { items: { include: { equipmentType: true } } },
              },
              evidences: { select: { id: true, fileName: true, fileSize: true } },
            },
          },
        },
        orderBy: [{ status: 'asc' }, { requestedAt: 'desc' }],
      }),
      prisma.scheduleChangeRequest.findMany({
        where: {
          authorizerId: user.id,
          ...statusWhere,
        },
        include: {
          space: true,
          requestedBy: { select: { id: true, username: true, fullName: true, departmentLabel: true } },
          authorizer: { select: { id: true, username: true, fullName: true } },
          event: {
            select: {
              id: true,
              demoCode: true,
              name: true,
              responsibleName: true,
              responsibleDepartment: true,
              criticalityLevel: true,
            },
          },
        },
        orderBy: [{ status: 'asc' }, { requestedAt: 'desc' }],
      }),
    ]);

    return NextResponse.json({
      spaceRequests,
      equipmentRequests: [],
      scheduleChangeRequests,
    });
  }

  if (user.role === 'EXTENSION') {
    const [spaceRequests, equipmentRequests, scheduleChangeRequests] = await Promise.all([
      prisma.spaceRequest.findMany({
        where: {
          authorizerId: user.id,
          ...statusWhere,
        },
        include: {
          space: true,
          authorizer: { select: { id: true, username: true, fullName: true } },
          event: {
            include: {
              createdBy: { select: { id: true, username: true, fullName: true, departmentLabel: true } },
              audiences: { include: { audienceType: true } },
              equipmentRequest: {
                include: { items: { include: { equipmentType: true } } },
              },
              evidences: { select: { id: true, fileName: true, fileSize: true } },
            },
          },
        },
        orderBy: [{ status: 'asc' }, { requestedAt: 'desc' }],
      }),
      prisma.equipmentRequest.findMany({
        where: {
          ...statusWhere,
        },
        include: {
          items: { include: { equipmentType: true } },
          authorizer: { select: { id: true, username: true, fullName: true } },
          event: {
            include: {
              space: true,
              spaceRequest: { select: { id: true, status: true } },
              createdBy: { select: { id: true, username: true, fullName: true, departmentLabel: true } },
              audiences: { include: { audienceType: true } },
            },
          },
        },
        orderBy: [{ status: 'asc' }, { requestedAt: 'desc' }],
      }),
      prisma.scheduleChangeRequest.findMany({
        where: {
          authorizerId: user.id,
          ...statusWhere,
        },
        include: {
          space: true,
          requestedBy: { select: { id: true, username: true, fullName: true, departmentLabel: true } },
          authorizer: { select: { id: true, username: true, fullName: true } },
          event: {
            select: {
              id: true,
              demoCode: true,
              name: true,
              responsibleName: true,
              responsibleDepartment: true,
              criticalityLevel: true,
            },
          },
        },
        orderBy: [{ status: 'asc' }, { requestedAt: 'desc' }],
      }),
    ]);

    return NextResponse.json({
      spaceRequests,
      equipmentRequests,
      scheduleChangeRequests,
    });
  }

  // SUPER_ADMIN consulta todas las bandejas
  const [spaceRequests, equipmentRequests, scheduleChangeRequests] = await Promise.all([
    prisma.spaceRequest.findMany({
      where: { ...statusWhere },
      include: {
        space: { include: { building: true } },
        authorizer: { select: { id: true, username: true, fullName: true } },
        event: {
          include: {
            createdBy: { select: { id: true, username: true, fullName: true, departmentLabel: true } },
            audiences: { include: { audienceType: true } },
            equipmentRequest: {
              include: { items: { include: { equipmentType: true } } },
            },
            evidences: { select: { id: true, fileName: true, fileSize: true } },
          },
        },
      },
      orderBy: [{ status: 'asc' }, { requestedAt: 'desc' }],
    }),
    prisma.equipmentRequest.findMany({
      where: { ...statusWhere },
      include: {
        items: { include: { equipmentType: true } },
        authorizer: { select: { id: true, username: true, fullName: true } },
        event: {
          include: {
            space: true,
            spaceRequest: { select: { id: true, status: true } },
            createdBy: { select: { id: true, username: true, fullName: true, departmentLabel: true } },
            audiences: { include: { audienceType: true } },
          },
        },
      },
      orderBy: [{ status: 'asc' }, { requestedAt: 'desc' }],
    }),
    prisma.scheduleChangeRequest.findMany({
      where: { ...statusWhere },
      include: {
        space: true,
        requestedBy: { select: { id: true, username: true, fullName: true, departmentLabel: true } },
        authorizer: { select: { id: true, username: true, fullName: true } },
        event: {
          select: {
            id: true,
            demoCode: true,
            name: true,
            responsibleName: true,
            responsibleDepartment: true,
            criticalityLevel: true,
          },
        },
      },
      orderBy: [{ status: 'asc' }, { requestedAt: 'desc' }],
    }),
  ]);

  return NextResponse.json({
    spaceRequests,
    equipmentRequests,
    scheduleChangeRequests,
  });
}
