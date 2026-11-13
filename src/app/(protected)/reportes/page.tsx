'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  FileBarChart,
  Download,
  MapPin,
  FileText,
  FileSpreadsheet,
  Users,
  GraduationCap,
  Clock,
  CheckCircle2,
  Filter,
  RotateCcw,
  ArrowUpRight,
  Building2,
} from 'lucide-react';
import {
  CriticalityBadge,
  EventLifecycleBadge,
  RequestStatusBadge,
} from '@/components/ui/StatusBadge';
import { ReportData } from '@/types/reports';

interface SpaceOption {
  id: string;
  name: string;
}

interface BuildingOption {
  id: string;
  name: string;
}

interface CareerOption {
  id: string;
  code: string;
  name: string;
}

interface GradeOption {
  id: string;
  code: string;
  name: string;
}

interface DeptOption {
  id: string;
  code: string;
  name: string;
  areaType: string;
}

const LIFECYCLE_OPTIONS = [
  { value: 'ALL', label: 'Todos los estados' },
  { value: 'PENDING_APPROVAL', label: 'Pendientes de autorización' },
  { value: 'SCHEDULED', label: 'Programados' },
  { value: 'IN_PROGRESS', label: 'En curso' },
  { value: 'CONCLUDED', label: 'Concluidos (todos)' },
  { value: 'COMPLETED_PENDING_EVIDENCE', label: 'Pendientes de evidencia' },
  { value: 'CLOSED', label: 'Cerrados con evidencia' },
  { value: 'REJECTED', label: 'Rechazados' },
  { value: 'EXPIRED', label: 'Vencidos' },
];

function KpiCard({
  label,
  value,
  caption,
  tone = 'plain',
}: {
  label: string;
  value: React.ReactNode;
  caption: React.ReactNode;
  tone?: 'plain' | 'feature';
}) {
  const feature = tone === 'feature';
  return (
    <div className={`p-[15px] ${feature ? 'ui-card-feature' : 'ui-card'}`}>
      <p
        className={`text-[10px] font-semibold uppercase tracking-[0.06em] ${
          feature ? 'text-brand-gold' : 'text-muted'
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-2.5 text-[28px] font-semibold leading-none tracking-tight ${
          feature ? 'text-white' : 'text-ink'
        }`}
      >
        {value}
      </p>
      <p className={`mt-2 text-[11px] ${feature ? 'text-white/70' : 'text-muted'}`}>{caption}</p>
    </div>
  );
}

function CardHead({
  icon: Icon,
  title,
  aside,
}: {
  icon: typeof Users;
  title: string;
  aside?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line px-[17px] py-3.5">
      <div className="flex min-w-0 items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-brand" />
        <h2 className="ui-card-title truncate">{title}</h2>
      </div>
      {aside}
    </div>
  );
}

export default function ReportsPage() {
  const [spaces, setSpaces] = useState<SpaceOption[]>([]);
  const [buildings, setBuildings] = useState<BuildingOption[]>([]);
  const [careers, setCareers] = useState<CareerOption[]>([]);
  const [academicGrades, setAcademicGrades] = useState<GradeOption[]>([]);
  const [departmentAreas, setDepartmentAreas] = useState<DeptOption[]>([]);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [spaceId, setSpaceId] = useState('ALL');
  const [buildingId, setBuildingId] = useState('ALL');
  const [lifecycle, setLifecycle] = useState('ALL');
  const [accessMode, setAccessMode] = useState('ALL');
  const [attendeeType, setAttendeeType] = useState('ALL');
  const [careerId, setCareerId] = useState('ALL');
  const [academicGradeId, setAcademicGradeId] = useState('ALL');
  const [departmentAreaId, setDepartmentAreaId] = useState('ALL');

  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/catalogs')
      .then((r) => r.json())
      .then((c) => {
        setSpaces(c.spaces || []);
        setBuildings(c.buildings || []);
        setCareers(c.careers || []);
        setAcademicGrades(c.academicGrades || []);
        setDepartmentAreas(c.departmentAreas || []);
      })
      .catch(() => undefined);
  }, []);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (spaceId !== 'ALL') params.set('spaceId', spaceId);
    if (buildingId !== 'ALL') params.set('buildingId', buildingId);
    if (lifecycle !== 'ALL') params.set('lifecycle', lifecycle);
    if (accessMode !== 'ALL') params.set('accessMode', accessMode);
    if (attendeeType !== 'ALL') params.set('attendeeType', attendeeType);
    if (careerId !== 'ALL') params.set('careerId', careerId);
    if (academicGradeId !== 'ALL') params.set('academicGradeId', academicGradeId);
    if (departmentAreaId !== 'ALL') params.set('departmentAreaId', departmentAreaId);
    return params.toString();
  }, [
    startDate,
    endDate,
    spaceId,
    buildingId,
    lifecycle,
    accessMode,
    attendeeType,
    careerId,
    academicGradeId,
    departmentAreaId,
  ]);

  const activeFilterCount = queryString ? queryString.split('&').length : 0;

  useEffect(() => {
    setLoading(true);
    fetch(`/api/reports${queryString ? `?${queryString}` : ''}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((res) => setData(res))
      .finally(() => setLoading(false));
  }, [queryString]);

  const resetFilters = () => {
    setStartDate('');
    setEndDate('');
    setSpaceId('ALL');
    setBuildingId('ALL');
    setLifecycle('ALL');
    setAccessMode('ALL');
    setAttendeeType('ALL');
    setCareerId('ALL');
    setAcademicGradeId('ALL');
    setDepartmentAreaId('ALL');
  };

  /** Descarga un archivo generado en el servidor con el formato institucional. */
  const downloadExport = useCallback(
    async (format: 'xlsx' | 'csv' | 'padron') => {
      setDownloading(format);
      setExportError(null);

      try {
        const params = new URLSearchParams(queryString);
        params.set('format', format);
        const response = await fetch(`/api/reports/export?${params.toString()}`, {
          cache: 'no-store',
        });

        if (!response.ok) {
          let message = `No fue posible generar el archivo (HTTP ${response.status}).`;
          try {
            const body = await response.json();
            if (body?.error) message = String(body.error);
          } catch {
            /* respuesta sin cuerpo JSON */
          }
          throw new Error(message);
        }

        const disposition = response.headers.get('content-disposition') || '';
        const match = /filename="([^"]+)"/.exec(disposition);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = match?.[1] || `reporte-sreu.${format === 'xlsx' ? 'xlsx' : 'csv'}`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
      } catch (err) {
        setExportError(
          err instanceof Error ? err.message : 'Error desconocido al generar el archivo.'
        );
      } finally {
        setDownloading(null);
      }
    },
    [queryString]
  );

  const peakHour = data?.peakCheckInHours?.length
    ? [...data.peakCheckInHours].sort((a, b) => b.count - a.count)[0]
    : null;

  return (
    <div className="space-y-5">
      {/* ===================== Encabezado ===================== */}
      <div className="flex flex-col justify-between gap-3.5 md:flex-row md:items-end">
        <div className="min-w-0">
          <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-ink sm:text-[28px]">
            Reportes y estadísticas
          </h1>
          <p className="mt-1 max-w-2xl text-[13px] text-muted">
            Análisis por evento, recinto, carrera, grado académico, departamento, horario pico y
            método de acceso (QR o manual), exportable en los formatos institucionales.
          </p>
        </div>
        <Link
          href={`/reportes/imprimir${queryString ? `?${queryString}` : ''}`}
          className="ui-btn-primary shrink-0"
        >
          <FileText className="h-3.5 w-3.5" />
          Generar PDF institucional
        </Link>
      </div>

      {/* ===================== Centro de exportación ===================== */}
      <section className="ui-card p-[17px]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Download className="h-4 w-4 text-brand" />
            <div>
              <h2 className="ui-card-title">Centro de exportación</h2>
              <p className="ui-caption mt-0.5">
                Los archivos respetan los{' '}
                {activeFilterCount > 0
                  ? `${activeFilterCount} filtro(s) activos`
                  : 'filtros activos'}{' '}
                de esta pantalla.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {/* PDF institucional */}
          <Link
            href={`/reportes/imprimir${queryString ? `?${queryString}` : ''}`}
            className="group flex items-start gap-3 rounded-card border border-brand-deep/40 bg-brand-deep p-3.5 text-white transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-hover"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10">
              <FileText className="h-4 w-4 text-brand-gold" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-semibold">Reporte PDF de métricas</span>
                <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-white/60 transition-colors group-hover:text-white" />
              </span>
              <span className="mt-1 block text-[11px] leading-snug text-white/70">
                Plantilla oficial ERM UTC en A4, con folio, sello QR de verificación, KPIs, tablas
                y firma del responsable.
              </span>
            </span>
          </Link>

          {/* Excel plantilla */}
          <button
            type="button"
            onClick={() => void downloadExport('xlsx')}
            disabled={downloading !== null || !data}
            className="group flex items-start gap-3 rounded-card border border-line bg-surface p-3.5 text-left shadow-card transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft">
              <FileSpreadsheet className="h-4 w-4 text-brand-deep" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-semibold text-ink">
                  {downloading === 'xlsx' ? 'Generando Excel…' : 'Reporte general (Excel)'}
                </span>
                <Download className="h-3.5 w-3.5 shrink-0 text-muted transition-colors group-hover:text-brand" />
              </span>
              <span className="mt-1 block text-[11px] leading-snug text-muted">
                Plantilla <span className="font-medium text-ink">Reporte de Eventos</span> con
                hoja de resumen gráfico, totales y promedios calculados.
              </span>
            </span>
          </button>

          {/* CSV plantilla */}
          <button
            type="button"
            onClick={() => void downloadExport('csv')}
            disabled={downloading !== null || !data}
            className="group flex items-start gap-3 rounded-card border border-line bg-surface p-3.5 text-left shadow-card transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-muted">
              <FileSpreadsheet className="h-4 w-4 text-brand" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-semibold text-ink">
                  {downloading === 'csv' ? 'Generando CSV…' : 'Reporte general (CSV)'}
                </span>
                <Download className="h-3.5 w-3.5 shrink-0 text-muted transition-colors group-hover:text-brand" />
              </span>
              <span className="mt-1 block text-[11px] leading-snug text-muted">
                Mismas columnas de la plantilla en texto plano (UTF-8), para hojas de cálculo o
                tableros externos.
              </span>
            </span>
          </button>

          {/* CSV padrón nominal */}
          <button
            type="button"
            onClick={() => void downloadExport('padron')}
            disabled={downloading !== null || !data}
            className="group flex items-start gap-3 rounded-card border border-line bg-surface p-3.5 text-left shadow-card transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-hover disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2 xl:col-span-3"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-muted">
              <Users className="h-4 w-4 text-brand" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-semibold text-ink">
                  {downloading === 'padron'
                    ? 'Generando padrón…'
                    : 'Padrón nominal de asistentes (CSV)'}
                </span>
                <Download className="h-3.5 w-3.5 shrink-0 text-muted transition-colors group-hover:text-brand" />
              </span>
              <span className="mt-1 block text-[11px] leading-snug text-muted">
                Detalle persona por persona: matrícula, carrera, grado, área, estado de
                invitación, hora de entrada, método de validación y operador que la registró.
              </span>
            </span>
          </button>
        </div>

        <div className="mt-3 rounded-xl bg-surface-muted p-3">
          <p className="text-[11px] leading-snug text-muted">
            <span className="font-semibold text-ink">Nota sobre la plantilla Excel:</span> la
            columna <span className="font-medium text-ink">«Ejes Univ. Pertinente»</span> se
            entrega vacía y conserva la lista desplegable de la plantilla, porque el eje
            universitario no se captura al registrar el evento. El resto de columnas se llena
            automáticamente desde el sistema.
          </p>
        </div>

        {exportError && (
          <p className="mt-3 rounded-xl border border-[#f0d4d3] bg-[#F9E8E7] p-3 text-[11px] font-medium text-[#B85D59]">
            {exportError}
          </p>
        )}
      </section>

      {/* ===================== Filtros ===================== */}
      <section className="ui-card p-[17px]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-brand" />
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
              Filtros de eventos y participación académica
            </h2>
          </div>
          {activeFilterCount > 0 && (
            <button type="button" onClick={resetFilters} className="ui-btn-secondary text-[11px]">
              <RotateCcw className="h-3 w-3" />
              Limpiar {activeFilterCount} filtro(s)
            </button>
          )}
        </div>

        <div className="mt-3.5 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
          <div>
            <label className="ui-field-label" htmlFor="f-start">
              Fecha desde
            </label>
            <input
              id="f-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="ui-field"
            />
          </div>
          <div>
            <label className="ui-field-label" htmlFor="f-end">
              Fecha hasta
            </label>
            <input
              id="f-end"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="ui-field"
            />
          </div>
          <div>
            <label className="ui-field-label" htmlFor="f-building">
              Edificio
            </label>
            <select
              id="f-building"
              value={buildingId}
              onChange={(e) => setBuildingId(e.target.value)}
              className="ui-field"
            >
              <option value="ALL">Todos los edificios</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="ui-field-label" htmlFor="f-space">
              Espacio
            </label>
            <select
              id="f-space"
              value={spaceId}
              onChange={(e) => setSpaceId(e.target.value)}
              className="ui-field"
            >
              <option value="ALL">Todos los espacios</option>
              {spaces.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="ui-field-label" htmlFor="f-lifecycle">
              Estado del ciclo de vida
            </label>
            <select
              id="f-lifecycle"
              value={lifecycle}
              onChange={(e) => setLifecycle(e.target.value)}
              className="ui-field"
            >
              {LIFECYCLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="ui-field-label" htmlFor="f-access">
              Modalidad de acceso
            </label>
            <select
              id="f-access"
              value={accessMode}
              onChange={(e) => setAccessMode(e.target.value)}
              className="ui-field"
            >
              <option value="ALL">Abiertos y restringidos</option>
              <option value="OPEN">Solo eventos abiertos</option>
              <option value="RESTRICTED">Solo eventos restringidos</option>
            </select>
          </div>
          <div>
            <label className="ui-field-label" htmlFor="f-attendee">
              Tipo de asistente
            </label>
            <select
              id="f-attendee"
              value={attendeeType}
              onChange={(e) => setAttendeeType(e.target.value)}
              className="ui-field"
            >
              <option value="ALL">Todos los asistentes</option>
              <option value="STUDENT">Alumnos</option>
              <option value="TEACHER">Docentes</option>
              <option value="ADMIN_STAFF">Personal administrativo</option>
              <option value="EXTERNAL_GUEST">Invitados externos</option>
            </select>
          </div>
          <div>
            <label className="ui-field-label" htmlFor="f-career">
              Carrera universitaria
            </label>
            <select
              id="f-career"
              value={careerId}
              onChange={(e) => setCareerId(e.target.value)}
              className="ui-field"
            >
              <option value="ALL">Todas las carreras</option>
              {careers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="ui-field-label" htmlFor="f-grade">
              Semestre / grado
            </label>
            <select
              id="f-grade"
              value={academicGradeId}
              onChange={(e) => setAcademicGradeId(e.target.value)}
              className="ui-field"
            >
              <option value="ALL">Todos los grados</option>
              {academicGrades.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="ui-field-label" htmlFor="f-dept">
              Departamento / área
            </label>
            <select
              id="f-dept"
              value={departmentAreaId}
              onChange={(e) => setDepartmentAreaId(e.target.value)}
              className="ui-field"
            >
              <option value="ALL">Todos los departamentos</option>
              {departmentAreas.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {loading || !data ? (
        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-6">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-[112px] animate-pulse rounded-card bg-surface-muted" />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-card bg-surface-muted" />
          <p className="pt-2 text-center text-xs text-muted">Generando métricas…</p>
        </div>
      ) : (
        <>
          {/* ===================== KPIs globales ===================== */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
            <KpiCard
              tone="feature"
              label="Eventos filtrados"
              value={data.summary.totalEvents}
              caption={
                <>
                  Abiertos: {data.summary.openEvents} · Restr.: {data.summary.restrictedEvents}
                </>
              }
            />
            <KpiCard
              label="Cierre documental"
              value={data.summary.closed}
              caption={<>Pend. evidencia: {data.summary.completedPendingEvidence}</>}
            />
            <KpiCard
              label="Asistentes registrados"
              value={data.summary.totalRegisteredActive}
              caption={<>QR vigentes: {data.summary.totalQrGenerated}</>}
            />
            <KpiCard
              label="Entradas verificadas"
              value={data.summary.totalCheckedIn}
              caption={
                <>
                  QR: {data.summary.totalCheckedInQr} · Manual:{' '}
                  {data.summary.totalCheckedInManual}
                </>
              }
            />
            <KpiCard
              label="% Asistencia global"
              value={`${data.summary.globalAttendancePct}%`}
              caption={<>Sin check-in: {data.summary.totalPendingCheckIn}</>}
            />
            <KpiCard
              label="Intentos rechazados QR"
              value={data.summary.totalScanRejected}
              caption={<>De {data.summary.totalScanAttempts} lecturas</>}
            />
          </div>

          {/* ===================== Desglose en dos columnas ===================== */}
          <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
            {/* Por categoría de asistente */}
            <section className="ui-card overflow-hidden">
              <CardHead
                icon={Users}
                title="Participación por categoría y método de entrada"
              />
              <div className="overflow-x-auto">
                <table className="ui-table">
                  <thead>
                    <tr>
                      <th>Categoría</th>
                      <th className="text-center">Registrados</th>
                      <th className="text-center">Asistieron</th>
                      <th className="text-center">Por QR</th>
                      <th className="text-center">Manual</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byAttendeeType.map((t) => (
                      <tr key={t.type}>
                        <td className="font-medium">{t.label}</td>
                        <td className="text-center font-semibold">{t.registered}</td>
                        <td className="text-center font-semibold text-brand-deep">
                          {t.checkedIn}
                        </td>
                        <td className="text-center text-muted">{t.qrMethod}</td>
                        <td className="text-center text-muted">{t.manualMethod}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Por carrera */}
            <section className="ui-card overflow-hidden">
              <CardHead icon={GraduationCap} title="Asistencia de alumnos por carrera" />
              <div className="max-h-[320px] overflow-y-auto scrollbar-slim">
                <table className="ui-table">
                  <thead className="sticky top-0">
                    <tr>
                      <th>Carrera</th>
                      <th className="text-center">Inscritos</th>
                      <th className="text-center">Entradas</th>
                      <th className="text-center">% Asist.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byCareer.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-7 text-center text-muted">
                          Sin registros de alumnos en el filtro actual.
                        </td>
                      </tr>
                    ) : (
                      data.byCareer.map((c) => (
                        <tr key={c.code}>
                          <td>
                            <span className="font-mono text-[10px] font-semibold text-brand-deep">
                              {c.code}
                            </span>{' '}
                            <span className="font-medium">{c.name}</span>
                          </td>
                          <td className="text-center font-semibold">{c.registered}</td>
                          <td className="text-center font-semibold text-brand-deep">
                            {c.checkedIn}
                          </td>
                          <td className="text-center">{c.attendancePct}%</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Grado y departamento */}
            <section className="ui-card overflow-hidden">
              <CardHead
                icon={CheckCircle2}
                title="Asistencia por semestre / grado y departamentos"
              />
              <div className="grid grid-cols-1 gap-4 p-[17px] sm:grid-cols-2">
                <div>
                  <p className="ui-label mb-2">Por semestre / cuatrimestre</p>
                  <div className="space-y-1.5">
                    {data.byAcademicGrade.length === 0 ? (
                      <p className="text-[11px] text-muted">Sin datos en el filtro actual.</p>
                    ) : (
                      data.byAcademicGrade.map((g) => (
                        <div
                          key={g.code}
                          className="flex items-center justify-between gap-2 rounded-xl bg-surface-muted px-2.5 py-2"
                        >
                          <span className="truncate text-[11px] font-medium text-ink">
                            {g.name}
                          </span>
                          <span className="shrink-0 text-[11px] font-semibold text-brand-deep">
                            {g.checkedIn}/{g.registered} ({g.attendancePct}%)
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div>
                  <p className="ui-label mb-2">Por departamento / área</p>
                  <div className="space-y-1.5">
                    {data.byDepartmentArea.length === 0 ? (
                      <p className="text-[11px] text-muted">Sin datos en el filtro actual.</p>
                    ) : (
                      data.byDepartmentArea.map((d) => (
                        <div
                          key={d.code}
                          className="flex items-center justify-between gap-2 rounded-xl bg-surface-muted px-2.5 py-2"
                        >
                          <span className="truncate text-[11px] font-medium text-ink">
                            {d.name}
                          </span>
                          <span className="shrink-0 text-[11px] font-semibold text-brand-deep">
                            {d.checkedIn}/{d.registered}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Por espacio */}
            <section className="ui-card overflow-hidden">
              <CardHead
                icon={MapPin}
                title="Uso y asistencia por espacio universitario"
                aside={
                  peakHour ? (
                    <span className="ui-chip-done shrink-0">
                      <Clock className="h-3 w-3" />
                      Hora pico {peakHour.hour}
                    </span>
                  ) : undefined
                }
              />
              <div className="max-h-[320px] overflow-y-auto scrollbar-slim">
                <table className="ui-table">
                  <thead className="sticky top-0">
                    <tr>
                      <th>Espacio</th>
                      <th className="text-center">Eventos</th>
                      <th className="text-center">Cerrados</th>
                      <th className="text-center">Inscritos</th>
                      <th className="text-center">Entradas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.bySpace.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-7 text-center text-muted">
                          Sin eventos en el filtro actual.
                        </td>
                      </tr>
                    ) : (
                      data.bySpace.map((s) => (
                        <tr key={s.spaceName}>
                          <td>
                            <p className="font-medium">{s.spaceName}</p>
                            <p className="ui-caption inline-flex items-center gap-1">
                              <Building2 className="h-2.5 w-2.5" />
                              {s.buildingName}
                            </p>
                          </td>
                          <td className="text-center font-semibold">{s.total}</td>
                          <td className="text-center text-muted">{s.closed}</td>
                          <td className="text-center">{s.registeredAttendees}</td>
                          <td className="text-center font-semibold text-brand-deep">
                            {s.checkedInAttendees}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {/* ===================== Detalle de eventos ===================== */}
          <section className="ui-card overflow-hidden">
            <CardHead
              icon={FileBarChart}
              title={`Detalle de eventos, ciclo de vida y métricas de asistencia (${data.events.length})`}
            />
            <div className="overflow-x-auto">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th>Evento</th>
                    <th>Espacio y fecha</th>
                    <th>Ciclo de vida</th>
                    <th>Modalidad</th>
                    <th className="text-center">Inscritos / entradas</th>
                    <th className="text-center">% Asist. / % Ocup.</th>
                  </tr>
                </thead>
                <tbody>
                  {data.events.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-muted">
                        No hay eventos que cumplan los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    data.events.map((ev) => (
                      <tr key={ev.id}>
                        <td>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] font-semibold text-muted">
                              {ev.id.slice(0, 6)}
                            </span>
                            <CriticalityBadge level={ev.criticalityLevel} compact />
                          </div>
                          <p className="mt-0.5 font-semibold text-ink">{ev.name}</p>
                          <p className="ui-caption">{ev.responsibleName}</p>
                        </td>
                        <td>
                          <p className="font-medium">{ev.space.name}</p>
                          <p className="ui-caption">
                            {ev.date} · {ev.startTime}–{ev.endTime}
                          </p>
                        </td>
                        <td>
                          <EventLifecycleBadge status={ev.lifecycleStatus} compact />
                          <div className="mt-1">
                            <RequestStatusBadge status={ev.spaceRequest?.status || 'PENDING'} />
                          </div>
                        </td>
                        <td>
                          <span
                            className={
                              ev.attendanceStats.accessMode === 'OPEN'
                                ? 'ui-chip-done'
                                : 'ui-chip-progress'
                            }
                          >
                            {ev.attendanceStats.accessMode === 'OPEN' ? 'Abierto' : 'Restringido'}
                          </span>
                        </td>
                        <td className="text-center">
                          <span className="font-semibold text-ink">
                            {ev.attendanceStats.registeredActive}
                          </span>{' '}
                          /{' '}
                          <span className="font-semibold text-brand-deep">
                            {ev.attendanceStats.checkedIn}
                          </span>
                        </td>
                        <td className="text-center">
                          <span className="font-semibold text-ink">
                            {ev.attendanceStats.attendancePct}%
                          </span>{' '}
                          / <span className="text-muted">{ev.attendanceStats.occupancyPct}%</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
