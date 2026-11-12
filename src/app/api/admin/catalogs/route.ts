import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Acceso restringido a SUPER_ADMIN.' }, { status: 403 });
  }

  const [careers, academicGrades, departmentAreas] = await Promise.all([
    prisma.career.findMany({ orderBy: { code: 'asc' } }),
    prisma.academicGrade.findMany({ orderBy: { levelOrder: 'asc' } }),
    prisma.departmentArea.findMany({ orderBy: [{ areaType: 'asc' }, { name: 'asc' }] }),
  ]);

  return NextResponse.json({
    careers,
    academicGrades,
    departmentAreas,
  });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Acceso restringido a SUPER_ADMIN.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const catalogType = String(body.catalogType || '').toUpperCase(); // CAREER | GRADE | DEPARTMENT
    const code = String(body.code || '').trim().toUpperCase();
    const name = String(body.name || '').trim();

    if (!code || !name) {
      return NextResponse.json(
        { error: 'El código y el nombre del catálogo son obligatorios.' },
        { status: 400 }
      );
    }

    if (catalogType === 'CAREER') {
      const description = body.description ? String(body.description).trim() : null;
      const created = await prisma.career.create({
        data: { code, name, description, active: true, isDemo: false },
      });
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'CATALOG_CREATED',
          entityType: 'Career',
          entityId: created.id,
          summary: `Carrera "${created.name}" (${created.code}) agregada al catálogo.`,
          newData: JSON.stringify(created),
        },
      });
      return NextResponse.json({ item: created }, { status: 201 });
    }

    if (catalogType === 'GRADE') {
      const levelOrder = Number(body.levelOrder) || 1;
      const created = await prisma.academicGrade.create({
        data: { code, name, levelOrder, active: true, isDemo: false },
      });
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'CATALOG_CREATED',
          entityType: 'AcademicGrade',
          entityId: created.id,
          summary: `Semestre/Grado "${created.name}" (${created.code}) agregado al catálogo.`,
          newData: JSON.stringify(created),
        },
      });
      return NextResponse.json({ item: created }, { status: 201 });
    }

    if (catalogType === 'DEPARTMENT') {
      const areaType =
        String(body.areaType || 'ACADEMIC').toUpperCase() === 'ADMINISTRATIVE'
          ? 'ADMINISTRATIVE'
          : 'ACADEMIC';
      const created = await prisma.departmentArea.create({
        data: { code, name, areaType, active: true, isDemo: false },
      });
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'CATALOG_CREATED',
          entityType: 'DepartmentArea',
          entityId: created.id,
          summary: `Departamento/Área "${created.name}" (${areaType}) agregado al catálogo.`,
          newData: JSON.stringify(created),
        },
      });
      return NextResponse.json({ item: created }, { status: 201 });
    }

    return NextResponse.json({ error: 'Tipo de catálogo inválido.' }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al crear elemento de catálogo.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Acceso restringido a SUPER_ADMIN.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const catalogType = String(body.catalogType || '').toUpperCase();
    const id = String(body.id || '');
    const name = body.name !== undefined ? String(body.name).trim() : undefined;
    const active = body.active !== undefined ? Boolean(body.active) : undefined;

    if (!id) {
      return NextResponse.json({ error: 'El ID es obligatorio.' }, { status: 400 });
    }

    if (catalogType === 'CAREER') {
      const updated = await prisma.career.update({
        where: { id },
        data: {
          ...(name ? { name } : {}),
          ...(active !== undefined ? { active } : {}),
        },
      });
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'CATALOG_UPDATED',
          entityType: 'Career',
          entityId: updated.id,
          summary: `Catálogo de carrera "${updated.name}" actualizado.`,
          newData: JSON.stringify(updated),
        },
      });
      return NextResponse.json({ item: updated });
    }

    if (catalogType === 'GRADE') {
      const levelOrder = body.levelOrder !== undefined ? Number(body.levelOrder) : undefined;
      const updated = await prisma.academicGrade.update({
        where: { id },
        data: {
          ...(name ? { name } : {}),
          ...(levelOrder !== undefined && !Number.isNaN(levelOrder) ? { levelOrder } : {}),
          ...(active !== undefined ? { active } : {}),
        },
      });
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'CATALOG_UPDATED',
          entityType: 'AcademicGrade',
          entityId: updated.id,
          summary: `Catálogo de grado "${updated.name}" actualizado.`,
          newData: JSON.stringify(updated),
        },
      });
      return NextResponse.json({ item: updated });
    }

    if (catalogType === 'DEPARTMENT') {
      const areaType =
        body.areaType !== undefined
          ? String(body.areaType).toUpperCase() === 'ADMINISTRATIVE'
            ? 'ADMINISTRATIVE'
            : 'ACADEMIC'
          : undefined;
      const updated = await prisma.departmentArea.update({
        where: { id },
        data: {
          ...(name ? { name } : {}),
          ...(areaType ? { areaType } : {}),
          ...(active !== undefined ? { active } : {}),
        },
      });
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'CATALOG_UPDATED',
          entityType: 'DepartmentArea',
          entityId: updated.id,
          summary: `Catálogo de área/departamento "${updated.name}" actualizado.`,
          newData: JSON.stringify(updated),
        },
      });
      return NextResponse.json({ item: updated });
    }

    return NextResponse.json({ error: 'Tipo de catálogo inválido.' }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al actualizar elemento de catálogo.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

