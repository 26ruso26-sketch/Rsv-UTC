'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  MapPin,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Lock,
  Download,
  FileText,
  UserCheck,
  ShieldCheck,
  GraduationCap,
  Briefcase,
  Building2,
  Globe,
} from 'lucide-react';

interface PublicEventPayload {
  event: {
    id: string;
    name: string;
    description: string;
    date: string;
    startTime: string;
    endTime: string;
    spaceName: string;
    spaceLocation: string;
    accessMode: 'OPEN' | 'RESTRICTED';
    institutionalEmailDomain: string;
  };
  registrationAvailability: {
    available: boolean;
    reason?: string;
  };
  catalogs: {
    careers: { id: string; code: string; name: string }[];
    academicGrades: { id: string; code: string; name: string; levelOrder: number }[];
    departmentAreas: { id: string; code: string; name: string; areaType: string }[];
  };
}

interface RegistrationSuccessData {
  registration: {
    attendeeId: string;
    fullName: string;
    email: string;
    attendeeType: string;
    credentialId: string;
    qrPngUrl: string;
    qrDownloadPngUrl: string;
    qrPassPdfUrl: string;
  };
  delivery: {
    status: string;
    message: string;
  };
}

export default function PublicEventRegistrationPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token || '';

  const [data, setData] = useState<PublicEventPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form fields
  const [attendeeType, setAttendeeType] = useState<
    'STUDENT' | 'TEACHER' | 'ADMIN_STAFF' | 'EXTERNAL_GUEST'
  >('STUDENT');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [enrollmentNumber, setEnrollmentNumber] = useState('');
  const [careerId, setCareerId] = useState('');
  const [academicGradeId, setAcademicGradeId] = useState('');
  const [departmentAreaId, setDepartmentAreaId] = useState('');
  const [organization, setOrganization] = useState('');
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [successData, setSuccessData] = useState<RegistrationSuccessData | null>(null);

  useEffect(() => {
    fetch(`/api/public/registro/${encodeURIComponent(token)}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || 'No se pudo cargar el formulario de registro.');
        }
        return json as PublicEventPayload;
      })
      .then((payload) => {
        setData(payload);
        if (payload.catalogs?.careers?.length > 0) {
          setCareerId(payload.catalogs.careers[0].id);
        }
        if (payload.catalogs?.academicGrades?.length > 0) {
          setAcademicGradeId(payload.catalogs.academicGrades[0].id);
        }
        const firstAcademicDept = payload.catalogs?.departmentAreas?.find(
          (d) => d.areaType === 'ACADEMIC'
        );
        if (firstAcademicDept) {
          setDepartmentAreaId(firstAcademicDept.id);
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Enlace inválido.');
      })
      .finally(() => setLoading(false));
  }, [token]);

  // Adjust default department when switching between TEACHER and ADMIN_STAFF
  useEffect(() => {
    if (!data?.catalogs?.departmentAreas) return;
    if (attendeeType === 'TEACHER') {
      const firstAcad = data.catalogs.departmentAreas.find((d) => d.areaType === 'ACADEMIC');
      if (firstAcad) setDepartmentAreaId(firstAcad.id);
    } else if (attendeeType === 'ADMIN_STAFF') {
      const firstAdmin = data.catalogs.departmentAreas.find(
        (d) => d.areaType === 'ADMINISTRATIVE'
      );
      if (firstAdmin) setDepartmentAreaId(firstAdmin.id);
    }
  }, [attendeeType, data]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      const res = await fetch(`/api/public/registro/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          email,
          attendeeType,
          enrollmentNumber: attendeeType === 'STUDENT' ? enrollmentNumber : null,
          careerId: attendeeType === 'STUDENT' ? careerId : null,
          academicGradeId: attendeeType === 'STUDENT' ? academicGradeId : null,
          departmentAreaId:
            attendeeType === 'TEACHER' || attendeeType === 'ADMIN_STAFF'
              ? departmentAreaId
              : null,
          organization: attendeeType === 'EXTERNAL_GUEST' ? organization : null,
          privacyAccepted,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setFormError(json.error || 'Error al registrar asistencia.');
      } else {
        setSuccessData(json);
      }
    } catch {
      setFormError('Error de red al enviar el registro.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-sm text-slate-600 font-medium">
          Verificando disponibilidad del evento universitario...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-bold text-slate-900">Enlace de Registro No Disponible</h1>
          <p className="text-xs text-slate-600">{error || 'El enlace solicitado no es válido.'}</p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
          >
            Ir al portal institucional SREU
          </Link>
        </div>
      </div>
    );
  }

  const { event, registrationAvailability, catalogs } = data;
  const academicDepts = catalogs.departmentAreas.filter((d) => d.areaType === 'ACADEMIC');
  const adminDepts = catalogs.departmentAreas.filter((d) => d.areaType === 'ADMINISTRATIVE');

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-950 via-slate-900 to-slate-950 py-10 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Institutional Header */}
        <div className="bg-emerald-900/50 border border-emerald-700/40 rounded-2xl p-5 text-white flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-500 text-slate-950 font-black flex items-center justify-center text-base shadow">
              UTC
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider font-bold text-emerald-300">
                Universidad Tecnológica · Sistema SREU
              </p>
              <h1 className="text-base sm:text-lg font-bold">
                Registro de Asistencia y Pase Individual QR
              </h1>
            </div>
          </div>
          <QrCode className="w-8 h-8 text-emerald-300 shrink-0 hidden sm:block" />
        </div>

        {/* Event Info Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
          <div className="p-6 border-b border-slate-200 bg-slate-50/70">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                  event.accessMode === 'OPEN'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-amber-50 text-amber-900 border-amber-300'
                }`}
              >
                {event.accessMode === 'OPEN' ? (
                  <>
                    <Globe className="w-3 h-3" /> Evento Abierto al Público
                  </>
                ) : (
                  <>
                    <Lock className="w-3 h-3" /> Evento de Acceso Restringido
                  </>
                )}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">{event.name}</h2>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{event.description}</p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-200/80 text-xs">
              <div className="flex items-center gap-2 text-slate-700">
                <Calendar className="w-4 h-4 text-emerald-700 shrink-0" />
                <div>
                  <p className="text-[10px] uppercase text-slate-400 font-semibold">Fecha</p>
                  <p className="font-bold text-slate-900">{event.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <Clock className="w-4 h-4 text-emerald-700 shrink-0" />
                <div>
                  <p className="text-[10px] uppercase text-slate-400 font-semibold">Horario</p>
                  <p className="font-bold text-slate-900">
                    {event.startTime} - {event.endTime} hrs
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <MapPin className="w-4 h-4 text-emerald-700 shrink-0" />
                <div>
                  <p className="text-[10px] uppercase text-slate-400 font-semibold">Recinto</p>
                  <p className="font-bold text-slate-900">{event.spaceName}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Restricted or Closed State */}
          {!registrationAvailability.available ? (
            <div className="p-8 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Inscripción Pública No Disponible
              </h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                {registrationAvailability.reason}
              </p>
            </div>
          ) : successData ? (
            /* Confirmation & QR Display */
            <div className="p-6 sm:p-8 space-y-6">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-emerald-950">
                    ¡Registro confirmado! Su código QR individual ha sido generado
                  </h3>
                  <p className="text-xs text-emerald-800 mt-1">
                    Presente este código QR en su teléfono o impreso al ingresar a{' '}
                    <strong>{event.spaceName}</strong>. El código es personal y válido para una
                    sola entrada.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-6 p-5 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={successData.registration.qrPngUrl}
                    alt="Código QR individual de acceso"
                    className="w-44 h-44 object-contain"
                  />
                </div>
                <div className="space-y-2.5 text-center sm:text-left flex-1">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-900">
                      Pase Oficial de Acceso
                    </span>
                    <h4 className="text-base font-bold text-slate-900 mt-1">
                      {successData.registration.fullName}
                    </h4>
                    <p className="text-xs text-slate-600">{successData.registration.email}</p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-600">
                    <strong>Estado de envío por correo:</strong> {successData.delivery.message}
                  </div>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-2">
                    <a
                      href={successData.registration.qrDownloadPngUrl}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Descargar Imagen QR (PNG)
                    </a>
                    <a
                      href={successData.registration.qrPassPdfUrl}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Descargar Pase en PDF
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Registration Form */
            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
              {formError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  1. Seleccione su Categoría de Asistente *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: 'STUDENT', label: 'Alumno', icon: GraduationCap },
                    { id: 'TEACHER', label: 'Docente', icon: Briefcase },
                    { id: 'ADMIN_STAFF', label: 'Administrativo', icon: Building2 },
                    { id: 'EXTERNAL_GUEST', label: 'Invitado Externo', icon: UserCheck },
                  ].map((item) => {
                    const Icon = item.icon;
                    const active = attendeeType === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() =>
                          setAttendeeType(
                            item.id as 'STUDENT' | 'TEACHER' | 'ADMIN_STAFF' | 'EXTERNAL_GUEST'
                          )
                        }
                        className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1.5 ${
                          active
                            ? 'bg-emerald-50/90 border-emerald-600 text-emerald-950 ring-2 ring-emerald-500/20'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <Icon
                          className={`w-4 h-4 ${
                            active ? 'text-emerald-700' : 'text-slate-400'
                          }`}
                        />
                        <span className="text-xs font-bold">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nombre completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ej. Valeria Guadalupe Morales Alanís"
                    className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Correo electrónico {attendeeType !== 'EXTERNAL_GUEST' ? 'institucional' : ''} *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={
                      attendeeType !== 'EXTERNAL_GUEST'
                        ? `usuario@${event.institutionalEmailDomain}`
                        : 'correo@organizacion.com'
                    }
                    className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              {/* Conditional Fields by Attendee Type (Section 9) */}
              {attendeeType === 'STUDENT' && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Matrícula *
                    </label>
                    <input
                      type="text"
                      required
                      value={enrollmentNumber}
                      onChange={(e) => setEnrollmentNumber(e.target.value.toUpperCase())}
                      placeholder="Ej. UTC2301045"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Carrera universitaria *
                    </label>
                    <select
                      required
                      value={careerId}
                      onChange={(e) => setCareerId(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                    >
                      {catalogs.careers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.code} — {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Semestre / Grado *
                    </label>
                    <select
                      required
                      value={academicGradeId}
                      onChange={(e) => setAcademicGradeId(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
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

              {attendeeType === 'TEACHER' && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Departamento o Área Académica *
                  </label>
                  <select
                    required
                    value={departmentAreaId}
                    onChange={(e) => setDepartmentAreaId(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                  >
                    {academicDepts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {attendeeType === 'ADMIN_STAFF' && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Departamento o Área Administrativa *
                  </label>
                  <select
                    required
                    value={departmentAreaId}
                    onChange={(e) => setDepartmentAreaId(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                  >
                    {adminDepts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {attendeeType === 'EXTERNAL_GUEST' && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Organización, Empresa o Institución de Procedencia (Opcional)
                  </label>
                  <input
                    type="text"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder="Ej. Cámara Industrial / Dependencia / Empresa"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                  />
                </div>
              )}

              {/* Privacy Notice (Section 13) */}
              <label className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={privacyAccepted}
                  onChange={(e) => setPrivacyAccepted(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded text-emerald-700 focus:ring-emerald-600"
                />
                <span className="text-xs text-slate-600 leading-relaxed">
                  <strong className="text-slate-900">Aviso de Privacidad Institucional:</strong>{' '}
                  Acepto que mis datos sean utilizados exclusivamente por la Universidad Tecnológica
                  para el control de acceso mediante código QR individual y estadísticas académicas
                  de participación en este evento.
                </span>
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 px-5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white font-bold text-sm shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                {submitting
                  ? 'Generando credencial QR individual...'
                  : 'Confirmar Registro y Obtener Pase QR'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
