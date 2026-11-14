'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CalendarPlus,
  CheckCircle2,
  AlertTriangle,
  Layers,
  UserCheck,
  Wrench,
  FileUp,
  ArrowLeft,
  Clock,
  ShieldCheck,
  QrCode,
  Globe,
  Lock,
} from 'lucide-react';
import {
  addOneHourForCleaning,
  calculateCriticalityLevel,
  getCriticalityMeta,
  getMonterreyDateString,
} from '@/lib/utils';

export default function NuevoEventoPage() {
  const router = useRouter();

  const [spaces, setSpaces] = useState<any[]>([]);
  const [audienceTypes, setAudienceTypes] = useState<any[]>([]);
  const [equipmentTypes, setEquipmentTypes] = useState<any[]>([]);

  // Campos del evento
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [justification, setJustification] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('11:00');
  const [spaceId, setSpaceId] = useState('');

  // Campos del solicitante representado (maestro / responsable)
  const [responsibleName, setResponsibleName] = useState('');
  const [responsibleDepartment, setResponsibleDepartment] = useState('');
  const [responsibleEmail, setResponsibleEmail] = useState('');

  // Criticidad múltiple
  const [selectedLevels, setSelectedLevels] = useState<number[]>([4]);

  // Equipo opcional
  const [requestEquipment, setRequestEquipment] = useState(false);
  const [equipmentCodes, setEquipmentCodes] = useState<string[]>([]);
  const [equipmentDescription, setEquipmentDescription] = useState('');

  // Modalidad de acceso y asistencia QR (Sección 8)
  const [accessMode, setAccessMode] = useState<'OPEN' | 'RESTRICTED'>('OPEN');
  const [registrationEnabled, setRegistrationEnabled] = useState(true);

  // Evidencia PDF opcional
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  // Estado de validación de disponibilidad en tiempo real
  const [availabilityStatus, setAvailabilityStatus] = useState<{
    checked: boolean;
    available: boolean;
    cleaningEndTime?: string;
    conflicts: any[];
    error?: string;
  }>({ checked: false, available: true, conflicts: [] });

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const today = getMonterreyDateString(new Date());
    setDate(today);

    fetch('/api/catalogs')
      .then((r) => r.json())
      .then((d) => {
        setSpaces(d.spaces || []);
        setAudienceTypes(d.audienceTypes || []);
        setEquipmentTypes(d.equipmentTypes || []);
        if (d.spaces?.length > 0) {
          setSpaceId(d.spaces[0].id);
        }
      });
  }, []);

  // Verificar disponibilidad automáticamente cuando cambia espacio, fecha u horario
  useEffect(() => {
    if (!spaceId || !date || !startTime || !endTime) return;
    const controller = new AbortController();
    const params = new URLSearchParams({
      mode: 'check',
      spaceId,
      date,
      startTime,
      endTime,
    });

    fetch(`/api/availability?${params.toString()}`, { signal: controller.signal })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setAvailabilityStatus({
            checked: true,
            available: false,
            conflicts: [],
            error: data.error || 'Horario inválido.',
          });
        } else {
          setAvailabilityStatus({
            checked: true,
            available: data.available,
            cleaningEndTime: data.cleaningEndTime,
            conflicts: data.conflicts || [],
          });
        }
      })
      .catch(() => {});

    return () => controller.abort();
  }, [spaceId, date, startTime, endTime]);

  const toggleAudienceLevel = (lvl: number) => {
    setSelectedLevels((prev) =>
      prev.includes(lvl) ? prev.filter((item) => item !== lvl) : [...prev, lvl]
    );
  };

  const toggleEquipmentCode = (code: string) => {
    setEquipmentCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const resultingCriticality =
    selectedLevels.length > 0 ? calculateCriticalityLevel(selectedLevels) : null;
  const criticalityMeta = resultingCriticality ? getCriticalityMeta(resultingCriticality) : null;

  const selectedSpace = spaces.find((s) => s.id === spaceId);

  let cleaningPreview = '';
  try {
    cleaningPreview = addOneHourForCleaning(endTime).cleaningEndTime;
  } catch {
    cleaningPreview = '';
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (selectedLevels.length === 0) {
      setErrorMsg('Debe seleccionar al menos una opción de criticidad.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          justification,
          date,
          startTime,
          endTime,
          spaceId,
          responsibleName,
          responsibleDepartment,
          responsibleEmail: responsibleEmail || null,
          audienceLevels: selectedLevels,
          requestEquipment,
          equipmentCodes,
          equipmentDescription,
          accessMode,
          registrationEnabled: accessMode === 'OPEN' ? registrationEnabled : false,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Error al registrar el evento.');
        setSubmitting(false);
        return;
      }

      const createdEventId = data.event.id;

      // Si el usuario adjuntó un PDF de evidencia, subirlo al evento recién creado (categoría SUPPORTING_DOCUMENT)
      if (pdfFile) {
        const formData = new FormData();
        formData.append('file', pdfFile);
        formData.append('category', 'SUPPORTING_DOCUMENT');
        const upRes = await fetch(`/api/events/${createdEventId}/evidences`, {
          method: 'POST',
          body: formData,
        });
        if (!upRes.ok) {
          router.push(`/eventos/${createdEventId}`);
          return;
        }
      }

      router.push(`/eventos/${createdEventId}`);
      router.refresh();
    } catch {
      setErrorMsg('Error de conexión al guardar el evento.');
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link
            href="/eventos"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-2 hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver a Mis Eventos
          </Link>
          <h1 className="mt-1 text-2xl sm:text-[28px] font-semibold text-ink">
            Registrar Nuevo Evento y Solicitud de Espacio
          </h1>
          <p className="text-xs text-ink-3">
            El sistema verificará la disponibilidad (incluyendo la hora obligatoria de limpieza),
            bloqueará provisionalmente el espacio y configurará el control de asistencia QR.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-bad/30 bg-bad-soft p-4 text-xs font-medium text-bad flex items-start gap-2.5">
          <AlertTriangle className="h-5 w-5 text-bad shrink-0" />
          <div>
            <p className="font-semibold">No se pudo registrar el evento:</p>
            <p className="mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Datos Generales del Evento */}
        <div className="rounded-xl border border-line bg-surface p-6 space-y-4">
          <h2 className="text-sm font-semibold text-ink border-b border-line pb-2.5">
            1. Información General del Evento
          </h2>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-2 mb-1">
                Nombre del evento *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Simposio de Ingeniería y Desarrollo de Software"
                className="w-full rounded-md border border-line-strong px-3.5 py-2.5 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ink-2 mb-1">
                  Descripción del evento *
                </label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe las actividades principales y objetivo del evento..."
                  className="w-full rounded-md border border-line-strong px-3.5 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-2 mb-1">
                  Justificación académica o institucional *
                </label>
                <textarea
                  rows={3}
                  required
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Explica la relevancia institucional para la autorización del recinto..."
                  className="w-full rounded-md border border-line-strong px-3.5 py-2 text-xs"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 2. Espacio Solicitado, Horario y Validación de Limpieza */}
        <div className="rounded-xl border border-line bg-surface p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2.5">
            <h2 className="text-sm font-semibold text-ink">
              2. Espacio Solicitado, Horario y Regla de Limpieza (+1 Hora)
            </h2>
            {selectedSpace && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft border border-accent/30 px-3 py-1 text-xs font-semibold text-accent">
                <ShieldCheck className="h-3.5 w-3.5 text-accent" />
                Autorizador asignado: {selectedSpace.authorizer?.fullName} (@
                {selectedSpace.authorizer?.username}) · Cap: {selectedSpace.capacity ?? 'N/D'}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-ink-2 mb-1">
                Espacio universitario (obligatorio) *
              </label>
              <select
                required
                value={spaceId}
                onChange={(e) => setSpaceId(e.target.value)}
                className="w-full rounded-md border border-line-strong px-3.5 py-2.5 text-xs font-medium"
              >
                {spaces.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (Cap. {s.capacity ?? 'N/D'}) — Autoriza: {s.authorizer?.username}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-2 mb-1">Fecha *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-md border border-line-strong px-3 py-2 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-ink-2 mb-1">Inicio *</label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-md border border-line-strong px-2.5 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-2 mb-1">Fin *</label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full rounded-md border border-line-strong px-2.5 py-2 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Indicador de Disponibilidad y Hora de Limpieza */}
          {availabilityStatus.checked && (
            <div
              className={`rounded-xl border p-3.5 text-xs ${
                availabilityStatus.available
                  ? 'border-accent/30 bg-accent-soft text-accent'
                  : 'border-bad/30 bg-bad-soft text-bad'
              }`}
            >
              {availabilityStatus.available ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
                    <span>
                      Horario disponible en {selectedSpace?.name}: Evento de {startTime} a {endTime}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-warn-soft border border-warn/30 px-2.5 py-1 text-[11px] font-semibold text-warn">
                    <Clock className="h-3.5 w-3.5" />
                    Hora obligatoria de limpieza: {endTime} a {cleaningPreview}
                  </span>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertTriangle className="h-4 w-4 text-bad shrink-0" />
                    <span>Conflicto de disponibilidad detectado:</span>
                  </div>
                  {availabilityStatus.error && <p>{availabilityStatus.error}</p>}
                  {availabilityStatus.conflicts.map((c, i) => (
                    <p key={i} className="pl-6 text-[11px] font-medium">
                      • {c.message}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. Solicitante Representado (Maestros / Responsable del Evento) */}
        <div className="rounded-xl border border-line bg-surface p-6 space-y-4">
          <div className="border-b border-line pb-2.5">
            <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-accent" />
              3. Datos del Responsable del Evento (Solicitante Representado)
            </h2>
            <p className="text-xs text-ink-3">
              Diferencia claramente al docente o responsable operativo respecto al usuario que
              registra la solicitud en el sistema.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-2 mb-1">
                Nombre del responsable del evento *
              </label>
              <input
                type="text"
                required
                value={responsibleName}
                onChange={(e) => setResponsibleName(e.target.value)}
                placeholder="Ej. Mtro. Juan Carlos Pérez"
                className="w-full rounded-md border border-line-strong px-3.5 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-2 mb-1">
                Área o departamento *
              </label>
              <input
                type="text"
                required
                value={responsibleDepartment}
                onChange={(e) => setResponsibleDepartment(e.target.value)}
                placeholder="Ej. Academia de Sistemas - Edificio 2"
                className="w-full rounded-md border border-line-strong px-3.5 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-2 mb-1">
                Correo electrónico de contacto (opcional)
              </label>
              <input
                type="email"
                value={responsibleEmail}
                onChange={(e) => setResponsibleEmail(e.target.value)}
                placeholder="docente@utc.edu.mx"
                className="w-full rounded-md border border-line-strong px-3.5 py-2 text-xs"
              />
            </div>
          </div>
        </div>

        {/* 4. Catálogo de Criticidad Múltiple */}
        <div className="rounded-xl border border-line bg-surface p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2.5">
            <div>
              <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
                <Layers className="h-4 w-4 text-ink-2" />
                4. Catálogo de Criticidad (Selección Múltiple)
              </h2>
              <p className="text-xs text-ink-3">
                Selecciona todas las opciones que apliquen. El sistema calcula automáticamente el
                nivel resultante utilizando el número menor.
              </p>
            </div>

            {criticalityMeta && (
              <div
                className={`rounded-full border px-3.5 py-2 text-xs font-semibold ${criticalityMeta.badgeClass}`}
              >
                Criticidad resultante: Nivel {criticalityMeta.level} ({criticalityMeta.priorityText})
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {audienceTypes.map((aud) => {
              const checked = selectedLevels.includes(aud.level);
              return (
                <label
                  key={aud.id}
                  className={`flex items-start gap-3 rounded-xl border p-3.5 cursor-pointer transition ${
                    checked
                      ? 'border-accent bg-accent-soft/60 '
                      : 'border-line bg-surface hover:bg-paper'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleAudienceLevel(aud.level)}
                    className="mt-0.5 h-4 w-4 rounded border-line-strong text-accent focus:ring-ink"
                  />
                  <div>
                    <p className="text-xs font-semibold text-ink">
                      Nivel {aud.level} — {aud.name}
                    </p>
                    <p className="text-[11px] text-ink-3">{aud.description}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* 5. Modalidad de Acceso y Control de Asistencia QR (Sección 8) */}
        <div className="rounded-xl border border-line bg-surface p-6 space-y-4">
          <div className="border-b border-line pb-2.5">
            <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
              <QrCode className="h-4 w-4 text-accent" />
              5. Modalidad de Acceso y Control de Asistencia QR
            </h2>
            <p className="text-xs text-ink-3">
              Define cómo se registrarán los asistentes y cómo se emitirán sus pases QR individuales.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label
              className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition ${
                accessMode === 'OPEN'
                  ? 'border-accent bg-accent-soft/60 '
                  : 'border-line bg-surface hover:bg-paper'
              }`}
            >
              <input
                type="radio"
                name="accessMode"
                checked={accessMode === 'OPEN'}
                onChange={() => setAccessMode('OPEN')}
                className="mt-0.5 h-4 w-4 text-accent"
              />
              <div>
                <p className="text-xs font-semibold text-ink flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-accent" />
                  Evento Abierto (OPEN) — Con registro público
                </p>
                <p className="mt-1 text-[11px] text-ink-2">
                  Habilita un enlace público <code className="font-mono">/registro/[token]</code> una
                  vez aprobado el espacio para que alumnos, docentes, administrativos o invitados se
                  registren y obtengan su QR individual.
                </p>
              </div>
            </label>

            <label
              className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition ${
                accessMode === 'RESTRICTED'
                  ? 'border-ink bg-sunk/60 '
                  : 'border-line bg-surface hover:bg-paper'
              }`}
            >
              <input
                type="radio"
                name="accessMode"
                checked={accessMode === 'RESTRICTED'}
                onChange={() => setAccessMode('RESTRICTED')}
                className="mt-0.5 h-4 w-4 text-ink-2"
              />
              <div>
                <p className="text-xs font-semibold text-ink flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-ink-2" />
                  Evento Restringido (RESTRICTED) — Solo por invitación
                </p>
                <p className="mt-1 text-[11px] text-ink-2">
                  Sin formulario público. Los invitados se administran de forma permanente dentro del
                  detalle del evento, generando y enviando pases QR individuales por invitación.
                </p>
              </div>
            </label>
          </div>

          {accessMode === 'OPEN' && (
            <div className="pt-2">
              <label className="inline-flex items-center gap-2 text-xs font-medium text-ink cursor-pointer">
                <input
                  type="checkbox"
                  checked={registrationEnabled}
                  onChange={(e) => setRegistrationEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-line-strong text-accent"
                />
                Activar automáticamente el enlace de registro público al aprobarse el espacio
              </label>
            </div>
          )}
        </div>

        {/* 6. Solicitud Opcional de Equipo */}
        <div className="rounded-xl border border-line bg-surface p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
                <Wrench className="h-4 w-4 text-ink-2" />
                6. Solicitud de Equipo (Opcional — Autoriza Extensión Universitaria)
              </h2>
              <p className="text-xs text-ink-3">
                La solicitud de equipo es independiente de la autorización del espacio.
              </p>
            </div>
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-ink cursor-pointer">
              <input
                type="checkbox"
                checked={requestEquipment}
                onChange={(e) => setRequestEquipment(e.target.checked)}
                className="h-4 w-4 rounded border-line-strong text-ink-2"
              />
              Requiero solicitar equipo
            </label>
          </div>

          {requestEquipment && (
            <div className="space-y-4 pt-2 border-t border-line">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {equipmentTypes.map((eq) => {
                  const selected = equipmentCodes.includes(eq.code);
                  return (
                    <label
                      key={eq.id}
                      className={`flex items-start gap-3 rounded-xl border p-3.5 cursor-pointer ${
                        selected
                          ? 'border-ink bg-sunk/60'
                          : 'border-line bg-surface'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleEquipmentCode(eq.code)}
                        className="mt-0.5 h-4 w-4 rounded border-line-strong text-ink-2"
                      />
                      <div>
                        <p className="text-xs font-semibold text-ink">{eq.name}</p>
                        <p className="text-[11px] text-ink-3">{eq.description}</p>
                      </div>
                    </label>
                  );
                })}
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-2 mb-1">
                  Descripción detallada de lo que necesita (sonido y/o mobiliario) *
                </label>
                <textarea
                  rows={3}
                  required={requestEquipment}
                  value={equipmentDescription}
                  onChange={(e) => setEquipmentDescription(e.target.value)}
                  placeholder="Especifica micrófonos, bocinas, mesas de presídium, sillas o acomodo requerido..."
                  className="w-full rounded-md border border-line-strong px-3.5 py-2 text-xs"
                />
              </div>
            </div>
          )}
        </div>

        {/* 7. Documento PDF de Apoyo Opcional */}
        <div className="rounded-xl border border-line bg-surface p-6 space-y-3">
          <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
            <FileUp className="h-4 w-4 text-ink-2" />
            7. Documento PDF de Apoyo (Opcional)
          </h2>
          <p className="text-xs text-ink-3">
            Adjunta programa del evento, oficio de solicitud o ficha técnica en formato PDF (máx.
            10 MB). Nota: La evidencia de cierre obligatorio se adjuntará una vez concluido el
            evento.
          </p>
          <input
            type="file"
            accept="application/pdf,.pdf"
            onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
            className="block w-full text-xs text-ink-2 file:mr-4 file:rounded-xl file:border-0 file:bg-ink file:px-4 file:py-2 file:text-xs file:font-semibold file:text-surface hover:file:bg-ink-2"
          />
        </div>

        {/* Botones de Acción */}
        <div className="flex items-center justify-end gap-3">
          <Link
            href="/eventos"
            className="rounded-full border border-line-strong bg-surface px-5 py-2.5 text-xs font-semibold text-ink-2 hover:bg-paper"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={submitting || !availabilityStatus.available}
            className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-2.5 text-xs font-semibold text-surface shadow-float hover:bg-ink-2 disabled:opacity-50"
          >
            <CalendarPlus className="h-4 w-4" />
            {submitting ? 'Registrando evento...' : 'Registrar Evento y Solicitar Espacio'}
          </button>
        </div>
      </form>
    </div>
  );
}
