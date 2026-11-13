import type { ReportData, ReportFilters } from './reports-service';
import { getLifecycleMeta } from './lifecycle';
import { EventLifecycleStatus } from '@/types';

/**
 * Mapeo de las métricas del sistema a los formatos institucionales:
 *
 *  - `templates/reporte-eventos-erm-utc.xlsx` (hoja «Reporte de Eventos»)
 *  - el mismo diseño servido como CSV
 *  - el padrón nominal de asistentes (CSV de detalle)
 */

export const EVENT_TEMPLATE_HEADERS = [
  'Fecha',
  'Nombre del Evento',
  'Ejes Univ. Pertinente',
  'Horas',
  'Participantes',
  'Quién Impartió',
  'De Parte de Quién',
  'Observaciones',
] as const;

export interface EventTemplateRow {
  fecha: string;
  nombre: string;
  eje: string;
  horas: number;
  participantes: number;
  quienImpartio: string;
  deParteDe: string;
  observaciones: string;
}

function formatHours(startMinutes: number, endMinutes: number): number {
  const minutes = Math.max(0, endMinutes - startMinutes);
  return Math.round((minutes / 60) * 10) / 10;
}

/** Filas de la hoja «Reporte de Eventos» a partir de los eventos filtrados. */
export function buildEventTemplateRows(data: ReportData): EventTemplateRow[] {
  return [...data.events]
    .sort((a, b) => a.date.localeCompare(b.date) || a.startMinutes - b.startMinutes)
    .map((ev) => {
      const stats = ev.attendanceStats;
      const lifecycleLabel = getLifecycleMeta(ev.lifecycleStatus as EventLifecycleStatus).label;
      const buildingName = ev.space.building?.name || 'Extensión Universitaria';

      const observaciones = [
        `${ev.space.name} (${buildingName})`,
        lifecycleLabel,
        stats.accessMode === 'OPEN' ? 'Acceso abierto' : 'Acceso restringido',
        `Registrados: ${stats.registeredActive}`,
        `Asistencia: ${stats.attendancePct}%`,
        `Ocupación: ${stats.occupancyPct}%`,
      ].join(' · ');

      return {
        fecha: ev.date,
        nombre: ev.name,
        // El eje universitario no se captura en el sistema: se deja vacío para
        // completarse con la lista desplegable de la plantilla.
        eje: '',
        horas: formatHours(ev.startMinutes, ev.endMinutes),
        participantes: stats.checkedIn,
        quienImpartio: ev.responsibleName,
        deParteDe: ev.responsibleDepartment,
        observaciones,
      };
    });
}

export interface TemplateSummary {
  totalEvents: number;
  totalHours: number;
  totalParticipants: number;
  averageParticipants: number;
}

export function buildTemplateSummary(rows: EventTemplateRow[]): TemplateSummary {
  const totalHours = Math.round(rows.reduce((acc, r) => acc + r.horas, 0) * 10) / 10;
  const totalParticipants = rows.reduce((acc, r) => acc + r.participantes, 0);

  return {
    totalEvents: rows.length,
    totalHours,
    totalParticipants,
    averageParticipants:
      rows.length > 0 ? Math.round((totalParticipants / rows.length) * 10) / 10 : 0,
  };
}

/* ------------------------------------------------------------------ */
/* CSV                                                                 */
/* ------------------------------------------------------------------ */

function csvCell(value: string | number): string {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows: (string | number)[][]): string {
  return '﻿' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

export function describeFilters(filters: ReportFilters): string {
  const period =
    filters.startDate && filters.endDate
      ? `${filters.startDate} a ${filters.endDate}`
      : filters.startDate
        ? `desde ${filters.startDate}`
        : filters.endDate
          ? `hasta ${filters.endDate}`
          : 'Histórico completo';

  const extras: string[] = [];
  if (filters.lifecycle !== 'ALL') extras.push(`ciclo de vida: ${filters.lifecycle}`);
  if (filters.accessMode !== 'ALL') extras.push(`modalidad: ${filters.accessMode}`);
  if (filters.attendeeType !== 'ALL') extras.push(`asistentes: ${filters.attendeeType}`);

  return extras.length > 0 ? `${period} · ${extras.join(' · ')}` : period;
}

/** CSV con el mismo diseño que la plantilla Excel institucional. */
export function buildEventTemplateCsv(data: ReportData, filters: ReportFilters): string {
  const rows = buildEventTemplateRows(data);
  const summary = buildTemplateSummary(rows);

  const output: (string | number)[][] = [
    ['REPORTE GENERAL DE EVENTOS Y ACTIVIDADES'],
    [`Periodo: ${describeFilters(filters)}`],
    [`Generado: ${new Date().toLocaleString('es-MX')}`],
    [],
    [...EVENT_TEMPLATE_HEADERS],
  ];

  for (const row of rows) {
    output.push([
      row.fecha,
      row.nombre,
      row.eje,
      `${row.horas} hrs`,
      row.participantes,
      row.quienImpartio,
      row.deParteDe,
      row.observaciones,
    ]);
  }

  output.push([
    '',
    '',
    'TOTALES / PROMEDIO:',
    `${summary.totalHours} hrs`,
    summary.totalParticipants,
    '',
    '',
    '',
  ]);

  output.push([]);
  output.push(['RESUMEN DE PARTICIPACIÓN - ERM UTC']);
  output.push(['Total de Eventos Registrados', summary.totalEvents]);
  output.push(['Total de Horas Acumuladas', summary.totalHours]);
  output.push(['Total de Participantes', summary.totalParticipants]);
  output.push(['Promedio de Participantes por Evento', summary.averageParticipants]);

  return toCsv(output);
}

/** CSV del padrón nominal de asistentes con control de acceso QR. */
export function buildAttendeesCsv(data: ReportData): string {
  const output: (string | number)[][] = [
    [
      'Codigo Evento',
      'Evento',
      'Fecha',
      'Espacio',
      'Nombre Asistente',
      'Correo',
      'Categoria',
      'Matricula',
      'Carrera',
      'Semestre/Grado',
      'Departamento/Area',
      'Organizacion Externa',
      'Estado Registro',
      'Estado Invitacion Correo',
      'Asistio (Check-in)',
      'Fecha/Hora Entrada',
      'Metodo Entrada',
      'Validado Por',
    ],
  ];

  for (const ev of data.events) {
    for (const att of ev.filteredAttendees) {
      output.push([
        ev.id.slice(0, 8),
        ev.name,
        ev.date,
        ev.space.name,
        att.fullName,
        att.email,
        att.attendeeType,
        att.enrollmentNumber || '',
        att.careerName || '',
        att.academicGradeName || '',
        att.departmentAreaName || '',
        att.organization || '',
        att.registrationStatus,
        att.invitationStatus,
        att.checkedInAt ? 'SI' : 'NO',
        att.checkedInAt ? new Date(att.checkedInAt).toLocaleString('es-MX') : '',
        att.checkInMethod || '',
        att.checkedInByName || '',
      ]);
    }
  }

  return toCsv(output);
}
