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
          <h1 className="text-xl font-bold text-slate-900">
            Administración Institucional (SUPER_ADMIN)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gestión de usuarios, asociación de directores por edificio y catálogos institucionales
            de Fase 1 y Fase 2
          </p>
        </div>
        {tab === 'USERS' && (
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            Crear Nuevo Usuario
          </button>
        )}
      </div>

      {/* Section Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setTab('USERS')}
          className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 ${
            tab === 'USERS'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Usuarios y Directores ({users.length})
        </button>
        <button
          onClick={() => setTab('CATALOGS')}
          className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 ${
            tab === 'CATALOGS'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          Catálogos Académicos y Departamentos (Fase 2)
        </button>
        <button
          onClick={() => setTab('SPACES')}
          className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 ${
            tab === 'SPACES'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <MapPin className="w-4 h-4" />
          Catálogo de Espacios ({spaces.length})
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {feedback && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {tab === 'USERS' && (
        <>
          {showCreate && (
            <form
              onSubmit={handleCreateUser}
              className="bg-white rounded-xl border border-emerald-200 shadow-sm p-5 space-y-4"
            >
              <h2 className="text-sm font-bold text-slate-900">
                Registrar Nueva Cuenta Institucional
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Usuario (username) *
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="ej. dir_posgrado"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nombre completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Dr. / Mtro. / Lic."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Correo institucional *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="usuario@utc.edu.mx"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contraseña inicial *
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Rol del sistema *
                  </label>
                  <select
                    value={role}
                    onChange={(e) =>
                      setRole(e.target.value as 'SUPER_ADMIN' | 'DIRECTOR' | 'EXTENSION')
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="DIRECTOR">Director de Edificio</option>
                    <option value="EXTENSION">Extensión Universitaria</option>
                    <option value="SUPER_ADMIN">Administrador General</option>
                  </select>
                </div>
                {role === 'DIRECTOR' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Edificio asignado *
                    </label>
                    <select
                      required
                      value={buildingId}
                      onChange={(e) => setBuildingId(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Departamento / Cargo visible
                  </label>
                  <input
                    type="text"
                    value={departmentLabel}
                    onChange={(e) => setDepartmentLabel(e.target.value)}
                    placeholder="Ej. Dirección Académica Edificio 1"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-semibold"
                >
                  Guardar Usuario
                </button>
              </div>
            </form>
          )}

          {/* Users Table */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <h2 className="text-sm font-bold text-slate-900">
                  Cuentas de Usuario y Asignación de Edificios
                </h2>
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center text-sm text-slate-500">Cargando cuentas...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500">
                      <th className="py-3 px-4">Usuario</th>
                      <th className="py-3 px-4">Nombre y Cargo</th>
                      <th className="py-3 px-4">Rol</th>
                      <th className="py-3 px-4">Edificio Asociado</th>
                      <th className="py-3 px-4">Estado</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          @{u.username}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-slate-900">{u.fullName}</p>
                          <p className="text-[11px] text-slate-500">
                            {u.departmentLabel || u.email}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                            {getRoleLabel(u.role)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {u.building ? (
                            <span className="inline-flex items-center gap-1 text-emerald-800 font-medium">
                              <Building2 className="w-3.5 h-3.5" />
                              {u.building.name}
                            </span>
                          ) : (
                            <span className="text-slate-400">Global / No aplica</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              u.active
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
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
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700"
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
            className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4"
          >
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-700" />
              Agregar Registro a Catálogos Institucionales (Fase 2)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catálogo Destino *
                </label>
                <select
                  value={catalogType}
                  onChange={(e) =>
                    setCatalogType(e.target.value as 'CAREER' | 'GRADE' | 'DEPARTMENT')
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-semibold"
                >
                  <option value="CAREER">Carreras Universitarias</option>
                  <option value="GRADE">Semestres / Grados Académicos</option>
                  <option value="DEPARTMENT">Departamentos y Áreas</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Clave / Código *
                </label>
                <input
                  type="text"
                  required
                  value={catCode}
                  onChange={(e) => setCatCode(e.target.value.toUpperCase())}
                  placeholder="Ej. IA_DATA / CUAT_11 / ACAD_IA"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre Oficial *
                </label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="Nombre de la carrera, grado o departamento"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                />
              </div>

              {catalogType === 'CAREER' && (
                <div className="sm:col-span-4">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Descripción académica
                  </label>
                  <input
                    type="text"
                    value={catDescription}
                    onChange={(e) => setCatDescription(e.target.value)}
                    placeholder="Descripción opcional del programa educativo"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                  />
                </div>
              )}

              {catalogType === 'GRADE' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Orden numérico
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={catLevelOrder}
                    onChange={(e) => setCatLevelOrder(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                  />
                </div>
              )}

              {catalogType === 'DEPARTMENT' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Clasificación del Área *
                  </label>
                  <select
                    value={catAreaType}
                    onChange={(e) =>
                      setCatAreaType(e.target.value as 'ACADEMIC' | 'ADMINISTRATIVE')
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
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
                className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold"
              >
                Guardar en Catálogo
              </button>
            </div>
          </form>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Careers */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-emerald-700" />
                <h3 className="text-xs font-bold uppercase text-slate-800">
                  Carreras Universitarias ({careers.length})
                </h3>
              </div>
              <div className="divide-y divide-slate-200 text-xs max-h-96 overflow-y-auto">
                {careers.map((c) => (
                  <div key={c.id} className="p-3 flex items-center justify-between gap-2">
                    <div>
                      <span className="font-mono font-bold text-[11px] text-emerald-800">
                        {c.code}
                      </span>
                      <p className="font-semibold text-slate-900">{c.name}</p>
                    </div>
                    <button
                      onClick={() => handleToggleCatalogActive('CAREER', c.id, c.active)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        c.active
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}
                    >
                      {c.active ? 'Activo' : 'Inactivo'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Grades */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-700" />
                <h3 className="text-xs font-bold uppercase text-slate-800">
                  Semestres / Grados ({academicGrades.length})
                </h3>
              </div>
              <div className="divide-y divide-slate-200 text-xs max-h-96 overflow-y-auto">
                {academicGrades.map((g) => (
                  <div key={g.id} className="p-3 flex items-center justify-between gap-2">
                    <div>
                      <span className="font-mono font-bold text-[11px] text-slate-500">
                        #{g.levelOrder} · {g.code}
                      </span>
                      <p className="font-semibold text-slate-900">{g.name}</p>
                    </div>
                    <button
                      onClick={() => handleToggleCatalogActive('GRADE', g.id, g.active)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        g.active
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}
                    >
                      {g.active ? 'Activo' : 'Inactivo'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Departments */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-emerald-700" />
                <h3 className="text-xs font-bold uppercase text-slate-800">
                  Departamentos y Áreas ({departmentAreas.length})
                </h3>
              </div>
              <div className="divide-y divide-slate-200 text-xs max-h-96 overflow-y-auto">
                {departmentAreas.map((d) => (
                  <div key={d.id} className="p-3 flex items-center justify-between gap-2">
                    <div>
                      <span
                        className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                          d.areaType === 'ACADEMIC'
                            ? 'bg-blue-50 text-blue-800'
                            : 'bg-purple-50 text-purple-800'
                        }`}
                      >
                        {d.areaType === 'ACADEMIC' ? 'Académico' : 'Administrativo'}
                      </span>
                      <p className="font-semibold text-slate-900 mt-0.5">{d.name}</p>
                    </div>
                    <button
                      onClick={() => handleToggleCatalogActive('DEPARTMENT', d.id, d.active)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        d.active
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
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
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-700" />
            <h2 className="text-sm font-bold text-slate-900">
              Catálogo Oficial de Espacios Universitarios y Autorizadores (9 Recintos)
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5">
            {spaces.map((sp) => (
              <div
                key={sp.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">{sp.name}</span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                    Cap. {sp.capacity}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">{sp.location}</p>
                <p className="text-[11px] text-emerald-800 font-semibold pt-1 border-t border-slate-200/80">
                  Autoriza: {sp.authorizer.fullName}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <form
            onSubmit={handleUpdateUser}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4"
          >
            <h3 className="text-base font-bold text-slate-900">
              Editar Cuenta @{editingUser.username}
            </h3>
            <p className="text-xs text-slate-500">{editingUser.fullName}</p>

            {editingUser.role === 'DIRECTOR' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Edificio Asociado
                </label>
                <select
                  value={editBuildingId}
                  onChange={(e) => setEditBuildingId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Restablecer Contraseña (opcional)
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Dejar vacío para conservar actual"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
              />
            </div>

            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={editActive}
                onChange={(e) => setEditActive(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-700"
              />
              Cuenta activa para iniciar sesión
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold"
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
