'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatDateTimeMonterrey } from '@/lib/utils';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

export function NotificationBell({ initialUnread = 0 }: { initialUnread?: number }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(initialUnread);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/notifications', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // ignore network error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (!open) {
      fetchNotifications();
    }
    setOpen(!open);
  };

  const markAllRead = async () => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAll: true }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const handleSelectNotification = async (item: NotificationItem) => {
    if (!item.isRead) {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: item.id }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    setOpen(false);
    if (item.link) {
      router.push(item.link);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={handleToggle}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-line-strong text-ink transition-colors hover:border-ink"
        aria-label="Notificaciones internas"
      >
        <Bell strokeWidth={1.5} className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-bad px-1 font-mono text-[10px] font-semibold text-surface">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 sm:w-96 overflow-hidden rounded-xl border border-line bg-surface shadow-float">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold text-ink">Notificaciones Internas</h3>
              <p className="font-mono text-[11px] text-ink-3">
                {unreadCount > 0
                  ? `${unreadCount} sin leer`
                  : 'Todas las notificaciones leídas'}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="inline-flex items-center gap-1 text-xs font-medium text-ink underline-offset-4 hover:underline"
              >
                <CheckCheck strokeWidth={1.5} className="h-3.5 w-3.5" />
                Marcar leídas
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-line">
            {loading && notifications.length === 0 ? (
              <div className="px-4 py-6 text-xs text-ink-3">Cargando notificaciones...</div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-6 text-xs text-ink-2">
                No tienes notificaciones registradas.
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleSelectNotification(n)}
                  className="w-full text-left px-4 py-3 transition-colors hover:bg-sunk/60 flex items-start gap-3"
                >
                  <span
                    className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                      !n.isRead ? 'bg-accent' : 'bg-line-strong'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={`text-xs truncate ${
                          !n.isRead ? 'font-semibold text-ink' : 'font-medium text-ink-2'
                        }`}
                      >
                        {n.title}
                      </p>
                      <ExternalLink strokeWidth={1.5} className="h-3 w-3 shrink-0 text-ink-3" />
                    </div>
                    <p className="mt-0.5 text-xs text-ink-2 line-clamp-2">{n.message}</p>
                    <p className="mt-1 font-mono text-[11px] text-ink-3">
                      {formatDateTimeMonterrey(n.createdAt)}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
