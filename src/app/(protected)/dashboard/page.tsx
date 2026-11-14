'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  PlusCircle,
  ArrowRight,
  QrCode,
  FileWarning,
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
      <div className="py-8 text-sm text-ink-3">
        Cargando indicadores ejecutivos y métricas de asistencia...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-xl mt-8 card p-6 space-y-4">
        <div className="flex items-start gap-3">
          <AlertTriangle strokeWidth={1.5} className="w-5 h-5 text-bad shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-ink">
              No se pudieron cargar los indicadores del dashboard
            </h2>
            <p className="text-xs text-bad">
              {error || 'No se recibieron datos válidos desde el servidor.'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void loadDashboard()}
          className="inline-flex h-9 items-center gap-2 px-4 rounded-full bg-ink hover:bg-ink-2 text-surface text-xs font-medium transition-colors"
        >
          <RefreshCw strokeWidth={1.5} className="w-3.5 h-3.5" />
          Reintentar
        </button>
      </div>
    );
  }

  const { stats } = data;
  const attendance = stats.attendanceSummary;

  const kpiCard = 'card p-5 flex flex-col justify-between gap-3 min-w-0';
  const kpiNumber = 'font-display text-4xl font-semibold leading-none tracking-tight';
  const kpiNote = 'font-mono text-[11px] text-ink-3';

  return (
    <div className="space-y-8">
      {/* Encabezado de página */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
        <div className="max-w-3xl">
          <p className="label-mono mb-2">Panel Institucional · SREU Fase 2</p>
          <h1 className="text-[28px] font-semibold text-ink">Bienvenido, {user?.fullName}</h1>
          <p className="text-sm text-ink-2 mt-2">
            {user?.buildingName
              ? `Responsable de ${user.buildingName} — Control de ciclo de vida de eventos, cierre documental PDF y asistencia QR.`
              : `${
                  user?.departmentLabel || 'Coordinación Institucional'
                } — Supervisión global de recintos, autorizaciones y control de acceso QR.`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Link
            href="/escaner"
            className="inline-flex h-10 items-center gap-2 px-4 rounded-full border border-line-strong text-ink hover:border-ink font-medium text-xs transition-colors"
          >
            <QrCode strokeWidth={1.5} className="w-4 h-4" />
            Escáner QR de Acceso
          </Link>
          <Link
            href="/eventos/nuevo"
            className="inline-flex h-10 items-center gap-2 px-4 rounded-full bg-ink hover:bg-ink-2 text-surface font-medium text-xs transition-colors"
          >
            <PlusCircle strokeWidth={1.5} className="w-4 h-4" />
            Registrar Evento
          </Link>
        </div>
      </div>

      {/* Aviso de cierre documental pendiente */}
      {stats.pendingEvidenceClosureCount > 0 && (
        <div className="rounded-xl border border-warn/30 bg-warn-soft p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <FileWarning strokeWidth={1.5} className="w-5 h-5 text-warn shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-semibold text-sm text-ink">
                Atención: {stats.pendingEvidenceClosureCount} evento(s) concluido(s) pendiente(s) de
                evidencia documental de cierre
              </p>
              <p className="text-ink-2 mt-0.5">
                Los eventos cuya hora de finalización ya concluyó requieren al menos un archivo PDF
                de evidencia de realización para pasar a estado Cerrado (`CLOSED`).
              </p>
            </div>
          </div>
          <Link
            href="/eventos?lifecycle=COMPLETED_PENDING_EVIDENCE"
            className="inline-flex h-9 items-center px-4 rounded-full bg-ink hover:bg-ink-2 text-surface text-xs font-medium shrink-0 transition-colors"
          >
            Ver Eventos Pendientes de Evidencia
          </Link>
        </div>
      )}

      {/* Ciclo de vida: una tarjeta protagonista y cinco neutras */}
      <section>
        <h2 className="label-mono mb-3">
          Ciclo de Vida de Eventos y Bandeja de Autorizaciones
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-4 rounded-xl border border-accent bg-accent text-on-accent p-6 flex flex-col justify-between gap-8 min-h-[220px]">
            <p className="font-mono text-label font-medium uppercase opacity-75">Total Eventos</p>
            <div>
              <p className="font-display text-hero font-semibold">{stats.totalEvents}</p>
              <p className="font-mono text-[11px] opacity-80 mt-3">
                Abiertos: {attendance.openEventsCount} · Restr.: {attendance.restrictedEventsCount}
              </p>
            </div>
          </div>

          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-6 gap-4">
            <div className={`${kpiCard} sm:col-span-3`}>
              <p className="label-mono">Programados</p>
              <div>
                <p className={`${kpiNumber} text-ink`}>{stats.lifecycleCounts.SCHEDULED}</p>
                <p className={`${kpiNote} mt-2`}>
                  En curso hoy: {stats.lifecycleCounts.IN_PROGRESS}
                </p>
              </div>
            </div>

            <div className={`${kpiCard} sm:col-span-3`}>
              <p className="label-mono">Por Autorizar (Míos)</p>
              <div>
                <p
                  className={`${kpiNumber} ${
                    stats.pendingAuthorizationsForMe > 0 ? 'text-warn' : 'text-ink'
                  }`}
                >
                  {stats.pendingAuthorizationsForMe}
                </p>
                <p className={`${kpiNote} mt-2`}>
                  Esp: {stats.pendingSpaceForMe} · Eq: {stats.pendingEquipmentForMe} · Hor:{' '}
                  {stats.pendingScheduleForMe}
                </p>
              </div>
            </div>

            <div className={`${kpiCard} sm:col-span-2`}>
              <p className="label-mono">Pend. Evidencia PDF</p>
              <div>
                <p
                  className={`${kpiNumber} ${
                    stats.lifecycleCounts.COMPLETED_PENDING_EVIDENCE > 0 ? 'text-warn' : 'text-ink'
                  }`}
                >
                  {stats.lifecycleCounts.COMPLETED_PENDING_EVIDENCE}
                </p>
                <p className={`${kpiNote} mt-2`}>Concluidos sin cierre</p>
              </div>
            </div>

            <div className={`${kpiCard} sm:col-span-2`}>
              <p className="label-mono">Cerrados (CLOSED)</p>
              <div>
                <p className={`${kpiNumber} text-ink`}>{stats.lifecycleCounts.CLOSED}</p>
                <p className={`${kpiNote} mt-2`}>Con PDF de realización</p>
              </div>
            </div>

            <div className={`${kpiCard} col-span-2 sm:col-span-2`}>
              <p className="label-mono">Rechazados / Vencidos</p>
              <div>
                <p className={`${kpiNumber} text-ink`}>
                  {stats.lifecycleCounts.REJECTED + stats.lifecycleCounts.EXPIRED}
                </p>
                <p className={`${kpiNote} mt-2`}>
                  Rech: {stats.lifecycleCounts.REJECTED} · Venc: {stats.lifecycleCounts.EXPIRED}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Asistencia y control de acceso QR */}
      <section className="card">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 px-6 pt-5 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">
              Métricas Globales de Registro de Asistentes y Control de Acceso QR
            </h2>
            <p className="text-xs text-ink-3 mt-1">
              Participación consolidada en tiempo real desde SQLite
            </p>
          </div>
          <Link
            href="/reportes"
            className="text-xs font-medium text-ink underline-offset-4 hover:underline inline-flex items-center gap-1 shrink-0"
          >
            Ver desglose por carrera y grado en Reportes{' '}
            <ArrowRight strokeWidth={1.5} className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 border-t border-line">
          <div className="p-6 border-b lg:border-b-0 border-r border-line">
            <p className="label-mono">Asistentes Registrados / Invitados</p>
            <p className={`${kpiNumber} text-ink mt-4`}>{attendance.totalRegisteredActive}</p>
            <p className={`${kpiNote} mt-2`}>Revocados: {attendance.totalRevoked}</p>
          </div>

          <div className="p-6 border-b lg:border-b-0 lg:border-r border-line">
            <p className="label-mono">Entradas Validadas (Check-in)</p>
            <p className={`${kpiNumber} text-ink mt-4`}>{attendance.totalCheckedIn}</p>
            <p className={`${kpiNote} mt-2`}>
              Pendientes de ingreso: {attendance.totalPendingCheckIn}
            </p>
          </div>

          <div className="p-6 border-r border-line">
            <p className="label-mono">Porcentaje de Asistencia Efectiva</p>
            <p className={`${kpiNumber} text-ink mt-4`}>{attendance.globalAttendancePct}%</p>
            <div className="mt-3 h-[3px] bg-sunk">
              <div
                className="h-full bg-accent"
                style={{ width: `${Math.min(100, Math.max(0, attendance.globalAttendancePct))}%` }}
              />
            </div>
            <p className={`${kpiNote} mt-2`}>(Entradas / Registrados activos) × 100</p>
          </div>

          <div className="p-6">
            <p className="label-mono">Ocupación Promedio de Recintos</p>
            <p className={`${kpiNumber} text-ink mt-4`}>{attendance.globalOccupancyPct}%</p>
            <div className="mt-3 h-[3px] bg-sunk">
              <div
                className="h-full bg-ink"
                style={{ width: `${Math.min(100, Math.max(0, attendance.globalOccupancyPct))}%` }}
              />
            </div>
            <p className={`${kpiNote} mt-2`}>
              En {attendance.eventsWithAttendanceCount} evento(s) con padrón QR
            </p>
          </div>
        </div>

        {/* Desglose por tipo de asistente */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-4 border-t border-line px-6 py-5">
          {[
            { key: 'STUDENT', label: 'Alumnos' },
            { key: 'TEACHER', label: 'Docentes' },
            { key: 'ADMIN_STAFF', label: 'Personal Administrativo' },
            { key: 'EXTERNAL_GUEST', label: 'Invitados Externos' },
          ].map((cat) => {
            const bucket = attendance.byAttendeeType[cat.key] || {
              registered: 0,
              checkedIn: 0,
            };
            const pct =
              bucket.registered > 0
                ? Math.min(100, Math.round((bucket.checkedIn / bucket.registered) * 100))
                : 0;
            return (
              <div key={cat.key}>
                <div className="flex items-baseline justify-between gap-3 text-xs">
                  <span className="font-medium text-ink">{cat.label}</span>
                  <span className="font-mono text-ink">
                    {bucket.checkedIn} <span className="text-ink-3">/ {bucket.registered}</span>
                  </span>
                </div>
                <div className="mt-2 h-[3px] bg-sunk">
                  <div className="h-full bg-ink" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Eventos (2/3) y bandeja (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <section className="lg:col-span-2 card overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-ink">Eventos Programados y Recientes</h2>
            <Link
              href="/eventos"
              className="text-xs font-medium text-ink underline-offset-4 hover:underline inline-flex items-center gap-1 shrink-0"
            >
              Ver todos <ArrowRight strokeWidth={1.5} className="w-3.5 h-3.5" />
            </Link>
          </div>

          {data.upcomingEvents.length === 0 ? (
            <div className="px-6 py-8 border-t border-line text-xs text-ink-2">
              No hay eventos próximos programados.
            </div>
          ) : (
            <div className="divide-y divide-line border-t border-line">
              {data.upcomingEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="min-w-0 space-y-2">
                    <p className="font-mono text-[11px] text-ink-3">
                      {ev.date} · {ev.startTime} - {ev.endTime}
                    </p>
                    <Link
                      href={`/eventos/${ev.id}`}
                      className="block text-[15px] font-semibold text-ink leading-snug underline-offset-4 hover:underline"
                    >
                      {ev.name}
                    </Link>
                    <p className="text-xs text-ink-2">
                      {ev.space.name} · Resp: {ev.responsibleName}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <EventLifecycleBadge status={ev.lifecycleStatus} />
                      <RequestStatusBadge status={ev.spaceRequest?.status || 'PENDING'} />
                      <CriticalityBadge level={ev.criticalityLevel} />
                    </div>
                  </div>
                  <Link
                    href={`/eventos/${ev.id}`}
                    className="inline-flex h-9 items-center px-4 rounded-full border border-line-strong text-xs font-medium text-ink hover:border-ink shrink-0 self-start sm:self-center transition-colors"
                  >
                    Abrir Expediente
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-ink">Bandeja de Autorizaciones</h2>
            <Link
              href="/autorizaciones"
              className="text-xs font-medium text-ink underline-offset-4 hover:underline shrink-0"
            >
              Ir a bandeja
            </Link>
          </div>

          {data.pendingSpaceRequests.length === 0 &&
          data.pendingEquipmentRequests.length === 0 &&
          data.pendingScheduleChanges.length === 0 ? (
            <div className="px-6 py-8 border-t border-line text-xs text-ink-2">
              No tienes solicitudes pendientes por resolver.
            </div>
          ) : (
            <>
              <div className="divide-y divide-line border-t border-line">
                {data.pendingSpaceRequests.map((req) => (
                  <div key={req.id} className="px-6 py-3.5 text-xs space-y-1">
                    <span className="label-mono">Solicitud de Espacio</span>
                    <p className="font-semibold text-ink">{req.event.name}</p>
                    <p className="text-ink-2">
                      {req.event.space.name} · {req.event.date} ({req.event.startTime})
                    </p>
                  </div>
                ))}

                {data.pendingEquipmentRequests.map((req) => (
                  <div key={req.id} className="px-6 py-3.5 text-xs space-y-1">
                    <span className="label-mono">Solicitud de Equipo</span>
                    <p className="font-semibold text-ink">{req.event.name}</p>
                    <p className="text-ink-2">
                      {req.event.space.name} · {req.event.date}
                    </p>
                  </div>
                ))}

                {data.pendingScheduleChanges.map((req) => (
                  <div key={req.id} className="px-6 py-3.5 text-xs space-y-1">
                    <span className="label-mono">Cambio de Horario</span>
                    <p className="font-semibold text-ink">{req.event.name}</p>
                    <p className="text-ink-2">
                      Propuesto: {req.proposedDate} ({req.proposedStartTime}-{req.proposedEndTime})
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t border-line px-6 py-4">
                <Link
                  href="/autorizaciones"
                  className="flex h-9 w-full items-center justify-center rounded-full bg-ink hover:bg-ink-2 text-surface text-xs font-medium transition-colors"
                >
                  Resolver Solicitudes
                </Link>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
