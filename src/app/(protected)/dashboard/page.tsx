'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  PlusCircle,
  ArrowRight,
  ArrowUpRight,
  MapPin,
  Users,
  QrCode,
  FileWarning,
  ShieldCheck,
  RefreshCw,
  Activity,
  GraduationCap,
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

/* ------------------------------------------------------------------ */
/* Componentes visuales locales (guía §5 y §7)                         */
/* ------------------------------------------------------------------ */

function MetricCard({
  label,
  value,
  caption,
  href,
  tone = 'plain',
}: {
  label: string;
  value: React.ReactNode;
  caption: React.ReactNode;
  href?: string;
  tone?: 'plain' | 'feature';
}) {
  const feature = tone === 'feature';

  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p
          className={`text-[10px] font-semibold uppercase tracking-[0.06em] ${
            feature ? 'text-brand-gold' : 'text-muted'
          }`}
        >
          {label}
        </p>
        {href && (
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors ${
              feature
                ? 'bg-white/10 text-white group-hover:bg-white/20'
                : 'bg-surface-muted text-muted group-hover:bg-brand-soft group-hover:text-brand-deep'
            }`}
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
      <p
        className={`mt-3 text-[32px] font-semibold leading-none tracking-tight ${
          feature ? 'text-white' : 'text-ink'
        }`}
      >
        {value}
      </p>
      <p className={`mt-2 text-[11px] ${feature ? 'text-white/70' : 'text-muted'}`}>{caption}</p>
    </>
  );

  const className = `group flex flex-col p-[15px] ${
    feature ? 'ui-card-feature' : 'ui-card-interactive'
  }`;

  return href ? (
    <Link href={href} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

function BarRow({
  label,
  value,
  total,
  color,
  hint,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
  hint?: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate text-[12px] font-medium text-ink">{label}</span>
        <span className="shrink-0 text-[11px] text-muted">
          <span className="font-semibold text-ink">{value}</span>
          {hint ? ` · ${hint}` : ` · ${pct}%`}
        </span>
      </div>
      <div
        className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted"
        role="img"
        aria-label={`${label}: ${value} de ${total} (${pct}%)`}
      >
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${Math.min(100, pct)}%`, background: color }}
        />
      </div>
    </div>
  );
}

function Donut({ pct, caption }: { pct: number; caption: string }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const safePct = Math.max(0, Math.min(100, pct));
  const dash = (safePct / 100) * circumference;

  return (
    <div className="relative mx-auto h-[132px] w-[132px] shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="var(--color-surface-muted)"
          strokeWidth="11"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          className="transition-[stroke-dasharray] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[26px] font-semibold leading-none tracking-tight text-ink">
          {safePct}%
        </span>
        <span className="mt-1 max-w-[92px] text-center text-[9px] font-medium uppercase tracking-[0.06em] text-muted">
          {caption}
        </span>
      </div>
    </div>
  );
}

const ATTENDEE_CATEGORIES = [
  { key: 'STUDENT', label: 'Alumnos', color: 'var(--color-primary-deep)' },
  { key: 'TEACHER', label: 'Docentes', color: 'var(--color-primary)' },
  { key: 'ADMIN_STAFF', label: 'Personal administrativo', color: 'var(--color-mint)' },
  { key: 'EXTERNAL_GUEST', label: 'Invitados externos', color: 'var(--color-gold)' },
];

/* ------------------------------------------------------------------ */

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
        throw new Error(
          'La respuesta del dashboard no contiene la estructura de indicadores esperada.'
        );
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
      <div className="space-y-5">
        <div className="h-16 animate-pulse rounded-card bg-surface-muted" />
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[118px] animate-pulse rounded-card bg-surface-muted" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-12">
          <div className="h-64 animate-pulse rounded-card bg-surface-muted lg:col-span-5" />
          <div className="h-64 animate-pulse rounded-card bg-surface-muted lg:col-span-4" />
          <div className="h-64 animate-pulse rounded-card bg-surface-muted lg:col-span-3" />
        </div>
        <p className="text-center text-xs text-muted">
          Cargando indicadores ejecutivos y métricas de asistencia…
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto mt-6 max-w-xl space-y-4 rounded-card border border-[#f0d4d3] bg-[#F9E8E7] p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#B85D59]" />
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-[#8f4340]">
              No se pudieron cargar los indicadores del dashboard
            </h2>
            <p className="text-xs text-[#B85D59]">
              {error || 'No se recibieron datos válidos desde el servidor.'}
            </p>
          </div>
        </div>
        <button type="button" onClick={() => void loadDashboard()} className="ui-btn-deep">
          <RefreshCw className="h-3.5 w-3.5" />
          Reintentar
        </button>
      </div>
    );
  }

  const { stats } = data;
  const lc = stats.lifecycleCounts;
  const att = stats.attendanceSummary;
  const lifecycleTotal = Math.max(1, stats.totalEvents);

  const lifecycleSeries = [
    {
      label: 'Pendientes de autorización',
      value: lc.PENDING_APPROVAL,
      color: 'var(--color-warning)',
    },
    { label: 'Programados', value: lc.SCHEDULED, color: 'var(--color-primary)' },
    { label: 'En curso', value: lc.IN_PROGRESS, color: 'var(--color-mint)' },
    {
      label: 'Pendientes de evidencia',
      value: lc.COMPLETED_PENDING_EVIDENCE,
      color: 'var(--color-gold)',
    },
    { label: 'Cerrados con PDF', value: lc.CLOSED, color: 'var(--color-primary-deep)' },
    { label: 'Rechazados', value: lc.REJECTED, color: 'var(--color-danger)' },
    { label: 'Vencidos', value: lc.EXPIRED, color: '#b9c2bd' },
  ];

  const hasPendingInbox =
    data.pendingSpaceRequests.length > 0 ||
    data.pendingEquipmentRequests.length > 0 ||
    data.pendingScheduleChanges.length > 0;

  return (
    <div className="space-y-5">
      {/* ===================== Encabezado de contenido (guía §4) ===================== */}
      <div className="flex flex-col justify-between gap-3.5 md:flex-row md:items-end">
        <div className="min-w-0">
          <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-ink sm:text-[28px]">
            Bienvenido, {user?.fullName?.split(' ')[0] || 'usuario'}
          </h1>
          <p className="mt-1 max-w-2xl text-[13px] text-muted">
            {user?.buildingName
              ? `Responsable de ${user.buildingName} · ciclo de vida de eventos, cierre documental y asistencia QR.`
              : `${
                  user?.departmentLabel || 'Coordinación institucional'
                } · supervisión global de recintos, autorizaciones y control de acceso QR.`}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link href="/escaner" className="ui-btn-secondary">
            <QrCode className="h-3.5 w-3.5 text-brand" />
            Escáner QR
          </Link>
          <Link href="/eventos/nuevo" className="ui-btn-primary">
            <PlusCircle className="h-3.5 w-3.5" />
            Registrar evento
          </Link>
        </div>
      </div>

      {/* ===================== Aviso de cierre documental pendiente ===================== */}
      {stats.pendingEvidenceClosureCount > 0 && (
        <div className="flex flex-col justify-between gap-3 rounded-card border border-brand-gold/35 bg-brand-gold-soft p-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <FileWarning className="mt-0.5 h-4 w-4 shrink-0 text-[#A47B1E]" />
            <div className="text-[12px] text-[#7a5c16]">
              <p className="font-semibold text-[#6b4f12]">
                {stats.pendingEvidenceClosureCount} evento(s) concluido(s) sin evidencia documental
                de cierre
              </p>
              <p className="mt-0.5">
                Los eventos cuya hora de finalización ya concluyó requieren al menos un PDF de
                evidencia para pasar a estado Cerrado.
              </p>
            </div>
          </div>
          <Link
            href="/eventos?lifecycle=COMPLETED_PENDING_EVIDENCE"
            className="ui-btn shrink-0 bg-[#A47B1E] text-white hover:bg-[#8a681a]"
          >
            Ver pendientes
          </Link>
        </div>
      )}

      {/* ===================== Fila 1 · Tarjetas de métricas (guía §7.4) ===================== */}
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <MetricCard
          tone="feature"
          label="Total de eventos"
          value={stats.totalEvents}
          href="/eventos"
          caption={
            <>
              Abiertos: {att.openEventsCount} · Restringidos: {att.restrictedEventsCount}
            </>
          }
        />
        <MetricCard
          label="Programados"
          value={lc.SCHEDULED}
          href="/eventos?lifecycle=SCHEDULED"
          caption={<>En curso ahora: {lc.IN_PROGRESS} · Hoy: {stats.todayEventsCount}</>}
        />
        <MetricCard
          label="Pend. evidencia PDF"
          value={lc.COMPLETED_PENDING_EVIDENCE}
          href="/eventos?lifecycle=COMPLETED_PENDING_EVIDENCE"
          caption="Concluidos sin cierre documental"
        />
        <MetricCard
          label="Cerrados con PDF"
          value={lc.CLOSED}
          href="/reportes"
          caption={<>Rechazados/vencidos: {lc.REJECTED + lc.EXPIRED}</>}
        />
      </div>

      {/* ===================== Fila 2 · Ciclo de vida, asistencia y recordatorios ===================== */}
      <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-12">
        {/* Gráfico de ciclo de vida */}
        <section className="ui-card p-[17px] lg:col-span-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-brand" />
              <div>
                <h2 className="ui-card-title">Ciclo de vida de eventos</h2>
                <p className="ui-caption mt-0.5">Distribución sobre {stats.totalEvents} evento(s)</p>
              </div>
            </div>
            <Link
              href="/reportes"
              className="shrink-0 text-[11px] font-semibold text-brand hover:text-brand-dark"
            >
              Reportes
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {lifecycleSeries.map((item) => (
              <BarRow
                key={item.label}
                label={item.label}
                value={item.value}
                total={lifecycleTotal}
                color={item.color}
              />
            ))}
          </div>
        </section>

        {/* Asistencia y control QR */}
        <section className="ui-card p-[17px] lg:col-span-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <QrCode className="h-4 w-4 text-brand" />
              <div>
                <h2 className="ui-card-title">Asistencia y acceso QR</h2>
                <p className="ui-caption mt-0.5">Participación consolidada</p>
              </div>
            </div>
          </div>

          <Donut pct={att.globalAttendancePct} caption="Asistencia efectiva" />

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-surface-muted p-2.5">
              <p className="ui-label">Registrados</p>
              <p className="mt-1 text-[18px] font-semibold leading-none text-ink">
                {att.totalRegisteredActive}
              </p>
              <p className="ui-caption mt-1">Revocados: {att.totalRevoked}</p>
            </div>
            <div className="rounded-xl bg-brand-soft/70 p-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-brand-deep">
                Entradas
              </p>
              <p className="mt-1 text-[18px] font-semibold leading-none text-brand-deep">
                {att.totalCheckedIn}
              </p>
              <p className="mt-1 text-[11px] text-brand-deep/70">
                Sin ingreso: {att.totalPendingCheckIn}
              </p>
            </div>
          </div>

          <div className="mt-3 space-y-2.5 border-t border-line pt-3">
            {ATTENDEE_CATEGORIES.map((cat) => {
              const bucket = att.byAttendeeType[cat.key] || { registered: 0, checkedIn: 0 };
              return (
                <BarRow
                  key={cat.key}
                  label={cat.label}
                  value={bucket.checkedIn}
                  total={Math.max(1, bucket.registered)}
                  color={cat.color}
                  hint={`de ${bucket.registered}`}
                />
              );
            })}
          </div>

          <p className="ui-caption mt-3">
            Ocupación promedio de recintos: {att.globalOccupancyPct}% en{' '}
            {att.eventsWithAttendanceCount} evento(s) con padrón QR.
          </p>
        </section>

        {/* Recordatorios */}
        <section className="ui-card flex flex-col p-[17px] lg:col-span-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-brand-gold" />
            <h2 className="ui-card-title">Recordatorios</h2>
          </div>

          <div className="mt-4 space-y-2">
            <Link
              href="/autorizaciones"
              className="block rounded-xl border border-line bg-surface-muted p-3 transition-colors hover:bg-brand-soft/50"
            >
              <p className="ui-label">Por autorizar (míos)</p>
              <p className="mt-1 text-[24px] font-semibold leading-none text-ink">
                {stats.pendingAuthorizationsForMe}
              </p>
              <p className="ui-caption mt-1.5">
                Espacio {stats.pendingSpaceForMe} · Equipo {stats.pendingEquipmentForMe} · Horario{' '}
                {stats.pendingScheduleForMe}
              </p>
            </Link>

            <div className="rounded-xl border border-line p-3">
              <p className="ui-label">Eventos de hoy</p>
              <p className="mt-1 text-[24px] font-semibold leading-none text-ink">
                {stats.todayEventsCount}
              </p>
              <p className="ui-caption mt-1.5">En curso: {lc.IN_PROGRESS}</p>
            </div>
          </div>

          {att.topCareers.length > 0 && (
            <div className="mt-3 border-t border-line pt-3">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-muted">
                <GraduationCap className="h-3.5 w-3.5 text-brand" />
                Carreras con más entradas
              </p>
              <ul className="mt-2.5 space-y-1.5">
                {att.topCareers.slice(0, 4).map((career) => (
                  <li key={career.name} className="flex items-center justify-between gap-2">
                    <span className="truncate text-[11px] text-ink">{career.name}</span>
                    <span className="shrink-0 text-[11px] font-semibold text-brand-deep">
                      {career.checkedIn}/{career.registered}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Link
            href="/reportes"
            className="ui-btn-ghost mt-auto w-full justify-between pt-2 text-[11px]"
          >
            Desglose completo
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </section>
      </div>

      {/* ===================== Fila 3 · Eventos y bandeja ===================== */}
      <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-12">
        {/* Eventos programados */}
        <section className="ui-card overflow-hidden lg:col-span-8">
          <div className="flex items-center justify-between gap-3 border-b border-line px-[17px] py-3.5">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-brand" />
              <h2 className="ui-card-title">Eventos programados y recientes</h2>
            </div>
            <Link
              href="/eventos"
              className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-brand hover:text-brand-dark"
            >
              Ver todos <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {data.upcomingEvents.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <Calendar className="mx-auto h-7 w-7 text-line" />
              <p className="mt-2 text-xs text-muted">No hay eventos próximos programados.</p>
              <Link href="/eventos/nuevo" className="ui-btn-secondary mt-3">
                <PlusCircle className="h-3.5 w-3.5 text-brand" />
                Registrar el primero
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {data.upcomingEvents.map((ev) => (
                <li
                  key={ev.id}
                  className="flex flex-col justify-between gap-3 px-[17px] py-3.5 transition-colors hover:bg-surface-muted/60 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <EventLifecycleBadge status={ev.lifecycleStatus} compact />
                      <CriticalityBadge level={ev.criticalityLevel} compact />
                      <RequestStatusBadge status={ev.spaceRequest?.status || 'PENDING'} />
                    </div>
                    <Link
                      href={`/eventos/${ev.id}`}
                      className="block truncate text-[13px] font-semibold text-ink hover:text-brand"
                    >
                      {ev.name}
                    </Link>
                    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[11px] text-muted">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {ev.space.name}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {ev.date} · {ev.startTime}–{ev.endTime}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {ev.responsibleName}
                      </span>
                    </div>
                  </div>
                  <Link
                    href={`/eventos/${ev.id}`}
                    className="ui-btn-secondary shrink-0 self-start text-[11px] sm:self-center"
                  >
                    Abrir expediente
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Bandeja de autorizaciones */}
        <section className="ui-card overflow-hidden lg:col-span-4">
          <div className="flex items-center justify-between gap-3 border-b border-line px-[17px] py-3.5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-brand-gold" />
              <h2 className="ui-card-title">Bandeja de autorizaciones</h2>
            </div>
            <Link
              href="/autorizaciones"
              className="shrink-0 text-[11px] font-semibold text-brand hover:text-brand-dark"
            >
              Ir
            </Link>
          </div>

          <div className="space-y-2 p-[17px]">
            {!hasPendingInbox ? (
              <div className="py-7 text-center">
                <CheckCircle2 className="mx-auto h-7 w-7 text-brand-mint" />
                <p className="mt-2 text-xs text-muted">
                  No tienes solicitudes pendientes por resolver.
                </p>
              </div>
            ) : (
              <>
                {data.pendingSpaceRequests.map((req) => (
                  <div key={req.id} className="rounded-xl border border-line bg-surface-muted p-3">
                    <span className="ui-chip-progress">Solicitud de espacio</span>
                    <p className="mt-1.5 truncate text-[12px] font-semibold text-ink">
                      {req.event.name}
                    </p>
                    <p className="ui-caption mt-0.5 truncate">
                      {req.event.space.name} · {req.event.date} ({req.event.startTime})
                    </p>
                  </div>
                ))}

                {data.pendingEquipmentRequests.map((req) => (
                  <div key={req.id} className="rounded-xl border border-line bg-surface-muted p-3">
                    <span className="ui-chip-info">Solicitud de equipo</span>
                    <p className="mt-1.5 truncate text-[12px] font-semibold text-ink">
                      {req.event.name}
                    </p>
                    <p className="ui-caption mt-0.5 truncate">
                      {req.event.space.name} · {req.event.date}
                    </p>
                  </div>
                ))}

                {data.pendingScheduleChanges.map((req) => (
                  <div key={req.id} className="rounded-xl border border-line bg-surface-muted p-3">
                    <span className="ui-chip bg-brand-soft text-brand-deep">Cambio de horario</span>
                    <p className="mt-1.5 truncate text-[12px] font-semibold text-ink">
                      {req.event.name}
                    </p>
                    <p className="ui-caption mt-0.5 truncate">
                      Propuesto: {req.proposedDate} ({req.proposedStartTime}–
                      {req.proposedEndTime})
                    </p>
                  </div>
                ))}

                <Link href="/autorizaciones" className="ui-btn-deep w-full">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Resolver solicitudes
                </Link>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
