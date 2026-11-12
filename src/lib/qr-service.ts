import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import zlib from 'zlib';

export const QR_STORAGE_DIR = process.env.QR_STORAGE_DIR || './storage/qrs';

export function getQrStorageDirectory(): string {
  const dir = path.resolve(process.cwd(), QR_STORAGE_DIR);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Generates a cryptographically secure random QR token with zero PII (Section 12).
 * Format: sreu_qr_<32 random hex chars> (40 ASCII bytes total).
 */
export function generateSecureQrToken(deterministicSeedForDemoOnly?: string): {
  rawToken: string;
  tokenHash: string;
} {
  const randomHex = deterministicSeedForDemoOnly
    ? crypto
        .createHmac('sha256', 'sreu-utc-demo-qr-generator-key-v2')
        .update(deterministicSeedForDemoOnly)
        .digest('hex')
        .slice(0, 32)
    : crypto.randomBytes(16).toString('hex');

  const rawToken = `sreu_qr_${randomHex}`;
  const tokenHash = hashQrToken(rawToken);
  return { rawToken, tokenHash };
}

/**
 * Hashes a raw QR token using SHA-256 so raw tokens are never stored in SQLite or logs.
 */
export function hashQrToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
}

// ============================================================================
// ISO/IEC 18004 QR Code Generator (Version 4-L: 33x33 modules, 80 data + 20 ECC)
// ============================================================================

const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);

(function initGaloisField() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) {
      x ^= 0x11d;
    }
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function computeReedSolomonEcc(data: Uint8Array, eccCount: number): Uint8Array {
  // Build generator polynomial of degree eccCount
  let gen = new Uint8Array([1]);
  for (let i = 0; i < eccCount; i++) {
    const next = new Uint8Array(gen.length + 1);
    const root = GF_EXP[i];
    for (let j = 0; j < gen.length; j++) {
      next[j] ^= gen[j];
      next[j + 1] ^= gfMul(gen[j], root);
    }
    gen = next;
  }

  const remainder = new Uint8Array(eccCount);
  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ remainder[0];
    for (let j = 0; j < eccCount - 1; j++) {
      remainder[j] = remainder[j + 1] ^ gfMul(gen[j + 1], factor);
    }
    remainder[eccCount - 1] = gfMul(gen[eccCount], factor);
  }
  return remainder;
}

// Precomputed BCH(15,5) format bits for ECC Level L (01) and Masks 0..7
const FORMAT_BITS_LEVEL_L = [
  0x77c4, // mask 0
  0x72f3, // mask 1
  0x7daa, // mask 2
  0x789d, // mask 3
  0x662f, // mask 4
  0x6318, // mask 5
  0x6c41, // mask 6
  0x6976, // mask 7
];

/**
 * Encodes a payload string (up to 78 ASCII bytes) into a 33x33 boolean QR matrix (ISO/IEC 18004 V4-L).
 */
export function encodeQrMatrix(payload: string): boolean[][] {
  const bytes = Buffer.from(payload, 'utf8');
  if (bytes.length > 78) {
    throw new Error('QR payload exceeds Version 4-L byte capacity (78 bytes).');
  }

  const TOTAL_DATA_CODEWORDS = 80;
  const ECC_CODEWORDS = 20;

  // Build bit stream: Byte mode (0100) + 8-bit length + data bytes + terminator
  const bits: number[] = [];
  const pushBits = (val: number, count: number) => {
    for (let i = count - 1; i >= 0; i--) {
      bits.push((val >> i) & 1);
    }
  };

  pushBits(0b0100, 4);
  pushBits(bytes.length, 8);
  for (let i = 0; i < bytes.length; i++) {
    pushBits(bytes[i], 8);
  }

  const maxBits = TOTAL_DATA_CODEWORDS * 8;
  const terminatorLen = Math.min(4, maxBits - bits.length);
  pushBits(0, terminatorLen);

  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  const dataCodewords = new Uint8Array(TOTAL_DATA_CODEWORDS);
  let byteIdx = 0;
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) {
      b = (b << 1) | bits[i + j];
    }
    dataCodewords[byteIdx++] = b;
  }

  let padToggle = true;
  while (byteIdx < TOTAL_DATA_CODEWORDS) {
    dataCodewords[byteIdx++] = padToggle ? 0xec : 0x11;
    padToggle = !padToggle;
  }

  const eccCodewords = computeReedSolomonEcc(dataCodewords, ECC_CODEWORDS);
  const allCodewords = new Uint8Array(TOTAL_DATA_CODEWORDS + ECC_CODEWORDS);
  allCodewords.set(dataCodewords, 0);
  allCodewords.set(eccCodewords, TOTAL_DATA_CODEWORDS);

  const SIZE = 33; // Version 4: 4*4 + 17 = 33
  const modules: boolean[][] = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
  const isFunction: boolean[][] = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));

  const setFunctionModule = (r: number, c: number, dark: boolean) => {
    if (r >= 0 && r < SIZE && c >= 0 && c < SIZE) {
      modules[r][c] = dark;
      isFunction[r][c] = true;
    }
  };

  // Finder patterns + separators at (0,0), (0, SIZE-7), (SIZE-7, 0)
  const placeFinder = (top: number, left: number) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const r = top + dr;
        const c = left + dc;
        if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) continue;
        const inOuter = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
        const onBorder = dr === 0 || dr === 6 || dc === 0 || dc === 6;
        const inInner = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
        setFunctionModule(r, c, inOuter && (onBorder || inInner));
      }
    }
  };

  placeFinder(0, 0);
  placeFinder(0, SIZE - 7);
  placeFinder(SIZE - 7, 0);

  // Alignment pattern for Version 4 at center (26, 26)
  const alignCenter = 26;
  for (let dr = -2; dr <= 2; dr++) {
    for (let dc = -2; dc <= 2; dc++) {
      const dist = Math.max(Math.abs(dr), Math.abs(dc));
      setFunctionModule(alignCenter + dr, alignCenter + dc, dist !== 1);
    }
  }

  // Timing patterns
  for (let i = 8; i < SIZE - 8; i++) {
    const dark = i % 2 === 0;
    setFunctionModule(6, i, dark);
    setFunctionModule(i, 6, dark);
  }

  // Dark module
  setFunctionModule(SIZE - 8, 8, true);

  // Reserve format information areas
  for (let i = 0; i <= 8; i++) {
    if (i !== 6) {
      isFunction[8][i] = true;
      isFunction[i][8] = true;
    }
  }
  for (let i = 0; i < 8; i++) {
    isFunction[8][SIZE - 1 - i] = true;
    isFunction[SIZE - 1 - i][8] = true;
  }

  // Place data bits in upward/downward 2-column zigzag
  let bitIndex = 0;
  const totalBits = allCodewords.length * 8;
  let upward = true;

  for (let rightCol = SIZE - 1; rightCol >= 1; rightCol -= 2) {
    if (rightCol === 6) rightCol = 5; // Skip vertical timing pattern column
    for (let step = 0; step < SIZE; step++) {
      const r = upward ? SIZE - 1 - step : step;
      for (let dc = 0; dc < 2; dc++) {
        const c = rightCol - dc;
        if (!isFunction[r][c]) {
          let dark = false;
          if (bitIndex < totalBits) {
            const byteVal = allCodewords[bitIndex >> 3];
            dark = ((byteVal >> (7 - (bitIndex & 7))) & 1) === 1;
            bitIndex++;
          }
          modules[r][c] = dark;
        }
      }
    }
    upward = !upward;
  }

  // Apply Mask 0: (r + c) % 2 === 0
  const maskIndex = 0;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (!isFunction[r][c] && (r + c) % 2 === 0) {
        modules[r][c] = !modules[r][c];
      }
    }
  }

  // Write format bits for Level L, Mask 0
  const formatBits = FORMAT_BITS_LEVEL_L[maskIndex];
  const getFormatBit = (idx: number) => ((formatBits >> idx) & 1) === 1;

  // Around top-left finder
  for (let i = 0; i <= 5; i++) modules[8][i] = getFormatBit(i);
  modules[8][7] = getFormatBit(6);
  modules[8][8] = getFormatBit(7);
  modules[7][8] = getFormatBit(8);
  for (let i = 9; i < 15; i++) modules[14 - i][8] = getFormatBit(i);

  // Around bottom-left and top-right finders
  for (let i = 0; i < 8; i++) modules[8][SIZE - 1 - i] = getFormatBit(i);
  for (let i = 8; i < 15; i++) modules[SIZE - 15 + i][8] = getFormatBit(i);

  return modules;
}

// ============================================================================
// Native PNG Encoder (CRC32 + Deflate + tEXt metadata for server verification)
// ============================================================================

const CRC_TABLE = new Uint32Array(256);
(function initCrcTable() {
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    CRC_TABLE[n] = c >>> 0;
  }
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makePngChunk(type: string, data: Buffer): Buffer {
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

/**
 * Renders a 33x33 QR matrix into a high-contrast PNG buffer (default scale=10, quietZone=4 -> 410x410 px).
 */
export function renderQrMatrixToPngBuffer(
  matrix: boolean[][],
  options?: { scale?: number; quietZone?: number; tokenHashMeta?: string }
): Buffer {
  const scale = options?.scale ?? 10;
  const quietZone = options?.quietZone ?? 4;
  const matrixSize = matrix.length;
  const imgSize = (matrixSize + quietZone * 2) * scale;

  // Grayscale (colorType = 0, bitDepth = 8): 1 byte per pixel + 1 filter byte per row
  const rowStride = imgSize + 1;
  const rawData = Buffer.alloc(rowStride * imgSize, 0xff);

  for (let y = 0; y < imgSize; y++) {
    const rowOffset = y * rowStride;
    rawData[rowOffset] = 0; // Filter type 0 (None)
    const mr = Math.floor(y / scale) - quietZone;
    for (let x = 0; x < imgSize; x++) {
      const mc = Math.floor(x / scale) - quietZone;
      const isDark =
        mr >= 0 && mr < matrixSize && mc >= 0 && mc < matrixSize ? matrix[mr][mc] : false;
      rawData[rowOffset + 1 + x] = isDark ? 0x00 : 0xff;
    }
  }

  const compressed = zlib.deflateSync(rawData);

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(imgSize, 0);
  ihdr.writeUInt32BE(imgSize, 4);
  ihdr[8] = 8; // bit depth 8
  ihdr[9] = 0; // grayscale
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const chunks: Buffer[] = [signature, makePngChunk('IHDR', ihdr)];

  if (options?.tokenHashMeta) {
    const textData = Buffer.from(`sreu-qr-hash\0${options.tokenHashMeta}`, 'ascii');
    chunks.push(makePngChunk('tEXt', textData));
  }

  chunks.push(makePngChunk('IDAT', compressed));
  chunks.push(makePngChunk('IEND', Buffer.alloc(0)));

  return Buffer.concat(chunks);
}

/**
 * Extracts `sreu-qr-hash` metadata from a PNG buffer generated by SREU if present.
 */
export function extractTokenHashFromSreuPng(pngBuffer: Buffer): string | null {
  try {
    const marker = Buffer.from('sreu-qr-hash\0', 'ascii');
    const idx = pngBuffer.indexOf(marker);
    if (idx === -1) return null;
    const hashStart = idx + marker.length;
    const hashHex = pngBuffer.subarray(hashStart, hashStart + 64).toString('ascii');
    if (/^[0-9a-f]{64}$/i.test(hashHex)) {
      return hashHex.toLowerCase();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Creates a QR PNG file in `./storage/qrs/` for a given raw token and returns its stored filename and hash.
 */
export function createAndSaveQrCredentialImage(params: {
  credentialId: string;
  rawToken: string;
  tokenHash: string;
}): {
  qrImagePath: string;
  fullPath: string;
  pngBuffer: Buffer;
} {
  const storageDir = getQrStorageDirectory();
  const matrix = encodeQrMatrix(params.rawToken);
  const pngBuffer = renderQrMatrixToPngBuffer(matrix, {
    scale: 10,
    quietZone: 4,
    tokenHashMeta: params.tokenHash,
  });

  const fileName = `qr-${params.credentialId}.png`;
  const fullPath = path.join(storageDir, fileName);
  fs.writeFileSync(fullPath, pngBuffer);

  return {
    qrImagePath: fileName,
    fullPath,
    pngBuffer,
  };
}

/**
 * Reads an existing QR PNG buffer from private storage.
 */
export function readStoredQrPngBuffer(qrImagePath: string): Buffer | null {
  try {
    const storageDir = getQrStorageDirectory();
    const safeName = path.basename(qrImagePath);
    const fullPath = path.join(storageDir, safeName);
    if (!fs.existsSync(fullPath)) return null;
    return fs.readFileSync(fullPath);
  } catch {
    return null;
  }
}

/**
 * Decodes our grayscale QR PNG from private storage back into its boolean matrix
 * so that PDF passes can draw vector-sharp QR modules directly from the stored PNG!
 */
export function decodeStoredQrPngToMatrix(pngBuffer: Buffer): boolean[][] | null {
  try {
    // Parse IHDR and IDAT chunks
    if (pngBuffer.length < 33) return null;
    const width = pngBuffer.readUInt32BE(16);
    const height = pngBuffer.readUInt32BE(20);
    if (width !== height || width < 33) return null;

    const idatChunks: Buffer[] = [];
    let offset = 8;
    while (offset + 8 <= pngBuffer.length) {
      const length = pngBuffer.readUInt32BE(offset);
      const type = pngBuffer.subarray(offset + 4, offset + 8).toString('ascii');
      const data = pngBuffer.subarray(offset + 8, offset + 8 + length);
      if (type === 'IDAT') {
        idatChunks.push(data);
      } else if (type === 'IEND') {
        break;
      }
      offset += 12 + length;
    }

    if (idatChunks.length === 0) return null;
    const inflated = zlib.inflateSync(Buffer.concat(idatChunks));
    const matrixSize = 33;
    const quietZone = 4;
    const totalModules = matrixSize + quietZone * 2; // 41
    const scale = Math.round(width / totalModules);
    const rowStride = width + 1;

    const matrix: boolean[][] = Array.from({ length: matrixSize }, () =>
      Array(matrixSize).fill(false)
    );

    for (let r = 0; r < matrixSize; r++) {
      const py = Math.floor((r + quietZone + 0.5) * scale);
      for (let c = 0; c < matrixSize; c++) {
        const px = Math.floor((c + quietZone + 0.5) * scale);
        const pixelVal = inflated[py * rowStride + 1 + px];
        matrix[r][c] = pixelVal < 128;
      }
    }

    return matrix;
  } catch {
    return null;
  }
}

/**
 * Generates an official PDF 1.4 Individual Access Pass containing the embedded vector QR code
 * and institutional instructions (Section 12).
 */
export function generateAttendeePassPdfBuffer(options: {
  eventName: string;
  eventCode: string;
  eventDate: string;
  eventStartTime: string;
  eventEndTime: string;
  spaceName: string;
  accessMode: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeeTypeLabel: string;
  detailLine: string;
  credentialId: string;
  qrPngBuffer?: Buffer | null;
}): Buffer {
  const sanitize = (str: string) =>
    (str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[()\\]/g, '');

  const lines: string[] = [
    'UNIVERSIDAD TECNOLOGICA - SISTEMA DE RESERVACION DE ESPACIOS (SREU)',
    '====================================================================',
    'PASE INDIVIDUAL DE ACCESO CON CODIGO QR UNICO',
    '--------------------------------------------------------------------',
    `EVENTO: ${sanitize(options.eventName)} (${sanitize(options.eventCode)})`,
    `MODALIDAD: ${options.accessMode === 'OPEN' ? 'EVENTO ABIERTO (REGISTRO PUBLICO)' : 'EVENTO RESTRINGIDO (LISTA DE INVITADOS)'}`,
    `FECHA: ${sanitize(options.eventDate)}`,
    `HORARIO: ${sanitize(options.eventStartTime)} a ${sanitize(options.eventEndTime)} hrs`,
    `RECINTO / ESPACIO: ${sanitize(options.spaceName)}`,
    '--------------------------------------------------------------------',
    'DATOS DEL ASISTENTE REGISTRADO:',
    `NOMBRE COMPLETO: ${sanitize(options.attendeeName)}`,
    `CATEGORIA: ${sanitize(options.attendeeTypeLabel)}`,
    `DETALLE ACADEMICO / AREA: ${sanitize(options.detailLine)}`,
    `CORREO ELECTRONICO: ${sanitize(options.attendeeEmail)}`,
    `ID CREDENCIAL QR: ${sanitize(options.credentialId)}`,
    '--------------------------------------------------------------------',
    'INSTRUCCIONES DE INGRESO:',
    '1. Presente este pase (impreso o en su telefono) al operador en la entrada.',
    '2. El codigo QR es personal, unico para este evento y valido para 1 sola entrada.',
    '3. El operador podra solicitar una identificacion oficial para cotejar su identidad.',
    '4. El codigo QR contiene unicamente un token criptografico sin datos personales.',
  ];

  const streamParts: string[] = [];

  // Header banner rectangle
  streamParts.push('0.04 0.35 0.25 rg');
  streamParts.push('45 730 522 36 re f');
  streamParts.push('0 0 0 rg');

  // Text block
  streamParts.push('BT');
  streamParts.push('/F1 10 Tf');
  streamParts.push('50 744 Td');
  streamParts.push('1 1 1 rg');
  streamParts.push(`(${lines[0]}) Tj`);
  streamParts.push('0 0 0 rg');
  streamParts.push('0 -30 Td');
  streamParts.push('14 TL');

  for (let i = 1; i < lines.length; i++) {
    streamParts.push(`T* (${lines[i]}) Tj`);
  }
  streamParts.push('ET');

  // Draw QR Code matrix inside PDF at bottom center
  const matrix = options.qrPngBuffer ? decodeStoredQrPngToMatrix(options.qrPngBuffer) : null;
  if (matrix) {
    const moduleSize = 5;
    const qrSize = matrix.length * moduleSize; // 165 pt
    const startX = 220;
    const startY = 180;

    // White background box with border
    streamParts.push('0.95 0.97 0.96 rg');
    streamParts.push(`${startX - 15} ${startY - 15} ${qrSize + 30} ${qrSize + 30} re f`);
    streamParts.push('0 0 0 rg');

    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (matrix[r][c]) {
          const x = startX + c * moduleSize;
          const y = startY + (matrix.length - 1 - r) * moduleSize;
          streamParts.push(`${x} ${y} ${moduleSize} ${moduleSize} re f`);
        }
      }
    }
  }

  const streamContent = streamParts.join('\n') + '\n';

  const objects: string[] = [];
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  objects.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
  objects.push(
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n'
  );
  objects.push(
    `4 0 obj\n<< /Length ${Buffer.byteLength(streamContent, 'ascii')} >>\nstream\n${streamContent}endstream\nendobj\n`
  );
  objects.push('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');

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

