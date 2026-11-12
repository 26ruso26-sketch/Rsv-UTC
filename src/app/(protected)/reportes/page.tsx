'use client';

import React, { useEffect, useState } from 'react';
import {
  FileBarChart,
  Download,
  Building2,
  MapPin,
  Printer,
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

  useEffect(() => {
    setLoading(true);
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

    fetch(`/api/reports?${params.toString()}`)
      .then((r) => r.json())
      .then((res) => setData(res))
      .finally(() => setLoading(false));
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

  function exportEventsCsv() {
    if (!data) return;
    const headers = [
      'Codigo',
      'Evento',
      'Modalidad',
      'Estado Ciclo de Vida',
      'Espacio',
      'Edificio',
      'Fecha',
      'Inicio',
      'Fin',
      'Responsable',
      'Departamento',
      'Capacidad Recinto',
      'Registrados Activos',
      'Revocados',
      'QR Generados',
      'Invitaciones Enviadas',
      'Entradas Registradas',
      '% Asistencia',
      '% Ocupacion',
    ];
    const rows = data.events.map((ev) => [
      ev.id.slice(0, 8),
      `"${ev.name.replace(/"/g, '""')}"`,
      ev.attendanceStats.accessMode === 'OPEN' ? 'ABIERTO' : 'RESTRINGIDO',
      ev.lifecycleStatus,
      `"${ev.space.name}"`,
      `"${ev.space.building?.name || 'Extension Universitaria'}"`,
      ev.date,
      ev.startTime,
      ev.endTime,
      `"${ev.responsibleName}"`,
      `"${ev.responsibleDepartment}"`,
      ev.attendanceStats.spaceCapacity,
      ev.attendanceStats.registeredActive,
      ev.attendanceStats.revoked,
      ev.attendanceStats.qrGenerated,
      ev.attendanceStats.invitationsSent,
      ev.attendanceStats.checkedIn,
      `${ev.attendanceStats.attendancePct}%`,
      `${ev.attendanceStats.occupancyPct}%`,
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-eventos-asistencia-sreu-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportAttendeesCsv() {
    if (!data) return;
    const headers = [
      'Codigo Evento',
      'Evento',
      'Fecha',
      'Espacio',
      'Nombre Asistente',
      'Correo',
      'Categoria',
      'Matricula',
      'Carrera',
      'Semestre/Grado',
      'Departamento/Area',
      'Organizacion Externa',
      'Estado Registro',
      'Estado Invitacion Correo',
      'Asistio (Check-in)',
      'Fecha/Hora Entrada',
      'Metodo Entrada',
      'Validado Por',
    ];

    const rows: (string | number)[][] = [];
    for (const ev of data.events) {
      for (const att of ev.filteredAttendees) {
        rows.push([
          ev.id.slice(0, 8),
          `"${ev.name.replace(/"/g, '""')}"`,
          ev.date,
          `"${ev.space.name}"`,
          `"${att.fullName.replace(/"/g, '""')}"`,
          att.email,
          att.attendeeType,
          att.enrollmentNumber || '',
          `"${att.careerName || ''}"`,
          `"${att.academicGradeName || ''}"`,
          `"${att.departmentAreaName || ''}"`,
          `"${att.organization || ''}"`,
          att.registrationStatus,
          att.invitationStatus,
          att.checkedInAt ? 'SI' : 'NO',
          att.checkedInAt ? new Date(att.checkedInAt).toLocaleString('es-MX') : '',
          att.checkInMethod || '',
          `"${att.checkedInByName || ''}"`,
        ]);
      }
    }

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `padron-nominal-asistencia-qr-sreu-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Reportes Ejecutivos, Ciclo de Vida y Estadísticas de Asistencia QR
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Análisis integral por evento, recinto, carrera, grado académico, departamento, horario
            pico y método de acceso (QR vs Manual)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            Exportar / Imprimir PDF
          </button>
          <button
            onClick={exportEventsCsv}
            disabled={!data || data.events.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            CSV Resumen Eventos
          </button>
          <button
            onClick={exportAttendeesCsv}
            disabled={!data}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-semibold shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            CSV Padrón Nominal Asistentes
          </button>
        </div>
      </div>

      {/* Filters (Section 22) */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4 space-y-3 print:hidden">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
          <Filter className="w-3.5 h-3.5 text-emerald-700" />
          Filtros de Eventos y Participación Académica
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
              Fecha Desde
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
              Fecha Hasta
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
              Edificio
            </label>
            <select
              value={buildingId}
              onChange={(e) => setBuildingId(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
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
            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
              Espacio
            </label>
            <select
              value={spaceId}
              onChange={(e) => setSpaceId(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
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
            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
              Estado Ciclo de Vida
            </label>
            <select
              value={lifecycle}
              onChange={(e) => setLifecycle(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
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
            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
              Modalidad Acceso
            </label>
            <select
              value={accessMode}
              onChange={(e) => setAccessMode(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
            >
              <option value="ALL">Abiertos y Restringidos</option>
              <option value="OPEN">Solo Eventos Abiertos</option>
              <option value="RESTRICTED">Solo Eventos Restringidos</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
              Tipo de Asistente
            </label>
            <select
              value={attendeeType}
              onChange={(e) => setAttendeeType(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
            >
              <option value="ALL">Todos los asistentes</option>
              <option value="STUDENT">Alumnos</option>
              <option value="TEACHER">Docentes</option>
              <option value="ADMIN_STAFF">Personal Administrativo</option>
              <option value="EXTERNAL_GUEST">Invitados Externos</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
              Carrera Universitaria
            </label>
            <select
              value={careerId}
              onChange={(e) => setCareerId(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
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
            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
              Semestre / Grado
            </label>
            <select
              value={academicGradeId}
              onChange={(e) => setAcademicGradeId(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
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
            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
              Departamento / Área
            </label>
            <select
              value={departmentAreaId}
              onChange={(e) => setDepartmentAreaId(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
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
        <div className="p-10 text-center text-sm text-slate-500">Generando métricas...</div>
      ) : (
        <>
          {/* Global Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3.5">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase text-slate-400">Eventos Filtrados</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{data.summary.totalEvents}</p>
              <p className="text-[11px] text-slate-500">
                Abiertos: {data.summary.openEvents} · Restr.: {data.summary.restrictedEvents}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase text-slate-400">
                Cierre Documental PDF
              </p>
              <p className="text-2xl font-black text-emerald-700 mt-1">{data.summary.closed}</p>
              <p className="text-[11px] text-orange-700 font-semibold">
                Pend. evidencia: {data.summary.completedPendingEvidence}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase text-slate-400">
                Asistentes Registrados
              </p>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {data.summary.totalRegisteredActive}
              </p>
              <p className="text-[11px] text-slate-500">
                QR vigentes: {data.summary.totalQrGenerated}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase text-slate-400">
                Entradas Verificadas
              </p>
              <p className="text-2xl font-black text-emerald-700 mt-1">
                {data.summary.totalCheckedIn}
              </p>
              <p className="text-[11px] text-slate-500">
                QR: {data.summary.totalCheckedInQr} · Manual: {data.summary.totalCheckedInManual}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase text-slate-400">% Asistencia Global</p>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {data.summary.globalAttendancePct}%
              </p>
              <p className="text-[11px] text-slate-500">
                Sin check-in: {data.summary.totalPendingCheckIn}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase text-slate-400">
                Intentos Rechazados QR
              </p>
              <p className="text-2xl font-black text-rose-700 mt-1">
                {data.summary.totalScanRejected}
              </p>
              <p className="text-[11px] text-slate-500">
                De {data.summary.totalScanAttempts} lecturas totales
              </p>
            </div>
          </div>

          {/* Breakdowns by Attendee Type, Career, Grade & Department */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* By Attendee Type & Check-in Method */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-700" />
                <h2 className="text-sm font-bold text-slate-900">
                  Participación por Categoría de Asistente y Método de Entrada
                </h2>
              </div>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500">
                    <th className="py-2.5 px-4">Categoría</th>
                    <th className="py-2.5 px-4 text-center">Registrados</th>
                    <th className="py-2.5 px-4 text-center">Asistieron</th>
                    <th className="py-2.5 px-4 text-center">Por QR</th>
                    <th className="py-2.5 px-4 text-center">Manual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {data.byAttendeeType.map((t) => (
                    <tr key={t.type}>
                      <td className="py-2.5 px-4 font-semibold text-slate-900">{t.label}</td>
                      <td className="py-2.5 px-4 text-center font-bold">{t.registered}</td>
                      <td className="py-2.5 px-4 text-center font-bold text-emerald-700">
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
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-emerald-700" />
                <h2 className="text-sm font-bold text-slate-900">
                  Asistencia de Alumnos por Carrera Universitaria
                </h2>
              </div>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500">
                    <th className="py-2.5 px-4">Carrera</th>
                    <th className="py-2.5 px-4 text-center">Inscritos</th>
                    <th className="py-2.5 px-4 text-center">Entradas</th>
                    <th className="py-2.5 px-4 text-center">% Asistencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {data.byCareer.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-400">
                        Sin registros de alumnos en el filtro actual.
                      </td>
                    </tr>
                  ) : (
                    data.byCareer.map((c) => (
                      <tr key={c.code}>
                        <td className="py-2.5 px-4">
                          <span className="font-mono font-bold text-emerald-800">{c.code}</span> —{' '}
                          <span className="font-medium text-slate-800">{c.name}</span>
                        </td>
                        <td className="py-2.5 px-4 text-center font-bold">{c.registered}</td>
                        <td className="py-2.5 px-4 text-center font-bold text-emerald-700">
                          {c.checkedIn}
                        </td>
                        <td className="py-2.5 px-4 text-center font-semibold">
                          {c.attendancePct}%
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* By Academic Grade & Peak Check-In Hours */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <h2 className="text-sm font-bold text-slate-900">
                  Asistencia por Semestre / Grado y Departamentos
                </h2>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-[11px] font-bold uppercase text-slate-400 mb-2">
                    Por Semestre / Cuatrimestre
                  </p>
                  <div className="space-y-1.5">
                    {data.byAcademicGrade.map((g) => (
                      <div
                        key={g.code}
                        className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200"
                      >
                        <span className="font-medium text-slate-800">{g.name}</span>
                        <span className="font-bold text-emerald-800">
                          {g.checkedIn}/{g.registered} ({g.attendancePct}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase text-slate-400 mb-2">
                    Por Departamento Académico / Administrativo
                  </p>
                  <div className="space-y-1.5">
                    {data.byDepartmentArea.map((d) => (
                      <div
                        key={d.code}
                        className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200"
                      >
                        <span className="font-medium text-slate-800 truncate pr-2">{d.name}</span>
                        <span className="font-bold text-emerald-800 shrink-0">
                          {d.checkedIn}/{d.registered}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* By Space & Peak Hours */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-700" />
                  <h2 className="text-sm font-bold text-slate-900">
                    Uso y Asistencia por Espacio Universitario
                  </h2>
                </div>
                {data.peakCheckInHours.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                    <Clock className="w-3 h-3" />
                    Hora pico entrada: {data.peakCheckInHours[0].hour} hrs
                  </span>
                )}
              </div>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500">
                    <th className="py-2.5 px-4">Espacio</th>
                    <th className="py-2.5 px-4 text-center">Eventos</th>
                    <th className="py-2.5 px-4 text-center">Cerrados</th>
                    <th className="py-2.5 px-4 text-center">Inscritos</th>
                    <th className="py-2.5 px-4 text-center">Entradas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {data.bySpace.map((s) => (
                    <tr key={s.spaceName}>
                      <td className="py-2.5 px-4 font-semibold text-slate-900">{s.spaceName}</td>
                      <td className="py-2.5 px-4 text-center font-bold">{s.total}</td>
                      <td className="py-2.5 px-4 text-center text-slate-700">{s.closed}</td>
                      <td className="py-2.5 px-4 text-center">{s.registeredAttendees}</td>
                      <td className="py-2.5 px-4 text-center font-bold text-emerald-700">
                        {s.checkedInAttendees}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detailed Events Table */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center gap-2">
              <FileBarChart className="w-4 h-4 text-emerald-700" />
              <h2 className="text-sm font-bold text-slate-900">
                Detalle de Eventos, Ciclo de Vida y Métricas de Asistencia ({data.events.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500">
                    <th className="py-2.5 px-3">Evento</th>
                    <th className="py-2.5 px-3">Espacio y Fecha</th>
                    <th className="py-2.5 px-3">Ciclo de Vida</th>
                    <th className="py-2.5 px-3">Modalidad</th>
                    <th className="py-2.5 px-3 text-center">Inscritos / Entradas</th>
                    <th className="py-2.5 px-3 text-center">% Asist. / % Ocup.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {data.events.map((ev) => (
                    <tr key={ev.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] font-bold text-slate-500">
                            {ev.id.slice(0, 6)}
                          </span>
                          <CriticalityBadge level={ev.criticalityLevel} />
                        </div>
                        <p className="font-bold text-slate-900 mt-0.5">{ev.name}</p>
                        <p className="text-[11px] text-slate-500">{ev.responsibleName}</p>
                      </td>
                      <td className="py-2.5 px-3">
                        <p className="font-semibold text-slate-800">{ev.space.name}</p>
                        <p className="text-[11px] text-slate-500">
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
                          className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                            ev.attendanceStats.accessMode === 'OPEN'
                              ? 'bg-emerald-50 text-emerald-800'
                              : 'bg-amber-50 text-amber-900'
                          }`}
                        >
                          {ev.attendanceStats.accessMode === 'OPEN' ? 'Abierto' : 'Restringido'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="font-bold text-slate-900">
                          {ev.attendanceStats.registeredActive}
                        </span>{' '}
                        /{' '}
                        <span className="font-bold text-emerald-700">
                          {ev.attendanceStats.checkedIn}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="font-bold text-slate-900">
                          {ev.attendanceStats.attendancePct}%
                        </span>{' '}
                        /{' '}
                        <span className="text-slate-600">
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
