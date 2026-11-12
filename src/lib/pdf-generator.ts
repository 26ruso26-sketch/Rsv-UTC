/**
 * Generates a valid, standards-compliant PDF 1.4 document with institutional text content.
 * Used for creating the demonstration PDF evidence files and verifying PDF uploads.
 */
export function generateInstitutionalPdfBuffer(options: {
  title: string;
  subtitle: string;
  eventCode: string;
  spaceName: string;
  responsibleName: string;
  department: string;
  bodyLines: string[];
}): Buffer {
  const sanitizePdfText = (input: string) =>
    input
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[()\\]/g, '');

  const lines: string[] = [
    'UNIVERSIDAD TECNOLOGICA - SISTEMA DE RESERVACION DE ESPACIOS (SREU)',
    '====================================================================',
    `DOCUMENTO DE EVIDENCIA OFICIAL: ${sanitizePdfText(options.eventCode)}`,
    `TITULO: ${sanitizePdfText(options.title)}`,
    `SUBTITULO: ${sanitizePdfText(options.subtitle)}`,
    `ESPACIO SOLICITADO: ${sanitizePdfText(options.spaceName)}`,
    `RESPONSABLE DEL EVENTO: ${sanitizePdfText(options.responsibleName)}`,
    `DEPARTAMENTO / AREA: ${sanitizePdfText(options.department)}`,
    '--------------------------------------------------------------------',
    ...options.bodyLines.map(sanitizePdfText),
    '--------------------------------------------------------------------',
    'Documento de demostracion generado para validacion academica SREU.',
  ];

  const contentCommands: string[] = ['BT', '/F1 11 Tf', '50 750 Td', '15 TL'];
  lines.forEach((line, idx) => {
    if (idx === 0) {
      contentCommands.push(`(${line}) Tj`);
    } else {
      contentCommands.push(`T* (${line}) Tj`);
    }
  });
  contentCommands.push('ET');
  const streamContent = contentCommands.join('\n') + '\n';

  const objects: string[] = [];
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  objects.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
  objects.push(
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n'
  );
  objects.push(
    `4 0 obj\n<< /Length ${Buffer.byteLength(streamContent, 'ascii')} >>\nstream\n${streamContent}endstream\nendobj\n`
  );
  objects.push(
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n'
  );

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];

  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'ascii'));
    pdf += obj;
  }

  const xrefOffset = Buffer.byteLength(pdf, 'ascii');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, 'ascii');
}

export function validatePdfBuffer(buffer: Buffer, fileName: string, maxBytes = 10 * 1024 * 1024): {
  valid: boolean;
  error?: string;
} {
  if (!fileName.toLowerCase().endsWith('.pdf')) {
    return { valid: false, error: 'El archivo debe tener extensión .pdf.' };
  }
  if (buffer.length === 0) {
    return { valid: false, error: 'El archivo PDF está vacío.' };
  }
  if (buffer.length > maxBytes) {
    return { valid: false, error: 'El archivo PDF excede el tamaño máximo permitido (10 MB).' };
  }
  const header = buffer.subarray(0, 5).toString('ascii');
  if (header !== '%PDF-') {
    return { valid: false, error: 'El archivo no tiene una firma PDF válida (%PDF-).' };
  }
  return { valid: true };
}

