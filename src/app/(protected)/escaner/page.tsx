'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  QrCode,
  Camera,
  CameraOff,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ArrowLeft,
  Clock,
  Users,
  ShieldCheck,
} from 'lucide-react';
import { EventLifecycleBadge } from '@/components/ui/StatusBadge';
import { EventLifecycleStatus } from '@/types';

interface OperableEvent {
  id: string;
  demoCode?: string | null;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  lifecycleStatus: EventLifecycleStatus;
  space: { id: string; name: string; capacity: number };
  attendanceConfig?: {
    accessMode: 'OPEN' | 'RESTRICTED';
    checkInOpen: boolean;
    checkInClosedAt?: string | null;
  } | null;
  _count?: {
    attendees: number;
    attendances: number;
  };
}

interface ScanLogItem {
  id: string;
  attemptedAt: string;
  result: string;
  method: string;
  details?: string | null;
  attendee?: {
    id: string;
    fullName: string;
    email: string;
    attendeeType: string;
  } | null;
  operator?: {
    id: string;
    username: string;
    fullName: string;
  } | null;
}

interface ScanOutcomeResponse {
  result:
    | 'AUTHORIZED'
    | 'DUPLICATE'
    | 'REVOKED'
    | 'WRONG_EVENT'
    | 'CHECKIN_CLOSED'
    | 'INVALID_TOKEN';
  title: string;
  message: string;
  attendee?: {
    id: string;
    fullName: string;
    email: string;
    attendeeType: string;
    attendeeTypeLabel: string;
    enrollmentNumber?: string | null;
    careerOrDepartment: string;
    semesterOrGrade: string;
  };
  checkedInAt?: string;
  firstCheckInAt?: string;
  firstCheckInMethod?: string;
  firstCheckInOperator?: string | null;
  method?: string;
  operatorName?: string;
}

export default function ScannerPage() {
  const searchParams = useSearchParams();
  const initialEventId = searchParams.get('eventId') || '';

  const [events, setEvents] = useState<OperableEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState(initialEventId);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [scanLogs, setScanLogs] = useState<ScanLogItem[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Camera state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const processingRef = useRef(false);
  const selectedEventIdRef = useRef(selectedEventId);
  const lastScannedRef = useRef<{ token: string; timestamp: number } | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [processingScan, setProcessingScan] = useState(false);
  const [lastResult, setLastResult] = useState<ScanOutcomeResponse | null>(null);

  useEffect(() => {
    selectedEventIdRef.current = selectedEventId;
  }, [selectedEventId]);

  const loadOperableEvents = useCallback(async () => {
    setLoadingEvents(true);
    try {
      const res = await fetch('/api/events?scope=operator', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      const list: OperableEvent[] = data.events || [];
      setEvents(list);
      if (!selectedEventIdRef.current && list.length > 0) {
        const preferred = list.find((e) => e.attendanceConfig?.checkInOpen) || list[0];
        setSelectedEventId(preferred.id);
      }
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  const loadRecentScanLogs = useCallback(async (eventId: string) => {
    if (!eventId) {
      setScanLogs([]);
      return;
    }
    setLoadingLogs(true);
    try {
      const res = await fetch(`/api/events/${eventId}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setScanLogs((data.event?.scanLogs || []).slice(0, 15));
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  const submitQrToken = useCallback(
    async (rawToken: string) => {
      const eventId = selectedEventIdRef.current;
      const cleanToken = rawToken.trim();
      if (!eventId || !cleanToken || processingRef.current) return;

      // Evitar procesar repetidamente el mismo QR mientras permanece frente a la cámara
      const now = Date.now();
      if (
        lastScannedRef.current &&
        lastScannedRef.current.token === cleanToken &&
        now - lastScannedRef.current.timestamp < 3000
      ) {
        return;
      }

      lastScannedRef.current = { token: cleanToken, timestamp: now };
      processingRef.current = true;
      setProcessingScan(true);

      try {
        const res = await fetch(`/api/events/${eventId}/check-in`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            method: 'QR',
            qrToken: cleanToken,
          }),
        });

        const data = (await res.json()) as ScanOutcomeResponse & { error?: string };
        if (!res.ok && data.error) {
          setLastResult({
            result: 'INVALID_TOKEN',
            title: 'Error de validación',
            message: data.error,
          });
        } else {
          setLastResult(data);
        }

        await Promise.all([loadOperableEvents(), loadRecentScanLogs(eventId)]);
      } catch {
        setLastResult({
          result: 'INVALID_TOKEN',
          title: 'Error de conexión',
          message: 'No fue posible validar el código QR con el servidor. Intente nuevamente.',
        });
      } finally {
        processingRef.current = false;
        setProcessingScan(false);
      }
    },
    [loadOperableEvents, loadRecentScanLogs]
  );

  const startCamera = useCallback(async () => {
    setCameraError('');

    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setCameraError(
        'La cámara del navegador requiere una conexión segura HTTPS (por ejemplo mediante Ngrok con https://) o localhost.'
      );
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError(
        'Este navegador no permite acceso a la cámara del dispositivo. Utilice un navegador móvil moderno compatible sobre HTTPS.'
      );
      return;
    }

    try {
      stopCamera();

      // Preferir cámara trasera en teléfonos (Android / iPhone)
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);

        const Win = window as unknown as {
          BarcodeDetector?: new (opts: { formats: string[] }) => {
            detect: (el: HTMLVideoElement) => Promise<{ rawValue: string }[]>;
          };
        };

        if (Win.BarcodeDetector) {
          const detector = new Win.BarcodeDetector({ formats: ['qr_code'] });
          scanIntervalRef.current = setInterval(async () => {
            if (!videoRef.current || processingRef.current) return;
            if (videoRef.current.readyState < 2) return;
            try {
              const codes = await detector.detect(videoRef.current);
              if (codes && codes.length > 0 && codes[0].rawValue) {
                await submitQrToken(codes[0].rawValue);
              }
            } catch {
              // Ignorar error de fotograma individual
            }
          }, 450);
        } else {
          setCameraError(
            'La cámara está activa, pero este navegador no soporta detección nativa BarcodeDetector para códigos QR. Use Chrome/Edge actualizado o Android Chrome sobre HTTPS.'
          );
        }
      }
    } catch (err) {
      const name = err instanceof DOMException ? err.name : '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setCameraError(
          'Permiso de cámara denegado. Autorice el acceso a la cámara en la configuración de su navegador y pulse "Reintentar cámara".'
        );
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setCameraError(
          'No se detectó ninguna cámara disponible en este dispositivo.'
        );
      } else if (name === 'NotReadableError') {
        setCameraError(
          'La cámara está siendo utilizada por otra aplicación. Ciérrela e intente nuevamente.'
        );
      } else {
        setCameraError(
          'No fue posible iniciar la cámara del dispositivo. Verifique permisos y que el acceso sea mediante HTTPS.'
        );
      }
    }
  }, [stopCamera, submitQrToken]);

  useEffect(() => {
    void loadOperableEvents();
    return () => {
      stopCamera();
    };
  }, [loadOperableEvents, stopCamera]);

  useEffect(() => {
    if (selectedEventId) {
      void loadRecentScanLogs(selectedEventId);
    }
  }, [selectedEventId, loadRecentScanLogs]);

  const currentEvent = events.find((e) => e.id === selectedEventId);

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-accent-soft text-accent">
            <ShieldCheck className="w-3.5 h-3.5" />
            Control de Acceso Exclusivo por Cámara QR
          </span>
          <h1 className="text-2xl sm:text-[28px] font-semibold text-ink mt-1 flex items-center gap-2.5">
            <QrCode className="w-6 h-6 text-accent shrink-0" />
            Escáner QR de Asistencia
          </h1>
        </div>
        {currentEvent && (
          <Link
            href={`/eventos/${currentEvent.id}`}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-full border border-line bg-surface hover:bg-paper text-xs font-medium text-ink-2 shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Ver Detalle del Evento
          </Link>
        )}
      </div>

      {/* 1. Selector de evento autorizado + 2. Información del evento + 7. Contador */}
      <div className="bg-surface rounded-xl border border-line p-4 sm:p-5 space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase font-mono tracking-[0.08em] text-ink-3 mb-1.5">
            Evento Autorizado
          </label>
          {loadingEvents ? (
            <div className="text-xs text-ink-3">Cargando eventos asignados...</div>
          ) : events.length === 0 ? (
            <div className="text-xs text-warn bg-warn-soft border border-warn/30 rounded-xl p-3">
              No tiene eventos asignados como organizador u operador de acceso.
            </div>
          ) : (
            <select
              value={selectedEventId}
              onChange={(e) => {
                setSelectedEventId(e.target.value);
                setLastResult(null);
                lastScannedRef.current = null;
              }}
              className="w-full px-3.5 py-2.5 text-sm font-medium rounded-md border border-line-strong bg-surface focus:outline-none focus:ring-2 focus:ring-ink"
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} — {ev.space.name} ({ev.date} {ev.startTime}-{ev.endTime})
                </option>
              ))}
            </select>
          )}
        </div>

        {currentEvent && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-line text-xs">
            <div className="p-2.5 rounded-xl bg-paper border border-line">
              <p className="text-[11px] uppercase font-mono tracking-[0.08em] font-medium text-ink-3">Estado Evento</p>
              <div className="mt-1">
                <EventLifecycleBadge status={currentEvent.lifecycleStatus} />
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-paper border border-line">
              <p className="text-[11px] uppercase font-mono tracking-[0.08em] font-medium text-ink-3">Recinto y Horario</p>
              <p className="font-semibold text-ink mt-1 truncate">{currentEvent.space.name}</p>
              <p className="text-[11px] text-ink-3">
                {currentEvent.date} · {currentEvent.startTime}-{currentEvent.endTime}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-paper border border-line">
              <p className="text-[11px] uppercase font-mono tracking-[0.08em] font-medium text-ink-3">
                Control de Acceso
              </p>
              <p
                className={`font-semibold mt-1 ${
                  currentEvent.attendanceConfig?.checkInOpen
                    ? 'text-accent'
                    : 'text-bad'
                }`}
              >
                {currentEvent.attendanceConfig?.checkInOpen
                  ? '● Acceso Habilitado'
                  : '● Acceso Cerrado'}
              </p>
              <p className="text-[11px] text-ink-3">
                {currentEvent.attendanceConfig?.accessMode === 'OPEN'
                  ? 'Evento Abierto'
                  : 'Evento Restringido'}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-accent-soft/70 border border-accent/30">
              <p className="text-[11px] uppercase font-mono tracking-[0.08em] font-medium text-accent flex items-center gap-1">
                <Users className="w-3 h-3" />
                Asistentes Registrados
              </p>
              <p className="text-base font-semibold text-accent mt-0.5">
                {currentEvent._count?.attendances ?? 0} / {currentEvent._count?.attendees ?? 0}
              </p>
              <p className="text-[11px] text-accent">
                Capacidad recinto: {currentEvent.space.capacity}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 6. Resultado del escaneo */}
      {lastResult && (
        <div
          className={`rounded-xl border-2 p-4 sm:p-5 transition-all ${
            lastResult.result === 'AUTHORIZED'
              ? 'bg-accent-soft border-accent text-accent'
              : lastResult.result === 'DUPLICATE'
              ? 'bg-warn-soft border-warn text-warn'
              : 'bg-bad-soft border-bad text-bad'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              {lastResult.result === 'AUTHORIZED' ? (
                <CheckCircle2 className="w-8 h-8 text-accent shrink-0 mt-0.5" />
              ) : lastResult.result === 'DUPLICATE' ? (
                <AlertTriangle className="w-8 h-8 text-warn shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-8 h-8 text-bad shrink-0 mt-0.5" />
              )}
              <div>
                <span className="text-[11px] font-semibold uppercase font-mono tracking-[0.08em] px-2 py-0.5 rounded bg-ink/10">
                  {lastResult.result === 'AUTHORIZED'
                    ? 'ACCESO AUTORIZADO'
                    : lastResult.result === 'DUPLICATE'
                    ? 'ASISTENCIA YA REGISTRADA'
                    : lastResult.result === 'REVOKED'
                    ? 'QR REVOCADO'
                    : lastResult.result === 'WRONG_EVENT'
                    ? 'QR DE OTRO EVENTO'
                    : lastResult.result === 'CHECKIN_CLOSED'
                    ? 'ACCESO CERRADO'
                    : 'QR INVÁLIDO'}
                </span>
                <h2 className="text-lg font-semibold mt-1">{lastResult.title}</h2>
                <p className="text-xs sm:text-sm font-medium mt-0.5 opacity-90">
                  {lastResult.message}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setLastResult(null);
                lastScannedRef.current = null;
              }}
              className="text-xs font-semibold underline opacity-75 hover:opacity-100 shrink-0"
            >
              Limpiar
            </button>
          </div>

          {lastResult.attendee && (
            <div className="mt-4 pt-3 border-t border-ink/10 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-surface/85 rounded-xl p-3.5 text-ink">
              <div>
                <p className="text-[11px] uppercase font-mono tracking-[0.08em] font-semibold text-ink-3">Nombre</p>
                <p className="font-semibold text-sm">{lastResult.attendee.fullName}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase font-mono tracking-[0.08em] font-semibold text-ink-3">
                  Tipo de Asistente
                </p>
                <p className="font-semibold">{lastResult.attendee.attendeeTypeLabel}</p>
                {lastResult.attendee.enrollmentNumber && (
                  <p className="font-mono text-[11px] text-accent font-medium">
                    Matrícula: {lastResult.attendee.enrollmentNumber}
                  </p>
                )}
              </div>
              <div>
                <p className="text-[11px] uppercase font-mono tracking-[0.08em] font-semibold text-ink-3">
                  Carrera o Departamento
                </p>
                <p className="font-medium">{lastResult.attendee.careerOrDepartment}</p>
                {lastResult.checkedInAt && (
                  <p className="text-[11px] text-accent font-semibold mt-0.5">
                    Hora de entrada:{' '}
                    {new Date(lastResult.checkedInAt).toLocaleTimeString('es-MX')}
                  </p>
                )}
              </div>
            </div>
          )}

          {lastResult.result === 'DUPLICATE' && lastResult.firstCheckInAt && (
            <div className="mt-3 text-xs font-medium bg-warn-soft/90 border border-warn/30 rounded-full px-3.5 py-2">
              Hora del primer registro:{' '}
              {new Date(lastResult.firstCheckInAt).toLocaleString('es-MX')}
              {lastResult.firstCheckInOperator
                ? ` · Validado por: ${lastResult.firstCheckInOperator}`
                : ''}
            </div>
          )}
        </div>
      )}

      {/* 3. Vista de cámara + 4. Indicador de cámara activa + 5. Indicaciones */}
      <div className="bg-surface rounded-xl border border-line p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
              <Camera className="w-4 h-4 text-accent" />
              Lector QR con Cámara
            </h3>
            <p className="text-xs text-ink-3 mt-0.5">
              Coloque el código QR del pase individual dentro del recuadro de lectura.
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
              cameraActive
                ? 'bg-accent-soft text-accent border-accent/30'
                : 'bg-sunk text-ink-2 border-line'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                cameraActive ? 'bg-accent animate-pulse' : 'bg-line-strong'
              }`}
            />
            {cameraActive ? 'Cámara activa' : 'Cámara en espera'}
          </span>
        </div>

        {/* Amplia vista de cámara con marco de lectura */}
        <div className="relative w-full aspect-[4/3] sm:aspect-video max-h-[420px] bg-ink rounded-xl overflow-hidden flex items-center justify-center border border-surface/15">
          <video
            ref={videoRef}
            className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
            playsInline
            muted
            autoPlay
          />

          {cameraActive && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center p-4">
              <div className="w-48 h-48 sm:w-56 sm:h-56 relative">
                <span className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-accent rounded-tl-xl" />
                <span className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-accent rounded-tr-xl" />
                <span className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-accent rounded-bl-xl" />
                <span className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-accent rounded-br-xl" />
              </div>
              <span className="mt-3 px-3 py-1 rounded-full bg-ink/75 text-surface text-[11px] font-medium">
                {processingScan
                  ? 'Validando código QR...'
                  : 'Alinee el código QR dentro del recuadro'}
              </span>
            </div>
          )}

          {!cameraActive && (
            <div className="text-center p-6 space-y-2.5 text-surface/80">
              <QrCode className="w-14 h-14 mx-auto text-accent-soft/80" />
              <p className="text-sm font-medium">Cámara lista para escanear</p>
              <p className="text-xs text-ink-3 max-w-sm mx-auto">
                Pulse &ldquo;Activar Cámara QR&rdquo; para solicitar permiso y detectar códigos QR
                automáticamente.
              </p>
            </div>
          )}
        </div>

        {cameraError && (
          <div className="p-3.5 rounded-xl bg-warn-soft border border-warn/30 text-warn text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span>{cameraError}</span>
            <button
              type="button"
              onClick={() => void startCamera()}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-warn hover:bg-warn/90 text-surface font-semibold shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reintentar cámara
            </button>
          </div>
        )}

        <div className="flex gap-2">
          {!cameraActive ? (
            <button
              type="button"
              disabled={!selectedEventId}
              onClick={() => void startCamera()}
              className="flex-1 py-3 px-4 rounded-full bg-ink hover:bg-ink-2 disabled:opacity-50 text-surface text-sm font-semibold flex items-center justify-center gap-2"
            >
              <Camera className="w-4 h-4" />
              Activar Cámara QR
            </button>
          ) : (
            <button
              type="button"
              onClick={stopCamera}
              className="flex-1 py-3 px-4 rounded-full bg-bad hover:bg-bad/90 text-surface text-sm font-semibold flex items-center justify-center gap-2"
            >
              <CameraOff className="w-4 h-4" />
              Detener Cámara
            </button>
          )}
        </div>
      </div>

      {/* 8. Historial reciente de escaneos */}
      <div className="bg-surface rounded-xl border border-line p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
            <Clock className="w-4 h-4 text-accent" />
            Historial Reciente de Escaneos
          </h3>
          {selectedEventId && (
            <button
              type="button"
              onClick={() => void loadRecentScanLogs(selectedEventId)}
              className="inline-flex items-center gap-1 text-xs font-medium text-ink-2 hover:text-ink"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
          )}
        </div>

        {scanLogs.length === 0 ? (
          <p className="text-xs text-ink-3 py-3">
            Aún no hay lecturas registradas para el evento seleccionado.
          </p>
        ) : (
          <div className="divide-y divide-line">
            {scanLogs.map((log) => (
              <div
                key={log.id}
                className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold shrink-0 ${
                      log.result === 'AUTHORIZED'
                        ? 'bg-accent-soft text-accent'
                        : log.result === 'DUPLICATE'
                        ? 'bg-warn-soft text-warn'
                        : 'bg-bad-soft text-bad'
                    }`}
                  >
                    {log.result}
                  </span>
                  <span className="font-medium text-ink truncate">
                    {log.attendee?.fullName || log.details || 'Credencial no reconocida'}
                  </span>
                </div>
                <span className="text-[11px] text-ink-3 shrink-0">
                  {new Date(log.attemptedAt).toLocaleString('es-MX')} · {log.method}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
