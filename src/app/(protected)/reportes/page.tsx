'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  FileBarChart,
  Download,
  FileText,
  FileSpreadsheet,
  Building2,
  MapPin,
  Users,
  GraduationCap,
  Clock,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import {
  CriticalityBadge,
  EventLifecycleBadge,
  RequestStatusBadge,
} from '@/components/ui/StatusBadge';
import { EventLifecycleStatus } from '@/types';

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

interface ReportData {
  summary: {
    totalEvents: number;
    pendingApproval: number;
    scheduled: number;
    inProgress: number;
    completedPendingEvidence: number;
    closed: number;
    rejected: number;
    expired: number;
    openEvents: number;
    restrictedEvents: number;
    totalRegisteredActive: number;
    totalRevoked: number;
    totalQrGenerated: number;
    totalInvitationsSent: number;
    totalInvitationsFailed: number;
    totalInvitationsPending: number;
    totalCheckedIn: number;
    totalCheckedInQr: number;
    totalCheckedInManual: number;
    totalPendingCheckIn: number;
    globalAttendancePct: number;
    globalOccupancyPct: number;
    totalScanAttempts: number;
    totalScanRejected: number;
  };
  bySpace: {
    spaceName: string;
    buildingName: string;
    capacity: number;
    total: number;
    approved: number;
    pending: number;
    rejected: number;
    closed: number;
    pendingEvidence: number;
    registeredAttendees: number;
    checkedInAttendees: number;
  }[];
  byBuilding: {
    buildingName: string;
    totalEvents: number;
    approvedEvents: number;
    closedEvents: number;
    pendingEvidenceEvents: number;
    registeredAttendees: number;
    checkedInAttendees: number;
  }[];
  byCareer: {
    code: string;
    name: string;
    registered: number;
    checkedIn: number;
    attendancePct: number;
  }[];
  byAcademicGrade: {
    code: string;
    name: string;
    levelOrder: number;
    registered: number;
    checkedIn: number;
    attendancePct: number;
  }[];
  byDepartmentArea: {
    code: string;
    name: string;
    areaType: string;
    registered: number;
    checkedIn: number;
    attendancePct: number;
  }[];
  byAttendeeType: {
    type: string;
    label: string;
    registered: number;
    checkedIn: number;
    qrMethod: number;
    manualMethod: number;
  }[];
  peakCheckInHours: { hour: string; count: number }[];
  events: {
    id: string;
    demoCode?: string | null;
    name: string;
    date: string;
    startTime: string;
    endTime: string;
    cleaningEndTime: string;
    responsibleName: string;
    responsibleDepartment: string;
    criticalityLevel: number;
    lifecycleStatus: EventLifecycleStatus;
    space: { name: string; capacity: number; building?: { name: string } | null };
    createdBy: { fullName: string; username: string };
    spaceRequest?: { status: string } | null;
    equipmentRequest?: { status: string } | null;
    attendanceStats: {
      accessMode: string;
      checkInOpen: boolean;
      registeredActive: number;
      revoked: number;
      qrGenerated: number;
      invitationsSent: number;
      invitationsFailed: number;
      invitationsPending: number;
      checkedIn: number;
      pendingCheckIn: number;
      attendancePct: number;
      spaceCapacity: number;
      occupancyPct: number;
      rejectedScans: number;
    };
    filteredAttendees: {
      id: string;
      fullName: string;
      email: string;
      attendeeType: string;
      enrollmentNumber: string | null;
      careerName: string | null;
      academicGradeName: string | null;
      departmentAreaName: string | null;
      organization: string | null;
      registrationStatus: string;
      checkedInAt: string | null;
      checkInMethod: string | null;
      checkedInByName: string | null;
      invitationStatus: string;
    }[];
  }[];
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
      });
  }, []);

  // Filtros activos en formato de query: los comparten la consulta de la
  // pantalla, las descargas del servidor y la vista imprimible del PDF.
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

  useEffect(() => {
    setLoading(true);
    fetch(`/api/reports${queryString ? `?${queryString}` : ''}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((res) => setData(res))
      .finally(() => setLoading(false));
  }, [queryString]);

  /**
   * Descarga un archivo generado en el servidor con el formato institucional.
   * `xlsx` rellena la plantilla templates/reporte-eventos-erm-utc.xlsx;
   * `csv` usa el mismo diseño en texto plano; `padron` es el detalle nominal.
   */
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-semibold text-ink">
            Reportes Ejecutivos, Ciclo de Vida y Estadísticas de Asistencia QR
          </h1>
          <p className="text-xs text-ink-3 mt-0.5">
            Análisis integral por evento, recinto, carrera, grado académico, departamento, horario
            pico y método de acceso (QR vs Manual)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <Link
            href={`/reportes/imprimir${queryString ? `?${queryString}` : ''}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-ink hover:bg-ink-2 text-surface text-xs font-medium"
          >
            <FileText className="w-3.5 h-3.5" />
            PDF Plantilla Institucional
          </Link>
          <button
            onClick={() => void downloadExport('xlsx')}
            disabled={downloading !== null || !data}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-ink hover:bg-ink-2 disabled:opacity-50 text-surface text-xs font-medium"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            {downloading === 'xlsx' ? 'Generando Excel...' : 'Excel Plantilla ERM'}
          </button>
          <button
            onClick={() => void downloadExport('csv')}
            disabled={downloading !== null || !data}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-line bg-surface hover:bg-paper disabled:opacity-50 text-ink-2 text-xs font-medium"
          >
            <Download className="w-3.5 h-3.5" />
            {downloading === 'csv' ? 'Generando CSV...' : 'CSV Resumen Eventos'}
          </button>
          <button
            onClick={() => void downloadExport('padron')}
            disabled={downloading !== null || !data}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-line bg-surface hover:bg-paper disabled:opacity-50 text-ink-2 text-xs font-medium"
          >
            <Download className="w-3.5 h-3.5" />
            {downloading === 'padron' ? 'Generando padrón...' : 'CSV Padrón Nominal'}
          </button>
        </div>
      </div>

      {/* Nota de formato y errores de exportación */}
      <div className="rounded-xl border border-line bg-surface p-3.5 print:hidden">
        <p className="text-[11px] text-ink-2 leading-snug">
          <span className="font-semibold text-ink">Formatos institucionales:</span> los cuatro
          archivos respetan los filtros activos de esta pantalla. El PDF usa la plantilla oficial
          ERM UTC (folio, sello QR y firma) y el Excel rellena{' '}
          <span className="font-mono text-[11px]">templates/reporte-eventos-erm-utc.xlsx</span>{' '}
          conservando su hoja de resumen gráfico. La columna «Ejes Univ. Pertinente» se entrega
          vacía y conserva su lista desplegable, porque el eje universitario no se captura al
          registrar el evento.
        </p>
        {exportError && (
          <p className="mt-2.5 rounded-md border border-bad/30 bg-bad-soft p-2.5 text-[11px] font-medium text-bad">
            {exportError}
          </p>
        )}
      </div>

      {/* Filters (Section 22) */}
      <div className="bg-surface rounded-xl border border-line p-4 space-y-3 print:hidden">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase font-mono tracking-[0.08em] text-ink-3">
          <Filter className="w-3.5 h-3.5 text-accent" />
          Filtros de Eventos y Participación Académica
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-[11px] font-semibold uppercase font-mono tracking-[0.08em] text-ink-3 mb-1">
              Fecha Desde
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-md border border-line-strong"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase font-mono tracking-[0.08em] text-ink-3 mb-1">
              Fecha Hasta
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-md border border-line-strong"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase font-mono tracking-[0.08em] text-ink-3 mb-1">
              Edificio
            </label>
            <select
              value={buildingId}
              onChange={(e) => setBuildingId(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-md border border-line-strong bg-surface"
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
            <label className="block text-[11px] font-semibold uppercase font-mono tracking-[0.08em] text-ink-3 mb-1">
              Espacio
            </label>
            <select
              value={spaceId}
              onChange={(e) => setSpaceId(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-md border border-line-strong bg-surface"
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
            <label className="block text-[11px] font-semibold uppercase font-mono tracking-[0.08em] text-ink-3 mb-1">
              Estado Ciclo de Vida
            </label>
            <select
              value={lifecycle}
              onChange={(e) => setLifecycle(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-md border border-line-strong bg-surface"
            >
              <option value="ALL">Todos los estados</option>
              <option value="PENDING_APPROVAL">Pendientes de autorización</option>
              <option value="SCHEDULED">Programados</option>
              <option value="IN_PROGRESS">En curso</option>
              <option value="CONCLUDED">Concluidos (todos)</option>
              <option value="COMPLETED_PENDING_EVIDENCE">Pendientes de evidencia</option>
              <option value="CLOSED">Cerrados con evidencia</option>
              <option value="REJECTED">Rechazados</option>
              <option value="EXPIRED">Vencidos</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase font-mono tracking-[0.08em] text-ink-3 mb-1">
              Modalidad Acceso
            </label>
            <select
              value={accessMode}
              onChange={(e) => setAccessMode(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-md border border-line-strong bg-surface"
            >
              <option value="ALL">Abiertos y Restringidos</option>
              <option value="OPEN">Solo Eventos Abiertos</option>
              <option value="RESTRICTED">Solo Eventos Restringidos</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase font-mono tracking-[0.08em] text-ink-3 mb-1">
              Tipo de Asistente
            </label>
            <select
              value={attendeeType}
              onChange={(e) => setAttendeeType(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-md border border-line-strong bg-surface"
            >
              <option value="ALL">Todos los asistentes</option>
              <option value="STUDENT">Alumnos</option>
              <option value="TEACHER">Docentes</option>
              <option value="ADMIN_STAFF">Personal Administrativo</option>
              <option value="EXTERNAL_GUEST">Invitados Externos</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase font-mono tracking-[0.08em] text-ink-3 mb-1">
              Carrera Universitaria
            </label>
            <select
              value={careerId}
              onChange={(e) => setCareerId(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-md border border-line-strong bg-surface"
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
            <label className="block text-[11px] font-semibold uppercase font-mono tracking-[0.08em] text-ink-3 mb-1">
              Semestre / Grado
            </label>
            <select
              value={academicGradeId}
              onChange={(e) => setAcademicGradeId(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-md border border-line-strong bg-surface"
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
            <label className="block text-[11px] font-semibold uppercase font-mono tracking-[0.08em] text-ink-3 mb-1">
              Departamento / Área
            </label>
            <select
              value={departmentAreaId}
              onChange={(e) => setDepartmentAreaId(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-md border border-line-strong bg-surface"
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
      </div>

      {loading || !data ? (
        <div className="p-10 text-center text-sm text-ink-3">Generando métricas...</div>
      ) : (
        <>
          {/* Global Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3.5">
            <div className="bg-surface rounded-xl border border-line p-4">
              <p className="text-[11px] font-semibold uppercase font-mono tracking-[0.08em] text-ink-3">Eventos Filtrados</p>
              <p className="text-2xl font-semibold text-ink mt-1">{data.summary.totalEvents}</p>
              <p className="text-[11px] text-ink-3">
                Abiertos: {data.summary.openEvents} · Restr.: {data.summary.restrictedEvents}
              </p>
            </div>
            <div className="bg-surface rounded-xl border border-line p-4">
              <p className="text-[11px] font-semibold uppercase font-mono tracking-[0.08em] text-ink-3">
                Cierre Documental PDF
              </p>
              <p className="text-2xl font-semibold text-accent mt-1">{data.summary.closed}</p>
              <p className="text-[11px] text-warn font-medium">
                Pend. evidencia: {data.summary.completedPendingEvidence}
              </p>
            </div>
            <div className="bg-surface rounded-xl border border-line p-4">
              <p className="text-[11px] font-semibold uppercase font-mono tracking-[0.08em] text-ink-3">
                Asistentes Registrados
              </p>
              <p className="text-2xl font-semibold text-ink mt-1">
                {data.summary.totalRegisteredActive}
              </p>
              <p className="text-[11px] text-ink-3">
                QR vigentes: {data.summary.totalQrGenerated}
              </p>
            </div>
            <div className="bg-surface rounded-xl border border-line p-4">
              <p className="text-[11px] font-semibold uppercase font-mono tracking-[0.08em] text-ink-3">
                Entradas Verificadas
              </p>
              <p className="text-2xl font-semibold text-accent mt-1">
                {data.summary.totalCheckedIn}
              </p>
              <p className="text-[11px] text-ink-3">
                QR: {data.summary.totalCheckedInQr} · Manual: {data.summary.totalCheckedInManual}
              </p>
            </div>
            <div className="bg-surface rounded-xl border border-line p-4">
              <p className="text-[11px] font-semibold uppercase font-mono tracking-[0.08em] text-ink-3">% Asistencia Global</p>
              <p className="text-2xl font-semibold text-ink mt-1">
                {data.summary.globalAttendancePct}%
              </p>
              <p className="text-[11px] text-ink-3">
                Sin check-in: {data.summary.totalPendingCheckIn}
              </p>
            </div>
            <div className="bg-surface rounded-xl border border-line p-4">
              <p className="text-[11px] font-semibold uppercase font-mono tracking-[0.08em] text-ink-3">
                Intentos Rechazados QR
              </p>
              <p className="text-2xl font-semibold text-bad mt-1">
                {data.summary.totalScanRejected}
              </p>
              <p className="text-[11px] text-ink-3">
                De {data.summary.totalScanAttempts} lecturas totales
              </p>
            </div>
          </div>

          {/* Breakdowns by Attendee Type, Career, Grade & Department */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* By Attendee Type & Check-in Method */}
            <div className="bg-surface rounded-xl border border-line overflow-hidden">
              <div className="px-5 py-3.5 border-b border-line flex items-center gap-2">
                <Users className="w-4 h-4 text-accent" />
                <h2 className="text-sm font-semibold text-ink">
                  Participación por Categoría de Asistente y Método de Entrada
                </h2>
              </div>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-paper border-b border-line text-[11px] font-semibold uppercase font-mono tracking-[0.08em] text-ink-3">
                    <th className="py-2.5 px-4">Categoría</th>
                    <th className="py-2.5 px-4 text-center">Registrados</th>
                    <th className="py-2.5 px-4 text-center">Asistieron</th>
                    <th className="py-2.5 px-4 text-center">Por QR</th>
                    <th className="py-2.5 px-4 text-center">Manual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.byAttendeeType.map((t) => (
                    <tr key={t.type}>
                      <td className="py-2.5 px-4 font-medium text-ink">{t.label}</td>
                      <td className="py-2.5 px-4 text-center font-semibold">{t.registered}</td>
                      <td className="py-2.5 px-4 text-center font-semibold text-accent">
                        {t.checkedIn}
                      </td>
                      <td className="py-2.5 px-4 text-center">{t.qrMethod}</td>
                      <td className="py-2.5 px-4 text-center">{t.manualMethod}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* By Career */}
            <div className="bg-surface rounded-xl border border-line overflow-hidden">
              <div className="px-5 py-3.5 border-b border-line flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-accent" />
                <h2 className="text-sm font-semibold text-ink">
                  Asistencia de Alumnos por Carrera Universitaria
                </h2>
              </div>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-paper border-b border-line text-[11px] font-semibold uppercase font-mono tracking-[0.08em] text-ink-3">
                    <th className="py-2.5 px-4">Carrera</th>
                    <th className="py-2.5 px-4 text-center">Inscritos</th>
                    <th className="py-2.5 px-4 text-center">Entradas</th>
                    <th className="py-2.5 px-4 text-center">% Asistencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.byCareer.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-ink-3">
                        Sin registros de alumnos en el filtro actual.
                      </td>
                    </tr>
                  ) : (
                    data.byCareer.map((c) => (
                      <tr key={c.code}>
                        <td className="py-2.5 px-4">
                          <span className="font-mono font-semibold text-accent">{c.code}</span> —{' '}
                          <span className="font-medium text-ink">{c.name}</span>
                        </td>
                        <td className="py-2.5 px-4 text-center font-semibold">{c.registered}</td>
                        <td className="py-2.5 px-4 text-center font-semibold text-accent">
                          {c.checkedIn}
                        </td>
                        <td className="py-2.5 px-4 text-center font-medium">
                          {c.attendancePct}%
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* By Academic Grade & Peak Check-In Hours */}
            <div className="bg-surface rounded-xl border border-line overflow-hidden">
              <div className="px-5 py-3.5 border-b border-line flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-accent" />
                <h2 className="text-sm font-semibold text-ink">
                  Asistencia por Semestre / Grado y Departamentos
                </h2>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-[11px] font-semibold uppercase font-mono tracking-[0.08em] text-ink-3 mb-2">
                    Por Semestre / Cuatrimestre
                  </p>
                  <div className="space-y-1.5">
                    {data.byAcademicGrade.map((g) => (
                      <div
                        key={g.code}
                        className="flex items-center justify-between p-2 rounded bg-paper border border-line"
                      >
                        <span className="font-medium text-ink">{g.name}</span>
                        <span className="font-semibold text-accent">
                          {g.checkedIn}/{g.registered} ({g.attendancePct}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase font-mono tracking-[0.08em] text-ink-3 mb-2">
                    Por Departamento Académico / Administrativo
                  </p>
                  <div className="space-y-1.5">
                    {data.byDepartmentArea.map((d) => (
                      <div
                        key={d.code}
                        className="flex items-center justify-between p-2 rounded bg-paper border border-line"
                      >
                        <span className="font-medium text-ink truncate pr-2">{d.name}</span>
                        <span className="font-semibold text-accent shrink-0">
                          {d.checkedIn}/{d.registered}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* By Space & Peak Hours */}
            <div className="bg-surface rounded-xl border border-line overflow-hidden">
              <div className="px-5 py-3.5 border-b border-line flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-accent" />
                  <h2 className="text-sm font-semibold text-ink">
                    Uso y Asistencia por Espacio Universitario
                  </h2>
                </div>
                {data.peakCheckInHours.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-accent bg-accent-soft px-2.5 py-0.5 rounded-full">
                    <Clock className="w-3 h-3" />
                    Hora pico entrada: {data.peakCheckInHours[0].hour} hrs
                  </span>
                )}
              </div>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-paper border-b border-line text-[11px] font-semibold uppercase font-mono tracking-[0.08em] text-ink-3">
                    <th className="py-2.5 px-4">Espacio</th>
                    <th className="py-2.5 px-4 text-center">Eventos</th>
                    <th className="py-2.5 px-4 text-center">Cerrados</th>
                    <th className="py-2.5 px-4 text-center">Inscritos</th>
                    <th className="py-2.5 px-4 text-center">Entradas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.bySpace.map((s) => (
                    <tr key={s.spaceName}>
                      <td className="py-2.5 px-4 font-medium text-ink">{s.spaceName}</td>
                      <td className="py-2.5 px-4 text-center font-semibold">{s.total}</td>
                      <td className="py-2.5 px-4 text-center text-ink-2">{s.closed}</td>
                      <td className="py-2.5 px-4 text-center">{s.registeredAttendees}</td>
                      <td className="py-2.5 px-4 text-center font-semibold text-accent">
                        {s.checkedInAttendees}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detailed Events Table */}
          <div className="bg-surface rounded-xl border border-line overflow-hidden">
            <div className="px-5 py-3.5 border-b border-line flex items-center gap-2">
              <FileBarChart className="w-4 h-4 text-accent" />
              <h2 className="text-sm font-semibold text-ink">
                Detalle de Eventos, Ciclo de Vida y Métricas de Asistencia ({data.events.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-paper border-b border-line text-[11px] font-semibold uppercase font-mono tracking-[0.08em] text-ink-3">
                    <th className="py-2.5 px-3">Evento</th>
                    <th className="py-2.5 px-3">Espacio y Fecha</th>
                    <th className="py-2.5 px-3">Ciclo de Vida</th>
                    <th className="py-2.5 px-3">Modalidad</th>
                    <th className="py-2.5 px-3 text-center">Inscritos / Entradas</th>
                    <th className="py-2.5 px-3 text-center">% Asist. / % Ocup.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.events.map((ev) => (
                    <tr key={ev.id} className="hover:bg-paper/70">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[11px] font-semibold text-ink-3">
                            {ev.id.slice(0, 6)}
                          </span>
                          <CriticalityBadge level={ev.criticalityLevel} />
                        </div>
                        <p className="font-semibold text-ink mt-0.5">{ev.name}</p>
                        <p className="text-[11px] text-ink-3">{ev.responsibleName}</p>
                      </td>
                      <td className="py-2.5 px-3">
                        <p className="font-medium text-ink">{ev.space.name}</p>
                        <p className="text-[11px] text-ink-3">
                          {ev.date} · {ev.startTime}-{ev.endTime}
                        </p>
                      </td>
                      <td className="py-2.5 px-3">
                        <EventLifecycleBadge status={ev.lifecycleStatus} />
                        <div className="mt-1">
                          <RequestStatusBadge status={ev.spaceRequest?.status || 'PENDING'} />
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold ${
                            ev.attendanceStats.accessMode === 'OPEN'
                              ? 'bg-accent-soft text-accent'
                              : 'bg-warn-soft text-warn'
                          }`}
                        >
                          {ev.attendanceStats.accessMode === 'OPEN' ? 'Abierto' : 'Restringido'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="font-semibold text-ink">
                          {ev.attendanceStats.registeredActive}
                        </span>{' '}
                        /{' '}
                        <span className="font-semibold text-accent">
                          {ev.attendanceStats.checkedIn}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="font-semibold text-ink">
                          {ev.attendanceStats.attendancePct}%
                        </span>{' '}
                        /{' '}
                        <span className="text-ink-2">
                          {ev.attendanceStats.occupancyPct}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
