'use client';

import React, { createContext, useContext, useMemo, useRef, useState } from 'react';
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
  QrCode,
  Bell,
  Search,
  CornerDownLeft,
} from 'lucide-react';
import { SessionUser } from '@/types';
import { NotificationBell } from './NotificationBell';

const AuthContext = createContext<{ user: SessionUser | null }>({ user: null });

export function useAuth() {
  return useContext(AuthContext);
}

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  visible: boolean;
  badge?: number;
  group: 'MENU' | 'GENERAL';
  keywords?: string;
}

interface AppShellProps {
  user: SessionUser;
  unreadNotifications: number;
  pendingAuthorizationsCount: number;
  children: React.ReactNode;
}

function getInitials(fullName: string) {
  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
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
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

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

  const navItems: NavItem[] = [
    {
      label: 'Inicio',
      href: '/dashboard',
      icon: LayoutDashboard,
      visible: true,
      group: 'MENU',
      keywords: 'panel dashboard indicadores metricas',
    },
    {
      label: 'Mis eventos',
      href: '/eventos',
      icon: ClipboardList,
      visible: true,
      group: 'MENU',
      keywords: 'expedientes ciclo de vida evidencias',
    },
    {
      label: 'Nuevo evento',
      href: '/eventos/nuevo',
      icon: CalendarPlus,
      visible: true,
      group: 'MENU',
      keywords: 'registrar solicitar reservar espacio',
    },
    {
      label: 'Calendario',
      href: '/calendario',
      icon: CalendarDays,
      visible: true,
      group: 'MENU',
      keywords: 'disponibilidad agenda ocupacion',
    },
    {
      label: 'Autorizaciones',
      href: '/autorizaciones',
      icon: ShieldCheck,
      visible: canAuthorize,
      badge: pendingAuthorizationsCount > 0 ? pendingAuthorizationsCount : undefined,
      group: 'GENERAL',
      keywords: 'aprobar rechazar bandeja solicitudes',
    },
    {
      label: 'Escáner QR',
      href: '/escaner',
      icon: QrCode,
      visible: true,
      group: 'GENERAL',
      keywords: 'asistencia check-in acceso lector',
    },
    {
      label: 'Reportes',
      href: '/reportes',
      icon: FileBarChart2,
      visible: true,
      group: 'GENERAL',
      keywords: 'metricas pdf csv excel exportar estadisticas',
    },
    {
      label: 'Administración',
      href: '/admin',
      icon: Settings,
      visible: isSuperAdmin,
      group: 'GENERAL',
      keywords: 'usuarios edificios espacios catalogos auditoria',
    },
  ];

  const visibleNav = navItems.filter((item) => item.visible);

  const searchResults = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];
    return visibleNav
      .filter(
        (item) =>
          item.label.toLowerCase().includes(term) ||
          (item.keywords || '').toLowerCase().includes(term)
      )
      .slice(0, 5);
  }, [search, visibleNav]);

  const isActive = (href: string) =>
    pathname === href ||
    (href === '/eventos' && pathname.startsWith('/eventos') && pathname !== '/eventos/nuevo') ||
    (href !== '/eventos' && href !== '/dashboard' && pathname.startsWith(href));

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const goToResult = (href: string) => {
    setSearch('');
    setSearchFocused(false);
    searchRef.current?.blur();
    router.push(href);
  };

  const roleShortLabel =
    user.role === 'SUPER_ADMIN'
      ? 'Administrador General'
      : user.role === 'EXTENSION'
      ? 'Extensión Universitaria'
      : user.buildingName || 'Dirección de Edificio';

  const roleBadgeLabel =
    user.role === 'SUPER_ADMIN'
      ? 'SUPER_ADMIN · Administrador General'
      : user.role === 'EXTENSION'
      ? 'EXTENSION · Extensión Universitaria'
      : `DIRECTOR · ${user.buildingName || 'Edificio Asignado'}`;

  const renderNavGroup = (group: 'MENU' | 'GENERAL') => {
    const items = visibleNav.filter((item) => item.group === group);
    if (items.length === 0) return null;

    return (
      <div className="space-y-0.5">
        <p className="px-3 pb-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted">
          {group}
        </p>
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`group relative flex items-center justify-between rounded-xl py-2 pl-3 pr-2.5 text-[13px] transition-colors duration-200 ease-out ${
                active
                  ? 'bg-surface font-semibold text-ink shadow-card'
                  : 'font-medium text-muted hover:bg-surface/70 hover:text-ink'
              }`}
            >
              {active && (
                <span className="absolute -left-2 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-brand" />
              )}
              <span className="flex min-w-0 items-center gap-2.5">
                <Icon
                  className={`h-[17px] w-[17px] shrink-0 transition-colors ${
                    active ? 'text-brand' : 'text-muted group-hover:text-brand'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </span>
              {item.badge !== undefined && (
                <span className="ml-1 shrink-0 rounded-full bg-brand-gold-soft px-1.5 py-0.5 text-[10px] font-bold text-[#A47B1E]">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-app lg:p-3.5 print:bg-white print:p-0">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col overflow-hidden bg-surface lg:min-h-[calc(100vh-1.75rem)] lg:flex-row lg:rounded-shell lg:shadow-shell print:block print:max-w-none print:rounded-none print:shadow-none">
        {/* ================= SIDEBAR (escritorio) ================= */}
        <aside className="hidden shrink-0 lg:flex lg:w-[224px] lg:flex-col lg:gap-4 lg:p-2.5 print:hidden">
          <div className="flex flex-1 flex-col rounded-[20px] bg-surface-sidebar p-3.5">
            {/* Logotipo */}
            <Link href="/dashboard" className="mb-5 flex items-center gap-2.5 px-1.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-deep text-white">
                <Building2 className="h-[18px] w-[18px]" />
              </span>
              <span className="min-w-0">
                <span className="block text-[15px] font-bold leading-tight tracking-tight text-ink">
                  SREU · UTC
                </span>
                <span className="block truncate text-[10px] text-muted">
                  Espacios y asistencia
                </span>
              </span>
            </Link>

            {/* Navegación */}
            <nav className="flex-1 space-y-4 overflow-y-auto scrollbar-slim">
              {renderNavGroup('MENU')}
              {renderNavGroup('GENERAL')}
            </nav>

            {/* Banner informativo inferior (guía §4) */}
            <div className="relative mt-5 overflow-hidden rounded-[18px] bg-brand-deep p-3.5 text-white">
              <span
                aria-hidden
                className="pointer-events-none absolute -right-7 -top-7 h-20 w-20 rounded-full border border-white/10"
              />
              <span
                aria-hidden
                className="pointer-events-none absolute -bottom-9 -left-5 h-24 w-24 rounded-full border border-white/10"
              />
              <p className="relative text-[10px] font-semibold uppercase tracking-[0.1em] text-brand-gold">
                Control de acceso
              </p>
              <p className="relative mt-1 text-[12px] font-semibold leading-snug">
                Valida entradas con el lector QR institucional
              </p>
              <Link
                href="/escaner"
                className="relative mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand px-3 py-2 text-[11px] font-semibold text-white transition-colors hover:bg-[#0a8a5d]"
              >
                <QrCode className="h-3.5 w-3.5" />
                Abrir escáner
              </Link>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-[11px] font-semibold text-muted transition-colors hover:border-state-danger/40 hover:bg-[#F9E8E7] hover:text-[#B85D59] disabled:opacity-60"
            >
              <LogOut className="h-3.5 w-3.5" />
              {loggingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
            </button>
          </div>
        </aside>

        {/* ================= ÁREA DE CONTENIDO ================= */}
        <div className="flex min-w-0 flex-1 flex-col pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0 print:block print:pb-0">
          {/* Topbar */}
          <header className="sticky top-0 z-30 border-b border-line bg-surface/95 px-4 backdrop-blur sm:px-6 lg:px-7 print:hidden">
            <div className="flex h-[66px] items-center justify-between gap-3">
              {/* Buscador */}
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-deep text-white lg:hidden">
                  <Building2 className="h-[18px] w-[18px]" />
                </span>

                <div className="relative w-full max-w-sm">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => window.setTimeout(() => setSearchFocused(false), 120)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && searchResults[0]) goToResult(searchResults[0].href);
                      if (e.key === 'Escape') {
                        setSearch('');
                        searchRef.current?.blur();
                      }
                    }}
                    placeholder="Buscar sección o acción…"
                    aria-label="Buscar una sección del sistema"
                    className="h-10 w-full rounded-control border border-transparent bg-surface-muted pl-10 pr-14 text-xs text-ink placeholder:text-muted focus:border-line focus:bg-surface focus:outline-none"
                  />
                  <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded-md border border-line bg-surface px-1.5 py-0.5 text-[9px] font-semibold text-muted sm:flex">
                    <CornerDownLeft className="h-2.5 w-2.5" />
                    Ir
                  </kbd>

                  {searchFocused && search.trim().length > 0 && (
                    <div className="absolute left-0 right-0 top-12 z-40 overflow-hidden rounded-card border border-line bg-surface p-1.5 shadow-hover">
                      {searchResults.length === 0 ? (
                        <p className="px-3 py-2.5 text-[11px] text-muted">
                          Sin coincidencias para “{search.trim()}”.
                        </p>
                      ) : (
                        searchResults.map((item) => {
                          const Icon = item.icon;
                          return (
                            <button
                              key={item.href}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => goToResult(item.href)}
                              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium text-ink transition-colors hover:bg-surface-muted"
                            >
                              <Icon className="h-4 w-4 shrink-0 text-brand" />
                              <span className="truncate">{item.label}</span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Acciones y perfil */}
              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href="/eventos/nuevo"
                  className="hidden items-center gap-1.5 rounded-xl bg-brand px-3.5 py-2 text-[11px] font-semibold text-white transition-colors hover:bg-brand-dark sm:inline-flex"
                >
                  <CalendarPlus className="h-3.5 w-3.5" />
                  Registrar evento
                </Link>

                <NotificationBell initialUnread={unreadNotifications} />

                <div className="hidden items-center gap-2.5 border-l border-line pl-3 lg:flex">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft text-[11px] font-bold text-brand-deep">
                    {getInitials(user.fullName)}
                  </span>
                  <span className="min-w-0 max-w-[150px]">
                    <span className="block truncate text-[12px] font-semibold text-ink">
                      {user.fullName}
                    </span>
                    <span className="block truncate text-[10px] text-muted">{roleShortLabel}</span>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  title="Cerrar sesión"
                  aria-label="Cerrar sesión"
                  className="ui-icon-btn lg:hidden"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </header>

          {/* Contenido de la página */}
          <main className="mx-auto w-full max-w-[1420px] flex-1 px-4 py-5 sm:px-6 lg:px-7 lg:py-6 print:max-w-none print:p-0">
            <AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>
          </main>
        </div>
      </div>

      {/* ================= NAVEGACIÓN INFERIOR (móvil/tablet) ================= */}
      <nav
        aria-label="Navegación principal móvil"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(20,35,28,0.06)] lg:hidden print:hidden"
      >
        <div
          className={`mx-auto grid h-16 max-w-2xl ${
            canAuthorize ? 'grid-cols-5' : 'grid-cols-4'
          }`}
        >
          {[
            { href: '/dashboard', label: 'Inicio', icon: LayoutDashboard, active: pathname === '/dashboard' },
            {
              href: '/calendario',
              label: 'Calendario',
              icon: CalendarDays,
              active: pathname.startsWith('/calendario'),
            },
            {
              href: '/eventos',
              label: 'Mis eventos',
              icon: ClipboardList,
              active: pathname.startsWith('/eventos') && pathname !== '/eventos/nuevo',
            },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`relative flex min-h-[44px] flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors ${
                  tab.active ? 'text-brand-deep' : 'text-muted hover:text-ink'
                }`}
              >
                {tab.active && (
                  <span className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-brand" />
                )}
                <Icon className="h-5 w-5" />
                <span className="truncate">{tab.label}</span>
              </Link>
            );
          })}

          {canAuthorize && (
            <Link
              href="/autorizaciones"
              className={`relative flex min-h-[44px] flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors ${
                pathname.startsWith('/autorizaciones') ? 'text-brand-deep' : 'text-muted hover:text-ink'
              }`}
            >
              {pathname.startsWith('/autorizaciones') && (
                <span className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-brand" />
              )}
              <ShieldCheck className="h-5 w-5" />
              <span className="truncate">Autorizar</span>
              {pendingAuthorizationsCount > 0 && (
                <span className="absolute right-3 top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand-gold px-1 text-[10px] font-bold text-white">
                  {pendingAuthorizationsCount}
                </span>
              )}
            </Link>
          )}

          <button
            type="button"
            onClick={() => setMobileMoreOpen(true)}
            className={`relative flex min-h-[44px] flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors ${
              mobileMoreOpen || isMoreSectionActive ? 'text-brand-deep' : 'text-muted hover:text-ink'
            }`}
          >
            {(mobileMoreOpen || isMoreSectionActive) && (
              <span className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-brand" />
            )}
            <Menu className="h-5 w-5" />
            <span className="truncate">Más</span>
            {unreadNotifications > 0 && (
              <span className="absolute right-4 top-1.5 h-2 w-2 rounded-full bg-state-danger" />
            )}
          </button>
        </div>
      </nav>

      {/* ================= HOJA INFERIOR "MÁS" ================= */}
      {mobileMoreOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-ink/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMoreOpen(false)}
        >
          <div
            className="mx-auto max-h-[85vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-t-shell bg-surface p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto h-1 w-10 rounded-full bg-line" />
            <div className="flex items-center justify-between gap-3 border-b border-line pb-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand-deep">
                  {getInitials(user.fullName)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{user.fullName}</p>
                  <p className="truncate text-[11px] text-muted">
                    @{user.username} · {roleBadgeLabel}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMoreOpen(false)}
                className="ui-icon-btn shrink-0"
                aria-label="Cerrar menú"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <Link
                href="/escaner"
                onClick={() => setMobileMoreOpen(false)}
                className="flex min-h-[48px] items-center gap-2.5 rounded-xl border border-brand/20 bg-brand-soft/60 p-3.5 text-xs font-semibold text-brand-deep"
              >
                <QrCode className="h-4 w-4 shrink-0 text-brand" />
                Escáner QR
              </Link>

              <Link
                href="/eventos/nuevo"
                onClick={() => setMobileMoreOpen(false)}
                className="flex min-h-[48px] items-center gap-2.5 rounded-xl border border-line p-3.5 text-xs font-semibold text-ink"
              >
                <CalendarPlus className="h-4 w-4 shrink-0 text-brand" />
                Nuevo evento
              </Link>

              <Link
                href="/reportes"
                onClick={() => setMobileMoreOpen(false)}
                className="flex min-h-[48px] items-center gap-2.5 rounded-xl border border-line p-3.5 text-xs font-semibold text-ink"
              >
                <FileBarChart2 className="h-4 w-4 shrink-0 text-brand" />
                Reportes
              </Link>

              {isSuperAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setMobileMoreOpen(false)}
                  className="flex min-h-[48px] items-center gap-2.5 rounded-xl border border-line p-3.5 text-xs font-semibold text-ink"
                >
                  <Settings className="h-4 w-4 shrink-0 text-brand" />
                  Administración
                </Link>
              )}

              <button
                type="button"
                onClick={() => void toggleMobileNotifications()}
                className="col-span-2 flex min-h-[48px] items-center justify-between rounded-xl border border-line p-3.5 text-xs font-semibold text-ink"
              >
                <span className="flex items-center gap-2.5">
                  <Bell className="h-4 w-4 shrink-0 text-brand-gold" />
                  Notificaciones
                </span>
                {unreadNotifications > 0 && (
                  <span className="ui-chip-pending">{unreadNotifications} sin leer</span>
                )}
              </button>
            </div>

            {mobileNotifOpen && (
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-card border border-line bg-surface-muted p-3">
                {loadingMobileNotifs ? (
                  <p className="py-2 text-center text-[11px] text-muted">
                    Cargando notificaciones…
                  </p>
                ) : mobileNotifs.length === 0 ? (
                  <p className="py-2 text-center text-[11px] text-muted">
                    Sin notificaciones recientes.
                  </p>
                ) : (
                  mobileNotifs.map((n) => (
                    <Link
                      key={n.id}
                      href={n.link || '/dashboard'}
                      onClick={() => setMobileMoreOpen(false)}
                      className={`block rounded-xl border p-2.5 text-xs ${
                        n.isRead
                          ? 'border-line bg-surface text-muted'
                          : 'border-brand/20 bg-brand-soft/60 font-semibold text-ink'
                      }`}
                    >
                      <p className="truncate font-semibold">{n.title}</p>
                      <p className="line-clamp-2 text-[11px] opacity-80">{n.message}</p>
                    </Link>
                  ))
                )}
              </div>
            )}

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-brand-deep px-4 py-3 text-xs font-semibold text-white"
            >
              <LogOut className="h-4 w-4" />
              {loggingOut ? 'Cerrando sesión…' : `Cerrar sesión (@${user.username})`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
