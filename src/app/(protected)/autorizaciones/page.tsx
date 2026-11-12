'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Building2,
  Wrench,
  CalendarClock,
  Eye,
  FileText,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { CriticalityBadge, RequestStatusBadge } from '@/components/ui/StatusBadge';
import { formatSpanishDate } from '@/lib/utils';

export default function AutorizacionesPage() {
  const [spaceRequests, setSpaceRequests] = useState<any[]>([]);
  const [equipmentRequests, setEquipmentRequests] = useState<any[]>([]);
  const [scheduleChangeRequests, setScheduleChangeRequests] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [activeTab, setActiveTab] = useState<'SPACE' | 'EQUIPMENT' | 'SCHEDULE'>('SPACE');
  const [loading, setLoading] = useState(true);

  // Estado para modal de rechazo con motivo obligatorio
  const [rejectTarget, setRejectTarget] = useState<{
    kind: 'SPACE' | 'EQUIPMENT' | 'SCHEDULE';
    id: string;
    title: string;
  } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const loadTrays = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/authorizations?status=${statusFilter}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      setSpaceRequests(data.spaceRequests || []);
      setEquipmentRequests(data.equipmentRequests || []);
      setScheduleChangeRequests(data.scheduleChangeRequests || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrays();
  }, [statusFilter]);

  const handleDecision = async (
    kind: 'SPACE' | 'EQUIPMENT' | 'SCHEDULE',
    id: string,
    decision: 'APPROVED' | 'REJECTED',
    reason?: string
  ) => {
    setProcessingId(id);
    setFeedback(null);

    const endpoint =
      kind === 'SPACE'
        ? `/api/authorizations/space/${id}`
        : kind === 'EQUIPMENT'
        ? `/api/authorizations/equipment/${id}`
        : `/api/authorizations/schedule-change/${id}`;

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          rejectionReason: reason || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setFeedback({
          type: 'error',
          text: data.error || 'No fue posible procesar la decisión.',
        });
      } else {
        setFeedback({
          type: 'success',
          text:
            decision === 'APPROVED'
              ? 'Solicitud APROBADA exitosamente. Se generó el registro de auditoría y notificación al solicitante.'
              : 'Solicitud RECHAZADA con motivo registrado. Se notificó al solicitante y se actualizaron los bloqueos de horario.',
        });
        setRejectTarget(null);
        setRejectionReason('');
        await loadTrays();
      }
    } catch {
      setFeedback({ type: 'error', text: 'Error de conexión con el servidor.' });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-emerald-700" />
            Bandeja de Autorizaciones y Control de Solicitudes
          </h1>
          <p className="text-xs text-slate-500">
            Revisa y autoriza solicitudes de espacio, equipo y modificaciones de horario asignadas
            a tu perfil. El rechazo exige motivo obligatorio.
          </p>
        </div>

        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
          {[
            { value: 'PENDING', label: 'Pendientes' },
            { value: 'APPROVED', label: 'Aprobadas' },
            { value: 'REJECTED', label: 'Rechazadas' },
            { value: 'ALL', label: 'Todas' },
          ].map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatusFilter(f.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                statusFilter === f.value
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {feedback && (
        <div
          className={`rounded-2xl border p-4 text-xs font-semibold ${
            feedback.type === 'success'
              ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
              : 'border-rose-300 bg-rose-50 text-rose-900'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Pestañas de Bandejas: Espacio, Equipo y Modificaciones de Horario */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => setActiveTab('SPACE')}
          className={`flex items-center justify-between rounded-2xl border p-4 text-left transition ${
            activeTab === 'SPACE'
              ? 'border-emerald-600 bg-emerald-50/70 shadow-sm'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-emerald-700" />
            <div>
              <p className="text-xs font-extrabold text-slate-900">Solicitudes de Espacio</p>
              <p className="text-[11px] text-slate-500">Auditorios y espacios comunes</p>
            </div>
          </div>
          <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-xs font-bold text-white">
            {spaceRequests.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('EQUIPMENT')}
          className={`flex items-center justify-between rounded-2xl border p-4 text-left transition ${
            activeTab === 'EQUIPMENT'
              ? 'border-indigo-600 bg-indigo-50/70 shadow-sm'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-3">
            <Wrench className="h-5 w-5 text-indigo-700" />
            <div>
              <p className="text-xs font-extrabold text-slate-900">Solicitudes de Equipo</p>
              <p className="text-[11px] text-slate-500">Exclusivo Extensión Universitaria</p>
            </div>
          </div>
          <span className="rounded-full bg-indigo-700 px-2.5 py-0.5 text-xs font-bold text-white">
            {equipmentRequests.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('SCHEDULE')}
          className={`flex items-center justify-between rounded-2xl border p-4 text-left transition ${
            activeTab === 'SCHEDULE'
              ? 'border-amber-600 bg-amber-50/70 shadow-sm'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-3">
            <CalendarClock className="h-5 w-5 text-amber-700" />
            <div>
              <p className="text-xs font-extrabold text-slate-900">Cambios de Horario</p>
              <p className="text-[11px] text-slate-500">Modificaciones propuestas</p>
            </div>
          </div>
          <span className="rounded-full bg-amber-600 px-2.5 py-0.5 text-xs font-bold text-white">
            {scheduleChangeRequests.length}
          </span>
        </button>
      </div>

      {/* Modal para capturar motivo obligatorio de rechazo */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="max-w-lg w-full rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-rose-600 shrink-0" />
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Confirmar Rechazo con Motivo Obligatorio
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">{rejectTarget.title}</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Motivo del rechazo (Obligatorio — será visible para el solicitante) *
              </label>
              <textarea
                rows={3}
                required
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Indique detalladamente la razón por la que se rechaza la solicitud para que el solicitante pueda corregirla..."
                className="w-full rounded-xl border border-slate-300 p-3 text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setRejectTarget(null);
                  setRejectionReason('');
                }}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={rejectionReason.trim().length < 5 || processingId === rejectTarget.id}
                onClick={() =>
                  handleDecision(
                    rejectTarget.kind,
                    rejectTarget.id,
                    'REJECTED',
                    rejectionReason.trim()
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" />
                Confirmar Rechazo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Listado según pestaña activa */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-xs text-slate-500">
          Cargando bandeja de autorizaciones...
        </div>
      ) : activeTab === 'SPACE' ? (
        <div className="space-y-4">
          {spaceRequests.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-xs text-slate-500">
              No hay solicitudes de espacio con el estado seleccionado en tu bandeja.
            </div>
          ) : (
            spaceRequests.map((sr) => (
              <div
                key={sr.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-extrabold text-slate-900">{sr.event.name}</h3>
                      <CriticalityBadge level={sr.event.criticalityLevel} />
                      <RequestStatusBadge status={sr.status} />
                    </div>
                    <p className="text-xs text-slate-600">
                      Espacio solicitado: <strong>{sr.space.name}</strong> · Fecha:{' '}
                      <strong>{formatSpanishDate(sr.event.date)}</strong> · Horario:{' '}
                      <strong>
                        {sr.event.startTime} a {sr.event.endTime}
                      </strong>{' '}
                      (Limpieza obligatoria: {sr.event.endTime} a {sr.event.cleaningEndTime})
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/eventos/${sr.event.id}`}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Ver Detalle
                    </Link>

                    {sr.status === 'PENDING' && (
                      <>
                        <button
                          type="button"
                          disabled={processingId === sr.id}
                          onClick={() => handleDecision('SPACE', sr.id, 'APPROVED')}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Aprobar Espacio
                        </button>
                        <button
                          type="button"
                          disabled={processingId === sr.id}
                          onClick={() =>
                            setRejectTarget({
                              kind: 'SPACE',
                              id: sr.id,
                              title: `Rechazar solicitud de espacio "${sr.space.name}" para el evento "${sr.event.name}"`,
                            })
                          }
                          className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50"
                        >
                          <XCircle className="h-4 w-4" />
                          Rechazar
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-slate-50 rounded-xl p-3.5 border border-slate-100">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400">
                      Responsable del Evento
                    </span>
                    <p className="font-bold text-slate-900">{sr.event.responsibleName}</p>
                    <p className="text-slate-600">{sr.event.responsibleDepartment}</p>
                    <p className="text-[11px] text-slate-500">
                      Registrado por: {sr.event.createdBy?.fullName} (@
                      {sr.event.createdBy?.username})
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <span className="text-[10px] font-bold uppercase text-slate-400">
                      Justificación Académica / Institucional
                    </span>
                    <p className="text-slate-800 mt-0.5">{sr.event.justification}</p>
                    {sr.event.evidences?.length > 0 && (
                      <div className="mt-2 flex items-center gap-2">
                        {sr.event.evidences.map((evDoc: any) => (
                          <a
                            key={evDoc.id}
                            href={`/api/evidences/${evDoc.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg bg-sky-100 px-2.5 py-1 text-[11px] font-bold text-sky-900 hover:bg-sky-200"
                          >
                            <FileText className="h-3 w-3" />
                            {evDoc.fileName}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {sr.rejectionReason && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
                    <strong>Motivo de rechazo registrado:</strong> {sr.rejectionReason}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : activeTab === 'EQUIPMENT' ? (
        <div className="space-y-4">
          {equipmentRequests.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-xs text-slate-500">
              No hay solicitudes de equipo en este estado (Recuerda que únicamente Extensión
              Universitaria autoriza equipo).
            </div>
          ) : (
            equipmentRequests.map((eq) => (
              <div
                key={eq.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-extrabold text-slate-900">{eq.event.name}</h3>
                      <RequestStatusBadge status={eq.status} labelPrefix="Equipo" />
                      <RequestStatusBadge
                        status={eq.event.spaceRequest?.status}
                        labelPrefix="Espacio"
                      />
                    </div>
                    <p className="text-xs text-slate-600">
                      Espacio del evento: <strong>{eq.event.space?.name}</strong> · Fecha:{' '}
                      <strong>{formatSpanishDate(eq.event.date)}</strong> ({eq.event.startTime}-
                      {eq.event.endTime})
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/eventos/${eq.event.id}`}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Detalle
                    </Link>

                    {eq.status === 'PENDING' && (
                      <>
                        <button
                          type="button"
                          disabled={processingId === eq.id}
                          onClick={() => handleDecision('EQUIPMENT', eq.id, 'APPROVED')}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-700 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-800"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Aprobar Equipo
                        </button>
                        <button
                          type="button"
                          disabled={processingId === eq.id}
                          onClick={() =>
                            setRejectTarget({
                              kind: 'EQUIPMENT',
                              id: eq.id,
                              title: `Rechazar solicitud de equipo para "${eq.event.name}" (El espacio NO se cancelará)`,
                            })
                          }
                          className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-700"
                        >
                          <XCircle className="h-4 w-4" />
                          Rechazar Equipo
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="rounded-xl bg-indigo-50/60 border border-indigo-100 p-3.5 text-xs space-y-1">
                  <p className="font-bold text-indigo-950">
                    Catálogo solicitado:{' '}
                    {eq.items.map((i: any) => i.equipmentType.name).join(' + ')}
                  </p>
                  <p className="text-slate-800">
                    <strong>Especificación detallada:</strong> {eq.description}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Solicitante: {eq.event.createdBy?.fullName} (@{eq.event.createdBy?.username}) ·
                    Responsable: {eq.event.responsibleName}
                  </p>
                </div>

                {eq.rejectionReason && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
                    <strong>Motivo de rechazo de equipo:</strong> {eq.rejectionReason}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {scheduleChangeRequests.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-xs text-slate-500">
              No hay solicitudes de modificación de horario con el estado seleccionado.
            </div>
          ) : (
            scheduleChangeRequests.map((sc) => (
              <div
                key={sc.id}
                className="rounded-2xl border border-amber-300 bg-white p-5 shadow-sm space-y-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-extrabold text-slate-900">{sc.event.name}</h3>
                      <RequestStatusBadge status={sc.status} />
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      Espacio: <strong>{sc.space.name}</strong> · Solicitado por:{' '}
                      {sc.requestedBy?.fullName} (@{sc.requestedBy?.username})
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/eventos/${sc.event.id}`}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Ver Evento
                    </Link>

                    {sc.status === 'PENDING' && (
                      <>
                        <button
                          type="button"
                          disabled={processingId === sc.id}
                          onClick={() => handleDecision('SCHEDULE', sc.id, 'APPROVED')}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Aprobar Cambio y Liberar Original
                        </button>
                        <button
                          type="button"
                          disabled={processingId === sc.id}
                          onClick={() =>
                            setRejectTarget({
                              kind: 'SCHEDULE',
                              id: sc.id,
                              title: `Rechazar modificación de horario para "${sc.event.name}" (Se conservará el horario original)`,
                            })
                          }
                          className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700"
                        >
                          <XCircle className="h-4 w-4" />
                          Rechazar Cambio
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3">
                    <span className="text-[10px] font-bold uppercase text-rose-800">
                      Horario Original Vigente (Rojo en calendario)
                    </span>
                    <p className="mt-1 font-extrabold text-slate-900">
                      {formatSpanishDate(sc.originalDate)} · {sc.originalStartTime} a{' '}
                      {sc.originalEndTime}
                    </p>
                    <p className="text-[11px] text-slate-600">
                      Limpieza original: {sc.originalEndTime} a {sc.originalCleaningEndTime}
                    </p>
                  </div>

                  <div className="rounded-xl border border-orange-300 bg-orange-50/70 p-3">
                    <span className="text-[10px] font-bold uppercase text-orange-800 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Nuevo Horario Propuesto (Naranja en calendario)
                    </span>
                    <p className="mt-1 font-extrabold text-slate-900">
                      {formatSpanishDate(sc.proposedDate)} · {sc.proposedStartTime} a{' '}
                      {sc.proposedEndTime}
                    </p>
                    <p className="text-[11px] text-slate-600">
                      Limpieza propuesta: {sc.proposedEndTime} a {sc.proposedCleaningEndTime}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 p-3 text-xs border border-slate-100">
                  <strong>Motivo del cambio:</strong> {sc.reason}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

