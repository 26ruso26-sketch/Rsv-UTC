'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Building2,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import { CalendarSlotBlock } from '@/types';
import {
  addDaysToDateString,
  formatSpanishDate,
  getMonterreyDateString,
} from '@/lib/utils';

type ViewMode = 'DAY' | 'WEEK' | 'MONTH';

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 07:00 .. 21:00

export default function CalendarioPage() {
  const [spaces, setSpaces] = useState<any[]>([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('DAY');
  const [baseDate, setBaseDate] = useState<string>('');
  const [blocks, setBlocks] = useState<CalendarSlotBlock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = getMonterreyDateString(new Date());
    // Por defecto abrir en Día +1 donde se encuentran DEMO-10, DEMO-11 y DEMO-12 para visualización inmediata
    const tomorrow = addDaysToDateString(today, 1);
    setBaseDate(tomorrow);

    fetch('/api/catalogs')
      .then((r) => r.json())
      .then((d) => {
        setSpaces(d.spaces || []);
      });
  }, []);

  const getRangeForView = (dateStr: string, mode: ViewMode) => {
    if (!dateStr) return { startDate: '', endDate: '' };
    if (mode === 'DAY') {
      return { startDate: dateStr, endDate: dateStr };
    }
    if (mode === 'WEEK') {
      return {
        startDate: addDaysToDateString(dateStr, -1),
        endDate: addDaysToDateString(dateStr, 5),
      };
    }
    // MONTH: 28 days window around the selected month
    const [y, m] = dateStr.split('-').map(Number);
    const firstDay = `${y}-${String(m).padStart(2, '0')}-01`;
    const lastDay = addDaysToDateString(firstDay, 30);
    return { startDate: firstDay, endDate: lastDay };
  };

  useEffect(() => {
    if (!baseDate) return;
    setLoading(true);
    const { startDate, endDate } = getRangeForView(baseDate, viewMode);
    const params = new URLSearchParams({
      mode: 'calendar',
      startDate,
      endDate,
      spaceId: selectedSpaceId,
    });

    fetch(`/api/availability?${params.toString()}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        setBlocks(d.blocks || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [baseDate, viewMode, selectedSpaceId]);

  const navigateDate = (deltaDays: number) => {
    if (!baseDate) return;
    const step = viewMode === 'DAY' ? deltaDays : viewMode === 'WEEK' ? deltaDays * 7 : deltaDays * 30;
    setBaseDate(addDaysToDateString(baseDate, step));
  };

  const getBlockStyles = (colorCode: CalendarSlotBlock['colorCode']) => {
    switch (colorCode) {
      case 'RED':
        return {
          container: 'border-bad bg-bad-soft text-bad',
          pill: 'bg-bad text-surface',
          label: 'ROJO · Reservación Aprobada',
        };
      case 'ORANGE':
        return {
          container: 'border-warn bg-warn-soft text-warn',
          pill: 'bg-warn text-surface',
          label: 'NARANJA · Solicitud / Cambio Pendiente (Bloqueo Provisional)',
        };
      case 'YELLOW':
        return {
          container: 'border-warn bg-warn-soft/90 text-warn border-dashed',
          pill: 'bg-warn text-surface',
          label: 'AMARILLO · Hora Obligatoria de Limpieza (No Reservable)',
        };
      default:
        return {
          container: 'border-accent/30 bg-accent-soft text-accent',
          pill: 'bg-ink text-surface',
          label: 'VERDE · Disponible',
        };
    }
  };

  const weekDays = baseDate
    ? Array.from({ length: 7 }, (_, i) => addDaysToDateString(baseDate, i - 1))
    : [];

  const monthDays = baseDate
    ? (() => {
        const [y, m] = baseDate.split('-').map(Number);
        const first = `${y}-${String(m).padStart(2, '0')}-01`;
        return Array.from({ length: 30 }, (_, i) => addDaysToDateString(first, i));
      })()
    : [];

  return (
    <div className="space-y-6">
      {/* Encabezado y Leyenda Semántica de Colores (Sección 12 y 13) */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-semibold text-ink">
            Calendario Visual de Disponibilidad y Ocupación
          </h1>
          <p className="text-xs text-ink-3">
            Consulta horarios ocupados, bloqueos provisionales, periodos obligatorios de limpieza
            (1 hora posterior) y espacios disponibles.
          </p>
        </div>

        {/* Leyenda obligatoria: Rojo, Naranja, Amarillo, Verde */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-bad/30 bg-bad-soft px-3 py-1.5 text-bad">
            <span className="h-3 w-3 rounded-full bg-bad" />
            Rojo: Reservación aprobada
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-warn/30 bg-warn-soft px-3 py-1.5 text-warn">
            <span className="h-3 w-3 rounded-full bg-warn" />
            Naranja: Solicitud / Cambio pendiente
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-warn/30 bg-warn-soft px-3 py-1.5 text-warn">
            <span className="h-3 w-3 rounded-full bg-warn" />
            Amarillo: Hora de limpieza
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent-soft px-3 py-1.5 text-accent">
            <span className="h-3 w-3 rounded-full bg-accent" />
            Verde: Disponible
          </span>
        </div>
      </div>

      {/* Barra de Controles: Espacio, Modo de Vista (Día, Semana, Mes) y Fecha */}
      <div className="rounded-xl border border-line bg-surface p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-ink-3" />
            <select
              value={selectedSpaceId}
              onChange={(e) => setSelectedSpaceId(e.target.value)}
              className="rounded-md border border-line-strong bg-paper px-3.5 py-2 text-xs font-semibold text-ink"
            >
              <option value="ALL">Todos los espacios universitarios (9)</option>
              {spaces.map((sp) => (
                <option key={sp.id} value={sp.id}>
                  {sp.name}
                </option>
              ))}
            </select>
          </div>

          <div className="inline-flex rounded-xl border border-line bg-sunk p-1">
            {(['DAY', 'WEEK', 'MONTH'] as ViewMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setViewMode(m)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  viewMode === m
                    ? 'bg-surface text-ink'
                    : 'text-ink-2 hover:text-ink'
                }`}
              >
                {m === 'DAY' ? 'Por Día' : m === 'WEEK' ? 'Por Semana' : 'Por Mes'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigateDate(-1)}
            className="rounded-full border border-line p-2 hover:bg-paper"
            title="Anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <input
            type="date"
            value={baseDate}
            onChange={(e) => setBaseDate(e.target.value)}
            className="rounded-md border border-line-strong px-3 py-1.5 text-xs font-semibold text-ink"
          />

          <button
            type="button"
            onClick={() => setBaseDate(getMonterreyDateString(new Date()))}
            className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink-2 hover:bg-paper"
          >
            Hoy
          </button>

          <button
            type="button"
            onClick={() => navigateDate(1)}
            className="rounded-full border border-line p-2 hover:bg-paper"
            title="Siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Contenido del Calendario según Vista */}
      {loading ? (
        <div className="rounded-xl border border-line bg-surface p-12 text-center text-xs text-ink-3">
          Cargando bloques horarios de disponibilidad...
        </div>
      ) : viewMode === 'DAY' ? (
        /* VISTA POR DÍA: Parrilla horaria detallada de 07:00 a 22:00 */
        <div className="rounded-xl border border-line bg-surface overflow-hidden">
          <div className="border-b border-line bg-ink px-6 py-4 text-surface flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold">
                Disponibilidad por Hora — {formatSpanishDate(baseDate)}
              </h2>
              <p className="text-xs text-surface/80">
                {selectedSpaceId === 'ALL'
                  ? 'Mostrando todos los espacios universitarios'
                  : `Espacio filtrado: ${
                      spaces.find((s) => s.id === selectedSpaceId)?.name || ''
                    }`}
              </p>
            </div>
            <Link
              href="/eventos/nuevo"
              className="rounded-full bg-ink px-3.5 py-1.5 text-xs font-semibold text-surface hover:bg-ink-2"
            >
              + Reservar en horario disponible
            </Link>
          </div>

          <div className="divide-y divide-line">
            {HOURS.map((hour) => {
              const hourStartMins = hour * 60;
              const hourEndMins = (hour + 1) * 60;
              const hourLabel = `${String(hour).padStart(2, '0')}:00 - ${String(hour + 1).padStart(
                2,
                '0'
              )}:00`;

              const matchingBlocks = blocks.filter(
                (b) =>
                  b.date === baseDate &&
                  b.startMinutes < hourEndMins &&
                  b.endMinutes > hourStartMins
              );

              return (
                <div
                  key={hour}
                  className="grid grid-cols-1 md:grid-cols-12 items-stretch hover:bg-paper/60"
                >
                  <div className="md:col-span-2 px-4 py-3.5 bg-paper border-b md:border-b-0 md:border-r border-line flex items-center justify-between md:justify-start">
                    <span className="font-mono text-xs font-semibold text-ink-2">{hourLabel}</span>
                  </div>

                  <div className="md:col-span-10 p-3 flex flex-wrap items-center gap-3">
                    {matchingBlocks.length === 0 ? (
                      <div className="flex items-center gap-2 rounded-full border border-accent/30 bg-accent-soft/70 px-3.5 py-2 text-xs font-medium text-accent">
                        <CheckCircle2 className="h-4 w-4 text-accent" />
                        <span>VERDE · Horario Disponible para Reservación</span>
                      </div>
                    ) : (
                      matchingBlocks.map((blk) => {
                        const st = getBlockStyles(blk.colorCode);
                        return (
                          <div
                            key={`${blk.id}-${hour}`}
                            className={`flex-1 min-w-[260px] rounded-xl border-2 p-3 text-xs ${st.container}`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase font-mono tracking-[0.08em] ${st.pill}`}
                              >
                                {blk.blockCategory === 'APPROVED'
                                  ? 'ROJO · Reservación Aprobada'
                                  : blk.blockCategory === 'SCHEDULE_CHANGE_PROPOSED'
                                  ? 'NARANJA · Nuevo Horario Propuesto (Pendiente)'
                                  : blk.blockCategory === 'PENDING'
                                  ? 'NARANJA · Solicitud Pendiente'
                                  : 'AMARILLO · Hora Obligatoria de Limpieza'}
                              </span>
                              <span className="font-mono text-[11px] font-semibold">
                                {blk.startTime} - {blk.endTime}
                              </span>
                            </div>

                            <div className="mt-2 flex items-center justify-between gap-2">
                              <div>
                                <p className="font-semibold text-sm">
                                  {blk.eventName}
                                </p>
                                <p className="text-[11px] opacity-85">
                                  Espacio: <strong>{blk.spaceName}</strong>
                                  {blk.responsibleName ? ` · Resp: ${blk.responsibleName}` : ''}
                                </p>
                              </div>

                              {blk.canViewPrivateDetails && blk.blockCategory !== 'CLEANING' && (
                                <Link
                                  href={`/eventos/${blk.eventId}`}
                                  className="inline-flex items-center gap-1 rounded-full bg-surface/90 px-2.5 py-1 text-[11px] font-semibold text-ink hover:bg-surface"
                                >
                                  Detalle
                                  <ExternalLink className="h-3 w-3" />
                                </Link>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : viewMode === 'WEEK' ? (
        /* VISTA POR SEMANA: 7 columnas de días */
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {weekDays.map((dayStr) => {
            const dayBlocks = blocks.filter((b) => b.date === dayStr);
            return (
              <div
                key={dayStr}
                className="rounded-xl border border-line bg-surface flex flex-col overflow-hidden"
              >
                <div className="bg-ink text-surface px-3 py-2.5 text-center">
                  <p className="text-xs font-semibold">{formatSpanishDate(dayStr)}</p>
                  <p className="text-[11px] text-ink-3 font-mono">{dayStr}</p>
                </div>

                <div className="p-2.5 flex-1 space-y-2">
                  {dayBlocks.length === 0 ? (
                    <div className="rounded-xl border border-accent/30 bg-accent-soft/70 p-3 text-center text-[11px] font-semibold text-accent">
                      Verde · Día Disponible
                    </div>
                  ) : (
                    dayBlocks.map((blk) => {
                      const st = getBlockStyles(blk.colorCode);
                      return (
                        <div
                          key={blk.id}
                          className={`rounded-xl border p-2.5 text-[11px] space-y-1 ${st.container}`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span
                              className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${st.pill}`}
                            >
                              {blk.startTime}-{blk.endTime}
                            </span>
                          </div>
                          <p className="font-semibold leading-snug">{blk.eventName}</p>
                          <p className="text-[11px] opacity-80">{blk.spaceName}</p>
                          {blk.canViewPrivateDetails && blk.blockCategory !== 'CLEANING' && (
                            <Link
                              href={`/eventos/${blk.eventId}`}
                              className="inline-block text-[11px] font-semibold underline pt-0.5"
                            >
                              Ver evento →
                            </Link>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* VISTA POR MES */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {monthDays.map((dayStr) => {
            const dayBlocks = blocks.filter((b) => b.date === dayStr);
            return (
              <div
                key={dayStr}
                onClick={() => {
                  setBaseDate(dayStr);
                  setViewMode('DAY');
                }}
                className="cursor-pointer rounded-xl border border-line bg-surface p-3 hover:border-accent transition flex flex-col justify-between min-h-[130px]"
              >
                <div className="flex items-center justify-between border-b border-line pb-1.5">
                  <span className="text-xs font-semibold text-ink">
                    {formatSpanishDate(dayStr)}
                  </span>
                </div>

                <div className="mt-2 space-y-1.5 flex-1">
                  {dayBlocks.length === 0 ? (
                    <span className="inline-block rounded-full bg-accent-soft border border-accent/30 px-2 py-1 text-[11px] font-semibold text-accent">
                      Disponible
                    </span>
                  ) : (
                    dayBlocks.slice(0, 3).map((b) => {
                      const st = getBlockStyles(b.colorCode);
                      return (
                        <div
                          key={b.id}
                          className={`rounded-full border px-2 py-1 text-[11px] font-semibold truncate ${st.container}`}
                        >
                          {b.startTime} {b.eventName}
                        </div>
                      );
                    })
                  )}
                  {dayBlocks.length > 3 && (
                    <p className="text-[11px] font-semibold text-ink-3">
                      +{dayBlocks.length - 3} bloques más
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

