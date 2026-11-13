import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { buildReportData, parseReportFilters } from '@/lib/reports-service';
import {
  buildAttendeesCsv,
  buildEventTemplateCsv,
  buildEventTemplateRows,
} from '@/lib/report-export';
import { buildEventsWorkbook } from '@/lib/report-xlsx';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FORMATS = ['xlsx', 'csv', 'padron'] as const;
type ExportFormat = (typeof FORMATS)[number];

function fileStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const format = (searchParams.get('format') || 'xlsx') as ExportFormat;

  if (!FORMATS.includes(format)) {
    return NextResponse.json(
      { error: `Formato no soportado. Use uno de: ${FORMATS.join(', ')}.` },
      { status: 400 }
    );
  }

  const filters = parseReportFilters(searchParams);

  try {
    const data = await buildReportData(user, filters);

    if (format === 'xlsx') {
      const workbook = buildEventsWorkbook(buildEventTemplateRows(data));
      return new NextResponse(new Uint8Array(workbook), {
        headers: {
          'Content-Type':
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="reporte-eventos-erm-utc-${fileStamp()}.xlsx"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    const csv =
      format === 'csv' ? buildEventTemplateCsv(data, filters) : buildAttendeesCsv(data);
    const name =
      format === 'csv'
        ? `reporte-eventos-erm-utc-${fileStamp()}.csv`
        : `padron-nominal-asistencia-qr-${fileStamp()}.csv`;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${name}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[API /api/reports/export] Error al generar el archivo:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Error interno al generar el archivo de reporte.',
      },
      { status: 500 }
    );
  }
}
