'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CalendarPlus,
  Search,
  Filter,
  Eye,
  AlertTriangle,
  FileText,
  Clock,
  RotateCcw,
  Users,
  Globe,
  Lock,
} from 'lucide-react';
import {
  CriticalityBadge,
  EventLifecycleBadge,
  RequestStatusBadge,
} from '@/components/ui/StatusBadge';
import { formatSpanishDate } from '@/lib/utils';

const LIFECYCLE_TABS = [
  { key: 'ALL', label: 'Todos', counterKey: 'ALL' },
  { key: 'PENDING_APPROVAL', label: 'Pendientes de autorización', counterKey: 'PENDING_APPROVAL' },
  { key: 'SCHEDULED', label: 'Programados', counterKey: 'SCHEDULED' },
  { key: 'IN_PROGRESS', label: 'En curso', counterKey: 'IN_PROGRESS' },
  { key: 'COMPLETED', label: 'Concluidos', counterKey: 'COMPLETED' },
  { key: 'COMPLETED_PENDING_EVIDENCE', label: 'Pendientes de evidencia', counterKey: 'COMPLETED_PENDING_EVIDENCE' },
  { key: 'CLOSED', label: 'Cerrados', counterKey: 'CLOSED' },
  { key: 'REJECTED', label: 'Rechazados', counterKey: 'REJECTED' },
  { key: 'EXPIRED', label: 'Vencidos', counterKey: 'EXPIRED' },
] as const;

export default function MisEventosPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [lifecycleCounters, setLifecycleCounters] = useState<Record<string, number>>({});
  const [spaces, setSpaces] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros requeridos (Sección 7 Fase 2: Fecha, Espacio, Estado general, Estado autorización, Criticidad, Responsable, Usuario que registró)
  const [dateFilter, setDateFilter] = useState('');
  const [spaceFilter, setSpaceFilter] = useState('ALL');
  const [lifecycleFilter, setLifecycleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [responsibleFilter, setResponsibleFilter] = useState('');
  const [createdByFilter, setCreatedByFilter] = useState('ALL');
  const [criticalityFilter, setCriticalityFilter] = useState('ALL');
  const [scopeFilter, setScopeFilter] = useState<'default' | 'mine'>('default');

  const fetchEvents = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (dateFilter) params.set('date', dateFilter);
    if (spaceFilter !== 'ALL') params.set('spaceId', spaceFilter);
    if (lifecycleFilter !== 'ALL') params.set('lifecycle', lifecycleFilter);
    if (statusFilter !== 'ALL') params.set('status', statusFilter);
    if (responsibleFilter.trim()) params.set('responsible', responsibleFilter.trim());
    if (createdByFilter !== 'ALL') params.set('createdById', createdByFilter);
    if (criticalityFilter !== 'ALL') params.set('criticalityLevel', criticalityFilter);
    params.set('scope', scopeFilter);

    try {
      const res = await fetch(`/api/events?${params.toString()}`, { cache: 'no-store' });
      const data = await res.json();
      setEvents(data.events || []);
      if (data.lifecycleCounters) {
        setLifecycleCounters(data.lifecycleCounters);
      }
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch('/api/catalogs')
      .then((r) => r.json())
      .then((d) => {
        setSpaces(d.spaces || []);
        setUsers(d.users || []);
      })
      .catch(() => { });
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [dateFilter, spaceFilter, lifecycleFilter, statusFilter, createdByFilter, criticalityFilter, scopeFilter]);

  const handleClearFilters = () => {
    setDateFilter('');
    setSpaceFilter('ALL');
    setLifecycleFilter('ALL');
    setStatusFilter('ALL');
    setResponsibleFilter('');
    setCreatedByFilter('ALL');
    setCriticalityFilter('ALL');
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Mis Eventos y Solicitudes</h1>
          <p className="text-xs text-slate-500">
            Consulta el ciclo de vida formal de cada evento, estados de espacio y equipo, control de
            asistencia QR y cierre documental.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setScopeFilter('default')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${scopeFilter === 'default'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              Todos de mi ámbito
            </button>
            <button
              type="button"
              onClick={() => setScopeFilter('mine')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${scopeFilter === 'mine'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              Registrados por mí
            </button>
          </div>

          <Link
            href="/eventos/nuevo"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-800"
          >
            <CalendarPlus className="h-4 w-4" />
            Nuevo Evento
          </Link>
        </div>
      </div>

      {/* Pestañas Rápidas de Ciclo de Vida con Contadores Reales desde SQLite (Sección 7) */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm">
        {LIFECYCLE_TABS.map((tab) => {
          const active = lifecycleFilter === tab.key;
          const count = lifecycleCounters[tab.counterKey] ?? 0;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setLifecycleFilter(tab.key)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${active
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/70'
                }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${active ? 'bg-white text-emerald-900' : 'bg-slate-200 text-slate-800'
                  }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Barra de Filtros (Sección 7 Fase 2) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <Filter className="h-3.5 w-3.5 text-emerald-700" />
            Filtros avanzados de búsqueda
          </span>
          <button
            type="button"
            onClick={handleClearFilters}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800"
          >
            <RotateCcw className="h-3 w-3" />
            Limpiar filtros
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Fecha</label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Espacio</label>
            <select
              value={spaceFilter}
              onChange={(e) => setSpaceFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900"
            >
              <option value="ALL">Todos los espacios (9)</option>
              {spaces.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Estado de Autorización
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900"
            >
              <option value="ALL">Todos</option>
              <option value="PENDING">Pendiente</option>
              <option value="APPROVED">Aprobado</option>
              <option value="REJECTED">Rechazado</option>
              <option value="EXPIRED">Vencido</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Criticidad</label>
            <select
              value={criticalityFilter}
              onChange={(e) => setCriticalityFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900"
            >
              <option value="ALL">Todos los niveles</option>
              <option value="1">Nivel 1 — Asiste rector</option>
              <option value="2">Nivel 2 — Asisten autoridades</option>
              <option value="3">Nivel 3 — Invitados especiales</option>
              <option value="4">Nivel 4 — Solo alumnos y docentes</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Usuario que registró
            </label>
            <select
              value={createdByFilter}
              onChange={(e) => setCreatedByFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900"
            >
              <option value="ALL">Todos los usuarios</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName} (@{u.username})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Responsable / Evento
            </label>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={responsibleFilter}
                onChange={(e) => setResponsibleFilter(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchEvents()}
                placeholder="Nombre o depto..."
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900"
              />
              <button
                type="button"
                onClick={fetchEvents}
                className="rounded-xl bg-slate-900 px-3 py-2 text-white hover:bg-slate-800"
                title="Buscar"
              >
                <Search className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de Eventos */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-xs text-slate-500">Cargando eventos...</div>
        ) : events.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <p className="text-sm font-bold text-slate-700">
              No se encontraron eventos con los filtros seleccionados.
            </p>
            <p className="text-xs text-slate-500">
              Ajusta los criterios de búsqueda o selecciona otra pestaña de ciclo de vida.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  <th className="py-3.5 px-4">Evento / Modalidad</th>
                  <th className="py-3.5 px-4">Responsable</th>
                  <th className="py-3.5 px-4">Espacio</th>
                  <th className="py-3.5 px-4">Fecha / Horario</th>
                  <th className="py-3.5 px-4">Estado General (Ciclo)</th>
                  <th className="py-3.5 px-4">Espacio / Equipo</th>
                  <th className="py-3.5 px-4">Criticidad</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {events.map((ev) => {
                  const hasRejection =
                    ev.spaceRequest?.status === 'REJECTED' ||
                    ev.equipmentRequest?.status === 'REJECTED';
                  const pendingChange = ev.scheduleChangeRequests?.find(
                    (c: any) => c.status === 'PENDING'
                  );
                  const accessMode = ev.attendanceConfig?.accessMode || 'OPEN';
                  const activeAttendeesCount = ev._count?.attendees ?? 0;

                  return (
                    <React.Fragment key={ev.id}>
                      <tr className="hover:bg-slate-50/90 transition">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/eventos/${ev.id}`}
                              className="font-bold text-slate-900 hover:text-emerald-700"
                            >
                              {ev.name}
                            </Link>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                            <span>Registró: @{ev.createdBy?.username}</span>
                            <span
                              className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold border ${accessMode === 'RESTRICTED'
                                  ? 'bg-purple-50 text-purple-800 border-purple-200'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                }`}
                            >
                              {accessMode === 'RESTRICTED' ? (
                                <Lock className="h-2.5 w-2.5" />
                              ) : (
                                <Globe className="h-2.5 w-2.5" />
                              )}
                              {accessMode === 'RESTRICTED' ? 'Restringido' : 'Abierto'}
                            </span>
                            {activeAttendeesCount > 0 && (
                              <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                                <Users className="h-2.5 w-2.5" />
                                {activeAttendeesCount} reg/inv
                              </span>
                            )}
                            {ev.evidences?.length > 0 && (
                              <span className="inline-flex items-center gap-1 rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 border border-sky-200">
                                <FileText className="h-3 w-3" />
                                {ev.evidences.length} PDF
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-slate-900">{ev.responsibleName}</p>
                          <p className="text-[11px] text-slate-500">{ev.responsibleDepartment}</p>
                        </td>

                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-slate-800">{ev.space?.name}</p>
                          <p className="text-[11px] text-slate-500">
                            Autoriza: {ev.space?.authorizer?.username}
                          </p>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <p className="font-medium text-slate-800">{formatSpanishDate(ev.date)}</p>
                          <p className="font-bold text-slate-900">
                            {ev.startTime} - {ev.endTime}
                          </p>
                          <p className="text-[10px] text-amber-700">
                            Limpieza: {ev.endTime} - {ev.cleaningEndTime}
                          </p>
                          {pendingChange && (
                            <span className="mt-1 inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
                              <Clock className="h-3 w-3" />
                              Cambio: {pendingChange.proposedStartTime}-
                              {pendingChange.proposedEndTime}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {ev.lifecycle && <EventLifecycleBadge state={ev.lifecycle.state} />}
                          {ev.lifecycle?.state === 'COMPLETED_PENDING_EVIDENCE' && (
                            <p className="mt-1 text-[10px] font-semibold text-amber-800">
                              Requiere PDF de cierre
                            </p>
                          )}
                        </td>

                        <td className="py-3.5 px-4 space-y-1">
                          <div>
                            <span className="text-[10px] text-slate-500 mr-1">Espacio:</span>
                            <RequestStatusBadge status={ev.spaceRequest?.status} />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 mr-1">Equipo:</span>
                            {ev.equipmentRequest ? (
                              <RequestStatusBadge status={ev.equipmentRequest.status} />
                            ) : (
                              <RequestStatusBadge status="NONE" />
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <CriticalityBadge level={ev.criticalityLevel} compact />
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <Link
                            href={`/eventos/${ev.id}`}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 shadow-sm hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-800"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Detalle
                          </Link>
                        </td>
                      </tr>

                      {hasRejection && (
                        <tr className="bg-rose-50/70">
                          <td colSpan={8} className="px-4 py-2.5">
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-rose-900">
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                                <div>
                                  {ev.spaceRequest?.status === 'REJECTED' && (
                                    <p>
                                      <strong>Motivo de rechazo de espacio:</strong>{' '}
                                      {ev.spaceRequest.rejectionReason}
                                    </p>
                                  )}
                                  {ev.equipmentRequest?.status === 'REJECTED' && (
                                    <p>
                                      <strong>Motivo de rechazo de equipo:</strong>{' '}
                                      {ev.equipmentRequest.rejectionReason}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <Link
                                href={`/eventos/${ev.id}`}
                                className="rounded-lg bg-rose-700 px-3 py-1 text-[11px] font-bold text-white hover:bg-rose-800"
                              >
                                Revisar en Detalle →
                              </Link>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
