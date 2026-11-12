import React from 'react';
import {
  CheckCircle2,
  Clock,
  XCircle,
  MinusCircle,
  Sparkles,
  PlayCircle,
  FileWarning,
  Lock,
  AlertOctagon,
  MailCheck,
  MailWarning,
  Mail,
} from 'lucide-react';
import { getCriticalityMeta } from '@/lib/utils';
import { EventLifecycleStatus } from '@/types';
import { getLifecycleMeta } from '@/lib/lifecycle';

export function RequestStatusBadge({
  status,
  labelPrefix,
}: {
  status?: string | null;
  labelPrefix?: string;
}) {
  if (!status || status === 'NONE') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600">
        <MinusCircle className="h-3.5 w-3.5 text-slate-400" />
        {labelPrefix ? `${labelPrefix}: ` : ''}No solicitado
      </span>
    );
  }

  if (status === 'APPROVED') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
        {labelPrefix ? `${labelPrefix}: ` : ''}Aprobado
      </span>
    );
  }

  if (status === 'REJECTED') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-300 bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-800">
        <XCircle className="h-3.5 w-3.5 text-rose-600" />
        {labelPrefix ? `${labelPrefix}: ` : ''}Rechazado
      </span>
    );
  }

  if (status === 'EXPIRED') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-400 bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-800">
        <AlertOctagon className="h-3.5 w-3.5 text-slate-600" />
        {labelPrefix ? `${labelPrefix}: ` : ''}Vencido
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
      <Clock className="h-3.5 w-3.5 text-amber-600" />
      {labelPrefix ? `${labelPrefix}: ` : ''}Pendiente
    </span>
  );
}

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

  const Icon =
    safeStatus === 'IN_PROGRESS'
      ? PlayCircle
      : safeStatus === 'COMPLETED_PENDING_EVIDENCE'
      ? FileWarning
      : safeStatus === 'CLOSED'
      ? Lock
      : safeStatus === 'SCHEDULED'
      ? CheckCircle2
      : safeStatus === 'REJECTED'
      ? XCircle
      : safeStatus === 'EXPIRED'
      ? AlertOctagon
      : Clock;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-bold ${
        compact ? 'text-[11px]' : 'text-xs'
      } ${meta.badgeClass}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {meta.label}
    </span>
  );
}

export function InvitationStatusBadge({ status }: { status?: string | null }) {
  if (status === 'SENT') {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800"
        title="El servidor SMTP aceptó el mensaje para envío"
      >
        <MailCheck className="h-3 w-3 text-emerald-600" />
        Enviado (SMTP)
      </span>
    );
  }
  if (status === 'FAILED') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-rose-300 bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-800">
        <MailWarning className="h-3 w-3 text-rose-600" />
        Fallido
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800">
      <Mail className="h-3 w-3 text-amber-600" />
      Pendiente envío
    </span>
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
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.badgeClass}`}
      title={meta.label}
    >
      <Sparkles className="h-3 w-3 shrink-0" />
      {compact ? meta.shortLabel : meta.label}
    </span>
  );
}
