import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { canUserAccessEventPrivateData, getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validatePdfBuffer } from '@/lib/pdf-generator';
import { parseMonterreyDateTime } from '@/lib/lifecycle';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  const writtenFilePaths: string[] = [];

  try {
    const event = await prisma.event.findUnique({
      where: { id: params.id },
      include: {
        space: true,
        spaceRequest: true,
        equipmentRequest: true,
        evidences: true,
      },
    });

    if (!event) {
      return NextResponse.json({ error: 'Evento no encontrado.' }, { status: 404 });
    }

    const canAccess = canUserAccessEventPrivateData(user, {
      createdById: event.createdById,
      space: event.space,
      spaceRequest: event.spaceRequest,
      equipmentRequest: event.equipmentRequest,
    });

    if (!canAccess) {
      return NextResponse.json(
        { error: 'No tiene permisos para adjuntar evidencias a este evento.' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const rawCategory = String(formData.get('category') || 'SUPPORTING_DOCUMENT')
      .trim()
      .toUpperCase();
    const category =
      rawCategory === 'CLOSURE_EVIDENCE' ? 'CLOSURE_EVIDENCE' : 'SUPPORTING_DOCUMENT';

    const replaceEvidenceId = formData.get('replaceEvidenceId')
      ? String(formData.get('replaceEvidenceId')).trim()
      : null;
    const replacementReason = formData.get('replacementReason')
      ? String(formData.get('replacementReason')).trim()
      : null;

    // Collect one or multiple files
    const files: File[] = [];
    const multiFiles = formData.getAll('files');
    for (const item of multiFiles) {
      if (item instanceof File && item.size > 0) {
        files.push(item);
      }
    }
    const singleFile = formData.get('file');
    if (singleFile instanceof File && singleFile.size > 0 && files.length === 0) {
      files.push(singleFile);
    }

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'Debe seleccionar al menos un archivo PDF válido.' },
        { status: 400 }
      );
    }

    // Validations specific to CLOSURE_EVIDENCE (Section 6)
    if (category === 'CLOSURE_EVIDENCE') {
      if (event.spaceRequest?.status !== 'APPROVED') {
        return NextResponse.json(
          {
            error:
              'Solo los eventos con solicitud de espacio APROBADA pueden realizar el cierre documental.',
          },
          { status: 400 }
        );
      }

      const now = new Date();
      const endAt = parseMonterreyDateTime(event.date, event.endTime);
      if (now.getTime() < endAt.getTime()) {
        return NextResponse.json(
          {
            error:
              'No se permite cerrar eventos futuros ni en curso. La evidencia de cierre solo puede adjuntarse cuando la fecha y hora de finalización del evento ya concluyeron.',
          },
          { status: 400 }
        );
      }

      if (replaceEvidenceId) {
        if (user.role !== 'SUPER_ADMIN') {
          return NextResponse.json(
            {
              error:
                'Una vez cerrado el evento, los reemplazos excepcionales de evidencia de cierre requieren permisos administrativos (SUPER_ADMIN).',
            },
            { status: 403 }
          );
        }
        if (!replacementReason || replacementReason.length < 5) {
          return NextResponse.json(
            {
              error:
                'Debe indicar el motivo administrativo del reemplazo excepcional de la evidencia de cierre.',
            },
            { status: 400 }
          );
        }
      }
    }

    const maxMb = Number(process.env.MAX_PDF_SIZE_MB || '10') || 10;
    const maxBytes = maxMb * 1024 * 1024;

    const preparedFiles: {
      originalName: string;
      storedName: string;
      fullPath: string;
      buffer: Buffer;
    }[] = [];

    const storageDir = path.resolve(
      process.cwd(),
      process.env.STORAGE_DIR || './storage/evidences'
    );
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    for (const f of files) {
      const arrayBuffer = await f.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const validation = validatePdfBuffer(buffer, f.name, maxBytes);
      if (!validation.valid) {
        return NextResponse.json({ error: `${f.name}: ${validation.error}` }, { status: 400 });
      }

      const safeBaseName = f.name
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/\.pdf$/i, '');
      const storedName = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${safeBaseName}.pdf`;
      const fullPath = path.join(storageDir, storedName);

      preparedFiles.push({
        originalName: f.name,
        storedName,
        fullPath,
        buffer,
      });
    }

    // Write files to private storage first; if DB transaction fails, clean up newly written files
    for (const pf of preparedFiles) {
      fs.writeFileSync(pf.fullPath, pf.buffer);
      writtenFilePaths.push(pf.fullPath);
    }

    const createdEvidences = await prisma.$transaction(async (tx) => {
      const results = [];

      for (const pf of preparedFiles) {
        const ev = await tx.eventEvidence.create({
          data: {
            eventId: event.id,
            fileName: pf.originalName,
            storedName: pf.storedName,
            filePath: pf.storedName,
            fileSize: pf.buffer.length,
            mimeType: 'application/pdf',
            category,
            isArchived: false,
            uploadedById: user.id,
          },
          include: {
            uploadedBy: { select: { id: true, username: true, fullName: true } },
          },
        });
        results.push(ev);
      }

      if (category === 'CLOSURE_EVIDENCE') {
        const now = new Date();

        if (replaceEvidenceId && results[0]) {
          const oldEv = await tx.eventEvidence.findUnique({
            where: { id: replaceEvidenceId },
          });
          if (oldEv && oldEv.eventId === event.id) {
            await tx.eventEvidence.update({
              where: { id: oldEv.id },
              data: {
                isArchived: true,
                replacedById: results[0].id,
                replacementReason,
              },
            });

            await tx.auditLog.create({
              data: {
                userId: user.id,
                eventId: event.id,
                action: 'CLOSURE_EVIDENCE_REPLACED',
                entityType: 'EventEvidence',
                entityId: results[0].id,
                summary: `Reemplazo administrativo excepcional de evidencia de cierre: "${oldEv.fileName}" reemplazada por "${results[0].fileName}" (documento anterior conservado para trazabilidad).`,
                reason: replacementReason,
                previousData: JSON.stringify({
                  previousEvidenceId: oldEv.id,
                  previousFileName: oldEv.fileName,
                }),
                newData: JSON.stringify({
                  newEvidenceId: results[0].id,
                  newFileName: results[0].fileName,
                }),
              },
            });
          }
        }

        await tx.event.update({
          where: { id: event.id },
          data: {
            closedAt: event.closedAt || now,
            closedById: event.closedById || user.id,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: user.id,
            eventId: event.id,
            action: 'EVENT_CLOSED_WITH_EVIDENCE',
            entityType: 'Event',
            entityId: event.id,
            summary: `Cierre documental del evento completado por ${user.fullName} mediante ${results.length} archivo(s) PDF de evidencia de realización (${results
              .map((r) => r.fileName)
              .join(', ')}). Estado general cambiado a CLOSED.`,
            newData: JSON.stringify({
              category: 'CLOSURE_EVIDENCE',
              closedAt: now.toISOString(),
              closedBy: user.username,
              files: results.map((r) => ({ id: r.id, fileName: r.fileName, fileSize: r.fileSize })),
            }),
          },
        });
      } else {
        for (const ev of results) {
          await tx.auditLog.create({
            data: {
              userId: user.id,
              eventId: event.id,
              action: 'EVIDENCE_UPLOADED',
              entityType: 'EventEvidence',
              entityId: ev.id,
              summary: `Documento PDF de soporte adjuntado: "${ev.fileName}" (${ev.fileSize} bytes). Clasificación: SUPPORTING_DOCUMENT.`,
              newData: JSON.stringify({
                fileName: ev.fileName,
                fileSize: ev.fileSize,
                category: 'SUPPORTING_DOCUMENT',
              }),
            },
          });
        }
      }

      return results;
    });

    return NextResponse.json(
      {
        evidence: createdEvidences[0],
        evidences: createdEvidences,
      },
      { status: 201 }
    );
  } catch (err) {
    // Rollback newly written files if transaction failed so event remains pending evidence cleanly
    for (const fp of writtenFilePaths) {
      try {
        if (fs.existsSync(fp)) fs.unlinkSync(fp);
      } catch {
        // ignore
      }
    }
    console.error('Error uploading evidence:', err);
    return NextResponse.json(
      { error: 'Error al almacenar el archivo PDF de evidencia.' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  return NextResponse.json(
    {
      error:
        'Por integridad institucional, no se permite eliminar libremente evidencias documentales. Para reemplazos excepcionales de evidencias de cierre, utilice la opción administrativa de reemplazo con motivo de auditoría.',
    },
    { status: 403 }
  );
}
