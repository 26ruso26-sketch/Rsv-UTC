'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Printer, RefreshCw, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/components/layout/AppShell';
import { ReportData } from '@/types/reports';
import './report-print.css';

const ATTENDEE_LABELS: Record<string, string> = {
  STUDENT: 'Alumnos',
  TEACHER: 'Docentes',
  ADMIN_STAFF: 'Personal Administrativo',
  EXTERNAL_GUEST: 'Invitados Externos',
};

/** Etiquetas de ciclo de vida (espejo de getLifecycleMeta, sin dependencias de servidor). */
const LIFECYCLE_STATUS_LABELS: Record<string, string> = {
  PENDING_APPROVAL: 'Pendiente de autorización',
  SCHEDULED: 'Programado',
  IN_PROGRESS: 'En curso',
  COMPLETED_PENDING_EVIDENCE: 'Concluido · pend. evidencia',
  CLOSED: 'Cerrado con evidencia',
  REJECTED: 'Rechazado',
  EXPIRED: 'Vencido',
};

const LIFECYCLE_LABELS: Record<string, string> = {
  ALL: 'Todos los estados',
  PENDING_APPROVAL: 'Pendientes de autorización',
  SCHEDULED: 'Programados',
  IN_PROGRESS: 'En curso',
  CONCLUDED: 'Concluidos',
  COMPLETED_PENDING_EVIDENCE: 'Pendientes de evidencia',
  CLOSED: 'Cerrados con evidencia',
  REJECTED: 'Rechazados',
  EXPIRED: 'Vencidos',
};

/** Filas por hoja en las tablas de continuación. */
const CAREER_ROWS_PAGE_1 = 6;
const ROWS_PER_PAGE = 20;
const EVENT_ROWS_PER_PAGE = 18;

function chunk<T>(items: T[], size: number): T[][] {
  const output: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    output.push(items.slice(i, i + size));
  }
  return output;
}

/** Folio corto y estable para el sello QR del reporte. */
function buildFolio(query: string, stamp: string): string {
  let hash = 0;
  const seed = `${query}|${stamp}`;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  const code = Math.abs(hash).toString(36).toUpperCase().padStart(6, '0').slice(0, 6);
  return `UTC-${stamp.replace(/-/g, '')}-${code}`;
}

function PageShell({
  children,
  page,
  totalPages,
}: {
  children: React.ReactNode;
  page: number;
  totalPages: number;
}) {
  return (
    <div className="erm-page">
      <div className="erm-header">
        <span className="u">Universidad Tecnológica de Coahuila</span>
        <div className="b">
          <div className="t">UTC</div>
          <div className="s">Halcón</div>
        </div>
      </div>

      {children}

      <div className="erm-footer">
        <span>
          Sistema de Gestión Institucional ERM UTC — Universidad Tecnológica de Coahuila
        </span>
        <span>
          Página {page} de {totalPages}
        </span>
      </div>
    </div>
  );
}

function SectionTable({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="erm-sec">
      <h2>{title}</h2>
      <table>{children}</table>
    </div>
  );
}

function PrintableReport() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const query = searchParams.toString();

  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [observacion, setObservacion] = useState('');
  const [signerName, setSignerName] = useState('');

  const generatedAt = useMemo(() => new Date(), []);
  const stamp = generatedAt.toISOString().slice(0, 10);
  const folio = useMemo(() => buildFolio(query, stamp), [query, stamp]);

  useEffect(() => {
    if (user?.fullName) setSignerName(user.fullName);
  }, [user?.fullName]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/reports${query ? `?${query}` : ''}`, { cache: 'no-store' })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
        return body as ReportData;
      })
      .then((body) => {
        if (!cancelled) setData(body);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'No fue posible generar el reporte imprimible.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [query]);

  const periodLabel = useMemo(() => {
    const start = searchParams.get('startDate');
    const end = searchParams.get('endDate');
    if (start && end) return `${start} al ${end}`;
    if (start) return `Desde ${start}`;
    if (end) return `Hasta ${end}`;
    return 'Histórico completo';
  }, [searchParams]);

  const filterLabel = useMemo(() => {
    const parts: string[] = [];
    const lifecycle = searchParams.get('lifecycle');
    const accessMode = searchParams.get('accessMode');
    const attendeeType = searchParams.get('attendeeType');

    if (lifecycle && lifecycle !== 'ALL') {
      parts.push(LIFECYCLE_LABELS[lifecycle] || lifecycle);
    }
    if (accessMode && accessMode !== 'ALL') {
      parts.push(accessMode === 'OPEN' ? 'Eventos abiertos' : 'Eventos restringidos');
    }
    if (attendeeType && attendeeType !== 'ALL') {
      parts.push(ATTENDEE_LABELS[attendeeType] || attendeeType);
    }
    if (searchParams.get('spaceId') && searchParams.get('spaceId') !== 'ALL') {
      parts.push('Espacio específico');
    }
    if (searchParams.get('buildingId') && searchParams.get('buildingId') !== 'ALL') {
      parts.push('Edificio específico');
    }

    return parts.length > 0
      ? parts.join(' · ')
      : 'Todos los eventos y actividades institucionales';
  }, [searchParams]);

  if (loading) {
    return (
      <div className="erm-print-toolbar p-10 text-center text-xs text-slate-500">
        Generando el reporte con el formato institucional…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="erm-print-toolbar mx-auto mt-6 max-w-lg space-y-4 rounded-2xl border border-rose-200 bg-rose-50 p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
          <div>
            <h2 className="text-sm font-bold text-rose-900">
              No se pudo generar el reporte imprimible
            </h2>
            <p className="mt-1 text-xs text-rose-800">{error}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-sm"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reintentar
          </button>
          <Link href="/reportes" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm">
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver a reportes
          </Link>
        </div>
      </div>
    );
  }

  const s = data.summary;

  const attendeeTotals = data.byAttendeeType.reduce(
    (acc, t) => ({
      registered: acc.registered + t.registered,
      checkedIn: acc.checkedIn + t.checkedIn,
      qrMethod: acc.qrMethod + t.qrMethod,
      manualMethod: acc.manualMethod + t.manualMethod,
    }),
    { registered: 0, checkedIn: 0, qrMethod: 0, manualMethod: 0 }
  );

  const careersPage1 = data.byCareer.slice(0, CAREER_ROWS_PAGE_1);
  const careersRest = data.byCareer.slice(CAREER_ROWS_PAGE_1);
  const careerRestPages = chunk(careersRest, ROWS_PER_PAGE);
  const spacePages = chunk(data.bySpace, ROWS_PER_PAGE);
  const eventPages = chunk(data.events, EVENT_ROWS_PER_PAGE);
  const hasAcademicBreakdown =
    data.byAcademicGrade.length > 0 || data.byDepartmentArea.length > 0;

  // Hoja 1 + continuación de carreras + desglose académico + espacios + eventos
  const totalPages =
    1 +
    careerRestPages.length +
    (hasAcademicBreakdown ? 1 : 0) +
    spacePages.length +
    eventPages.length;

  let pageNumber = 0;
  const nextPage = () => ++pageNumber;

  return (
    <>
      {/* Barra de acciones (no se imprime) */}
      <div className="erm-print-toolbar mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-slate-900">
            Vista previa del reporte institucional
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Folio {folio} · {totalPages} hoja(s) A4 · Imprime o guarda como PDF (Ctrl/Cmd + P).
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link href="/reportes" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm">
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver
          </Link>
          <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-sm">
            <Printer className="h-3.5 w-3.5" />
            Imprimir / Guardar PDF
          </button>
        </div>
      </div>

      <div className="erm">
        {/* ===================== HOJA 1 · Resumen ejecutivo ===================== */}
        <PageShell page={nextPage()} totalPages={totalPages}>
          <div className="erm-titlebar">
            <div>
              <div className="k">ERM UTC</div>
              <h1>
                REPORTE DE MÉTRICAS
                <br />
                DE ASISTENCIA
              </h1>
              <p className="sub">
                Folio {folio} · Emitido por {user?.fullName || 'Sistema SREU'}
              </p>
            </div>
            <div className="erm-qr">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/reports/verification-qr?folio=${encodeURIComponent(folio)}`}
                alt={`Código QR de verificación del reporte ${folio}`}
              />
            </div>
          </div>

          <div className="erm-box erm-info">
            <div className="erm-row">
              <div className="erm-lbl">Evento / filtro:</div>
              <div className="erm-val">{filterLabel}</div>
            </div>
            <div className="erm-row">
              <div className="erm-lbl">Periodo:</div>
              <div className="erm-val">{periodLabel}</div>
            </div>
            <div className="erm-row">
              <div className="erm-lbl">Fecha de generación:</div>
              <div className="erm-val">{generatedAt.toLocaleString('es-MX')}</div>
            </div>
          </div>

          <div className="erm-kpis">
            <div className="erm-kpi">
              <span className="k">Eventos filtrados</span>
              <span className="v">{s.totalEvents}</span>
              <span className="d">
                Abiertos: {s.openEvents} · Restr.: {s.restrictedEvents}
              </span>
            </div>
            <div className="erm-kpi">
              <span className="k">Cierre documental PDF</span>
              <span className="v">{s.closed}</span>
              <span className="d">Pend. evidencia: {s.completedPendingEvidence}</span>
            </div>
            <div className="erm-kpi">
              <span className="k">Asistentes registrados</span>
              <span className="v">{s.totalRegisteredActive}</span>
              <span className="d">QR vigentes: {s.totalQrGenerated}</span>
            </div>
            <div className="erm-kpi">
              <span className="k">Entradas verificadas</span>
              <span className="v">{s.totalCheckedIn}</span>
              <span className="d">
                QR: {s.totalCheckedInQr} · Manual: {s.totalCheckedInManual}
              </span>
            </div>
            <div className="erm-kpi">
              <span className="k">% Asistencia global</span>
              <span className="v">{s.globalAttendancePct}%</span>
              <span className="d">Sin check-in: {s.totalPendingCheckIn}</span>
            </div>
            <div className="erm-kpi">
              <span className="k">Intentos rechazados QR</span>
              <span className="v">{s.totalScanRejected}</span>
              <span className="d">De {s.totalScanAttempts} lecturas totales</span>
            </div>
          </div>

          <SectionTable title="Participación por categoría de asistente y método de entrada">
            <thead>
              <tr>
                <th className="l" style={{ width: '34%' }}>
                  Categoría
                </th>
                <th className="c">Registrados</th>
                <th className="c">Asistieron</th>
                <th className="c">Por QR</th>
                <th className="c">Manual</th>
              </tr>
            </thead>
            <tbody>
              {data.byAttendeeType.map((t) => (
                <tr key={t.type}>
                  <td>{t.label}</td>
                  <td className="c">{t.registered}</td>
                  <td className="c">{t.checkedIn}</td>
                  <td className="c">{t.qrMethod}</td>
                  <td className="c">{t.manualMethod}</td>
                </tr>
              ))}
              <tr className="total">
                <td>Total</td>
                <td className="c">{attendeeTotals.registered}</td>
                <td className="c">{attendeeTotals.checkedIn}</td>
                <td className="c">{attendeeTotals.qrMethod}</td>
                <td className="c">{attendeeTotals.manualMethod}</td>
              </tr>
            </tbody>
          </SectionTable>

          <SectionTable title="Asistencia de alumnos por carrera universitaria">
            <thead>
              <tr>
                <th className="l" style={{ width: '16%' }}>
                  Clave
                </th>
                <th className="l">Carrera</th>
                <th className="c" style={{ width: '14%' }}>
                  Inscritos
                </th>
                <th className="c" style={{ width: '14%' }}>
                  Entradas
                </th>
                <th className="c" style={{ width: '15%' }}>
                  % Asistencia
                </th>
              </tr>
            </thead>
            <tbody>
              {careersPage1.length === 0 ? (
                <tr>
                  <td colSpan={5} className="c muted">
                    Sin registros de alumnos en el filtro aplicado.
                  </td>
                </tr>
              ) : (
                careersPage1.map((c) => (
                  <tr key={c.code}>
                    <td className="mono">{c.code}</td>
                    <td>{c.name}</td>
                    <td className="c">{c.registered}</td>
                    <td className="c">{c.checkedIn}</td>
                    <td className="c">{c.attendancePct}%</td>
                  </tr>
                ))
              )}
              {careersRest.length > 0 && (
                <tr>
                  <td colSpan={5} className="muted">
                    + {careersRest.length} carrera(s) adicionales en el desglose de las hojas
                    siguientes.
                  </td>
                </tr>
              )}
            </tbody>
          </SectionTable>

          <div className="erm-box">
            <div className="erm-row erm-obs">
              <div className="erm-lbl">Observación:</div>
              <textarea
                className="erm-obs-input"
                rows={3}
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
                placeholder="Escriba aquí la observación que debe aparecer en el reporte impreso…"
                aria-label="Observación del reporte"
              />
            </div>
          </div>

          <div className="erm-sig">
            <input
              className="name"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="Nombre del responsable"
              aria-label="Nombre del responsable que firma"
            />
            <div className="line">Firma del Responsable</div>
            <div className="s">
              {user?.buildingName || user?.departmentLabel || 'Extensión Universitaria'}
            </div>
          </div>
        </PageShell>

        {/* ===================== Continuación de carreras ===================== */}
        {careerRestPages.map((rows, index) => (
          <PageShell key={`careers-${index}`} page={nextPage()} totalPages={totalPages}>
            <SectionTable
              title={`Asistencia de alumnos por carrera universitaria (continuación ${
                index + 1
              })`}
            >
              <thead>
                <tr>
                  <th className="l" style={{ width: '16%' }}>
                    Clave
                  </th>
                  <th className="l">Carrera</th>
                  <th className="c" style={{ width: '14%' }}>
                    Inscritos
                  </th>
                  <th className="c" style={{ width: '14%' }}>
                    Entradas
                  </th>
                  <th className="c" style={{ width: '15%' }}>
                    % Asistencia
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.code}>
                    <td className="mono">{c.code}</td>
                    <td>{c.name}</td>
                    <td className="c">{c.registered}</td>
                    <td className="c">{c.checkedIn}</td>
                    <td className="c">{c.attendancePct}%</td>
                  </tr>
                ))}
              </tbody>
            </SectionTable>
          </PageShell>
        ))}

        {/* ===================== Desglose académico ===================== */}
        {hasAcademicBreakdown && (
          <PageShell page={nextPage()} totalPages={totalPages}>
            {data.byAcademicGrade.length > 0 && (
              <SectionTable title="Asistencia por semestre / cuatrimestre">
                <thead>
                  <tr>
                    <th className="l">Grado académico</th>
                    <th className="c" style={{ width: '18%' }}>
                      Inscritos
                    </th>
                    <th className="c" style={{ width: '18%' }}>
                      Entradas
                    </th>
                    <th className="c" style={{ width: '18%' }}>
                      % Asistencia
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.byAcademicGrade.slice(0, 12).map((g) => (
                    <tr key={g.code}>
                      <td>{g.name}</td>
                      <td className="c">{g.registered}</td>
                      <td className="c">{g.checkedIn}</td>
                      <td className="c">{g.attendancePct}%</td>
                    </tr>
                  ))}
                </tbody>
              </SectionTable>
            )}

            {data.byDepartmentArea.length > 0 && (
              <SectionTable title="Participación por departamento académico y administrativo">
                <thead>
                  <tr>
                    <th className="l">Departamento / Área</th>
                    <th className="c" style={{ width: '18%' }}>
                      Registrados
                    </th>
                    <th className="c" style={{ width: '18%' }}>
                      Entradas
                    </th>
                    <th className="c" style={{ width: '18%' }}>
                      % Asistencia
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.byDepartmentArea.slice(0, 14).map((d) => (
                    <tr key={d.code}>
                      <td>{d.name}</td>
                      <td className="c">{d.registered}</td>
                      <td className="c">{d.checkedIn}</td>
                      <td className="c">{d.attendancePct}%</td>
                    </tr>
                  ))}
                </tbody>
              </SectionTable>
            )}

            {data.peakCheckInHours.length > 0 && (
              <div className="erm-box">
                <div className="erm-row">
                  <div className="erm-lbl">Horario pico de registro de entradas:</div>
                  <div className="erm-val">
                    {data.peakCheckInHours
                      .map((h) => `${h.hour} hrs (${h.count})`)
                      .join(' · ')}
                  </div>
                </div>
              </div>
            )}
          </PageShell>
        )}

        {/* ===================== Uso por espacio ===================== */}
        {spacePages.map((rows, index) => (
          <PageShell key={`spaces-${index}`} page={nextPage()} totalPages={totalPages}>
            <SectionTable
              title={`Uso y asistencia por espacio universitario${
                spacePages.length > 1 ? ` (${index + 1}/${spacePages.length})` : ''
              }`}
            >
              <thead>
                <tr>
                  <th className="l">Espacio</th>
                  <th className="l" style={{ width: '22%' }}>
                    Edificio
                  </th>
                  <th className="c" style={{ width: '10%' }}>
                    Cap.
                  </th>
                  <th className="c" style={{ width: '10%' }}>
                    Eventos
                  </th>
                  <th className="c" style={{ width: '10%' }}>
                    Cerrados
                  </th>
                  <th className="c" style={{ width: '12%' }}>
                    Inscritos
                  </th>
                  <th className="c" style={{ width: '12%' }}>
                    Entradas
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((sp) => (
                  <tr key={sp.spaceName}>
                    <td>{sp.spaceName}</td>
                    <td>{sp.buildingName}</td>
                    <td className="c">{sp.capacity}</td>
                    <td className="c">{sp.total}</td>
                    <td className="c">{sp.closed}</td>
                    <td className="c">{sp.registeredAttendees}</td>
                    <td className="c">{sp.checkedInAttendees}</td>
                  </tr>
                ))}
              </tbody>
            </SectionTable>
          </PageShell>
        ))}

        {/* ===================== Detalle de eventos ===================== */}
        {eventPages.map((rows, index) => (
          <PageShell key={`events-${index}`} page={nextPage()} totalPages={totalPages}>
            <SectionTable
              title={`Detalle de eventos, ciclo de vida y métricas de asistencia${
                eventPages.length > 1 ? ` (${index + 1}/${eventPages.length})` : ''
              }`}
            >
              <thead>
                <tr>
                  <th className="l" style={{ width: '9%' }}>
                    Fecha
                  </th>
                  <th className="l">Evento</th>
                  <th className="l" style={{ width: '17%' }}>
                    Espacio
                  </th>
                  <th className="l" style={{ width: '15%' }}>
                    Estado
                  </th>
                  <th className="c" style={{ width: '9%' }}>
                    Insc.
                  </th>
                  <th className="c" style={{ width: '9%' }}>
                    Entradas
                  </th>
                  <th className="c" style={{ width: '9%' }}>
                    % Asist.
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((ev) => (
                  <tr key={ev.id}>
                    <td className="mono">{ev.date}</td>
                    <td>{ev.name}</td>
                    <td>{ev.space.name}</td>
                    <td>{LIFECYCLE_STATUS_LABELS[ev.lifecycleStatus] || ev.lifecycleStatus}</td>
                    <td className="c">{ev.attendanceStats.registeredActive}</td>
                    <td className="c">{ev.attendanceStats.checkedIn}</td>
                    <td className="c">{ev.attendanceStats.attendancePct}%</td>
                  </tr>
                ))}
              </tbody>
            </SectionTable>
          </PageShell>
        ))}
      </div>
    </>
  );
}

export default function ReportePrintPage() {
  return (
    <Suspense
      fallback={
        <div className="p-10 text-center text-xs text-slate-500">Preparando la plantilla…</div>
      }
    >
      <PrintableReport />
    </Suspense>
  );
}
