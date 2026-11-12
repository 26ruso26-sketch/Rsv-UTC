export const MONTERREY_TIMEZONE = 'America/Monterrey';

/**
 * Returns the current date string YYYY-MM-DD in America/Monterrey timezone.
 */
export function getMonterreyDateString(referenceDate: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: MONTERREY_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(referenceDate);
}

/**
 * Adds `days` to a YYYY-MM-DD date string and returns the new YYYY-MM-DD string.
 */
export function addDaysToDateString(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  dt.setUTCDate(dt.getUTCDate() + days);
  const year = dt.getUTCFullYear();
  const month = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const day = String(dt.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Converts a "HH:mm" string into minutes from midnight (0..1440).
 */
export function timeToMinutes(timeStr: string): number {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(timeStr.trim());
  if (!match) {
    throw new Error(`Formato de hora inválido: "${timeStr}". Use HH:mm (24h).`);
  }
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  return hours * 60 + minutes;
}

/**
 * Converts minutes from midnight into "HH:mm" format.
 */
export function minutesToTime(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(1440, totalMinutes));
  const hours = Math.floor(clamped / 60);
  const minutes = clamped % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Adds 60 minutes (1 mandatory cleaning hour) to an end time "HH:mm".
 */
export function addOneHourForCleaning(endTime: string): {
  endMinutes: number;
  cleaningEndMinutes: number;
  cleaningEndTime: string;
} {
  const endMinutes = timeToMinutes(endTime);
  const cleaningEndMinutes = endMinutes + 60;
  const cleaningEndTime = minutesToTime(cleaningEndMinutes);
  return {
    endMinutes,
    cleaningEndMinutes,
    cleaningEndTime,
  };
}

/**
 * Calculates resulting criticality level using the minimum level number selected.
 * Example: [1, 3, 4] -> 1
 */
export function calculateCriticalityLevel(levels: number[]): number {
  if (!levels || levels.length === 0) {
    throw new Error('Debe seleccionar al menos un nivel de criticidad.');
  }
  const validLevels = levels.filter((n) => Number.isInteger(n) && n >= 1 && n <= 4);
  if (validLevels.length === 0) {
    throw new Error('Los niveles de criticidad deben estar entre 1 y 4.');
  }
  return Math.min(...validLevels);
}

export function getCriticalityMeta(level: number): {
  level: number;
  label: string;
  shortLabel: string;
  badgeClass: string;
  priorityText: string;
} {
  switch (level) {
    case 1:
      return {
        level: 1,
        label: 'Nivel 1 — Asiste rector (Máxima prioridad)',
        shortLabel: 'Nivel 1 (Rector)',
        badgeClass: 'bg-purple-100 text-purple-900 border-purple-300',
        priorityText: 'Crítica Institucional',
      };
    case 2:
      return {
        level: 2,
        label: 'Nivel 2 — Asisten autoridades',
        shortLabel: 'Nivel 2 (Autoridades)',
        badgeClass: 'bg-indigo-100 text-indigo-900 border-indigo-300',
        priorityText: 'Alta Prioridad',
      };
    case 3:
      return {
        level: 3,
        label: 'Nivel 3 — Invitados especiales',
        shortLabel: 'Nivel 3 (Invitados)',
        badgeClass: 'bg-sky-100 text-sky-900 border-sky-300',
        priorityText: 'Prioridad Media',
      };
    default:
      return {
        level: 4,
        label: 'Nivel 4 — Solo alumnos y docentes',
        shortLabel: 'Nivel 4 (Comunidad)',
        badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
        priorityText: 'Operación Académica',
      };
  }
}

export function formatSpanishDate(dateStr: string): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return new Intl.DateTimeFormat('es-MX', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(dt);
}

export function formatDateTimeMonterrey(dateInput: Date | string): string {
  const dt = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: MONTERREY_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dt);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatFileSize(bytes: number): string {
  return formatBytes(bytes);
}

export function formatDateKey(referenceDate: Date = new Date()): string {
  return getMonterreyDateString(referenceDate);
}

export function addCleaningMinutes(endTime: string, cleaningMinutes = 60): string {
  const endMins = timeToMinutes(endTime);
  return minutesToTime(endMins + cleaningMinutes);
}

export function getRoleLabel(role: string): string {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'Administrador General';
    case 'DIRECTOR':
      return 'Director de Edificio';
    case 'EXTENSION':
      return 'Extensión Universitaria';
    default:
      return role;
  }
}


