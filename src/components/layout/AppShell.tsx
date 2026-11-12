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
  Building2,
  Menu,
  X,
  UserCheck,
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col overflow-x-hidden">
      <div className="flex-1 flex">
        {/* Sidebar para Escritorio (Sección 21) */}
        <aside className="hidden lg:flex lg:w-72 lg:flex-col lg:border-r lg:border-slate-200 lg:bg-slate-900 lg:text-slate-100 shrink-0">
          <div className="p-6 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold shadow-lg">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-base font-extrabold tracking-tight text-white">SREU · UTC</h1>
                <p className="text-xs text-slate-400">Reservación y Asistencia QR</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-slate-800/90 p-3 border border-slate-700/80">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                <p className="text-xs font-bold text-white truncate">{user.fullName}</p>
              </div>
              <p className="mt-1 text-[11px] font-medium text-emerald-300">{roleBadgeLabel}</p>
              <p className="text-[11px] text-slate-400 truncate">Usuario: @{user.username}</p>
            </div>
          </div>

          <nav className="flex-1 px-4 py-5 space-y-1.5 overflow-y-auto">
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
                    className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                      active
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </span>
                    {item.badge !== undefined && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                          active
                            ? 'bg-white text-emerald-900'
                            : 'bg-amber-500 text-slate-950'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
          </nav>

          <div className="p-4 border-t border-slate-800">
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-200 transition hover:bg-rose-600 hover:border-rose-500 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              {loggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
            </button>
          </div>
        </aside>

        {/* Contenedor Principal */}
        <div className="flex-1 flex flex-col min-w-0 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0">
          {/* Header Superior */}
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur px-4 sm:px-6 lg:px-8 py-3.5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex lg:hidden h-9 w-9 items-center justify-center rounded-xl bg-emerald-700 text-white font-bold">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                    Sistema de Reservación de Espacios Universitarios
                  </h2>
                  <p className="text-xs text-slate-500 truncate">{roleBadgeLabel}</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <Link
                  href="/escaner"
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-sm transition hover:bg-slate-50"
                >
                  <QrCode className="h-4 w-4 text-emerald-700" />
                  Escáner QR
                </Link>

                <Link
                  href="/eventos/nuevo"
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-800"
                >
                  <CalendarPlus className="h-4 w-4" />
                  Registrar Evento
                </Link>

                <NotificationBell initialUnread={unreadNotifications} />

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  title="Cerrar sesión"
                  className="inline-flex lg:hidden items-center justify-center rounded-xl border border-slate-200 bg-white p-2.5 text-slate-700 hover:bg-rose-50 hover:text-rose-700"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>
          </header>

          {/* Contenido de la Página */}
          <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl w-full mx-auto">
            <AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>
          </main>
        </div>
      </div>

      {/* Barra Inferior Fija para Móvil y Tablet */}
      <nav
        aria-label="Navegación principal móvil"
        className="fixed bottom-0 inset-x-0 z-40 border-t border-slate-200 bg-white lg:hidden shadow-[0_-4px_16px_rgba(15,23,42,0.06)] pb-[env(safe-area-inset-bottom)]"
      >
        <div
          className={`grid ${
            canAuthorize ? 'grid-cols-5' : 'grid-cols-4'
          } h-16 max-w-2xl mx-auto`}
        >
          <Link
            href="/dashboard"
            className={`relative flex flex-col items-center justify-center gap-1 min-h-[44px] text-[11px] font-semibold transition-colors ${
              pathname === '/dashboard'
                ? 'text-emerald-700'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {pathname === '/dashboard' && (
              <span className="absolute top-0 inset-x-4 h-0.5 rounded-full bg-emerald-600" />
            )}
            <LayoutDashboard className="h-5 w-5" />
            <span className="truncate">Inicio</span>
          </Link>

          <Link
            href="/calendario"
            className={`relative flex flex-col items-center justify-center gap-1 min-h-[44px] text-[11px] font-semibold transition-colors ${
              pathname.startsWith('/calendario')
                ? 'text-emerald-700'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {pathname.startsWith('/calendario') && (
              <span className="absolute top-0 inset-x-4 h-0.5 rounded-full bg-emerald-600" />
            )}
            <CalendarDays className="h-5 w-5" />
            <span className="truncate">Calendario</span>
          </Link>

          <Link
            href="/eventos"
            className={`relative flex flex-col items-center justify-center gap-1 min-h-[44px] text-[11px] font-semibold transition-colors ${
              pathname.startsWith('/eventos') && pathname !== '/eventos/nuevo'
                ? 'text-emerald-700'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {pathname.startsWith('/eventos') && pathname !== '/eventos/nuevo' && (
              <span className="absolute top-0 inset-x-4 h-0.5 rounded-full bg-emerald-600" />
            )}
            <ClipboardList className="h-5 w-5" />
            <span className="truncate">Mis eventos</span>
          </Link>

          {canAuthorize && (
            <Link
              href="/autorizaciones"
              className={`relative flex flex-col items-center justify-center gap-1 min-h-[44px] text-[11px] font-semibold transition-colors ${
                pathname.startsWith('/autorizaciones')
                  ? 'text-emerald-700'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {pathname.startsWith('/autorizaciones') && (
                <span className="absolute top-0 inset-x-4 h-0.5 rounded-full bg-emerald-600" />
              )}
              <ShieldCheck className="h-5 w-5" />
              <span className="truncate">Autorizar</span>
              {pendingAuthorizationsCount > 0 && (
                <span className="absolute top-1.5 right-3 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-slate-950">
                  {pendingAuthorizationsCount}
                </span>
              )}
            </Link>
          )}

          <button
            type="button"
            onClick={() => setMobileMoreOpen(true)}
            className={`relative flex flex-col items-center justify-center gap-1 min-h-[44px] text-[11px] font-semibold transition-colors ${
              mobileMoreOpen || isMoreSectionActive
                ? 'text-emerald-700'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {(mobileMoreOpen || isMoreSectionActive) && (
              <span className="absolute top-0 inset-x-4 h-0.5 rounded-full bg-emerald-600" />
            )}
            <Menu className="h-5 w-5" />
            <span className="truncate">Más</span>
            {unreadNotifications > 0 && (
              <span className="absolute top-1.5 right-4 h-2 w-2 rounded-full bg-rose-500" />
            )}
          </button>
        </div>
      </nav>

      {/* Bottom Sheet "Más" en Móvil y Tablet */}
      {mobileMoreOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm lg:hidden flex items-end"
          onClick={() => setMobileMoreOpen(false)}
        >
          <div
            className="w-full max-w-2xl mx-auto rounded-t-3xl bg-white p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-slate-200 mx-auto" />
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">{user.fullName}</p>
                <p className="text-xs text-slate-500 truncate">
                  @{user.username} · {roleBadgeLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMobileMoreOpen(false)}
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 shrink-0"
                aria-label="Cerrar menú"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <Link
                href="/escaner"
                onClick={() => setMobileMoreOpen(false)}
                className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs font-bold text-emerald-900 hover:bg-emerald-100 min-h-[48px]"
              >
                <QrCode className="h-4 w-4 text-emerald-700 shrink-0" />
                Escáner QR
              </Link>

              <Link
                href="/eventos/nuevo"
                onClick={() => setMobileMoreOpen(false)}
                className="flex items-center gap-2.5 rounded-xl border border-slate-200 p-3.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 min-h-[48px]"
              >
                <CalendarPlus className="h-4 w-4 text-emerald-600 shrink-0" />
                Nuevo evento
              </Link>

              <Link
                href="/reportes"
                onClick={() => setMobileMoreOpen(false)}
                className="flex items-center gap-2.5 rounded-xl border border-slate-200 p-3.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 min-h-[48px]"
              >
                <FileBarChart2 className="h-4 w-4 text-emerald-700 shrink-0" />
                Reportes
              </Link>

              {isSuperAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setMobileMoreOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl border border-slate-200 p-3.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 min-h-[48px]"
                >
                  <Settings className="h-4 w-4 text-purple-600 shrink-0" />
                  Administración
                </Link>
              )}

              <button
                type="button"
                onClick={() => void toggleMobileNotifications()}
                className="col-span-2 flex items-center justify-between rounded-xl border border-slate-200 p-3.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 min-h-[48px]"
              >
                <span className="flex items-center gap-2.5">
                  <Bell className="h-4 w-4 text-amber-600 shrink-0" />
                  Notificaciones
                </span>
                {unreadNotifications > 0 && (
                  <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white">
                    {unreadNotifications} sin leer
                  </span>
                )}
              </button>
            </div>

            {mobileNotifOpen && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2 max-h-48 overflow-y-auto">
                {loadingMobileNotifs ? (
                  <p className="text-xs text-slate-500 text-center py-2">
                    Cargando notificaciones...
                  </p>
                ) : mobileNotifs.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-2">
                    Sin notificaciones recientes.
                  </p>
                ) : (
                  mobileNotifs.map((n) => (
                    <Link
                      key={n.id}
                      href={n.link || '/dashboard'}
                      onClick={() => setMobileMoreOpen(false)}
                      className={`block rounded-lg p-2.5 text-xs border ${
                        n.isRead
                          ? 'bg-white border-slate-200 text-slate-600'
                          : 'bg-emerald-50 border-emerald-200 text-slate-900 font-semibold'
                      }`}
                    >
                      <p className="font-bold truncate">{n.title}</p>
                      <p className="text-[11px] opacity-80 line-clamp-2">{n.message}</p>
                    </Link>
                  ))
                )}
              </div>
            )}

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-xs font-bold text-white shadow hover:bg-rose-700 min-h-[44px]"
            >
              <LogOut className="h-4 w-4" />
              {loggingOut ? 'Cerrando sesión...' : `Cerrar sesión (@${user.username})`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
