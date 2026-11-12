import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { canUserAccessEventPrivateData, getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  const evidence = await prisma.eventEvidence.findUnique({
    where: { id: params.id },
    include: {
      event: {
        include: {
          space: true,
          spaceRequest: true,
          equipmentRequest: true,
        },
      },
    },
  });

  if (!evidence) {
    return NextResponse.json({ error: 'Evidencia no encontrada.' }, { status: 404 });
  }

  const hasAccess = canUserAccessEventPrivateData(user, {
    createdById: evidence.event.createdById,
    space: evidence.event.space,
    spaceRequest: evidence.event.spaceRequest,
    equipmentRequest: evidence.event.equipmentRequest,
  });

  if (!hasAccess) {
    return NextResponse.json(
      { error: 'No tiene permisos para descargar esta evidencia PDF.' },
      { status: 403 }
    );
  }

  const storageDir = path.resolve(process.cwd(), process.env.STORAGE_DIR || './storage/evidences');
  const fullPath = path.join(storageDir, path.basename(evidence.filePath));

  if (!fs.existsSync(fullPath)) {
    return NextResponse.json(
      { error: 'El archivo PDF no se encuentra en el almacenamiento privado.' },
      { status: 404 }
    );
  }

  const fileBuffer = fs.readFileSync(fullPath);

  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${encodeURIComponent(evidence.fileName)}"`,
      'Content-Length': String(fileBuffer.length),
      'Cache-Control': 'private, no-store',
    },
  });
}

