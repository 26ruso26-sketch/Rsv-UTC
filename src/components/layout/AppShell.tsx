'use client';

import React, { createContext, useContext, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarDays,
  CalendarPlus,
  ClipboardList,
  ShieldCheck,
  FileBarChart2,
  Settings,
  LogOut,
  Menu,
  X,
  QrCode,
  Bell,
} from 'lucide-react';
import { SessionUser } from '@/types';
import { NotificationBell } from './NotificationBell';

const AuthContext = createContext<{ user: SessionUser | null }>({ user: null });

export function useAuth() {
  return useContext(AuthContext);
}

interface AppShellProps {
  user: SessionUser;
  unreadNotifications: number;
  pendingAuthorizationsCount: number;
  children: React.ReactNode;
}

export function AppShell({
  user,
  unreadNotifications,
  pendingAuthorizationsCount,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [mobileNotifOpen, setMobileNotifOpen] = useState(false);
  const [mobileNotifs, setMobileNotifs] = useState<
    { id: string; title: string; message: string; link: string | null; isRead: boolean }[]
  >([]);
  const [loadingMobileNotifs, setLoadingMobileNotifs] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const toggleMobileNotifications = async () => {
    const next = !mobileNotifOpen;
    setMobileNotifOpen(next);
    if (next) {
      setLoadingMobileNotifs(true);
      try {
        const res = await fetch('/api/notifications', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setMobileNotifs((data.notifications || []).slice(0, 6));
        }
      } finally {
        setLoadingMobileNotifs(false);
      }
    }
  };

  const isMoreSectionActive =
    pathname.startsWith('/reportes') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/escaner') ||
    pathname === '/eventos/nuevo';

  const canAuthorize =
    user.role === 'DIRECTOR' || user.role === 'EXTENSION' || user.role === 'SUPER_ADMIN';
  const isSuperAdmin = user.role === 'SUPER_ADMIN';

  const desktopNavItems = [
    {
      label: 'Inicio',
      href: '/dashboard',
      icon: LayoutDashboard,
      visible: true,
    },
    {
      label: 'Mis eventos',
      href: '/eventos',
      icon: ClipboardList,
      visible: true,
    },
    {
      label: 'Nuevo evento',
      href: '/eventos/nuevo',
      icon: CalendarPlus,
      visible: true,
    },
    {
      label: 'Calendario',
      href: '/calendario',
      icon: CalendarDays,
      visible: true,
    },
    {
      label: 'Autorizaciones',
      href: '/autorizaciones',
      icon: ShieldCheck,
      visible: canAuthorize,
      badge: pendingAuthorizationsCount > 0 ? pendingAuthorizationsCount : undefined,
    },
    {
      label: 'Escáner de asistencia',
      href: '/escaner',
      icon: QrCode,
      visible: true,
    },
    {
      label: 'Reportes',
      href: '/reportes',
      icon: FileBarChart2,
      visible: true,
    },
    {
      label: 'Administración',
      href: '/admin',
      icon: Settings,
      visible: isSuperAdmin,
    },
  ];

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const roleBadgeLabel =
    user.role === 'SUPER_ADMIN'
      ? 'SUPER_ADMIN · Administrador General'
      : user.role === 'EXTENSION'
      ? 'EXTENSION · Extensión Universitaria'
      : `DIRECTOR · ${user.buildingName || 'Edificio Asignado'}`;

  const initials = user.fullName
    .replace(/\(.*?\)/g, '')
    .split(/\s+/)
    .filter((part) => part && !/^(dr|dra|mtro|mtra|lic|ing|c\.p)\.?$/i.test(part))
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  const mobileTab = (active: boolean) =>
    `relative flex flex-col items-center justify-center gap-1 min-h-[44px] text-[11px] transition-colors ${
      active ? 'font-semibold text-ink' : 'font-medium text-ink-3 hover:text-ink'
    }`;
  const mobileTabBar = <span className="absolute top-0 inset-x-5 h-[3px] bg-accent" />;
  const sheetTile =
    'flex items-center gap-2.5 rounded-md border border-line p-3.5 text-xs font-medium text-ink hover:border-ink min-h-[48px] transition-colors';

  return (
    <div className="min-h-screen bg-paper flex flex-col overflow-x-hidden print:bg-white">
      <div className="flex-1 flex">
        {/* Barra lateral de escritorio: directamente sobre el papel */}
        <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-line shrink-0 sticky top-0 h-screen print:hidden">
          <div className="px-6 pt-6 pb-5">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/fondo/logo.png" alt="UTC" className="h-9 w-auto shrink-0" />
              <div className="min-w-0 border-l border-line pl-3">
                <h1 className="text-base font-semibold text-ink leading-none">SREU · UTC</h1>
                <p className="mt-1 text-[11px] text-ink-3 leading-tight">
                  Reservación y Asistencia QR
                </p>
              </div>
            </div>
          </div>

          <nav className="flex-1 py-2 overflow-y-auto">
            {desktopNavItems
              .filter((item) => item.visible)
              .map((item) => {
                const Icon = item.icon;
                const active =
                  pathname === item.href ||
                  (item.href !== '/eventos' && pathname.startsWith(item.href)) ||
                  (item.href === '/eventos' &&
                    pathname.startsWith('/eventos') &&
                    pathname !== '/eventos/nuevo');

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`relative flex items-center justify-between pl-6 pr-5 py-2.5 text-sm transition-colors ${
                      active ? 'font-semibold text-ink' : 'text-ink-2 hover:text-ink'
                    }`}
                  >
                    {active && <span className="absolute left-0 inset-y-1.5 w-[3px] bg-accent" />}
                    <span className="flex items-center gap-3 min-w-0">
                      <Icon
                        strokeWidth={1.5}
                        className={`h-[18px] w-[18px] shrink-0 ${active ? 'text-accent' : ''}`}
                      />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.badge !== undefined && (
                      <span className="rounded-full bg-warn-soft px-2 py-0.5 font-mono text-[11px] font-semibold text-warn">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
          </nav>

          <div className="border-t border-line px-6 py-5 space-y-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sunk font-mono text-xs font-semibold text-ink">
                {initials}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-ink leading-snug">{user.fullName}</p>
                <p className="mt-0.5 text-[11px] text-ink-2 leading-snug">{roleBadgeLabel}</p>
                <p className="font-mono text-[11px] text-ink-3 truncate">Usuario: @{user.username}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-line-strong px-4 py-2 text-xs font-medium text-ink-2 transition-colors hover:border-bad hover:text-bad"
            >
              <LogOut strokeWidth={1.5} className="h-4 w-4" />
              {loggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
            </button>
          </div>
        </aside>

        {/* Contenedor Principal */}
        <div className="flex-1 flex flex-col min-w-0 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0 print:block print:pb-0">
          {/* Cabecera superior */}
          <header className="sticky top-0 z-30 border-b border-line bg-paper px-4 sm:px-6 lg:px-8 py-3 print:hidden">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/fondo/logo.png" alt="UTC" className="h-8 w-auto shrink-0 lg:hidden" />
                <div className="min-w-0">
                  <h2 className="text-sm sm:text-base font-semibold text-ink truncate">
                    Sistema de Reservación de Espacios Universitarios
                  </h2>
                  <p className="font-mono text-[11px] text-ink-3 truncate">{roleBadgeLabel}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/escaner"
                  className="hidden sm:inline-flex h-9 items-center gap-1.5 rounded-full border border-line-strong px-3.5 text-xs font-medium text-ink transition-colors hover:border-ink"
                >
                  <QrCode strokeWidth={1.5} className="h-4 w-4" />
                  Escáner QR
                </Link>

                <Link
                  href="/eventos/nuevo"
                  className="hidden sm:inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-xs font-medium text-surface transition-colors hover:bg-ink-2"
                >
                  <CalendarPlus strokeWidth={1.5} className="h-4 w-4" />
                  Registrar Evento
                </Link>

                <NotificationBell initialUnread={unreadNotifications} />

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  title="Cerrar sesión"
                  aria-label="Cerrar sesión"
                  className="inline-flex lg:hidden h-9 w-9 items-center justify-center rounded-full border border-line-strong text-ink-2 transition-colors hover:border-bad hover:text-bad"
                >
                  <LogOut strokeWidth={1.5} className="h-4 w-4" />
                </button>
              </div>
            </div>
          </header>

          {/* Contenido de la Página */}
          <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[1440px] w-full mx-auto print:max-w-none print:p-0">
            <AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>
          </main>
        </div>
      </div>

      {/* Barra inferior fija para móvil y tablet */}
      <nav
        aria-label="Navegación principal móvil"
        className="fixed bottom-0 inset-x-0 z-40 border-t border-line bg-surface lg:hidden pb-[env(safe-area-inset-bottom)] print:hidden"
      >
        <div
          className={`grid ${
            canAuthorize ? 'grid-cols-5' : 'grid-cols-4'
          } h-16 max-w-2xl mx-auto`}
        >
          <Link href="/dashboard" className={mobileTab(pathname === '/dashboard')}>
            {pathname === '/dashboard' && mobileTabBar}
            <LayoutDashboard strokeWidth={1.5} className="h-5 w-5" />
            <span className="truncate">Inicio</span>
          </Link>

          <Link href="/calendario" className={mobileTab(pathname.startsWith('/calendario'))}>
            {pathname.startsWith('/calendario') && mobileTabBar}
            <CalendarDays strokeWidth={1.5} className="h-5 w-5" />
            <span className="truncate">Calendario</span>
          </Link>

          <Link
            href="/eventos"
            className={mobileTab(pathname.startsWith('/eventos') && pathname !== '/eventos/nuevo')}
          >
            {pathname.startsWith('/eventos') && pathname !== '/eventos/nuevo' && mobileTabBar}
            <ClipboardList strokeWidth={1.5} className="h-5 w-5" />
            <span className="truncate">Mis eventos</span>
          </Link>

          {canAuthorize && (
            <Link
              href="/autorizaciones"
              className={mobileTab(pathname.startsWith('/autorizaciones'))}
            >
              {pathname.startsWith('/autorizaciones') && mobileTabBar}
              <ShieldCheck strokeWidth={1.5} className="h-5 w-5" />
              <span className="truncate">Autorizar</span>
              {pendingAuthorizationsCount > 0 && (
                <span className="absolute top-1.5 right-3 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-warn px-1 font-mono text-[11px] font-semibold text-surface">
                  {pendingAuthorizationsCount}
                </span>
              )}
            </Link>
          )}

          <button
            type="button"
            onClick={() => setMobileMoreOpen(true)}
            className={mobileTab(mobileMoreOpen || isMoreSectionActive)}
          >
            {(mobileMoreOpen || isMoreSectionActive) && mobileTabBar}
            <Menu strokeWidth={1.5} className="h-5 w-5" />
            <span className="truncate">Más</span>
            {unreadNotifications > 0 && (
              <span className="absolute top-1.5 right-4 h-2 w-2 rounded-full bg-bad" />
            )}
          </button>
        </div>
      </nav>

      {/* Hoja inferior "Más" en móvil y tablet */}
      {mobileMoreOpen && (
        <div
          className="fixed inset-0 z-50 bg-ink/50 lg:hidden flex items-end"
          onClick={() => setMobileMoreOpen(false)}
        >
          <div
            className="w-full max-w-2xl mx-auto rounded-t-[20px] border-t border-line bg-surface p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-float space-y-4 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-line-strong mx-auto" />
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink truncate">{user.fullName}</p>
                <p className="font-mono text-[11px] text-ink-3 truncate">
                  @{user.username} · {roleBadgeLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMobileMoreOpen(false)}
                className="rounded-full p-2 text-ink-2 hover:bg-sunk shrink-0"
                aria-label="Cerrar menú"
              >
                <X strokeWidth={1.5} className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <Link href="/escaner" onClick={() => setMobileMoreOpen(false)} className={sheetTile}>
                <QrCode strokeWidth={1.5} className="h-4 w-4 shrink-0" />
                Escáner QR
              </Link>

              <Link
                href="/eventos/nuevo"
                onClick={() => setMobileMoreOpen(false)}
                className={sheetTile}
              >
                <CalendarPlus strokeWidth={1.5} className="h-4 w-4 shrink-0" />
                Nuevo evento
              </Link>

              <Link href="/reportes" onClick={() => setMobileMoreOpen(false)} className={sheetTile}>
                <FileBarChart2 strokeWidth={1.5} className="h-4 w-4 shrink-0" />
                Reportes
              </Link>

              {isSuperAdmin && (
                <Link href="/admin" onClick={() => setMobileMoreOpen(false)} className={sheetTile}>
                  <Settings strokeWidth={1.5} className="h-4 w-4 shrink-0" />
                  Administración
                </Link>
              )}

              <button
                type="button"
                onClick={() => void toggleMobileNotifications()}
                className={`col-span-2 justify-between ${sheetTile}`}
              >
                <span className="flex items-center gap-2.5">
                  <Bell strokeWidth={1.5} className="h-4 w-4 shrink-0" />
                  Notificaciones
                </span>
                {unreadNotifications > 0 && (
                  <span className="rounded-full bg-bad-soft px-2 py-0.5 font-mono text-[11px] font-semibold text-bad">
                    {unreadNotifications} sin leer
                  </span>
                )}
              </button>
            </div>

            {mobileNotifOpen && (
              <div className="border-t border-line max-h-48 overflow-y-auto divide-y divide-line">
                {loadingMobileNotifs ? (
                  <p className="text-xs text-ink-3 py-3">Cargando notificaciones...</p>
                ) : mobileNotifs.length === 0 ? (
                  <p className="text-xs text-ink-3 py-3">Sin notificaciones recientes.</p>
                ) : (
                  mobileNotifs.map((n) => (
                    <Link
                      key={n.id}
                      href={n.link || '/dashboard'}
                      onClick={() => setMobileMoreOpen(false)}
                      className="flex items-start gap-2.5 py-2.5 text-xs"
                    >
                      <span
                        className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                          n.isRead ? 'bg-line-strong' : 'bg-accent'
                        }`}
                      />
                      <span className="min-w-0">
                        <span
                          className={`block truncate ${
                            n.isRead ? 'text-ink-2' : 'font-semibold text-ink'
                          }`}
                        >
                          {n.title}
                        </span>
                        <span className="block text-[11px] text-ink-3 line-clamp-2">
                          {n.message}
                        </span>
                      </span>
                    </Link>
                  ))
                )}
              </div>
            )}

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-bad px-4 py-3 text-xs font-semibold text-bad hover:bg-bad hover:text-surface min-h-[44px] transition-colors"
            >
              <LogOut strokeWidth={1.5} className="h-4 w-4" />
              {loggingOut ? 'Cerrando sesión...' : `Cerrar sesión (@${user.username})`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
