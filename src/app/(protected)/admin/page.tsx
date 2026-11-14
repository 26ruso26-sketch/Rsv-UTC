'use client';

import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  UserPlus,
  Building2,
  MapPin,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  GraduationCap,
  Layers,
  Briefcase,
  Plus,
} from 'lucide-react';
import { getRoleLabel } from '@/lib/utils';

interface AdminUser {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: string;
  buildingId: string | null;
  building?: { id: string; code: string; name: string } | null;
  departmentLabel: string | null;
  active: boolean;
}

interface BuildingItem {
  id: string;
  code: string;
  name: string;
}

interface SpaceItem {
  id: string;
  code: string;
  name: string;
  location: string;
  capacity: number;
  authorizerType: string;
  authorizer: { fullName: string; username: string };
}

interface CareerItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  active: boolean;
}

interface GradeItem {
  id: string;
  code: string;
  name: string;
  levelOrder: number;
  active: boolean;
}

interface DeptItem {
  id: string;
  code: string;
  name: string;
  areaType: string;
  active: boolean;
}

export default function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [buildings, setBuildings] = useState<BuildingItem[]>([]);
  const [spaces, setSpaces] = useState<SpaceItem[]>([]);
  const [careers, setCareers] = useState<CareerItem[]>([]);
  const [academicGrades, setAcademicGrades] = useState<GradeItem[]>([]);
  const [departmentAreas, setDepartmentAreas] = useState<DeptItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'USERS' | 'CATALOGS' | 'SPACES'>('USERS');

  // Create user form
  const [showCreate, setShowCreate] = useState(false);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'SUPER_ADMIN' | 'DIRECTOR' | 'EXTENSION'>('DIRECTOR');
  const [buildingId, setBuildingId] = useState('');
  const [departmentLabel, setDepartmentLabel] = useState('');

  // Reset password modal
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [editBuildingId, setEditBuildingId] = useState('');
  const [editActive, setEditActive] = useState(true);

  // Create catalog item form (Section 10)
  const [catalogType, setCatalogType] = useState<'CAREER' | 'GRADE' | 'DEPARTMENT'>('CAREER');
  const [catCode, setCatCode] = useState('');
  const [catName, setCatName] = useState('');
  const [catDescription, setCatDescription] = useState('');
  const [catLevelOrder, setCatLevelOrder] = useState(1);
  const [catAreaType, setCatAreaType] = useState<'ACADEMIC' | 'ADMINISTRATIVE'>('ACADEMIC');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  async function loadData() {
    setLoading(true);
    try {
      const [usersRes, catalogsRes, adminCatalogsRes] = await Promise.all([
        fetch('/api/users').then((r) => r.json()),
        fetch('/api/catalogs').then((r) => r.json()),
        fetch('/api/admin/catalogs').then((r) => r.json()),
      ]);
      setUsers(usersRes.users || []);
      setBuildings(catalogsRes.buildings || []);
      setSpaces(catalogsRes.spaces || []);
      setCareers(adminCatalogsRes.careers || []);
      setAcademicGrades(adminCatalogsRes.academicGrades || []);
      setDepartmentAreas(adminCatalogsRes.departmentAreas || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setFeedback('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          fullName,
          email,
          password,
          role,
          buildingId: role === 'DIRECTOR' ? buildingId : null,
          departmentLabel,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo crear el usuario.');
      } else {
        setFeedback(`Usuario "${data.user.username}" creado correctamente.`);
        setShowCreate(false);
        setUsername('');
        setFullName('');
        setEmail('');
        setPassword('');
        await loadData();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    setError('');
    setFeedback('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingUser.id,
          buildingId: editingUser.role === 'DIRECTOR' ? editBuildingId : null,
          active: editActive,
          newPassword: newPassword.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error al actualizar el usuario.');
      } else {
        setFeedback(`Cuenta @${editingUser.username} actualizada.`);
        setEditingUser(null);
        setNewPassword('');
        await loadData();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateCatalogItem(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setFeedback('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/admin/catalogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          catalogType,
          code: catCode,
          name: catName,
          description: catDescription,
          levelOrder: catLevelOrder,
          areaType: catAreaType,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error al agregar registro al catálogo.');
      } else {
        setFeedback(`Registro "${catName}" agregado exitosamente al catálogo.`);
        setCatCode('');
        setCatName('');
        setCatDescription('');
        await loadData();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleCatalogActive(
    type: 'CAREER' | 'GRADE' | 'DEPARTMENT',
    id: string,
    currentActive: boolean
  ) {
    setError('');
    setFeedback('');
    const res = await fetch('/api/admin/catalogs', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        catalogType: type,
        id,
        active: !currentActive,
      }),
    });
    if (res.ok) {
      setFeedback('Estado del catálogo actualizado.');
      await loadData();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-semibold text-ink">
            Administración Institucional (SUPER_ADMIN)
          </h1>
          <p className="text-xs text-ink-3 mt-0.5">
            Gestión de usuarios, asociación de directores por edificio y catálogos institucionales
            de Fase 1 y Fase 2
          </p>
        </div>
        {tab === 'USERS' && (
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-ink hover:bg-ink-2 text-surface text-xs font-medium"
          >
            <UserPlus className="w-4 h-4" />
            Crear Nuevo Usuario
          </button>
        )}
      </div>

      {/* Section Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-line pb-3">
        <button
          onClick={() => setTab('USERS')}
          className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 ${
            tab === 'USERS'
              ? 'bg-ink text-surface'
              : 'bg-surface border border-line text-ink-2 hover:bg-paper'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Usuarios y Directores ({users.length})
        </button>
        <button
          onClick={() => setTab('CATALOGS')}
          className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 ${
            tab === 'CATALOGS'
              ? 'bg-ink text-surface'
              : 'bg-surface border border-line text-ink-2 hover:bg-paper'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          Catálogos Académicos y Departamentos (Fase 2)
        </button>
        <button
          onClick={() => setTab('SPACES')}
          className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 ${
            tab === 'SPACES'
              ? 'bg-ink text-surface'
              : 'bg-surface border border-line text-ink-2 hover:bg-paper'
          }`}
        >
          <MapPin className="w-4 h-4" />
          Catálogo de Espacios ({spaces.length})
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-bad-soft border border-bad/30 text-bad text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {feedback && (
        <div className="p-3.5 rounded-xl bg-accent-soft border border-accent/30 text-accent text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {tab === 'USERS' && (
        <>
          {showCreate && (
            <form
              onSubmit={handleCreateUser}
              className="bg-surface rounded-xl border border-accent/30 p-5 space-y-4"
            >
              <h2 className="text-sm font-semibold text-ink">
                Registrar Nueva Cuenta Institucional
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-ink-2 mb-1">
                    Usuario (username) *
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="ej. dir_posgrado"
                    className="w-full px-3 py-2 text-xs rounded-md border border-line-strong"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-2 mb-1">
                    Nombre completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Dr. / Mtro. / Lic."
                    className="w-full px-3 py-2 text-xs rounded-md border border-line-strong"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-2 mb-1">
                    Correo institucional *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="usuario@utc.edu.mx"
                    className="w-full px-3 py-2 text-xs rounded-md border border-line-strong"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-2 mb-1">
                    Contraseña inicial *
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-3 py-2 text-xs rounded-md border border-line-strong"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-2 mb-1">
                    Rol del sistema *
                  </label>
                  <select
                    value={role}
                    onChange={(e) =>
                      setRole(e.target.value as 'SUPER_ADMIN' | 'DIRECTOR' | 'EXTENSION')
                    }
                    className="w-full px-3 py-2 text-xs rounded-md border border-line-strong bg-surface"
                  >
                    <option value="DIRECTOR">Director de Edificio</option>
                    <option value="EXTENSION">Extensión Universitaria</option>
                    <option value="SUPER_ADMIN">Administrador General</option>
                  </select>
                </div>
                {role === 'DIRECTOR' && (
                  <div>
                    <label className="block text-xs font-medium text-ink-2 mb-1">
                      Edificio asignado *
                    </label>
                    <select
                      required
                      value={buildingId}
                      onChange={(e) => setBuildingId(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-md border border-line-strong bg-surface"
                    >
                      <option value="">Seleccione edificio...</option>
                      {buildings.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-ink-2 mb-1">
                    Departamento / Cargo visible
                  </label>
                  <input
                    type="text"
                    value={departmentLabel}
                    onChange={(e) => setDepartmentLabel(e.target.value)}
                    placeholder="Ej. Dirección Académica Edificio 1"
                    className="w-full px-3 py-2 text-xs rounded-md border border-line-strong"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-3.5 py-1.5 rounded-full border border-line text-xs font-medium text-ink-2"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-full bg-ink text-surface text-xs font-medium"
                >
                  Guardar Usuario
                </button>
              </div>
            </form>
          )}

          {/* Users Table */}
          <div className="bg-surface rounded-xl border border-line overflow-hidden">
            <div className="px-5 py-4 border-b border-line flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-accent" />
                <h2 className="text-sm font-semibold text-ink">
                  Cuentas de Usuario y Asignación de Edificios
                </h2>
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center text-sm text-ink-3">Cargando cuentas...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-paper border-b border-line text-[11px] font-semibold uppercase font-mono tracking-[0.08em] text-ink-3">
                      <th className="py-3 px-4">Usuario</th>
                      <th className="py-3 px-4">Nombre y Cargo</th>
                      <th className="py-3 px-4">Rol</th>
                      <th className="py-3 px-4">Edificio Asociado</th>
                      <th className="py-3 px-4">Estado</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line text-xs">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-paper/80">
                        <td className="py-3 px-4 font-mono font-semibold text-ink">
                          @{u.username}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-medium text-ink">{u.fullName}</p>
                          <p className="text-[11px] text-ink-3">
                            {u.departmentLabel || u.email}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-sunk text-ink border border-line">
                            {getRoleLabel(u.role)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {u.building ? (
                            <span className="inline-flex items-center gap-1 text-accent font-medium">
                              <Building2 className="w-3.5 h-3.5" />
                              {u.building.name}
                            </span>
                          ) : (
                            <span className="text-ink-3">Global / No aplica</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${
                              u.active
                                ? 'bg-accent-soft text-accent border border-accent/30'
                                : 'bg-bad-soft text-bad border border-bad/30'
                            }`}
                          >
                            {u.active ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setEditingUser(u);
                              setEditBuildingId(u.buildingId || '');
                              setEditActive(u.active);
                              setNewPassword('');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-line hover:bg-sunk text-xs font-medium text-ink-2"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Phase 2 Catalogs Management (Section 10) */}
      {tab === 'CATALOGS' && (
        <div className="space-y-6">
          <form
            onSubmit={handleCreateCatalogItem}
            className="bg-surface rounded-xl border border-line p-5 space-y-4"
          >
            <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
              <Plus className="w-4 h-4 text-accent" />
              Agregar Registro a Catálogos Institucionales (Fase 2)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-ink-2 mb-1">
                  Catálogo Destino *
                </label>
                <select
                  value={catalogType}
                  onChange={(e) =>
                    setCatalogType(e.target.value as 'CAREER' | 'GRADE' | 'DEPARTMENT')
                  }
                  className="w-full px-3 py-2 text-xs rounded-md border border-line-strong bg-surface font-medium"
                >
                  <option value="CAREER">Carreras Universitarias</option>
                  <option value="GRADE">Semestres / Grados Académicos</option>
                  <option value="DEPARTMENT">Departamentos y Áreas</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-2 mb-1">
                  Clave / Código *
                </label>
                <input
                  type="text"
                  required
                  value={catCode}
                  onChange={(e) => setCatCode(e.target.value.toUpperCase())}
                  placeholder="Ej. IA_DATA / CUAT_11 / ACAD_IA"
                  className="w-full px-3 py-2 text-xs rounded-md border border-line-strong font-mono"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-ink-2 mb-1">
                  Nombre Oficial *
                </label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="Nombre de la carrera, grado o departamento"
                  className="w-full px-3 py-2 text-xs rounded-md border border-line-strong"
                />
              </div>

              {catalogType === 'CAREER' && (
                <div className="sm:col-span-4">
                  <label className="block text-xs font-medium text-ink-2 mb-1">
                    Descripción académica
                  </label>
                  <input
                    type="text"
                    value={catDescription}
                    onChange={(e) => setCatDescription(e.target.value)}
                    placeholder="Descripción opcional del programa educativo"
                    className="w-full px-3 py-2 text-xs rounded-md border border-line-strong"
                  />
                </div>
              )}

              {catalogType === 'GRADE' && (
                <div>
                  <label className="block text-xs font-medium text-ink-2 mb-1">
                    Orden numérico
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={catLevelOrder}
                    onChange={(e) => setCatLevelOrder(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-md border border-line-strong"
                  />
                </div>
              )}

              {catalogType === 'DEPARTMENT' && (
                <div>
                  <label className="block text-xs font-medium text-ink-2 mb-1">
                    Clasificación del Área *
                  </label>
                  <select
                    value={catAreaType}
                    onChange={(e) =>
                      setCatAreaType(e.target.value as 'ACADEMIC' | 'ADMINISTRATIVE')
                    }
                    className="w-full px-3 py-2 text-xs rounded-md border border-line-strong bg-surface"
                  >
                    <option value="ACADEMIC">Área Académica (Docentes)</option>
                    <option value="ADMINISTRATIVE">Área Administrativa (Personal)</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-full bg-ink hover:bg-ink-2 text-surface text-xs font-semibold"
              >
                Guardar en Catálogo
              </button>
            </div>
          </form>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Careers */}
            <div className="bg-surface rounded-xl border border-line overflow-hidden">
              <div className="px-4 py-3 bg-paper border-b border-line flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-accent" />
                <h3 className="text-xs font-semibold uppercase font-mono tracking-[0.08em] text-ink">
                  Carreras Universitarias ({careers.length})
                </h3>
              </div>
              <div className="divide-y divide-line text-xs max-h-96 overflow-y-auto">
                {careers.map((c) => (
                  <div key={c.id} className="p-3 flex items-center justify-between gap-2">
                    <div>
                      <span className="font-mono font-semibold text-[11px] text-accent">
                        {c.code}
                      </span>
                      <p className="font-medium text-ink">{c.name}</p>
                    </div>
                    <button
                      onClick={() => handleToggleCatalogActive('CAREER', c.id, c.active)}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                        c.active
                          ? 'bg-accent-soft text-accent border-accent/30'
                          : 'bg-sunk text-ink-3 border-line'
                      }`}
                    >
                      {c.active ? 'Activo' : 'Inactivo'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Grades */}
            <div className="bg-surface rounded-xl border border-line overflow-hidden">
              <div className="px-4 py-3 bg-paper border-b border-line flex items-center gap-2">
                <Layers className="w-4 h-4 text-accent" />
                <h3 className="text-xs font-semibold uppercase font-mono tracking-[0.08em] text-ink">
                  Semestres / Grados ({academicGrades.length})
                </h3>
              </div>
              <div className="divide-y divide-line text-xs max-h-96 overflow-y-auto">
                {academicGrades.map((g) => (
                  <div key={g.id} className="p-3 flex items-center justify-between gap-2">
                    <div>
                      <span className="font-mono font-semibold text-[11px] text-ink-3">
                        #{g.levelOrder} · {g.code}
                      </span>
                      <p className="font-medium text-ink">{g.name}</p>
                    </div>
                    <button
                      onClick={() => handleToggleCatalogActive('GRADE', g.id, g.active)}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                        g.active
                          ? 'bg-accent-soft text-accent border-accent/30'
                          : 'bg-sunk text-ink-3 border-line'
                      }`}
                    >
                      {g.active ? 'Activo' : 'Inactivo'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Departments */}
            <div className="bg-surface rounded-xl border border-line overflow-hidden">
              <div className="px-4 py-3 bg-paper border-b border-line flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-accent" />
                <h3 className="text-xs font-semibold uppercase font-mono tracking-[0.08em] text-ink">
                  Departamentos y Áreas ({departmentAreas.length})
                </h3>
              </div>
              <div className="divide-y divide-line text-xs max-h-96 overflow-y-auto">
                {departmentAreas.map((d) => (
                  <div key={d.id} className="p-3 flex items-center justify-between gap-2">
                    <div>
                      <span
                        className={`inline-block px-1.5 py-0.2 rounded text-[11px] font-semibold uppercase font-mono tracking-[0.08em] ${
                          d.areaType === 'ACADEMIC'
                            ? 'bg-sunk text-ink'
                            : 'bg-sunk text-ink'
                        }`}
                      >
                        {d.areaType === 'ACADEMIC' ? 'Académico' : 'Administrativo'}
                      </span>
                      <p className="font-medium text-ink mt-0.5">{d.name}</p>
                    </div>
                    <button
                      onClick={() => handleToggleCatalogActive('DEPARTMENT', d.id, d.active)}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                        d.active
                          ? 'bg-accent-soft text-accent border-accent/30'
                          : 'bg-sunk text-ink-3 border-line'
                      }`}
                    >
                      {d.active ? 'Activo' : 'Inactivo'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Spaces Catalog */}
      {tab === 'SPACES' && (
        <div className="bg-surface rounded-xl border border-line overflow-hidden">
          <div className="px-5 py-4 border-b border-line flex items-center gap-2">
            <MapPin className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-semibold text-ink">
              Catálogo Oficial de Espacios Universitarios y Autorizadores (9 Recintos)
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5">
            {spaces.map((sp) => (
              <div
                key={sp.id}
                className="p-4 rounded-xl border border-line bg-paper/60 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-ink">{sp.name}</span>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-surface border border-line text-ink-2">
                    Cap. {sp.capacity}
                  </span>
                </div>
                <p className="text-[11px] text-ink-3">{sp.location}</p>
                <p className="text-[11px] text-accent font-medium pt-1 border-t border-line">
                  Autoriza: {sp.authorizer.fullName}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-ink/60 flex items-center justify-center p-4">
          <form
            onSubmit={handleUpdateUser}
            className="bg-surface rounded-xl max-w-md w-full p-6 shadow-float space-y-4"
          >
            <h3 className="text-base font-semibold text-ink">
              Editar Cuenta @{editingUser.username}
            </h3>
            <p className="text-xs text-ink-3">{editingUser.fullName}</p>

            {editingUser.role === 'DIRECTOR' && (
              <div>
                <label className="block text-xs font-medium text-ink-2 mb-1">
                  Edificio Asociado
                </label>
                <select
                  value={editBuildingId}
                  onChange={(e) => setEditBuildingId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-md border border-line-strong bg-surface"
                >
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1">
                Restablecer Contraseña (opcional)
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Dejar vacío para conservar actual"
                className="w-full px-3 py-2 text-xs rounded-md border border-line-strong"
              />
            </div>

            <label className="flex items-center gap-2 text-xs font-medium text-ink-2">
              <input
                type="checkbox"
                checked={editActive}
                onChange={(e) => setEditActive(e.target.checked)}
                className="w-4 h-4 rounded text-accent"
              />
              Cuenta activa para iniciar sesión
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 rounded-full border border-line text-xs font-medium text-ink-2"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-full bg-ink text-surface text-xs font-medium"
              >
                Guardar Cambios
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
