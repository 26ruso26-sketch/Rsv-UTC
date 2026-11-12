'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  PlusCircle,
  CheckSquare,
  ArrowRight,
  MapPin,
  Users,
  QrCode,
  FileWarning,
  ShieldCheck,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/components/layout/AppShell';
import {
  CriticalityBadge,
  EventLifecycleBadge,
  RequestStatusBadge,
} from '@/components/ui/StatusBadge';
import { EventLifecycleStatus } from '@/types';

interface DashboardEvent {
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
  space: { id: string; name: string; capacity: number };
  spaceRequest?: { status: string } | null;
  equipmentRequest?: { status: string } | null;
  attendanceConfig?: {
    accessMode: 'OPEN' | 'RESTRICTED';
    checkInOpen: boolean;
  } | null;
}

interface DashboardData {
  stats: {
    totalEvents: number;
    approvedEvents: number;
    pendingEvents: number;
    rejectedEvents: number;
    expiredEvents: number;
    pendingEvidenceClosureCount: number;
    closedEventsCount: number;
    inProgressEventsCount: number;
    scheduledEventsCount: number;
    todayEventsCount: number;
    pendingAuthorizationsForMe: number;
    pendingSpaceForMe: number;
    pendingEquipmentForMe: number;
    pendingScheduleForMe: number;
    lifecycleCounts: {
      PENDING_APPROVAL: number;
      SCHEDULED: number;
      IN_PROGRESS: number;
      COMPLETED_PENDING_EVIDENCE: number;
      CLOSED: number;
      REJECTED: number;
      EXPIRED: number;
    };
    attendanceSummary: {
      totalRegisteredActive: number;
      totalRevoked: number;
      totalCheckedIn: number;
      totalPendingCheckIn: number;
      globalAttendancePct: number;
      globalOccupancyPct: number;
      eventsWithAttendanceCount: number;
      openEventsCount: number;
      restrictedEventsCount: number;
      byAttendeeType: Record<string, { registered: number; checkedIn: number }>;
      topCareers: { name: string; registered: number; checkedIn: number }[];
    };
  };
  todayEvents: DashboardEvent[];
  upcomingEvents: DashboardEvent[];
  myRecentEvents: DashboardEvent[];
  pendingSpaceRequests: {
    id: string;
    event: { id: string; name: string; date: string; startTime: string; space: { name: string } };
  }[];
  pendingEquipmentRequests: {
    id: string;
    event: { id: string; name: string; date: string; space: { name: string } };
  }[];
  pendingScheduleChanges: {
    id: string;
    proposedDate: string;
    proposedStartTime: string;
    proposedEndTime: string;
    event: { id: string; name: string; space: { name: string } };
  }[];
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/dashboard', {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });

      const contentType = response.headers.get('content-type') || '';
      const rawBody = await response.text();

      if (!rawBody || !rawBody.trim()) {
        throw new Error(
          `El servidor devolvió una respuesta vacía (HTTP ${response.status}).`
        );
      }

      if (!contentType.includes('application/json')) {
        throw new Error(
          `La respuesta del servidor no tiene formato JSON válido (HTTP ${response.status}).`
        );
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(rawBody);
      } catch {
        throw new Error(
          `No fue posible interpretar la respuesta JSON del servidor (HTTP ${response.status}).`
        );
      }

      if (!response.ok) {
        const apiError =
          parsed && typeof parsed === 'object' && 'error' in parsed
            ? String((parsed as { error?: unknown }).error || '')
            : '';
        throw new Error(
          apiError || `Error al consultar los indicadores (HTTP ${response.status}).`
        );
      }

      if (!parsed || typeof parsed !== 'object' || !('stats' in parsed)) {
        throw new Error('La respuesta del dashboard no contiene la estructura de indicadores esperada.');
      }

      setData(parsed as DashboardData);
    } catch (err) {
      setData(null);
      setError(
        err instanceof Error
          ? err.message
          : 'No fue posible cargar los indicadores del dashboard.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  if (loading) {
    return (
      <div className="p-8 text-center text-sm text-slate-500">
        Cargando indicadores ejecutivos y métricas de asistencia...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-xl mx-auto mt-8 bg-rose-50 border border-rose-200 rounded-2xl p-6 text-rose-900 space-y-4 shadow-sm">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h2 className="text-sm font-bold">
              No se pudieron cargar los indicadores del dashboard
            </h2>
            <p className="text-xs text-rose-800">
              {error || 'No se recibieron datos válidos desde el servidor.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void loadDashboard()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const { stats } = data;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 mb-2">
            Panel Institucional · SREU Fase 2
          </span>
          <h1 className="text-xl sm:text-2xl font-bold">Bienvenido, {user?.fullName}</h1>
          <p className="text-xs sm:text-sm text-emerald-100/80 mt-1">
            {user?.buildingName
              ? `Responsable de ${user.buildingName} — Control de ciclo de vida de eventos, cierre documental PDF y asistencia QR.`
              : `${
                  user?.departmentLabel || 'Coordinación Institucional'
                } — Supervisión global de recintos, autorizaciones y control de acceso QR.`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Link
            href="/escaner"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-semibold text-xs transition-colors"
          >
            <QrCode className="w-4 h-4 text-emerald-300" />
            Escáner QR de Acceso
          </Link>
          <Link
            href="/eventos/nuevo"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            Registrar Evento
          </Link>
        </div>
      </div>

      {/* Mandatory Closure Pending Alert */}
      {stats.pendingEvidenceClosureCount > 0 && (
        <div className="p-4 rounded-xl bg-orange-50 border border-orange-300 text-orange-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <FileWarning className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold text-sm">
                Atención: {stats.pendingEvidenceClosureCount} evento(s) concluido(s) pendiente(s) de
                evidencia documental de cierre
              </p>
              <p className="text-orange-900 mt-0.5">
                Los eventos cuya hora de finalización ya concluyó requieren al menos un archivo PDF
                de evidencia de realización para pasar a estado Cerrado (`CLOSED`).
              </p>
            </div>
          </div>
          <Link
            href="/eventos?lifecycle=COMPLETED_PENDING_EVIDENCE"
            className="px-3.5 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shrink-0"
          >
            Ver Eventos Pendientes de Evidencia
          </Link>
        </div>
      )}

      {/* Lifecycle KPI Grid (Section 4 & 7) */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
          Ciclo de Vida de Eventos y Bandeja de Autorizaciones
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm">
            <p className="text-[11px] font-semibold uppercase text-slate-500">Total Eventos</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{stats.totalEvents}</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Abiertos: {stats.attendanceSummary.openEventsCount} · Restr.:{' '}
              {stats.attendanceSummary.restrictedEventsCount}
            </p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm">
            <p className="text-[11px] font-semibold uppercase text-sky-700">Programados</p>
            <p className="text-2xl font-black text-sky-900 mt-1">
              {stats.lifecycleCounts.SCHEDULED}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              En curso hoy: {stats.lifecycleCounts.IN_PROGRESS}
            </p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm">
            <p className="text-[11px] font-semibold uppercase text-orange-700">
              Pend. Evidencia PDF
            </p>
            <p className="text-2xl font-black text-orange-700 mt-1">
              {stats.lifecycleCounts.COMPLETED_PENDING_EVIDENCE}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Concluidos sin cierre</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm">
            <p className="text-[11px] font-semibold uppercase text-emerald-700">
              Cerrados (CLOSED)
            </p>
            <p className="text-2xl font-black text-emerald-700 mt-1">
              {stats.lifecycleCounts.CLOSED}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Con PDF de realización</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm">
            <p className="text-[11px] font-semibold uppercase text-amber-700">
              Por Autorizar (Míos)
            </p>
            <p className="text-2xl font-black text-amber-700 mt-1">
              {stats.pendingAuthorizationsForMe}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Esp: {stats.pendingSpaceForMe} · Eq: {stats.pendingEquipmentForMe} · Hor:{' '}
              {stats.pendingScheduleForMe}
            </p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm">
            <p className="text-[11px] font-semibold uppercase text-slate-500">
              Rechazados / Vencidos
            </p>
            <p className="text-2xl font-black text-slate-800 mt-1">
              {stats.lifecycleCounts.REJECTED + stats.lifecycleCounts.EXPIRED}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Rech: {stats.lifecycleCounts.REJECTED} · Venc: {stats.lifecycleCounts.EXPIRED}
            </p>
          </div>
        </div>
      </div>

      {/* Attendance & QR Control KPIs (Section 21) */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-emerald-700" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Métricas Globales de Registro de Asistentes y Control de Acceso QR
              </h2>
              <p className="text-xs text-slate-500">
                Participación consolidada en tiempo real desde SQLite
              </p>
            </div>
          </div>
          <Link
            href="/reportes"
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1"
          >
            Ver desglose por carrera y grado en Reportes <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <p className="text-[11px] font-bold uppercase text-slate-500">
              Asistentes Registrados / Invitados
            </p>
            <p className="text-2xl font-black text-slate-900 mt-1">
              {stats.attendanceSummary.totalRegisteredActive}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Revocados: {stats.attendanceSummary.totalRevoked}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
            <p className="text-[11px] font-bold uppercase text-emerald-800">
              Entradas Validadas (Check-in)
            </p>
            <p className="text-2xl font-black text-emerald-700 mt-1">
              {stats.attendanceSummary.totalCheckedIn}
            </p>
            <p className="text-[11px] text-emerald-800 mt-0.5">
              Pendientes de ingreso: {stats.attendanceSummary.totalPendingCheckIn}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <p className="text-[11px] font-bold uppercase text-slate-500">
              Porcentaje de Asistencia Efectiva
            </p>
            <p className="text-2xl font-black text-slate-900 mt-1 flex items-center gap-1.5">
              {stats.attendanceSummary.globalAttendancePct}%
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              (Entradas / Registrados activos) × 100
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <p className="text-[11px] font-bold uppercase text-slate-500">
              Ocupación Promedio de Recintos
            </p>
            <p className="text-2xl font-black text-slate-900 mt-1">
              {stats.attendanceSummary.globalOccupancyPct}%
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              En {stats.attendanceSummary.eventsWithAttendanceCount} evento(s) con padrón QR
            </p>
          </div>
        </div>

        {/* Breakdown by Attendee Category */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-xs">
          {[
            { key: 'STUDENT', label: 'Alumnos' },
            { key: 'TEACHER', label: 'Docentes' },
            { key: 'ADMIN_STAFF', label: 'Personal Administrativo' },
            { key: 'EXTERNAL_GUEST', label: 'Invitados Externos' },
          ].map((cat) => {
            const bucket = stats.attendanceSummary.byAttendeeType[cat.key] || {
              registered: 0,
              checkedIn: 0,
            };
            return (
              <div
                key={cat.key}
                className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200/70 bg-white"
              >
                <span className="font-semibold text-slate-700">{cat.label}</span>
                <span className="font-bold text-slate-900">
                  {bucket.checkedIn}{' '}
                  <span className="text-slate-400 font-normal">/ {bucket.registered}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 cols: Upcoming & Recent Events */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-700" />
                <h2 className="text-sm font-bold text-slate-900">
                  Eventos Programados y Recientes
                </h2>
              </div>
              <Link
                href="/eventos"
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1"
              >
                Ver todos <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {data.upcomingEvents.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No hay eventos próximos programados.
              </div>
            ) : (
              <div className="divide-y divide-slate-200/80">
                {data.upcomingEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <EventLifecycleBadge status={ev.lifecycleStatus} />
                        <CriticalityBadge level={ev.criticalityLevel} />
                        <RequestStatusBadge status={ev.spaceRequest?.status || 'PENDING'} />
                      </div>
                      <Link
                        href={`/eventos/${ev.id}`}
                        className="text-sm font-bold text-slate-900 hover:text-emerald-700 block"
                      >
                        {ev.name}
                      </Link>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {ev.space.name}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {ev.date} · {ev.startTime} - {ev.endTime}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          Resp: {ev.responsibleName}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        href={`/eventos/${ev.id}`}
                        className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50/50"
                      >
                        Abrir Expediente
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Pending Authorizations Inbox */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <h2 className="text-sm font-bold text-slate-900">Bandeja de Autorizaciones</h2>
              </div>
              <Link
                href="/autorizaciones"
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
              >
                Ir a bandeja
              </Link>
            </div>

            <div className="p-4 space-y-3">
              {data.pendingSpaceRequests.length === 0 &&
              data.pendingEquipmentRequests.length === 0 &&
              data.pendingScheduleChanges.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  No tienes solicitudes pendientes por resolver.
                </div>
              ) : (
                <>
                  {data.pendingSpaceRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-3 rounded-lg border border-amber-200 bg-amber-50/60 text-xs space-y-1"
                    >
                      <span className="text-[10px] font-bold uppercase text-amber-800">
                        Solicitud de Espacio
                      </span>
                      <p className="font-bold text-slate-900">{req.event.name}</p>
                      <p className="text-slate-600">
                        {req.event.space.name} · {req.event.date} ({req.event.startTime})
                      </p>
                    </div>
                  ))}

                  {data.pendingEquipmentRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-3 rounded-lg border border-blue-200 bg-blue-50/60 text-xs space-y-1"
                    >
                      <span className="text-[10px] font-bold uppercase text-blue-800">
                        Solicitud de Equipo
                      </span>
                      <p className="font-bold text-slate-900">{req.event.name}</p>
                      <p className="text-slate-600">
                        {req.event.space.name} · {req.event.date}
                      </p>
                    </div>
                  ))}

                  {data.pendingScheduleChanges.map((req) => (
                    <div
                      key={req.id}
                      className="p-3 rounded-lg border border-purple-200 bg-purple-50/60 text-xs space-y-1"
                    >
                      <span className="text-[10px] font-bold uppercase text-purple-800">
                        Cambio de Horario
                      </span>
                      <p className="font-bold text-slate-900">{req.event.name}</p>
                      <p className="text-slate-600">
                        Propuesto: {req.proposedDate} ({req.proposedStartTime}-{req.proposedEndTime}
                        )
                      </p>
                    </div>
                  ))}

                  <Link
                    href="/autorizaciones"
                    className="w-full py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    Resolver Solicitudes
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
