import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { buildReportData, parseReportFilters } from '@/lib/reports-service';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const data = await buildReportData(user, parseReportFilters(searchParams));

  return NextResponse.json(data);
}
