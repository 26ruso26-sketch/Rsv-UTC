'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  FileText,
  Upload,
  History,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Volume2,
  Armchair,
  Shield,
  Timer,
  CalendarClock,
  Users,
  QrCode,
  Globe,
  Lock,
  UserPlus,
  Mail,
  Ban,
  Edit3,
  Download,
  Copy,
  Check,
  Search,
  FileCheck2,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '@/components/layout/AppShell';
import {
  CriticalityBadge,
  EventLifecycleBadge,
  RequestStatusBadge,
} from '@/components/ui/StatusBadge';
import { formatFileSize } from '@/lib/utils';
import { EventLifecycleStatus } from '@/types';

interface AttendeeRecord {
  id: string;
  fullName: string;
  email: string;
  attendeeType: 'STUDENT' | 'TEACHER' | 'ADMIN_STAFF' | 'EXTERNAL_GUEST';
  enrollmentNumber: string | null;
  careerId: string | null;
  career: { id: string; code: string; name: string } | null;
  academicGradeId: string | null;
  academicGrade: { id: string; code: string; name: string } | null;
  departmentAreaId: string | null;
  departmentArea: { id: string; code: string; name: string; areaType: string } | null;
  organization: string | null;
  registrationStatus: 'REGISTERED' | 'INVITED' | 'REVOKED';
  createdAt: string;
  revokedAt: string | null;
  revocationReason: string | null;
  qrCredentials: {
    id: string;
    isActive: boolean;
    revokedAt: string | null;
  }[];
  attendance: {
    id: string;
    checkedInAt: string;
    registrationMethod: 'QR' | 'MANUAL';
    notes: string | null;
    checkedInBy: { fullName: string; username: string } | null;
  } | null;
  invitationDeliveries: {
    id: string;
    status: 'PENDING' | 'SENT' | 'FAILED';
    sentAt: string | null;
    errorMessage: string | null;
    attempts: number;
  }[];
}

interface EventDetail {
  id: string;
  demoCode?: string | null;
  name: string;
  description: string;
  justification: string;
  date: string;
  startTime: string;
  endTime: string;
  cleaningEndTime: string;
  responsibleName: string;
  responsibleDepartment: string;
  responsibleEmail?: string | null;
  criticalityLevel: number;
  createdById: string;
  createdAt: string;
  closedAt?: string | null;
  closedBy?: { id: string; username: string; fullName: string } | null;
  lifecycleStatus: EventLifecycleStatus;
  hasStarted: boolean;
  hasEnded: boolean;
  canModifySchedule: boolean;
  canUploadClosureEvidence: boolean;
  closureEvidencesCount: number;
  supportingDocumentsCount: number;
  space: {
    id: string;
    code: string;
    name: string;
    location: string;
    capacity: number;
    authorizerUserId: string;
    building?: { id: string; name: string } | null;
    authorizer: { id: string; username: string; fullName: string; departmentLabel?: string };
  };
  createdBy: {
    id: string;
    username: string;
    fullName: string;
    role: string;
    departmentLabel?: string;
    email?: string;
  };
  audiences: {
    id: string;
    audienceType: { id: string; code: string; name: string; level: number };
  }[];
  spaceRequest?: {
    id: string;
    status: string;
    rejectionReason?: string | null;
    resolvedAt?: string | null;
    authorizer?: { id: string; username: string; fullName: string };
  } | null;
  equipmentRequest?: {
    id: string;
    status: string;
    description: string;
    rejectionReason?: string | null;
    resolvedAt?: string | null;
    items: {
      id: string;
      notes?: string | null;
      equipmentType: { id: string; code: string; name: string };
    }[];
    authorizer?: { id: string; username: string; fullName: string } | null;
  } | null;
  scheduleChangeRequests: {
    id: string;
    proposedDate: string;
    proposedStartTime: string;
    proposedEndTime: string;
    proposedCleaningEndTime: string;
    reason: string;
    status: string;
    rejectionReason?: string | null;
    requestedAt: string;
    resolvedAt?: string | null;
    requestedBy: { fullName: string; username: string };
    authorizer: { fullName: string; username: string };
  }[];
  evidences: {
    id: string;
    fileName: string;
    fileSize: number;
    category: 'SUPPORTING_DOCUMENT' | 'CLOSURE_EVIDENCE';
    isArchived: boolean;
    replacementReason?: string | null;
    uploadedAt: string;
    uploadedBy: { fullName: string; username: string };
  }[];
  attendanceConfig?: {
    id: string;
    accessMode: 'OPEN' | 'RESTRICTED';
    registrationEnabled: boolean;
    publicRegistrationToken: string;
    registrationStartAt?: string | null;
    registrationEndAt?: string | null;
    checkInOpen: boolean;
    checkInClosedAt?: string | null;
    institutionalEmailDomain?: string | null;
  } | null;
  attendees: AttendeeRecord[];
  accessOperators: {
    id: string;
    userId: string;
    active: boolean;
    assignedAt: string;
    user: {
      id: string;
      username: string;
      fullName: string;
      role: string;
      departmentLabel?: string | null;
    };
  }[];
  scanLogs: {
    id: string;
    attemptedAt: string;
    result: string;
    method: string;
    details?: string | null;
    operator?: { fullName: string; username: string } | null;
    attendee?: { fullName: string; email: string } | null;
  }[];
  auditLogs: {
    id: string;
    action: string;
    summary: string;
    reason?: string | null;
    createdAt: string;
    user: { fullName: string; username: string; role: string };
  }[];
  attendanceMetrics?: {
    activeRegisteredCount: number;
    revokedCount: number;
    qrGeneratedCount: number;
    invitationsSentCount: number;
    invitationsFailedCount: number;
    invitationsPendingCount: number;
    checkedInCount: number;
    totalCheckedInHistorical: number;
    withoutCheckInCount: number;
    checkInStillOpen: boolean;
    checkInClosedAt?: string | null;
    attendancePercentage: number;
    spaceCapacity: number;
    occupancyPercentage: number;
    rejectedScansCount: number;
  };
}

interface CatalogsPayload {
  users: { id: string; username: string; fullName: string; role: string }[];
  careers: { id: string; code: string; name: string }[];
  academicGrades: { id: string; code: string; name: string; levelOrder: number }[];
  departmentAreas: { id: string; code: string; name: string; areaType: string }[];
}

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const eventId = params?.id || '';
  const { user } = useAuth();

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [catalogs, setCatalogs] = useState<CatalogsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Main View Tab: 'GENERAL' | 'ATTENDANCE' | 'CLOSURE' | 'AUDIT'
  const [activeTab, setActiveTab] = useState<'GENERAL' | 'ATTENDANCE' | 'CLOSURE' | 'AUDIT'>(
    'GENERAL'
  );

  // Schedule Change State
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [proposedDate, setProposedDate] = useState('');
  const [proposedStartTime, setProposedStartTime] = useState('10:00');
  const [proposedEndTime, setProposedEndTime] = useState('12:00');
  const [scheduleReason, setScheduleReason] = useState('');
  const [scheduleError, setScheduleError] = useState('');
  const [scheduleSuccess, setScheduleSuccess] = useState('');
  const [submittingSchedule, setSubmittingSchedule] = useState(false);

  // PDF Upload State (Supporting & Closure)
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [pdfFeedback, setPdfFeedback] = useState('');
  const [pdfError, setPdfError] = useState('');
  const [replacementEvidenceId, setReplacementEvidenceId] = useState('');
  const [replacementReason, setReplacementReason] = useState('');

  // Attendance & Guest Management State
  const [attendeeSearch, setAttendeeSearch] = useState('');
  const [attendeeTypeFilter, setAttendeeTypeFilter] = useState('ALL');
  const [attendeeStatusFilter, setAttendeeStatusFilter] = useState('ALL');
  const [copiedLink, setCopiedLink] = useState(false);

  // Add / Edit Guest Modal State
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [editingAttendee, setEditingAttendee] = useState<AttendeeRecord | null>(null);
  const [guestFullName, setGuestFullName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestType, setGuestType] = useState<
    'STUDENT' | 'TEACHER' | 'ADMIN_STAFF' | 'EXTERNAL_GUEST'
  >('STUDENT');
  const [guestEnrollment, setGuestEnrollment] = useState('');
  const [guestCareerId, setGuestCareerId] = useState('');
  const [guestGradeId, setGuestGradeId] = useState('');
  const [guestDeptId, setGuestDeptId] = useState('');
  const [guestOrg, setGuestOrg] = useState('');
  const [guestSubmitting, setGuestSubmitting] = useState(false);
  const [guestFeedback, setGuestFeedback] = useState('');
  const [guestError, setGuestError] = useState('');

  // Operator assignment state
  const [selectedOperatorUserId, setSelectedOperatorUserId] = useState('');

  async function loadEventAndCatalogs() {
    setLoading(true);
    setError('');
    try {
      const [evRes, catRes] = await Promise.all([
        fetch(`/api/events/${eventId}`),
        fetch('/api/catalogs'),
      ]);
      const evData = await evRes.json();
      const catData = await catRes.json();

      if (!evRes.ok) {
        setError(evData.error || 'No se pudo cargar el evento.');
      } else {
        setEvent(evData.event);
        setProposedDate(evData.event.date);
        setProposedStartTime(evData.event.startTime);
        setProposedEndTime(evData.event.endTime);
      }

      if (catRes.ok) {
        setCatalogs(catData);
        if (catData.careers?.length > 0 && !guestCareerId) {
          setGuestCareerId(catData.careers[0].id);
        }
        if (catData.academicGrades?.length > 0 && !guestGradeId) {
          setGuestGradeId(catData.academicGrades[0].id);
        }
        if (catData.departmentAreas?.length > 0 && !guestDeptId) {
          setGuestDeptId(catData.departmentAreas[0].id);
        }
        if (catData.users?.length > 0 && !selectedOperatorUserId) {
          setSelectedOperatorUserId(catData.users[0].id);
        }
      }
    } catch {
      setError('Error de conexión al consultar el evento.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (eventId) loadEventAndCatalogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function handleRequestScheduleChange(e: React.FormEvent) {
    e.preventDefault();
    setScheduleError('');
    setScheduleSuccess('');
    setSubmittingSchedule(true);

    try {
      const res = await fetch(`/api/events/${eventId}/schedule-change`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposedDate,
          proposedStartTime,
          proposedEndTime,
          reason: scheduleReason,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setScheduleError(data.error || 'No fue posible registrar la solicitud de modificación.');
      } else {
        setScheduleSuccess(
          'Solicitud de cambio de horario enviada. El horario actual se mantiene activo hasta que el autorizador resuelva.'
        );
        setShowScheduleForm(false);
        setScheduleReason('');
        await loadEventAndCatalogs();
      }
    } finally {
      setSubmittingSchedule(false);
    }
  }

  async function handlePdfUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    category: 'SUPPORTING_DOCUMENT' | 'CLOSURE_EVIDENCE'
  ) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setPdfError('');
    setPdfFeedback('');
    setUploadingPdf(true);

    try {
      const formData = new FormData();
      formData.append('category', category);
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }
      if (replacementEvidenceId) {
        formData.append('replaceEvidenceId', replacementEvidenceId);
        formData.append('replacementReason', replacementReason);
      }

      const res = await fetch(`/api/events/${eventId}/evidences`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setPdfError(data.error || 'Error al subir archivo(s) PDF.');
      } else {
        setPdfFeedback(
          category === 'CLOSURE_EVIDENCE'
            ? 'Evidencia de realización subida exitosamente. El evento ha quedado formalmente CERRADO (CLOSED).'
            : `Documento(s) PDF de soporte adjuntados correctamente.`
        );
        setReplacementEvidenceId('');
        setReplacementReason('');
        await loadEventAndCatalogs();
      }
    } finally {
      setUploadingPdf(false);
      e.target.value = '';
    }
  }

  async function handleUpdateAttendanceConfig(patch: Record<string, unknown>) {
    setGuestError('');
    setGuestFeedback('');
    const res = await fetch(`/api/events/${eventId}/attendance-config`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (!res.ok) {
      setGuestError(data.error || 'Error al actualizar configuración de asistencia.');
    } else {
      setGuestFeedback('Configuración de control de asistencia actualizada.');
      await loadEventAndCatalogs();
    }
  }

  function openNewGuestModal() {
    setEditingAttendee(null);
    setGuestFullName('');
    setGuestEmail('');
    setGuestType('STUDENT');
    setGuestEnrollment('');
    setGuestOrg('');
    if (catalogs?.careers?.[0]) setGuestCareerId(catalogs.careers[0].id);
    if (catalogs?.academicGrades?.[0]) setGuestGradeId(catalogs.academicGrades[0].id);
    const firstAcad = catalogs?.departmentAreas?.find((d) => d.areaType === 'ACADEMIC');
    if (firstAcad) setGuestDeptId(firstAcad.id);
    setShowGuestModal(true);
  }

  function openEditGuestModal(att: AttendeeRecord) {
    setEditingAttendee(att);
    setGuestFullName(att.fullName);
    setGuestEmail(att.email);
    setGuestType(att.attendeeType);
    setGuestEnrollment(att.enrollmentNumber || '');
    setGuestCareerId(att.careerId || catalogs?.careers?.[0]?.id || '');
    setGuestGradeId(att.academicGradeId || catalogs?.academicGrades?.[0]?.id || '');
    setGuestDeptId(att.departmentAreaId || catalogs?.departmentAreas?.[0]?.id || '');
    setGuestOrg(att.organization || '');
    setShowGuestModal(true);
  }

  async function handleSaveGuest(e: React.FormEvent) {
    e.preventDefault();
    setGuestError('');
    setGuestFeedback('');
    setGuestSubmitting(true);

    try {
      const payload = {
        action: editingAttendee ? 'EDIT' : undefined,
        attendeeId: editingAttendee?.id,
        fullName: guestFullName,
        email: guestEmail,
        attendeeType: guestType,
        enrollmentNumber: guestType === 'STUDENT' ? guestEnrollment : null,
        careerId: guestType === 'STUDENT' ? guestCareerId : null,
        academicGradeId: guestType === 'STUDENT' ? guestGradeId : null,
        departmentAreaId:
          guestType === 'TEACHER' || guestType === 'ADMIN_STAFF' ? guestDeptId : null,
        organization: guestType === 'EXTERNAL_GUEST' ? guestOrg : null,
      };

      const res = await fetch(`/api/events/${eventId}/attendees`, {
        method: editingAttendee ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setGuestError(data.error || 'No fue posible guardar el invitado.');
      } else {
        setGuestFeedback(
          data.message ||
            (editingAttendee
              ? 'Datos del invitado actualizados correctamente.'
              : 'Invitado agregado y credencial QR individual generada.')
        );
        setShowGuestModal(false);
        await loadEventAndCatalogs();
      }
    } finally {
      setGuestSubmitting(false);
    }
  }

  async function handleAttendeeAction(
    attendeeId: string,
    action: 'RESEND_INVITATION' | 'REVOKE'
  ) {
    setGuestError('');
    setGuestFeedback('');
    const reason =
      action === 'REVOKE'
        ? window.prompt(
            'Indique el motivo de revocación de esta invitación (el QR quedará invalidado de inmediato):',
            'Cancelación o sustitución de invitado'
          )
        : undefined;

    if (action === 'REVOKE' && reason === null) return;

    const res = await fetch(`/api/events/${eventId}/attendees`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attendeeId,
        action,
        reason,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setGuestError(data.error || 'Error al procesar acción.');
    } else {
      setGuestFeedback(data.message || 'Acción completada.');
      await loadEventAndCatalogs();
    }
  }

  async function handleAssignOperator(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedOperatorUserId) return;
    setGuestError('');
    setGuestFeedback('');
    const res = await fetch(`/api/events/${eventId}/operators`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: selectedOperatorUserId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setGuestError(data.error || 'Error al asignar operador.');
    } else {
      setGuestFeedback('Operador de acceso asignado al evento.');
      await loadEventAndCatalogs();
    }
  }

  async function handleToggleOperator(operatorId: string, currentActive: boolean) {
    await fetch(`/api/events/${eventId}/operators`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operatorId, active: !currentActive }),
    });
    await loadEventAndCatalogs();
  }

  if (loading) {
    return <div className="p-8 text-center text-sm text-ink-3">Cargando expediente...</div>;
  }

  if (error || !event) {
    return (
      <div className="bg-bad-soft border border-bad/30 rounded-xl p-6 text-bad space-y-3">
        <div className="flex items-center gap-2 font-semibold text-sm">
          <AlertCircle className="w-5 h-5" />
          <span>Acceso Denegado o Evento No Encontrado</span>
        </div>
        <p className="text-xs">{error}</p>
        <Link
          href="/eventos"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-bad underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Volver a Eventos
        </Link>
      </div>
    );
  }

  const canManageAttendance =
    user?.id === event.createdById || user?.role === 'SUPER_ADMIN';
  const canOperateScanner =
    canManageAttendance ||
    event.accessOperators.some((op) => op.userId === user?.id && op.active);

  const hasPendingScheduleChange = event.scheduleChangeRequests.some(
    (s) => s.status === 'PENDING'
  );

  const publicRegPath = event.attendanceConfig?.publicRegistrationToken
    ? `/registro/${event.attendanceConfig.publicRegistrationToken}`
    : '';

  const filteredAttendees = event.attendees.filter((att) => {
    if (attendeeTypeFilter !== 'ALL' && att.attendeeType !== attendeeTypeFilter) return false;
    if (attendeeStatusFilter === 'CHECKED_IN' && !att.attendance) return false;
    if (
      attendeeStatusFilter === 'WITHOUT_CHECKIN' &&
      (Boolean(att.attendance) || att.registrationStatus === 'REVOKED')
    )
      return false;
    if (attendeeStatusFilter === 'REVOKED' && att.registrationStatus !== 'REVOKED') return false;
    if (attendeeStatusFilter === 'ACTIVE' && att.registrationStatus === 'REVOKED') return false;

    if (attendeeSearch.trim()) {
      const q = attendeeSearch.toLowerCase();
      const mName = att.fullName.toLowerCase().includes(q);
      const mMail = att.email.toLowerCase().includes(q);
      const mEnroll = (att.enrollmentNumber || '').toLowerCase().includes(q);
      if (!mName && !mMail && !mEnroll) return false;
    }
    return true;
  });

  const closureEvidences = event.evidences.filter(
    (ev) => ev.category === 'CLOSURE_EVIDENCE' && !ev.isArchived
  );
  const archivedEvidences = event.evidences.filter((ev) => ev.isArchived);
  const supportEvidences = event.evidences.filter(
    (ev) => ev.category === 'SUPPORTING_DOCUMENT' && !ev.isArchived
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/eventos"
              className="inline-flex items-center gap-1 text-xs font-medium text-ink-3 hover:text-ink"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Eventos
            </Link>
            <span className="text-surface/80">/</span>
            <EventLifecycleBadge status={event.lifecycleStatus} />
            <CriticalityBadge level={event.criticalityLevel} />
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                event.attendanceConfig?.accessMode === 'OPEN'
                  ? 'bg-accent-soft text-accent border-accent/30'
                  : 'bg-warn-soft text-warn border-warn/30'
              }`}
            >
              {event.attendanceConfig?.accessMode === 'OPEN' ? (
                <>
                  <Globe className="w-3 h-3" /> Evento Abierto
                </>
              ) : (
                <>
                  <Lock className="w-3 h-3" /> Evento Restringido
                </>
              )}
            </span>
          </div>
          <h1 className="text-2xl sm:text-[28px] font-semibold text-ink">{event.name}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canOperateScanner && (
            <Link
              href={`/escaner?eventId=${event.id}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-ink hover:bg-ink-2 text-surface text-xs font-semibold transition-colors"
            >
              <QrCode className="w-4 h-4" />
              Abrir Escáner QR de Acceso
            </Link>
          )}
          {canManageAttendance &&
            event.canModifySchedule &&
            !hasPendingScheduleChange && (
              <button
                onClick={() => setShowScheduleForm(!showScheduleForm)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-ink hover:bg-ink-2 text-surface text-xs font-medium transition-colors"
              >
                <CalendarClock className="w-4 h-4" />
                Solicitar Cambio de Horario
              </button>
            )}
        </div>
      </div>

      {/* Mandatory Closure Alert Banner if event is COMPLETED_PENDING_EVIDENCE */}
      {event.lifecycleStatus === 'COMPLETED_PENDING_EVIDENCE' && (
        <div className="p-4 rounded-xl bg-warn-soft border-2 border-warn/30 text-warn flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-6 h-6 text-warn shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold">
                Evento Concluido — Pendiente de Evidencia Documental de Cierre
              </h3>
              <p className="text-xs text-warn mt-0.5">
                La hora de finalización del evento ya concluyó. Para cerrar formalmente este evento
                (`CLOSED`), es obligatorio adjuntar al menos un archivo PDF de evidencia de
                realización.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('CLOSURE')}
            className="px-4 py-2 rounded-full bg-warn hover:bg-warn/90 text-surface text-xs font-semibold shrink-0"
          >
            Subir PDF de Cierre Ahora
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-line pb-3">
        <button
          onClick={() => setActiveTab('GENERAL')}
          className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition-colors ${
            activeTab === 'GENERAL'
              ? 'bg-ink text-surface'
              : 'bg-surface border border-line text-ink-2 hover:bg-paper'
          }`}
        >
          <FileText className="w-4 h-4" />
          1. Expediente y Solicitudes
        </button>
        <button
          onClick={() => setActiveTab('ATTENDANCE')}
          className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition-colors ${
            activeTab === 'ATTENDANCE'
              ? 'bg-ink text-surface'
              : 'bg-surface border border-line text-ink-2 hover:bg-paper'
          }`}
        >
          <Users className="w-4 h-4" />
          2. Invitados y Control de Acceso QR ({event.attendanceMetrics?.activeRegisteredCount ?? 0}
          )
        </button>
        <button
          onClick={() => setActiveTab('CLOSURE')}
          className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition-colors ${
            activeTab === 'CLOSURE'
              ? 'bg-ink text-surface'
              : 'bg-surface border border-line text-ink-2 hover:bg-paper'
          }`}
        >
          <FileCheck2 className="w-4 h-4" />
          3. Cierre Documental y Evidencias PDF ({event.evidences.length})
        </button>
        <button
          onClick={() => setActiveTab('AUDIT')}
          className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition-colors ${
            activeTab === 'AUDIT'
              ? 'bg-ink text-surface'
              : 'bg-surface border border-line text-ink-2 hover:bg-paper'
          }`}
        >
          <History className="w-4 h-4" />
          4. Bitácora y Trazabilidad ({event.auditLogs.length})
        </button>
      </div>

      {/* Schedule Change Form */}
      {showScheduleForm && (
        <form
          onSubmit={handleRequestScheduleChange}
          className="bg-surface rounded-xl border border-warn/30 p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-warn" />
              Solicitar Modificación de Horario (Requiere Autorización)
            </h2>
            <button
              type="button"
              onClick={() => setShowScheduleForm(false)}
              className="text-xs text-ink-3 hover:text-ink"
            >
              Cancelar
            </button>
          </div>
          <p className="text-xs text-ink-2">
            El horario original (<strong>{event.date}</strong> de{' '}
            <strong>
              {event.startTime} a {event.endTime}
            </strong>
            ) permanecerá reservado mientras el autorizador evalúa el cambio.
          </p>

          {scheduleError && (
            <div className="p-3 rounded-md bg-bad-soft border border-bad/30 text-bad text-xs">
              {scheduleError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1">
                Nueva Fecha Propuesta *
              </label>
              <input
                type="date"
                required
                value={proposedDate}
                onChange={(e) => setProposedDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-md border border-line-strong"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1">
                Nueva Hora Inicio *
              </label>
              <input
                type="time"
                required
                value={proposedStartTime}
                onChange={(e) => setProposedStartTime(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-md border border-line-strong"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1">
                Nueva Hora Fin *
              </label>
              <input
                type="time"
                required
                value={proposedEndTime}
                onChange={(e) => setProposedEndTime(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-md border border-line-strong"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-2 mb-1">
              Motivo de la modificación *
            </label>
            <textarea
              required
              rows={2}
              value={scheduleReason}
              onChange={(e) => setScheduleReason(e.target.value)}
              placeholder="Explique la razón institucional del cambio de horario..."
              className="w-full px-3 py-2 text-xs rounded-md border border-line-strong"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submittingSchedule}
              className="px-4 py-2 rounded-full bg-warn hover:bg-warn/90 text-surface text-xs font-medium"
            >
              {submittingSchedule ? 'Validando disponibilidad...' : 'Enviar Solicitud de Cambio'}
            </button>
          </div>
        </form>
      )}

      {scheduleSuccess && (
        <div className="p-3.5 rounded-xl bg-accent-soft border border-accent/30 text-accent text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
          <span>{scheduleSuccess}</span>
        </div>
      )}

      {/* =====================================================================
          TAB 1: EXPEDIENTE GENERAL Y SOLICITUDES
         ===================================================================== */}
      {activeTab === 'GENERAL' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-surface rounded-xl border border-line p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-line">
                <h2 className="text-sm font-semibold text-ink">
                  Información General del Evento
                </h2>
                {event.hasStarted && (
                  <span className="text-[11px] font-medium text-ink-3 bg-sunk px-2.5 py-0.5 rounded-full">
                    Modificación de horario bloqueada (el evento ya inició o concluyó)
                  </span>
                )}
              </div>
              <p className="text-xs text-ink-2 leading-relaxed">{event.description}</p>

              <div className="p-3.5 rounded-md bg-paper border border-line">
                <p className="text-[11px] font-semibold uppercase font-mono tracking-[0.08em] text-ink-3">
                  Justificación Académica / Institucional
                </p>
                <p className="text-xs text-ink-2 mt-1">{event.justification}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-semibold text-ink">{event.space.name}</p>
                    <p className="text-ink-3">
                      {event.space.location} · Capacidad: {event.space.capacity} personas
                    </p>
                    <p className="text-[11px] text-accent font-medium mt-0.5">
                      Autoriza: {event.space.authorizer.fullName}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-semibold text-ink">Fecha: {event.date}</p>
                    <p className="text-ink-2 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3.5 h-3.5 text-ink-3" />
                      Evento: <strong>{event.startTime}</strong> a <strong>{event.endTime}</strong>
                    </p>
                    <p className="text-[11px] text-warn flex items-center gap-1 mt-0.5">
                      <Timer className="w-3 h-3" />
                      Limpieza obligatoria: {event.endTime} a {event.cleaningEndTime}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <User className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="text-[11px] uppercase font-mono tracking-[0.08em] font-semibold text-ink-3">
                      Responsable Representado
                    </p>
                    <p className="font-semibold text-ink">{event.responsibleName}</p>
                    <p className="text-ink-3">{event.responsibleDepartment}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Shield className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="text-[11px] uppercase font-mono tracking-[0.08em] font-semibold text-ink-3">
                      Registrado en el Sistema por
                    </p>
                    <p className="font-semibold text-ink">{event.createdBy.fullName}</p>
                    <p className="text-ink-3">
                      @{event.createdBy.username} · {event.createdBy.departmentLabel}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-line">
                <p className="text-[11px] font-semibold uppercase font-mono tracking-[0.08em] text-ink-3 mb-2">
                  Público Participante Seleccionado (Cálculo Automático de Criticidad)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {event.audiences.map((a) => (
                    <span
                      key={a.id}
                      className="px-2.5 py-1 rounded-full text-xs font-medium bg-sunk text-ink border border-line"
                    >
                      Nivel {a.audienceType.level}: {a.audienceType.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Schedule Change Requests */}
            {event.scheduleChangeRequests.length > 0 && (
              <div className="bg-surface rounded-xl border border-line p-5 space-y-3">
                <h2 className="text-sm font-semibold text-ink">
                  Solicitudes de Modificación de Horario
                </h2>
                <div className="space-y-2.5">
                  {event.scheduleChangeRequests.map((sc) => (
                    <div
                      key={sc.id}
                      className="p-3.5 rounded-md border border-line bg-paper/70 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-ink">
                          Propuesta: {sc.proposedDate} · {sc.proposedStartTime} a{' '}
                          {sc.proposedEndTime} (Limpieza hasta {sc.proposedCleaningEndTime})
                        </span>
                        <RequestStatusBadge status={sc.status} />
                      </div>
                      <p className="text-ink-2">
                        <strong>Motivo:</strong> {sc.reason}
                      </p>
                      {sc.rejectionReason && (
                        <p className="text-bad font-medium">
                          <strong>Motivo de rechazo / vencimiento:</strong> {sc.rejectionReason}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Independent Request Statuses */}
          <div className="space-y-5">
            <div className="bg-surface rounded-xl border border-line p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase font-mono tracking-[0.08em] text-ink-3">
                  1. Solicitud del Espacio
                </h3>
                <RequestStatusBadge status={event.spaceRequest?.status || 'PENDING'} />
              </div>
              <p className="text-xs text-ink-2 font-medium">{event.space.name}</p>
              <p className="text-[11px] text-ink-3">
                Autorizador asignado: <strong>{event.space.authorizer.fullName}</strong>
              </p>
              {event.spaceRequest?.rejectionReason && (
                <div className="p-2.5 rounded-md bg-bad-soft border border-bad/30 text-bad text-xs">
                  <strong>Motivo:</strong> {event.spaceRequest.rejectionReason}
                </div>
              )}
            </div>

            <div className="bg-surface rounded-xl border border-line p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase font-mono tracking-[0.08em] text-ink-3">
                  2. Solicitud de Equipo
                </h3>
                {event.equipmentRequest ? (
                  <RequestStatusBadge status={event.equipmentRequest.status} />
                ) : (
                  <span className="text-xs text-ink-3">No solicitada</span>
                )}
              </div>

              {event.equipmentRequest ? (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    {event.equipmentRequest.items.map((it) => (
                      <span
                        key={it.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sunk text-ink text-xs font-medium"
                      >
                        {it.equipmentType.code === 'SOUND' ? (
                          <Volume2 className="w-3.5 h-3.5 text-accent" />
                        ) : (
                          <Armchair className="w-3.5 h-3.5 text-accent" />
                        )}
                        {it.equipmentType.name}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-ink-2 bg-paper p-2.5 rounded-md border border-line">
                    {event.equipmentRequest.description}
                  </p>
                  {event.equipmentRequest.rejectionReason && (
                    <div className="p-2.5 rounded-md bg-bad-soft border border-bad/30 text-bad text-xs">
                      <strong>Motivo de rechazo:</strong> {event.equipmentRequest.rejectionReason}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs text-ink-3">
                  Este evento no requirió equipo de sonido ni mobiliario adicional.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: INVITADOS, REGISTRO PÚBLICO Y CONTROL DE ACCESO QR (Secciones 8-21)
         ===================================================================== */}
      {activeTab === 'ATTENDANCE' && (
        <div className="space-y-6">
          {guestError && (
            <div className="p-3.5 rounded-xl bg-bad-soft border border-bad/30 text-bad text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{guestError}</span>
            </div>
          )}
          {guestFeedback && (
            <div className="p-3.5 rounded-xl bg-accent-soft border border-accent/30 text-accent text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{guestFeedback}</span>
            </div>
          )}

          {/* Per-Event Attendance Metrics Cards (Section 21) */}
          {event.attendanceMetrics && (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              <div className="bg-surface rounded-xl border border-line p-3.5">
                <p className="text-[11px] font-semibold uppercase font-mono tracking-[0.08em] text-ink-3">
                  Registrados Activos
                </p>
                <p className="text-xl font-semibold text-ink mt-1">
                  {event.attendanceMetrics.activeRegisteredCount}
                </p>
                <p className="text-[11px] text-ink-3">
                  Revocados: {event.attendanceMetrics.revokedCount}
                </p>
              </div>
              <div className="bg-surface rounded-xl border border-line p-3.5">
                <p className="text-[11px] font-semibold uppercase font-mono tracking-[0.08em] text-ink-3">QR Vigentes</p>
                <p className="text-xl font-semibold text-accent mt-1">
                  {event.attendanceMetrics.qrGeneratedCount}
                </p>
                <p className="text-[11px] text-ink-3">Credenciales únicas</p>
              </div>
              <div className="bg-surface rounded-xl border border-line p-3.5">
                <p className="text-[11px] font-semibold uppercase font-mono tracking-[0.08em] text-ink-3">
                  Invitaciones Correo
                </p>
                <p className="text-xl font-semibold text-ink mt-1">
                  {event.attendanceMetrics.invitationsSentCount}
                </p>
                <p className="text-[11px] text-ink-3">
                  Fallidas: {event.attendanceMetrics.invitationsFailedCount} · Pend:{' '}
                  {event.attendanceMetrics.invitationsPendingCount}
                </p>
              </div>
              <div className="bg-surface rounded-xl border border-line p-3.5">
                <p className="text-[11px] font-semibold uppercase font-mono tracking-[0.08em] text-ink-3">
                  Entradas Registradas
                </p>
                <p className="text-xl font-semibold text-accent mt-1">
                  {event.attendanceMetrics.checkedInCount}
                </p>
                <p className="text-[11px] text-ink-3">
                  Sin entrada: {event.attendanceMetrics.withoutCheckInCount}
                </p>
              </div>
              <div className="bg-surface rounded-xl border border-line p-3.5">
                <p className="text-[11px] font-semibold uppercase font-mono tracking-[0.08em] text-ink-3">% de Asistencia</p>
                <p className="text-xl font-semibold text-ink mt-1">
                  {event.attendanceMetrics.attendancePercentage}%
                </p>
                <p className="text-[11px] text-ink-3">Sobre activos</p>
              </div>
              <div className="bg-surface rounded-xl border border-line p-3.5">
                <p className="text-[11px] font-semibold uppercase font-mono tracking-[0.08em] text-ink-3">
                  % Ocupación Recinto
                </p>
                <p className="text-xl font-semibold text-ink mt-1">
                  {event.attendanceMetrics.occupancyPercentage}%
                </p>
                <p className="text-[11px] text-ink-3">
                  Capacidad: {event.attendanceMetrics.spaceCapacity}
                </p>
              </div>
            </div>
          )}

          {/* Attendance Configuration & Access Control Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 bg-surface rounded-xl border border-line p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-ink">
                    Configuración de Modalidad y Control de Acceso (Independiente del Cierre
                    Documental)
                  </h3>
                  <p className="text-xs text-ink-3">
                    Gestione si el evento es Abierto o Restringido y controle la apertura/cierre de
                    lectura QR en puerta.
                  </p>
                </div>
              </div>

              {canManageAttendance && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="p-3.5 rounded-xl bg-paper border border-line space-y-2">
                    <p className="text-[11px] font-semibold uppercase font-mono tracking-[0.08em] text-ink-3">
                      1. Modalidad del Evento
                    </p>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleUpdateAttendanceConfig({ accessMode: 'OPEN' })}
                        className={`flex-1 py-1.5 px-2.5 rounded-full text-xs font-semibold border ${
                          event.attendanceConfig?.accessMode === 'OPEN'
                            ? 'bg-ink text-surface border-accent'
                            : 'bg-surface text-ink-2 border-line'
                        }`}
                      >
                        Abierto
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateAttendanceConfig({ accessMode: 'RESTRICTED' })}
                        className={`flex-1 py-1.5 px-2.5 rounded-full text-xs font-semibold border ${
                          event.attendanceConfig?.accessMode === 'RESTRICTED'
                            ? 'bg-warn text-surface border-warn'
                            : 'bg-surface text-ink-2 border-line'
                        }`}
                      >
                        Restringido
                      </button>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-paper border border-line space-y-2">
                    <p className="text-[11px] font-semibold uppercase font-mono tracking-[0.08em] text-ink-3">
                      2. Registro Público
                    </p>
                    {event.attendanceConfig?.accessMode === 'RESTRICTED' ? (
                      <p className="text-[11px] text-warn font-medium">
                        Bloqueado automáticamente en eventos restringidos.
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateAttendanceConfig({
                            registrationEnabled: !event.attendanceConfig?.registrationEnabled,
                          })
                        }
                        className={`w-full py-1.5 px-3 rounded-full text-xs font-semibold ${
                          event.attendanceConfig?.registrationEnabled
                            ? 'bg-accent-soft text-accent border border-accent/30'
                            : 'bg-sunk text-ink-2'
                        }`}
                      >
                        {event.attendanceConfig?.registrationEnabled
                          ? '● Inscripción Pública Activa'
                          : '○ Inscripción Pública Cerrada'}
                      </button>
                    )}
                  </div>

                  <div className="p-3.5 rounded-xl bg-paper border border-line space-y-2">
                    <p className="text-[11px] font-semibold uppercase font-mono tracking-[0.08em] text-ink-3">
                      3. Lectura QR en Puerta
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateAttendanceConfig({
                          checkInOpen: !event.attendanceConfig?.checkInOpen,
                        })
                      }
                      className={`w-full py-1.5 px-3 rounded-full text-xs font-semibold ${
                        event.attendanceConfig?.checkInOpen
                          ? 'bg-ink text-surface'
                          : 'bg-bad-soft text-bad border border-bad/30'
                      }`}
                    >
                      {event.attendanceConfig?.checkInOpen
                        ? '● Acceso Abierto (Cerrar Acceso)'
                        : '○ Acceso Cerrado (Abrir Acceso)'}
                    </button>
                  </div>
                </div>
              )}

              {/* Public Registration Link Box (Only when OPEN) */}
              {event.attendanceConfig?.accessMode === 'OPEN' && publicRegPath && (
                <div className="p-3.5 rounded-xl bg-accent-soft/80 border border-accent/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs">
                    <p className="font-semibold text-accent flex items-center gap-1.5">
                      <Globe className="w-4 h-4 text-accent" />
                      Enlace de Registro Público para Comunidad Universitaria / Externa:
                    </p>
                    <Link
                      href={publicRegPath}
                      target="_blank"
                      className="font-mono text-[11px] text-accent underline break-all"
                    >
                      {typeof window !== 'undefined'
                        ? `${window.location.origin}${publicRegPath}`
                        : publicRegPath}
                    </Link>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const url =
                        typeof window !== 'undefined'
                          ? `${window.location.origin}${publicRegPath}`
                          : publicRegPath;
                      navigator.clipboard.writeText(url);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface border border-accent/30 text-accent text-xs font-semibold shrink-0"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-accent" /> Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copiar Enlace
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Access Operators Assignment (Section 15) */}
            <div className="bg-surface rounded-xl border border-line p-5 space-y-3">
              <h3 className="text-xs font-semibold uppercase font-mono tracking-[0.08em] text-ink-3 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-accent" />
                Operadores de Escáner QR Asignados
              </h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {event.accessOperators.length === 0 ? (
                  <p className="text-xs text-ink-3">
                    Solo el organizador y SUPER_ADMIN pueden escanear actualmente.
                  </p>
                ) : (
                  event.accessOperators.map((op) => (
                    <div
                      key={op.id}
                      className="flex items-center justify-between p-2 rounded-md bg-paper border border-line text-xs"
                    >
                      <div>
                        <p className="font-semibold text-ink">{op.user.fullName}</p>
                        <p className="text-[11px] text-ink-3">@{op.user.username}</p>
                      </div>
                      {canManageAttendance && (
                        <button
                          type="button"
                          onClick={() => handleToggleOperator(op.id, op.active)}
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            op.active
                              ? 'bg-accent-soft text-accent'
                              : 'bg-sunk text-ink-2'
                          }`}
                        >
                          {op.active ? 'Activo' : 'Inactivo'}
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>

              {canManageAttendance && catalogs?.users && (
                <form onSubmit={handleAssignOperator} className="pt-2 border-t border-line flex gap-2">
                  <select
                    value={selectedOperatorUserId}
                    onChange={(e) => setSelectedOperatorUserId(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 text-xs rounded-md border border-line-strong bg-surface"
                  >
                    {catalogs.users.map((u) => (
                      <option key={u.id} value={u.id}>
                        @{u.username} — {u.fullName}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-full bg-ink text-surface text-xs font-semibold"
                  >
                    Asignar
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Permanent Guest List Management (Section 11) */}
          <div className="bg-surface rounded-xl border border-line overflow-hidden">
            <div className="p-5 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-ink">
                  Padrón de Invitados y Asistentes con Credencial QR Individual
                </h3>
                <p className="text-xs text-ink-3">
                  Agregue invitados manualmente en cualquier momento, descargue pases QR en PNG/PDF,
                  reenvíe invitaciones por correo o revoque accesos.
                </p>
              </div>
              {canManageAttendance && (
                <button
                  type="button"
                  onClick={openNewGuestModal}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-ink hover:bg-ink-2 text-surface text-xs font-semibold shrink-0"
                >
                  <UserPlus className="w-4 h-4" />
                  Agregar Invitado / Asistente
                </button>
              )}
            </div>

            {/* Filters */}
            <div className="p-4 bg-paper border-b border-line grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-ink-3 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={attendeeSearch}
                  onChange={(e) => setAttendeeSearch(e.target.value)}
                  placeholder="Buscar por nombre, correo o matrícula..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md border border-line-strong bg-surface"
                />
              </div>
              <select
                value={attendeeTypeFilter}
                onChange={(e) => setAttendeeTypeFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-md border border-line-strong bg-surface"
              >
                <option value="ALL">Todas las categorías</option>
                <option value="STUDENT">Alumnos</option>
                <option value="TEACHER">Docentes</option>
                <option value="ADMIN_STAFF">Personal Administrativo</option>
                <option value="EXTERNAL_GUEST">Invitados Externos</option>
              </select>
              <select
                value={attendeeStatusFilter}
                onChange={(e) => setAttendeeStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-md border border-line-strong bg-surface"
              >
                <option value="ALL">Todos los estados</option>
                <option value="ACTIVE">Activos (Registrados / Invitados)</option>
                <option value="CHECKED_IN">Con entrada registrada</option>
                <option value="WITHOUT_CHECKIN">Pendientes de ingresar</option>
                <option value="REVOKED">Revocados</option>
              </select>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-sunk/80 border-b border-line text-[11px] font-semibold uppercase font-mono tracking-[0.08em] text-ink-3">
                    <th className="py-3 px-4">Asistente / Invitado</th>
                    <th className="py-3 px-4">Categoría y Adscripción</th>
                    <th className="py-3 px-4">Invitación Correo</th>
                    <th className="py-3 px-4">Asistencia (Check-in)</th>
                    <th className="py-3 px-4 text-right">Pase QR y Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredAttendees.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-ink-3">
                        No hay asistentes que coincidan con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    filteredAttendees.map((att) => {
                      const latestInv = att.invitationDeliveries[0];
                      const isRevoked = att.registrationStatus === 'REVOKED';
                      return (
                        <tr key={att.id} className="hover:bg-paper/80">
                          <td className="py-3 px-4">
                            <p className="font-semibold text-ink">{att.fullName}</p>
                            <p className="text-[11px] text-ink-3">{att.email}</p>
                            {isRevoked && (
                              <span className="inline-block mt-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-bad-soft text-bad">
                                REVOCADO: {att.revocationReason || 'Acceso cancelado'}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-medium text-ink">
                              {att.attendeeType === 'STUDENT'
                                ? 'Alumno'
                                : att.attendeeType === 'TEACHER'
                                ? 'Docente'
                                : att.attendeeType === 'ADMIN_STAFF'
                                ? 'Personal Administrativo'
                                : 'Invitado Externo'}
                            </span>
                            {att.enrollmentNumber && (
                              <p className="font-mono text-[11px] text-accent font-medium">
                                Matrícula: {att.enrollmentNumber}
                              </p>
                            )}
                            <p className="text-[11px] text-ink-3">
                              {att.career?.name ||
                                att.departmentArea?.name ||
                                att.organization ||
                                '—'}
                              {att.academicGrade ? ` · ${att.academicGrade.name}` : ''}
                            </p>
                          </td>
                          <td className="py-3 px-4">
                            {latestInv ? (
                              <div>
                                <span
                                  className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                    latestInv.status === 'SENT'
                                      ? 'bg-accent-soft text-accent border border-accent/30'
                                      : latestInv.status === 'FAILED'
                                      ? 'bg-bad-soft text-bad border border-bad/30'
                                      : 'bg-warn-soft text-warn border border-warn/30'
                                  }`}
                                >
                                  {latestInv.status === 'SENT'
                                    ? 'Enviada'
                                    : latestInv.status === 'FAILED'
                                    ? 'Falló envío'
                                    : 'Pendiente SMTP'}
                                </span>
                                {latestInv.errorMessage && (
                                  <p
                                    className="text-[11px] text-ink-3 mt-0.5 max-w-[180px] truncate"
                                    title={latestInv.errorMessage}
                                  >
                                    {latestInv.errorMessage}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-ink-3">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {att.attendance ? (
                              <div>
                                <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-accent-soft text-accent">
                                  ✓ Entrada ({att.attendance.registrationMethod})
                                </span>
                                <p className="text-[11px] text-ink-3 mt-0.5">
                                  {new Date(att.attendance.checkedInAt).toLocaleString('es-MX')}
                                </p>
                              </div>
                            ) : (
                              <span className="text-[11px] text-ink-3">Sin check-in</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {!isRevoked && (
                                <>
                                  <a
                                    href={`/api/qrs/${att.id}?format=png&download=1`}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded border border-line bg-surface hover:bg-paper text-[11px] font-medium text-ink-2"
                                    title="Descargar imagen QR PNG"
                                  >
                                    <Download className="w-3 h-3" /> QR
                                  </a>
                                  <a
                                    href={`/api/qrs/${att.id}?format=pdf&download=1`}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded border border-line bg-surface hover:bg-paper text-[11px] font-medium text-ink-2"
                                    title="Descargar Pase en PDF"
                                  >
                                    <FileText className="w-3 h-3" /> PDF
                                  </a>
                                </>
                              )}
                              {canManageAttendance && !isRevoked && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleAttendeeAction(att.id, 'RESEND_INVITATION')
                                    }
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded border border-line bg-surface hover:bg-paper text-[11px] font-medium text-accent"
                                    title="Reenviar invitación con QR vigente"
                                  >
                                    <Mail className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openEditGuestModal(att)}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded border border-line bg-surface hover:bg-paper text-[11px] font-medium text-ink-2"
                                    title="Editar datos del invitado"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleAttendeeAction(att.id, 'REVOKE')}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded border border-bad/30 bg-bad-soft hover:bg-bad-soft text-[11px] font-medium text-bad"
                                    title="Revocar invitación e invalidar QR"
                                  >
                                    <Ban className="w-3 h-3" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 3: CIERRE DOCUMENTAL OBLIGATORIO Y EVIDENCIAS PDF (Sección 6)
         ===================================================================== */}
      {activeTab === 'CLOSURE' && (
        <div className="space-y-6">
          {pdfError && (
            <div className="p-3.5 rounded-xl bg-bad-soft border border-bad/30 text-bad text-xs">
              {pdfError}
            </div>
          )}
          {pdfFeedback && (
            <div className="p-3.5 rounded-xl bg-accent-soft border border-accent/30 text-accent text-xs">
              {pdfFeedback}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. Closure Evidence Box */}
            <div className="bg-surface rounded-xl border-2 border-accent/30 p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold uppercase font-mono tracking-[0.08em] bg-accent-soft text-accent">
                    Requisito Obligatorio de Cierre (`CLOSURE_EVIDENCE`)
                  </span>
                  <h3 className="text-base font-semibold text-ink mt-1">
                    Evidencia Documental de Realización y Conclusión
                  </h3>
                  <p className="text-xs text-ink-3 mt-0.5">
                    Para que un evento concluido pase a estado <strong>Cerrado (CLOSED)</strong>, es
                    obligatorio subir al menos un archivo PDF de evidencia posterior a la hora de
                    finalización.
                  </p>
                </div>
                {event.canUploadClosureEvidence && (
                  <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-ink hover:bg-ink-2 text-surface text-xs font-semibold cursor-pointer shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    {uploadingPdf ? 'Subiendo...' : 'Subir PDF de Cierre'}
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      multiple
                      disabled={uploadingPdf}
                      onChange={(e) => handlePdfUpload(e, 'CLOSURE_EVIDENCE')}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {!event.hasEnded && (
                <div className="p-3 rounded-md bg-warn-soft border border-warn/30 text-warn text-xs">
                  El cierre documental estará disponible una vez que concluya el horario programado
                  del evento ({event.date} {event.endTime} hrs). No se permite cerrar eventos
                  futuros ni en curso.
                </div>
              )}

              {event.closedAt && (
                <div className="p-3 rounded-md bg-accent-soft border border-accent/30 text-accent text-xs">
                  <strong>Evento Cerrado Formalmente:</strong>{' '}
                  {new Date(event.closedAt).toLocaleString('es-MX')}
                  {event.closedBy ? ` por ${event.closedBy.fullName}` : ''}
                </div>
              )}

              {closureEvidences.length === 0 ? (
                <div className="p-6 text-center rounded-xl bg-paper border border-dashed border-line text-xs text-ink-3">
                  Aún no se ha cargado evidencia PDF de cierre para este evento.
                </div>
              ) : (
                <div className="space-y-2">
                  {closureEvidences.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-3 rounded-md border border-accent/30 bg-accent-soft/40 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <p className="font-semibold text-ink">{ev.fileName}</p>
                        <p className="text-[11px] text-ink-3">
                          {formatFileSize(ev.fileSize)} · Subido por {ev.uploadedBy.fullName} el{' '}
                          {new Date(ev.uploadedAt).toLocaleString('es-MX')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={`/api/evidences/${ev.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded bg-surface border border-line text-ink-2 font-medium hover:bg-paper"
                        >
                          Ver PDF
                        </a>
                        {user?.role === 'SUPER_ADMIN' && (
                          <button
                            type="button"
                            onClick={() => setReplacementEvidenceId(ev.id)}
                            className="px-2.5 py-1 rounded bg-warn-soft text-warn font-medium text-[11px]"
                          >
                            Reemplazar
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Super Admin Exceptional Replacement Box */}
              {replacementEvidenceId && user?.role === 'SUPER_ADMIN' && (
                <div className="p-4 rounded-xl bg-warn-soft border border-warn/30 space-y-3 text-xs">
                  <p className="font-semibold text-warn">
                    Reemplazo Administrativo Excepcional (Conserva Historial y Archivo Anterior)
                  </p>
                  <input
                    type="text"
                    value={replacementReason}
                    onChange={(e) => setReplacementReason(e.target.value)}
                    placeholder="Motivo obligatorio del reemplazo para auditoría..."
                    className="w-full px-3 py-2 rounded-md border border-warn/30 bg-surface"
                  />
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setReplacementEvidenceId('')}
                      className="text-ink-2 underline"
                    >
                      Cancelar
                    </button>
                    <label className="px-3 py-1.5 rounded-full bg-warn text-surface font-semibold cursor-pointer">
                      Seleccionar Nuevo PDF y Reemplazar
                      <input
                        type="file"
                        accept="application/pdf,.pdf"
                        onChange={(e) => handlePdfUpload(e, 'CLOSURE_EVIDENCE')}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Supporting Documents Box */}
            <div className="bg-surface rounded-xl border border-line p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold uppercase font-mono tracking-[0.08em] bg-sunk text-ink-2">
                    Documentos Previos (`SUPPORTING_DOCUMENT`)
                  </span>
                  <h3 className="text-base font-semibold text-ink mt-1">
                    Oficios, Programas y Documentos de Soporte
                  </h3>
                  <p className="text-xs text-ink-3 mt-0.5">
                    Documentos adjuntados durante la planeación o solicitud del evento. No
                    sustituyen la evidencia de cierre posterior al evento.
                  </p>
                </div>
                <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-ink hover:bg-ink-2 text-surface text-xs font-semibold cursor-pointer shrink-0">
                  <Upload className="w-3.5 h-3.5" />
                  Adjuntar Soporte PDF
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    multiple
                    disabled={uploadingPdf}
                    onChange={(e) => handlePdfUpload(e, 'SUPPORTING_DOCUMENT')}
                    className="hidden"
                  />
                </label>
              </div>

              {supportEvidences.length === 0 ? (
                <div className="p-6 text-center rounded-xl bg-paper border border-dashed border-line text-xs text-ink-3">
                  Sin documentos de soporte previos.
                </div>
              ) : (
                <div className="space-y-2">
                  {supportEvidences.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-3 rounded-md border border-line bg-paper flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <p className="font-semibold text-ink">{ev.fileName}</p>
                        <p className="text-[11px] text-ink-3">
                          {formatFileSize(ev.fileSize)} · {ev.uploadedBy.fullName} ·{' '}
                          {new Date(ev.uploadedAt).toLocaleString('es-MX')}
                        </p>
                      </div>
                      <a
                        href={`/api/evidences/${ev.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded bg-surface border border-line text-ink-2 font-medium hover:bg-sunk"
                      >
                        Abrir PDF
                      </a>
                    </div>
                  ))}
                </div>
              )}

              {archivedEvidences.length > 0 && (
                <div className="pt-3 border-t border-line space-y-2">
                  <p className="text-[11px] font-semibold uppercase font-mono tracking-[0.08em] text-ink-3">
                    Historial de Evidencias Reemplazadas (Conservadas por Auditoría)
                  </p>
                  {archivedEvidences.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-2.5 rounded-md bg-sunk border border-line text-[11px] flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium text-ink-2 line-through">{ev.fileName}</p>
                        <p className="text-ink-3">
                          Motivo de reemplazo: {ev.replacementReason || 'Reemplazo administrativo'}
                        </p>
                      </div>
                      <a
                        href={`/api/evidences/${ev.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="underline text-ink-2"
                      >
                        Consultar archivo histórico
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 4: BITÁCORA DE AUDITORÍA Y ACCESOS ESCANEADOS
         ===================================================================== */}
      {activeTab === 'AUDIT' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-surface rounded-xl border border-line p-5 space-y-4">
            <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
              <History className="w-4 h-4 text-accent" />
              Historial y Auditoría del Evento ({event.auditLogs.length})
            </h2>
            <div className="space-y-3 max-h-[540px] overflow-y-auto pr-1">
              {event.auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-md border border-line bg-paper/60 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-semibold text-accent">
                      {log.action}
                    </span>
                    <span className="text-[11px] text-ink-3">
                      {new Date(log.createdAt).toLocaleString('es-MX')}
                    </span>
                  </div>
                  <p className="text-ink">{log.summary}</p>
                  {log.reason && (
                    <p className="text-bad font-medium">Motivo: {log.reason}</p>
                  )}
                  <p className="text-[11px] text-ink-3">
                    Usuario: {log.user.fullName} (@{log.user.username})
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface rounded-xl border border-line p-5 space-y-4">
            <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
              <QrCode className="w-4 h-4 text-accent" />
              Bitácora de Intentos de Escaneo y Validación en Puerta ({event.scanLogs.length})
            </h2>
            <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1">
              {event.scanLogs.length === 0 ? (
                <p className="text-xs text-ink-3">
                  Aún no se registran lecturas de códigos QR en este evento.
                </p>
              ) : (
                event.scanLogs.map((scan) => (
                  <div
                    key={scan.id}
                    className="p-3 rounded-md border border-line bg-paper text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          scan.result === 'AUTHORIZED'
                            ? 'bg-accent-soft text-accent'
                            : scan.result === 'DUPLICATE'
                            ? 'bg-warn-soft text-warn'
                            : 'bg-bad-soft text-bad'
                        }`}
                      >
                        {scan.result} ({scan.method})
                      </span>
                      <span className="text-[11px] text-ink-3">
                        {new Date(scan.attemptedAt).toLocaleString('es-MX')}
                      </span>
                    </div>
                    {scan.attendee && (
                      <p className="font-semibold text-ink">
                        {scan.attendee.fullName} ({scan.attendee.email})
                      </p>
                    )}
                    {scan.details && <p className="text-ink-2">{scan.details}</p>}
                    {scan.operator && (
                      <p className="text-[11px] text-ink-3">
                        Operador: {scan.operator.fullName}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Guest Modal */}
      {showGuestModal && catalogs && (
        <div className="fixed inset-0 z-50 bg-ink/60 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveGuest}
            className="bg-surface rounded-xl max-w-lg w-full p-6 shadow-float space-y-4"
          >
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-base font-semibold text-ink">
                {editingAttendee
                  ? `Editar Invitado: ${editingAttendee.fullName}`
                  : 'Agregar Invitado / Asistente con QR Individual'}
              </h3>
              <button
                type="button"
                onClick={() => setShowGuestModal(false)}
                className="text-xs text-ink-3 hover:text-ink"
              >
                Cerrar
              </button>
            </div>

            {editingAttendee && !editingAttendee.attendance && (
              <div className="p-2.5 rounded-md bg-warn-soft border border-warn/30 text-[11px] text-warn">
                Nota: Si modifica el correo electrónico antes del ingreso, el QR anterior se
                revocará automáticamente y se emitirá un nuevo QR para el nuevo correo.
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1">
                Categoría del Invitado *
              </label>
              <select
                value={guestType}
                onChange={(e) => {
                  const nextType = e.target.value as
                    | 'STUDENT'
                    | 'TEACHER'
                    | 'ADMIN_STAFF'
                    | 'EXTERNAL_GUEST';
                  setGuestType(nextType);
                  if (nextType === 'TEACHER') {
                    const acad = catalogs.departmentAreas.find((d) => d.areaType === 'ACADEMIC');
                    if (acad) setGuestDeptId(acad.id);
                  } else if (nextType === 'ADMIN_STAFF') {
                    const adm = catalogs.departmentAreas.find(
                      (d) => d.areaType === 'ADMINISTRATIVE'
                    );
                    if (adm) setGuestDeptId(adm.id);
                  }
                }}
                className="w-full px-3 py-2 text-xs rounded-md border border-line-strong bg-surface font-medium"
              >
                <option value="STUDENT">Alumno</option>
                <option value="TEACHER">Docente</option>
                <option value="ADMIN_STAFF">Personal Administrativo</option>
                <option value="EXTERNAL_GUEST">Invitado Externo</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-ink-2 mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={guestFullName}
                  onChange={(e) => setGuestFullName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-md border border-line-strong"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-2 mb-1">
                  Correo Electrónico *
                </label>
                <input
                  type="email"
                  required
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-md border border-line-strong"
                />
              </div>
            </div>

            {guestType === 'STUDENT' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-paper border border-line">
                <div>
                  <label className="block text-xs font-medium text-ink-2 mb-1">
                    Matrícula *
                  </label>
                  <input
                    type="text"
                    required
                    value={guestEnrollment}
                    onChange={(e) => setGuestEnrollment(e.target.value.toUpperCase())}
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-line-strong bg-surface font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-2 mb-1">
                    Carrera *
                  </label>
                  <select
                    required
                    value={guestCareerId}
                    onChange={(e) => setGuestCareerId(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-line-strong bg-surface"
                  >
                    {catalogs.careers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} — {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-2 mb-1">
                    Semestre / Grado *
                  </label>
                  <select
                    required
                    value={guestGradeId}
                    onChange={(e) => setGuestGradeId(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-line-strong bg-surface"
                  >
                    {catalogs.academicGrades.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {(guestType === 'TEACHER' || guestType === 'ADMIN_STAFF') && (
              <div className="p-3 rounded-xl bg-paper border border-line">
                <label className="block text-xs font-medium text-ink-2 mb-1">
                  Departamento o Área{' '}
                  {guestType === 'TEACHER' ? 'Académica' : 'Administrativa'} *
                </label>
                <select
                  required
                  value={guestDeptId}
                  onChange={(e) => setGuestDeptId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-md border border-line-strong bg-surface"
                >
                  {catalogs.departmentAreas
                    .filter((d) =>
                      guestType === 'TEACHER'
                        ? d.areaType === 'ACADEMIC'
                        : d.areaType === 'ADMINISTRATIVE'
                    )
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                </select>
              </div>
            )}

            {guestType === 'EXTERNAL_GUEST' && (
              <div className="p-3 rounded-xl bg-paper border border-line">
                <label className="block text-xs font-medium text-ink-2 mb-1">
                  Organización o Institución (Opcional)
                </label>
                <input
                  type="text"
                  value={guestOrg}
                  onChange={(e) => setGuestOrg(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-md border border-line-strong bg-surface"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowGuestModal(false)}
                className="px-4 py-2 rounded-full border border-line text-xs font-medium text-ink-2"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guestSubmitting}
                className="px-4 py-2 rounded-full bg-ink hover:bg-ink-2 text-surface text-xs font-semibold"
              >
                {guestSubmitting
                  ? 'Procesando...'
                  : editingAttendee
                  ? 'Guardar Cambios'
                  : 'Generar QR y Registrar Invitado'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
