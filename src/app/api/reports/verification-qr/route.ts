import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { encodeQrMatrix } from '@/lib/qr-service';

export const runtime = 'nodejs';

/**
 * Sello QR de verificación para la plantilla institucional de reportes.
 * Codifica el folio del reporte y se entrega como SVG para imprimirse nítido.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const folio = (searchParams.get('folio') || '').slice(0, 60).trim();
  if (!folio) {
    return NextResponse.json({ error: 'Falta el folio del reporte.' }, { status: 400 });
  }

  try {
    const matrix = encodeQrMatrix(`SREU-RPT:${folio}`);
    const size = matrix.length;
    const quiet = 2;
    const total = size + quiet * 2;

    const modules: string[] = [];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (matrix[y][x]) {
          modules.push(`M${x + quiet} ${y + quiet}h1v1h-1z`);
        }
      }
    }

    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" ` +
      `shape-rendering="crispEdges" role="img" aria-label="Código QR de verificación del reporte">` +
      `<rect width="${total}" height="${total}" fill="#ffffff"/>` +
      `<path d="${modules.join('')}" fill="#114b36"/>` +
      `</svg>`;

    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[API /api/reports/verification-qr] Error:', error);
    return NextResponse.json(
      { error: 'No fue posible generar el sello QR del reporte.' },
      { status: 500 }
    );
  }
}
