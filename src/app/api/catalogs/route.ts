import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ensureDatabaseSeeded } from '@/lib/bootstrap';
import { getSmtpConfig } from '@/lib/mail-service';

export async function GET() {
  await ensureDatabaseSeeded();
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  const [
    buildings,
    spaces,
    audienceTypes,
    equipmentTypes,
    users,
    careers,
    academicGrades,
    departmentAreas,
  ] = await Promise.all([
    prisma.building.findMany({
      where: { active: true },
      orderBy: { code: 'asc' },
    }),
    prisma.space.findMany({
      where: { active: true },
      include: {
        building: { select: { id: true, name: true, code: true } },
        authorizer: {
          select: { id: true, username: true, fullName: true, role: true, departmentLabel: true },
        },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.audienceType.findMany({
      where: { active: true },
      orderBy: { level: 'asc' },
    }),
    prisma.equipmentType.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    }),
    prisma.user.findMany({
      where: { active: true },
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        departmentLabel: true,
        email: true,
      },
      orderBy: { fullName: 'asc' },
    }),
    prisma.career.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    }),
    prisma.academicGrade.findMany({
      where: { active: true },
      orderBy: { levelOrder: 'asc' },
    }),
    prisma.departmentArea.findMany({
      where: { active: true },
      orderBy: [{ areaType: 'asc' }, { name: 'asc' }],
    }),
  ]);

  const smtp = getSmtpConfig();

  return NextResponse.json({
    buildings,
    spaces,
    audienceTypes,
    equipmentTypes,
    users,
    careers,
    academicGrades,
    departmentAreas,
    institutionalEmailDomain: process.env.INSTITUTIONAL_EMAIL_DOMAIN || 'utc.edu.mx',
    smtpConfigured: smtp.configured,
  });
}
