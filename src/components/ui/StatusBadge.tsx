import React from 'react';
import { getCriticalityMeta } from '@/lib/utils';
import { EventLifecycleStatus } from '@/types';
import { getLifecycleMeta } from '@/lib/lifecycle';

/**
 * Chips del sistema "Papel y tinta":
 *  - Estado: píldora con fondo suave, texto del color de estado y un punto de 6px.
 *  - Categoría: chip cuadrado neutro en mono.
 * El color solo comunica estado; el texto siempre acompaña.
 */
type Tone = 'ok' | 'warn' | 'bad' | 'neutral';

const TONE: Record<Tone, { chip: string; dot: string }> = {
  ok: { chip: 'bg-ok-soft text-ok', dot: 'bg-ok' },
  warn: { chip: 'bg-warn-soft text-warn', dot: 'bg-warn' },
  bad: { chip: 'bg-bad-soft text-bad', dot: 'bg-bad' },
  neutral: { chip: 'bg-sunk text-ink-2', dot: 'bg-ink-3' },
};

function StatusChip({
  tone,
  compact = false,
  title,
  children,
}: {
  tone: Tone;
  compact?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-medium whitespace-nowrap ${
        compact ? 'text-[11px]' : 'text-xs'
      } ${TONE[tone].chip}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONE[tone].dot}`} />
      {children}
    </span>
  );
}

export function RequestStatusBadge({
  status,
  labelPrefix,
}: {
  status?: string | null;
  labelPrefix?: string;
}) {
  const prefix = labelPrefix ? `${labelPrefix}: ` : '';

  if (!status || status === 'NONE') {
    return <StatusChip tone="neutral">{prefix}No solicitado</StatusChip>;
  }
  if (status === 'APPROVED') {
    return <StatusChip tone="ok">{prefix}Aprobado</StatusChip>;
  }
  if (status === 'REJECTED') {
    return <StatusChip tone="bad">{prefix}Rechazado</StatusChip>;
  }
  if (status === 'EXPIRED') {
    return <StatusChip tone="neutral">{prefix}Vencido</StatusChip>;
  }
  return <StatusChip tone="warn">{prefix}Pendiente</StatusChip>;
}

const LIFECYCLE_TONE: Record<EventLifecycleStatus, Tone> = {
  PENDING_APPROVAL: 'warn',
  SCHEDULED: 'neutral',
  IN_PROGRESS: 'ok',
  COMPLETED_PENDING_EVIDENCE: 'warn',
  CLOSED: 'ok',
  REJECTED: 'bad',
  EXPIRED: 'neutral',
};

export function EventLifecycleBadge({
  status,
  state,
  compact = false,
}: {
  status?: EventLifecycleStatus | string | null;
  state?: EventLifecycleStatus | string | null;
  compact?: boolean;
}) {
  const safeStatus = (status || state || 'PENDING_APPROVAL') as EventLifecycleStatus;
  const meta = getLifecycleMeta(safeStatus);

  return (
    <StatusChip tone={LIFECYCLE_TONE[safeStatus] ?? 'neutral'} compact={compact}>
      {meta.label}
    </StatusChip>
  );
}

export function InvitationStatusBadge({ status }: { status?: string | null }) {
  if (status === 'SENT') {
    return (
      <StatusChip tone="ok" compact title="El servidor SMTP aceptó el mensaje para envío">
        Enviado (SMTP)
      </StatusChip>
    );
  }
  if (status === 'FAILED') {
    return (
      <StatusChip tone="bad" compact>
        Fallido
      </StatusChip>
    );
  }
  return (
    <StatusChip tone="warn" compact>
      Pendiente envío
    </StatusChip>
  );
}

export function CriticalityBadge({
  level,
  compact = false,
}: {
  level: number;
  compact?: boolean;
}) {
  const meta = getCriticalityMeta(level);
  return (
    <span
      className="inline-flex items-center rounded-md border border-line bg-sunk/60 px-2 py-0.5 font-mono text-[11px] text-ink-2 whitespace-nowrap"
      title={meta.label}
    >
      {compact ? meta.shortLabel : meta.label}
    </span>
  );
}
