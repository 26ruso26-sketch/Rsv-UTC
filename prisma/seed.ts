import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

// Carga variables desde .env local si existen (sin sobrescribir las ya definidas en el entorno)
const localEnvPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(localEnvPath)) {
  const envContent = fs.readFileSync(localEnvPath, 'utf8');
  for (const rawLine of envContent.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIndex = line.indexOf('=');
    if (eqIndex <= 0) continue;
    const key = line.slice(0, eqIndex).trim();
    const val = line.slice(eqIndex + 1).trim().replace(/^(['"])(.*)\1$/, '$2');
    if (key && !(key in process.env)) {
      process.env[key] = val;
    }
  }
}
import { hashPassword } from '../src/lib/crypto';
import { generateInstitutionalPdfBuffer } from '../src/lib/pdf-generator';
import { addCleaningMinutes, timeToMinutes } from '../src/lib/utils';
import {
  createAndSaveQrCredentialImage,
  generateSecureQrToken,
} from '../src/lib/qr-service';

const prisma = new PrismaClient();

export async function runSeed() {
  console.log('==========================================================');
  console.log(' SREU — Inicializando Seed Aditivo (Fase 1 + Fase 2)');
  console.log('==========================================================');

  // 1. Edificios (4: EDIF-1 .. EDIF-4)
  const buildingsData = [
    {
      code: 'EDIF-1',
      name: 'Edificio 1',
      description: 'Sede de ingenierías en software, redes, sistemas y tecnologías de información.',
    },
    {
      code: 'EDIF-2',
      name: 'Edificio 2',
      description: 'Sede de negocios, contaduría, administración y gestión empresarial.',
    },
    {
      code: 'EDIF-3',
      name: 'Edificio 3',
      description: 'Sede de manufactura, mecatrónica, energías y mantenimiento industrial.',
    },
    {
      code: 'EDIF-4',
      name: 'Edificio 4',
      description: 'Sede de investigación aplicada, posgrados y vinculación científica.',
    },
  ];

  const buildingsByCode: Record<string, { id: string; code: string; name: string }> = {};
  for (const b of buildingsData) {
    const record = await prisma.building.upsert({
      where: { code: b.code },
      update: { description: b.description, active: true, isDemo: true },
      create: { ...b, active: true, isDemo: true },
    });
    buildingsByCode[b.code] = record;
  }
  console.log('✔ 4 edificios verificados (EDIF-1 a EDIF-4).');

  // 2. Usuarios Iniciales (6: director1..4, extuni, admin)
  const getSeedPassword = (envKey: string): { plainPass: string; isExplicit: boolean } => {
    const configured = process.env[envKey]?.trim() || process.env.SEED_DEFAULT_PASSWORD?.trim();
    if (configured) return { plainPass: configured, isExplicit: true };
    const generated = crypto.randomBytes(9).toString('base64url');
    return { plainPass: generated, isExplicit: false };
  };

  const usersData = [
    {
      username: 'director1',
      ...getSeedPassword('SEED_DIRECTOR1_PASSWORD'),
      fullName: 'Dr. Roberto Méndez Garza (Director Edificio 1)',
      email: 'director1@utc.edu.mx',
      role: 'DIRECTOR',
      buildingId: buildingsByCode['EDIF-1'].id,
      departmentLabel: 'Dirección Académica Edificio 1',
    },
    {
      username: 'director2',
      ...getSeedPassword('SEED_DIRECTOR2_PASSWORD'),
      fullName: 'Dra. Laura Patricia Treviño (Directora Edificio 2)',
      email: 'director2@utc.edu.mx',
      role: 'DIRECTOR',
      buildingId: buildingsByCode['EDIF-2'].id,
      departmentLabel: 'Dirección Académica Edificio 2',
    },
    {
      username: 'director3',
      ...getSeedPassword('SEED_DIRECTOR3_PASSWORD'),
      fullName: 'Mtro. Carlos Eduardo Villarreal (Director Edificio 3)',
      email: 'director3@utc.edu.mx',
      role: 'DIRECTOR',
      buildingId: buildingsByCode['EDIF-3'].id,
      departmentLabel: 'Dirección Académica Edificio 3',
    },
    {
      username: 'director4',
      ...getSeedPassword('SEED_DIRECTOR4_PASSWORD'),
      fullName: 'Mtra. Sofía Alejandra Cantú (Directora Edificio 4)',
      email: 'director4@utc.edu.mx',
      role: 'DIRECTOR',
      buildingId: buildingsByCode['EDIF-4'].id,
      departmentLabel: 'Dirección Académica Edificio 4',
    },
    {
      username: 'extuni',
      ...getSeedPassword('SEED_EXTENSION_PASSWORD'),
      fullName: 'Lic. Fernando Elizondo (Extensión Universitaria)',
      email: 'extuni@utc.edu.mx',
      role: 'EXTENSION',
      buildingId: null,
      departmentLabel: 'Coordinación de Extensión Universitaria',
    },
    {
      username: 'admin',
      ...getSeedPassword('SEED_ADMIN_PASSWORD'),
      fullName: 'Mtro. Ricardo Valdés (Administrador General)',
      email: 'admin@utc.edu.mx',
      role: 'SUPER_ADMIN',
      buildingId: null,
      departmentLabel: 'Rectoría y Administración General SREU',
    },
  ];

  const usersByUsername: Record<string, { id: string; username: string; fullName: string }> = {};
  for (const u of usersData) {
    const passwordHash = hashPassword(u.plainPass);
    const existing = await prisma.user.findUnique({ where: { username: u.username } });
    if (!existing && !u.isExplicit) {
      console.warn(
        `⚠ SEED_*_PASSWORD / SEED_DEFAULT_PASSWORD no definida en .env; se generó una contraseña temporal para ${u.username}.`
      );
    }
    const record = await prisma.user.upsert({
      where: { username: u.username },
      update: {
        fullName: u.fullName,
        email: u.email,
        role: u.role,
        buildingId: u.buildingId,
        departmentLabel: u.departmentLabel,
        ...(u.isExplicit ? { passwordHash } : {}),
        active: true,
        isDemo: true,
      },
      create: {
        username: u.username,
        passwordHash,
        fullName: u.fullName,
        email: u.email,
        role: u.role,
        buildingId: u.buildingId,
        departmentLabel: u.departmentLabel,
        active: true,
        isDemo: true,
      },
    });
    usersByUsername[u.username] = record;
  }
  console.log('✔ 6 cuentas institucionales verificadas.');

  // 3. Espacios Universitarios (9)
  const spacesData = [
    {
      code: 'AUD-EDIF-1',
      name: 'Auditorio Edificio 1',
      category: 'AUDITORIO',
      buildingId: buildingsByCode['EDIF-1'].id,
      location: 'Planta Baja, Edificio 1',
      capacity: 180,
      authorizerType: 'DIRECTOR',
      authorizerUserId: usersByUsername.director1.id,
    },
    {
      code: 'AUD-EDIF-2',
      name: 'Auditorio Edificio 2',
      category: 'AUDITORIO',
      buildingId: buildingsByCode['EDIF-2'].id,
      location: 'Planta Baja, Edificio 2',
      capacity: 160,
      authorizerType: 'DIRECTOR',
      authorizerUserId: usersByUsername.director2.id,
    },
    {
      code: 'AUD-EDIF-3',
      name: 'Auditorio Edificio 3',
      category: 'AUDITORIO',
      buildingId: buildingsByCode['EDIF-3'].id,
      location: 'Planta Baja, Edificio 3',
      capacity: 200,
      authorizerType: 'DIRECTOR',
      authorizerUserId: usersByUsername.director3.id,
    },
    {
      code: 'AUD-EDIF-4',
      name: 'Auditorio Edificio 4',
      category: 'AUDITORIO',
      buildingId: buildingsByCode['EDIF-4'].id,
      location: 'Planta Baja, Edificio 4',
      capacity: 150,
      authorizerType: 'DIRECTOR',
      authorizerUserId: usersByUsername.director4.id,
    },
    {
      code: 'DOMO',
      name: 'Domo',
      category: 'EXPLANADA_DOMO',
      buildingId: null,
      location: 'Explanada Techada Central',
      capacity: 600,
      authorizerType: 'EXTENSION',
      authorizerUserId: usersByUsername.extuni.id,
    },
    {
      code: 'EXPLANADA',
      name: 'Explanada',
      category: 'EXPLANADA_DOMO',
      buildingId: null,
      location: 'Plaza Central del Campus',
      capacity: 800,
      authorizerType: 'EXTENSION',
      authorizerUserId: usersByUsername.extuni.id,
    },
    {
      code: 'AUD-VINCULACION',
      name: 'Auditorio Vinculación',
      category: 'AUDITORIO',
      buildingId: null,
      location: 'Centro de Vinculación y Extensión Universitaria',
      capacity: 350,
      authorizerType: 'EXTENSION',
      authorizerUserId: usersByUsername.extuni.id,
    },
    {
      code: 'CANCHA-FUTBOL',
      name: 'Cancha de fútbol',
      category: 'DEPORTIVO',
      buildingId: null,
      location: 'Complejo Deportivo Norte',
      capacity: 250,
      authorizerType: 'EXTENSION',
      authorizerUserId: usersByUsername.extuni.id,
    },
    {
      code: 'CANCHA-SOFTBALL',
      name: 'Cancha de softball',
      category: 'DEPORTIVO',
      buildingId: null,
      location: 'Complejo Deportivo Oriente',
      capacity: 200,
      authorizerType: 'EXTENSION',
      authorizerUserId: usersByUsername.extuni.id,
    },
  ];

  const spacesByCode: Record<
    string,
    { id: string; code: string; name: string; authorizerUserId: string; capacity: number }
  > = {};
  for (const s of spacesData) {
    const record = await prisma.space.upsert({
      where: { code: s.code },
      update: {
        category: s.category,
        buildingId: s.buildingId,
        location: s.location,
        capacity: s.capacity,
        authorizerType: s.authorizerType,
        authorizerUserId: s.authorizerUserId,
        active: true,
        isDemo: true,
      },
      create: { ...s, active: true, isDemo: true },
    });
    spacesByCode[s.code] = record;
  }
  console.log('✔ 9 espacios universitarios verificados.');

  // 4. Catálogo de Criticidad (Niveles 1 al 4) y Tipos de Equipo (2)
  const audienceTypesData = [
    {
      level: 1,
      name: 'Asiste rector',
      description: 'Máxima prioridad institucional; eventos con presencia de Rectoría.',
    },
    {
      level: 2,
      name: 'Asisten autoridades',
      description: 'Eventos con autoridades gubernamentales, directivos o consejeros.',
    },
    {
      level: 3,
      name: 'Invitados especiales',
      description: 'Conferencias con ponentes externos, empresas vinculadas o colegios.',
    },
    {
      level: 4,
      name: 'Solo alumnos y docentes',
      description: 'Actividades académicas internas para estudiantes y profesorado.',
    },
  ];

  const audiencesByLevel: Record<number, { id: string; level: number; name: string }> = {};
  for (const a of audienceTypesData) {
    const record = await prisma.audienceType.upsert({
      where: { level: a.level },
      update: { name: a.name, description: a.description, active: true, isDemo: true },
      create: { ...a, active: true, isDemo: true },
    });
    audiencesByLevel[a.level] = record;
  }

  const equipmentTypesData = [
    {
      code: 'SOUND',
      name: 'Equipo de sonido',
      description: 'Consola de audio, micrófonos inalámbricos, bocinas y pódium sonorizado.',
    },
    {
      code: 'FURNITURE',
      name: 'Mobiliario',
      description: 'Mesas para presídium, tablones con paño institucional, sillas adicionales y mamparas.',
    },
  ];

  const equipmentByCode: Record<string, { id: string; code: string; name: string }> = {};
  for (const eq of equipmentTypesData) {
    const record = await prisma.equipmentType.upsert({
      where: { code: eq.code },
      update: { name: eq.name, description: eq.description, active: true, isDemo: true },
      create: { ...eq, active: true, isDemo: true },
    });
    equipmentByCode[eq.code] = record;
  }
  console.log('✔ Catálogos de criticidad (4) y equipamiento (2) verificados.');

  // =========================================================================
  // 5. NUEVOS CATÁLOGOS FASE 2: CARRERAS, GRADOS Y DEPARTAMENTOS (Sección 10)
  // =========================================================================
  const careersData = [
    {
      code: 'IDGS',
      name: 'Ingeniería en Desarrollo y Gestión de Software',
      description: 'Desarrollo full-stack, arquitectura de software, nube y seguridad.',
    },
    {
      code: 'IRIC',
      name: 'Ingeniería en Redes Inteligentes y Ciberseguridad',
      description: 'Infraestructura de telecomunicaciones, seguridad ofensiva/defensiva y cómputo en la nube.',
    },
    {
      code: 'IMEC',
      name: 'Ingeniería en Mecatrónica',
      description: 'Automatización industrial, robótica colaborativa, PLC y control.',
    },
    {
      code: 'IIND',
      name: 'Ingeniería en Procesos y Operaciones Industriales',
      description: 'Manufactura esbelta, calidad Six Sigma, cadena de suministro y logística.',
    },
    {
      code: 'LGFN',
      name: 'Licenciatura en Gestión y Desarrollo de Negocios',
      description: 'Dirección estratégica, finanzas corporativas, mercadotecnia e innovación.',
    },
    {
      code: 'LCON',
      name: 'Licenciatura en Contaduría y Fiscalización',
      description: 'Auditoría financiera, estrategia fiscal y control presupuestal.',
    },
  ];

  const careersByCode: Record<string, { id: string; code: string; name: string }> = {};
  for (const c of careersData) {
    const record = await prisma.career.upsert({
      where: { code: c.code },
      update: { name: c.name, description: c.description, active: true, isDemo: true },
      create: { ...c, active: true, isDemo: true },
    });
    careersByCode[c.code] = record;
  }

  const gradesData = [
    { code: 'CUAT_01', name: '1° Cuatrimestre / Semestre', levelOrder: 1 },
    { code: 'CUAT_02', name: '2° Cuatrimestre / Semestre', levelOrder: 2 },
    { code: 'CUAT_03', name: '3° Cuatrimestre / Semestre', levelOrder: 3 },
    { code: 'CUAT_04', name: '4° Cuatrimestre / Semestre', levelOrder: 4 },
    { code: 'CUAT_05', name: '5° Cuatrimestre / Semestre', levelOrder: 5 },
    { code: 'CUAT_06', name: '6° Cuatrimestre / Semestre', levelOrder: 6 },
    { code: 'CUAT_07', name: '7° Cuatrimestre / Semestre', levelOrder: 7 },
    { code: 'CUAT_08', name: '8° Cuatrimestre / Semestre', levelOrder: 8 },
    { code: 'CUAT_09', name: '9° Cuatrimestre / Semestre', levelOrder: 9 },
    { code: 'CUAT_10', name: '10° Cuatrimestre / Estadía Profesional', levelOrder: 10 },
    { code: 'POSGRADO', name: 'Posgrado / Especialidad', levelOrder: 11 },
  ];

  const gradesByCode: Record<string, { id: string; code: string; name: string }> = {};
  for (const g of gradesData) {
    const record = await prisma.academicGrade.upsert({
      where: { code: g.code },
      update: { name: g.name, levelOrder: g.levelOrder, active: true, isDemo: true },
      create: { ...g, active: true, isDemo: true },
    });
    gradesByCode[g.code] = record;
  }

  const departmentAreasData = [
    {
      code: 'ACAD_TI',
      name: 'Academia de Tecnologías de la Información y Software',
      areaType: 'ACADEMIC',
    },
    {
      code: 'ACAD_MECATRONICA',
      name: 'Academia de Mecatrónica y Automatización',
      areaType: 'ACADEMIC',
    },
    {
      code: 'ACAD_NEGOCIOS',
      name: 'Academia de Ciencias Económico Administrativas',
      areaType: 'ACADEMIC',
    },
    {
      code: 'ACAD_INDUSTRIAL',
      name: 'Academia de Procesos Industriales y Calidad',
      areaType: 'ACADEMIC',
    },
    {
      code: 'ACAD_CIENCIAS_BASICAS',
      name: 'Departamento de Ciencias Básicas e Investigación',
      areaType: 'ACADEMIC',
    },
    {
      code: 'ADMIN_SERVICIOS_ESCOLARES',
      name: 'Dirección de Servicios Escolares y Titulación',
      areaType: 'ADMINISTRATIVE',
    },
    {
      code: 'ADMIN_EXTENSION',
      name: 'Coordinación de Extensión Universitaria y Cultura',
      areaType: 'ADMINISTRATIVE',
    },
    {
      code: 'ADMIN_VINCULACION',
      name: 'Dirección de Vinculación Empresarial y Estadías',
      areaType: 'ADMINISTRATIVE',
    },
    {
      code: 'ADMIN_FINANZAS',
      name: 'Dirección de Administración, Finanzas y Recursos Humanos',
      areaType: 'ADMINISTRATIVE',
    },
    {
      code: 'ADMIN_RECTORIA',
      name: 'Oficina de Rectoría y Planeación Institucional',
      areaType: 'ADMINISTRATIVE',
    },
  ];

  const deptsByCode: Record<string, { id: string; code: string; name: string; areaType: string }> = {};
  for (const d of departmentAreasData) {
    const record = await prisma.departmentArea.upsert({
      where: { code: d.code },
      update: { name: d.name, areaType: d.areaType, active: true, isDemo: true },
      create: { ...d, active: true, isDemo: true },
    });
    deptsByCode[d.code] = record;
  }
  console.log('✔ Catálogos Fase 2 (6 carreras, 11 grados, 10 departamentos) verificados.');

  // =========================================================================
  // 6. PRESERVAR LOS 13 EVENTOS EXISTENTES Y AMPLIAR DEMO CON FASE 2
  // =========================================================================
  const evidenceStorageDir = path.resolve(
    process.cwd(),
    process.env.STORAGE_DIR || './storage/evidences'
  );
  if (!fs.existsSync(evidenceStorageDir)) {
    fs.mkdirSync(evidenceStorageDir, { recursive: true });
  }

  // Asegurar que los 13 eventos existentes tengan su EventAttendanceConfig 1:1
  const allExistingEvents = await prisma.event.findMany({
    include: {
      space: true,
      spaceRequest: true,
      evidences: true,
      attendanceConfig: true,
    },
  });

  for (const ev of allExistingEvents) {
    if (!ev.attendanceConfig) {
      const isOpenDemo =
        ev.demoCode === 'DEMO-02' || ev.demoCode === 'DEMO-06' || ev.demoCode === 'DEMO-11';
      await prisma.eventAttendanceConfig.create({
        data: {
          eventId: ev.id,
          accessMode: isOpenDemo ? 'OPEN' : 'RESTRICTED',
          registrationEnabled: isOpenDemo && ev.spaceRequest?.status === 'APPROVED',
          publicRegistrationToken: `reg_${
            ev.demoCode ? ev.demoCode.toLowerCase().replace(/[^a-z0-9]/g, '') : ev.id.slice(0, 8)
          }_utc2026`,
          checkInOpen: isOpenDemo && ev.spaceRequest?.status === 'APPROVED',
          institutionalEmailDomain: 'utc.edu.mx',
        },
      });
    }
  }

  // Asegurar que DEMO-HIST-01 (evento histórico pasado aprobado) cuente con evidencia de cierre CLOSURE_EVIDENCE y estado CLOSED
  const demoHist01 = await prisma.event.findUnique({
    where: { demoCode: 'DEMO-HIST-01' },
    include: { evidences: true, space: true },
  });
  if (demoHist01) {
    const hasClosureEv = demoHist01.evidences.some((e) => e.category === 'CLOSURE_EVIDENCE');
    if (!hasClosureEv) {
      const fileName = 'acta-cierre-coloquio-investigacion.pdf';
      const storedName = 'demo-closure-coloquio-hist-01.pdf';
      const fullPath = path.join(evidenceStorageDir, storedName);
      const pdfBuf = generateInstitutionalPdfBuffer({
        title: demoHist01.name,
        subtitle: `Fecha: ${demoHist01.date} (${demoHist01.startTime} - ${demoHist01.endTime})`,
        eventCode: 'DEMO-HIST-01',
        spaceName: demoHist01.space.name,
        responsibleName: demoHist01.responsibleName,
        department: demoHist01.responsibleDepartment,
        bodyLines: [
          'EVIDENCIA DOCUMENTAL DE REALIZACION Y CIERRE DEL EVENTO (CLOSURE_EVIDENCE)',
          'El evento concluyo satisfactoriamente cumpliendo el programa academico.',
          'Recinto entregado en optimas condiciones tras la hora de limpieza.',
        ],
      });
      fs.writeFileSync(fullPath, pdfBuf);

      await prisma.eventEvidence.create({
        data: {
          eventId: demoHist01.id,
          fileName,
          storedName,
          filePath: storedName,
          fileSize: pdfBuf.length,
          mimeType: 'application/pdf',
          category: 'CLOSURE_EVIDENCE',
          isArchived: false,
          uploadedById: demoHist01.createdById,
          isDemo: true,
        },
      });
    }

    if (!demoHist01.closedAt) {
      await prisma.event.update({
        where: { id: demoHist01.id },
        data: {
          closedAt: new Date(),
          closedById: demoHist01.createdById,
        },
      });
    }
  }

  // Crear o actualizar 2 eventos adicionales de Fase 2 si no existen (DEMO-14 Abierto y DEMO-15 Restringido)
  const phase2EventsSpec = [
    {
      demoCode: 'DEMO-14',
      name: 'Congreso de Inteligencia Artificial y Ciberseguridad UTC 2026 (Evento Abierto)',
      description:
        'Jornada académica abierta a toda la comunidad estudiantil, docente y público invitado con conferencias magistrales sobre IA generativa, DevSecOps y arquitectura cloud.',
      justification:
        'Fortalecer las competencias tecnológicas de alumnos de IDGS, IRIC e IMEC mediante ponencias interactivas con registro QR individual.',
      date: '2026-11-18',
      startTime: '09:00',
      endTime: '13:00',
      spaceCode: 'AUD-VINCULACION',
      responsibleName: 'Dr. Roberto Carlos Esquivel',
      responsibleDepartment: 'Academia de Tecnologías de la Información y Software',
      responsibleEmail: 'roberto.esquivel@utc.edu.mx',
      createdByUsername: 'director1',
      audienceLevels: [2, 3, 4],
      criticalityLevel: 2,
      accessMode: 'OPEN' as const,
      registrationEnabled: true,
      publicRegistrationToken: 'reg_congreso_ia_ciberseguridad_utc2026',
      checkInOpen: true,
      requestSound: true,
      requestFurniture: true,
      equipmentDesc:
        'Sonido principal de auditorio, 4 micrófonos inalámbricos y mesa de registro QR en lobby.',
    },
    {
      demoCode: 'DEMO-15',
      name: 'Sesión Solemne del Consejo de Vinculación Empresarial y Rectoría (Evento Restringido)',
      description:
        'Sesión protocolaria de acceso exclusivo mediante lista cerrada de invitados para la firma de convenios de estadías duales 2026-2027.',
      justification:
        'Reunión ejecutiva de alta prioridad institucional con consejeros empresariales, directores de edificio y titulares de área.',
      date: '2026-11-19',
      startTime: '10:00',
      endTime: '12:30',
      spaceCode: 'AUD-EDIF-1',
      responsibleName: 'Mtro. Ricardo Valdés',
      responsibleDepartment: 'Oficina de Rectoría y Planeación Institucional',
      responsibleEmail: 'admin@utc.edu.mx',
      createdByUsername: 'director1',
      audienceLevels: [1, 2, 3],
      criticalityLevel: 1,
      accessMode: 'RESTRICTED' as const,
      registrationEnabled: false,
      publicRegistrationToken: 'reg_consejo_restringido_utc2026',
      checkInOpen: true,
      requestSound: true,
      requestFurniture: true,
      equipmentDesc:
        'Presídium para 12 personas, micrófonos de cuello de ganso y pódium institucional.',
    },
  ];

  const seededPhase2Events: Record<string, { id: string; demoCode: string; name: string }> = {};

  for (const spec of phase2EventsSpec) {
    const space = spacesByCode[spec.spaceCode];
    const creator = usersByUsername[spec.createdByUsername];
    const cleaningEndTime = addCleaningMinutes(spec.endTime, 60);
    const startMinutes = timeToMinutes(spec.startTime);
    const endMinutes = timeToMinutes(spec.endTime);
    const cleaningEndMinutes = timeToMinutes(cleaningEndTime);

    let ev = await prisma.event.findUnique({
      where: { demoCode: spec.demoCode },
    });

    if (!ev) {
      ev = await prisma.event.create({
        data: {
          demoCode: spec.demoCode,
          name: spec.name,
          description: spec.description,
          justification: spec.justification,
          date: spec.date,
          startTime: spec.startTime,
          endTime: spec.endTime,
          cleaningEndTime,
          startMinutes,
          endMinutes,
          cleaningEndMinutes,
          spaceId: space.id,
          responsibleName: spec.responsibleName,
          responsibleDepartment: spec.responsibleDepartment,
          responsibleEmail: spec.responsibleEmail,
          createdById: creator.id,
          criticalityLevel: spec.criticalityLevel,
          isDemo: true,
        },
      });

      for (const lvl of spec.audienceLevels) {
        const aud = audiencesByLevel[lvl];
        if (aud) {
          await prisma.eventAudience.create({
            data: { eventId: ev.id, audienceTypeId: aud.id },
          });
        }
      }

      await prisma.spaceRequest.create({
        data: {
          eventId: ev.id,
          spaceId: space.id,
          status: 'APPROVED',
          authorizerId: space.authorizerUserId,
          resolvedAt: new Date(),
        },
      });

      await prisma.reservation.create({
        data: {
          eventId: ev.id,
          spaceId: space.id,
          reservationType: 'ORIGINAL',
          status: 'APPROVED',
          date: spec.date,
          startTime: spec.startTime,
          endTime: spec.endTime,
          cleaningEndTime,
          startMinutes,
          endMinutes,
          cleaningEndMinutes,
        },
      });

      const eqReq = await prisma.equipmentRequest.create({
        data: {
          eventId: ev.id,
          status: 'APPROVED',
          description: spec.equipmentDesc,
          authorizerId: usersByUsername.extuni.id,
          resolvedAt: new Date(),
        },
      });

      if (spec.requestSound) {
        await prisma.equipmentRequestType.create({
          data: {
            equipmentRequestId: eqReq.id,
            equipmentTypeId: equipmentByCode.SOUND.id,
          },
        });
      }
      if (spec.requestFurniture) {
        await prisma.equipmentRequestType.create({
          data: {
            equipmentRequestId: eqReq.id,
            equipmentTypeId: equipmentByCode.FURNITURE.id,
          },
        });
      }

      // PDF de soporte para DEMO-14 y DEMO-15
      const fileName = `programa-oficial-${spec.demoCode.toLowerCase()}.pdf`;
      const storedName = `demo-support-${spec.demoCode.toLowerCase()}.pdf`;
      const fullPath = path.join(evidenceStorageDir, storedName);
      const pdfBuf = generateInstitutionalPdfBuffer({
        title: spec.name,
        subtitle: `Fecha: ${spec.date} (${spec.startTime} - ${spec.endTime})`,
        eventCode: spec.demoCode,
        spaceName: space.name,
        responsibleName: spec.responsibleName,
        department: spec.responsibleDepartment,
        bodyLines: [
          `Modalidad de control de acceso: ${
            spec.accessMode === 'OPEN'
              ? 'ABIERTO (Registro Publico + QR)'
              : 'RESTRINGIDO (Lista Cerrada + QR)'
          }`,
          'Documento de soporte y programa academico verificado.',
          'Control de acceso QR individual habilitado.',
        ],
      });
      fs.writeFileSync(fullPath, pdfBuf);

      await prisma.eventEvidence.create({
        data: {
          eventId: ev.id,
          fileName,
          storedName,
          filePath: storedName,
          fileSize: pdfBuf.length,
          mimeType: 'application/pdf',
          category: 'SUPPORTING_DOCUMENT',
          isArchived: false,
          uploadedById: creator.id,
          isDemo: true,
        },
      });
    }

    await prisma.eventAttendanceConfig.upsert({
      where: { eventId: ev.id },
      update: {
        accessMode: spec.accessMode,
        registrationEnabled: spec.registrationEnabled,
        publicRegistrationToken: spec.publicRegistrationToken,
        checkInOpen: spec.checkInOpen,
        institutionalEmailDomain: 'utc.edu.mx',
      },
      create: {
        eventId: ev.id,
        accessMode: spec.accessMode,
        registrationEnabled: spec.registrationEnabled,
        publicRegistrationToken: spec.publicRegistrationToken,
        checkInOpen: spec.checkInOpen,
        institutionalEmailDomain: 'utc.edu.mx',
      },
    });

    // Asignar operadores de acceso para el escáner QR (Sección 15)
    for (const opUsername of ['extuni', 'director1', 'director2']) {
      const opUser = usersByUsername[opUsername];
      if (opUser) {
        await prisma.eventAccessOperator.upsert({
          where: {
            eventId_userId: {
              eventId: ev.id,
              userId: opUser.id,
            },
          },
          update: { active: true },
          create: {
            eventId: ev.id,
            userId: opUser.id,
            assignedById: creator.id,
            active: true,
          },
        });
      }
    }

    seededPhase2Events[spec.demoCode] = { id: ev.id, demoCode: spec.demoCode, name: ev.name };
  }

  // =========================================================================
  // 7. SEMBRAR 24 ASISTENTES DEMO CON CREDENCIALES QR, IMÁGENES PNG, ENVÍOS Y CHECK-INS (Sección 24)
  // =========================================================================
  interface DemoAttendeeSeed {
    eventDemoCode: string;
    fullName: string;
    email: string;
    attendeeType: 'STUDENT' | 'TEACHER' | 'ADMIN_STAFF' | 'EXTERNAL_GUEST';
    enrollmentNumber?: string;
    careerCode?: string;
    gradeCode?: string;
    deptCode?: string;
    organization?: string;
    registrationStatus: 'REGISTERED' | 'INVITED' | 'REVOKED';
    deliveryStatus: 'SENT' | 'PENDING' | 'FAILED';
    checkedInMethod?: 'QR' | 'MANUAL' | null;
  }

  const demoAttendees: DemoAttendeeSeed[] = [
    // --- DEMO-14: Evento Abierto (14 asistentes de los 4 tipos) ---
    {
      eventDemoCode: 'DEMO-14',
      fullName: 'Valeria Guadalupe Morales Alanís',
      email: 'valeria.morales23@utc.edu.mx',
      attendeeType: 'STUDENT',
      enrollmentNumber: 'UTC2301045',
      careerCode: 'IDGS',
      gradeCode: 'CUAT_09',
      registrationStatus: 'REGISTERED',
      deliveryStatus: 'SENT',
      checkedInMethod: 'QR',
    },
    {
      eventDemoCode: 'DEMO-14',
      fullName: 'Sebastián Emiliano Cantú Villarreal',
      email: 'sebastian.cantu23@utc.edu.mx',
      attendeeType: 'STUDENT',
      enrollmentNumber: 'UTC2301089',
      careerCode: 'IDGS',
      gradeCode: 'CUAT_09',
      registrationStatus: 'REGISTERED',
      deliveryStatus: 'SENT',
      checkedInMethod: 'QR',
    },
    {
      eventDemoCode: 'DEMO-14',
      fullName: 'Camila Fernanda Garza Rodríguez',
      email: 'camila.garza24@utc.edu.mx',
      attendeeType: 'STUDENT',
      enrollmentNumber: 'UTC2402112',
      careerCode: 'IRIC',
      gradeCode: 'CUAT_06',
      registrationStatus: 'REGISTERED',
      deliveryStatus: 'SENT',
      checkedInMethod: 'QR',
    },
    {
      eventDemoCode: 'DEMO-14',
      fullName: 'Diego Alejandro Lozano Chapa',
      email: 'diego.lozano24@utc.edu.mx',
      attendeeType: 'STUDENT',
      enrollmentNumber: 'UTC2402154',
      careerCode: 'IRIC',
      gradeCode: 'CUAT_06',
      registrationStatus: 'REGISTERED',
      deliveryStatus: 'SENT',
      checkedInMethod: 'MANUAL',
    },
    {
      eventDemoCode: 'DEMO-14',
      fullName: 'Mariana Sofía Elizondo Cavazos',
      email: 'mariana.elizondo25@utc.edu.mx',
      attendeeType: 'STUDENT',
      enrollmentNumber: 'UTC2503019',
      careerCode: 'IMEC',
      gradeCode: 'CUAT_03',
      registrationStatus: 'REGISTERED',
      deliveryStatus: 'SENT',
      checkedInMethod: 'QR',
    },
    {
      eventDemoCode: 'DEMO-14',
      fullName: 'Jorge Eduardo Salinas Peña',
      email: 'jorge.salinas25@utc.edu.mx',
      attendeeType: 'STUDENT',
      enrollmentNumber: 'UTC2503044',
      careerCode: 'IMEC',
      gradeCode: 'CUAT_03',
      registrationStatus: 'REGISTERED',
      deliveryStatus: 'SENT',
      checkedInMethod: null,
    },
    {
      eventDemoCode: 'DEMO-14',
      fullName: 'Ana Paula Quintanilla Montemayor',
      email: 'ana.quintanilla23@utc.edu.mx',
      attendeeType: 'STUDENT',
      enrollmentNumber: 'UTC2304077',
      careerCode: 'LGFN',
      gradeCode: 'CUAT_07',
      registrationStatus: 'REGISTERED',
      deliveryStatus: 'SENT',
      checkedInMethod: 'QR',
    },
    {
      eventDemoCode: 'DEMO-14',
      fullName: 'Luis Fernando Cepeda Arredondo',
      email: 'luis.cepeda24@utc.edu.mx',
      attendeeType: 'STUDENT',
      enrollmentNumber: 'UTC2405031',
      careerCode: 'IIND',
      gradeCode: 'CUAT_05',
      registrationStatus: 'REGISTERED',
      deliveryStatus: 'PENDING',
      checkedInMethod: null,
    },
    {
      eventDemoCode: 'DEMO-14',
      fullName: 'Mtra. Claudia Patricia Benavides Tamez',
      email: 'claudia.benavides@utc.edu.mx',
      attendeeType: 'TEACHER',
      deptCode: 'ACAD_TI',
      registrationStatus: 'REGISTERED',
      deliveryStatus: 'SENT',
      checkedInMethod: 'QR',
    },
    {
      eventDemoCode: 'DEMO-14',
      fullName: 'Dr. Héctor Javier Flores Sepúlveda',
      email: 'hector.flores@utc.edu.mx',
      attendeeType: 'TEACHER',
      deptCode: 'ACAD_MECATRONICA',
      registrationStatus: 'REGISTERED',
      deliveryStatus: 'SENT',
      checkedInMethod: 'QR',
    },
    {
      eventDemoCode: 'DEMO-14',
      fullName: 'Mtro. Arturo Gabriel Domínguez Lira',
      email: 'arturo.dominguez@utc.edu.mx',
      attendeeType: 'TEACHER',
      deptCode: 'ACAD_CIENCIAS_BASICAS',
      registrationStatus: 'REGISTERED',
      deliveryStatus: 'SENT',
      checkedInMethod: null,
    },
    {
      eventDemoCode: 'DEMO-14',
      fullName: 'Lic. Gabriela Estefanía Ríos Ochoa',
      email: 'gabriela.rios@utc.edu.mx',
      attendeeType: 'ADMIN_STAFF',
      deptCode: 'ADMIN_SERVICIOS_ESCOLARES',
      registrationStatus: 'REGISTERED',
      deliveryStatus: 'SENT',
      checkedInMethod: 'QR',
    },
    {
      eventDemoCode: 'DEMO-14',
      fullName: 'Ing. Marco Antonio Guajardo Vela',
      email: 'mguajardo@cluster-software-nl.org.mx',
      attendeeType: 'EXTERNAL_GUEST',
      organization: 'Clúster de Software y Tecnologías de Información',
      registrationStatus: 'INVITED',
      deliveryStatus: 'SENT',
      checkedInMethod: 'QR',
    },
    {
      eventDemoCode: 'DEMO-14',
      fullName: 'C.P. Raúl Ernesto Villarreal Mora (Invitación Revocada)',
      email: 'rvillarreal.revocado@externo.mx',
      attendeeType: 'EXTERNAL_GUEST',
      organization: 'Consultoría Externa',
      registrationStatus: 'REVOKED',
      deliveryStatus: 'FAILED',
      checkedInMethod: null,
    },

    // --- DEMO-15: Evento Restringido (10 invitados por lista cerrada) ---
    {
      eventDemoCode: 'DEMO-15',
      fullName: 'Ing. Patricio Zambrano Sada',
      email: 'pzambrano@parqueindustrial-norte.mx',
      attendeeType: 'EXTERNAL_GUEST',
      organization: 'Consejo Industrial del Norte A.C.',
      registrationStatus: 'INVITED',
      deliveryStatus: 'SENT',
      checkedInMethod: 'QR',
    },
    {
      eventDemoCode: 'DEMO-15',
      fullName: 'Lic. Beatriz Eugenia Sada de la Garza',
      email: 'bsada@caintra-vinculacion.org.mx',
      attendeeType: 'EXTERNAL_GUEST',
      organization: 'Cámara de la Industria de Transformación',
      registrationStatus: 'INVITED',
      deliveryStatus: 'SENT',
      checkedInMethod: 'QR',
    },
    {
      eventDemoCode: 'DEMO-15',
      fullName: 'Mtro. Gerardo Alonso Villarreal Garza',
      email: 'gvillarreal@educacion-superior.gob.mx',
      attendeeType: 'EXTERNAL_GUEST',
      organization: 'Subsecretaría de Educación Superior y Ciencia',
      registrationStatus: 'INVITED',
      deliveryStatus: 'SENT',
      checkedInMethod: 'MANUAL',
    },
    {
      eventDemoCode: 'DEMO-15',
      fullName: 'Dra. Lorena Marisol Leal Palacios',
      email: 'lorena.leal@utc.edu.mx',
      attendeeType: 'TEACHER',
      deptCode: 'ACAD_NEGOCIOS',
      registrationStatus: 'INVITED',
      deliveryStatus: 'SENT',
      checkedInMethod: 'QR',
    },
    {
      eventDemoCode: 'DEMO-15',
      fullName: 'Dr. Óscar René Cavazos Treviño',
      email: 'oscar.cavazos@utc.edu.mx',
      attendeeType: 'TEACHER',
      deptCode: 'ACAD_INDUSTRIAL',
      registrationStatus: 'INVITED',
      deliveryStatus: 'SENT',
      checkedInMethod: 'QR',
    },
    {
      eventDemoCode: 'DEMO-15',
      fullName: 'Lic. Verónica Alejandra Dávila Guerra',
      email: 'veronica.davila@utc.edu.mx',
      attendeeType: 'ADMIN_STAFF',
      deptCode: 'ADMIN_VINCULACION',
      registrationStatus: 'INVITED',
      deliveryStatus: 'SENT',
      checkedInMethod: 'QR',
    },
    {
      eventDemoCode: 'DEMO-15',
      fullName: 'C.P. Daniel Humberto Barrera Cantú',
      email: 'daniel.barrera@utc.edu.mx',
      attendeeType: 'ADMIN_STAFF',
      deptCode: 'ADMIN_FINANZAS',
      registrationStatus: 'INVITED',
      deliveryStatus: 'SENT',
      checkedInMethod: null,
    },
    {
      eventDemoCode: 'DEMO-15',
      fullName: 'Lic. Paulina Montserrat Garza Tijerina',
      email: 'paulina.garza@utc.edu.mx',
      attendeeType: 'ADMIN_STAFF',
      deptCode: 'ADMIN_RECTORIA',
      registrationStatus: 'INVITED',
      deliveryStatus: 'SENT',
      checkedInMethod: 'QR',
    },
    {
      eventDemoCode: 'DEMO-15',
      fullName: 'Natalia Ximena Cárdenas Mireles (Representante Consejo Estudiantil)',
      email: 'natalia.cardenas23@utc.edu.mx',
      attendeeType: 'STUDENT',
      enrollmentNumber: 'UTC2301001',
      careerCode: 'IDGS',
      gradeCode: 'CUAT_10',
      registrationStatus: 'INVITED',
      deliveryStatus: 'SENT',
      checkedInMethod: 'QR',
    },
    {
      eventDemoCode: 'DEMO-15',
      fullName: 'Emiliano Gael Méndez Rocha (Consejero Alumno Posgrado)',
      email: 'emiliano.mendez22@utc.edu.mx',
      attendeeType: 'STUDENT',
      enrollmentNumber: 'UTC2209012',
      careerCode: 'LCON',
      gradeCode: 'POSGRADO',
      registrationStatus: 'INVITED',
      deliveryStatus: 'PENDING',
      checkedInMethod: null,
    },
  ];

  let seededAttendeeCount = 0;
  let seededCheckInCount = 0;

  for (let idx = 0; idx < demoAttendees.length; idx++) {
    const item = demoAttendees[idx];
    const targetEv = seededPhase2Events[item.eventDemoCode];
    if (!targetEv) continue;

    const careerId = item.careerCode ? careersByCode[item.careerCode]?.id || null : null;
    const academicGradeId = item.gradeCode ? gradesByCode[item.gradeCode]?.id || null : null;
    const departmentAreaId = item.deptCode ? deptsByCode[item.deptCode]?.id || null : null;

    let attendee = await prisma.eventAttendee.findFirst({
      where: {
        eventId: targetEv.id,
        email: item.email,
      },
    });

    if (!attendee) {
      attendee = await prisma.eventAttendee.create({
        data: {
          eventId: targetEv.id,
          fullName: item.fullName,
          email: item.email,
          attendeeType: item.attendeeType,
          enrollmentNumber: item.enrollmentNumber || null,
          careerId,
          academicGradeId,
          departmentAreaId,
          organization: item.organization || null,
          registrationStatus: item.registrationStatus,
          privacyAcceptedAt: new Date(Date.now() - 86400000 * 2),
          createdById: usersByUsername.director1.id,
          revokedAt: item.registrationStatus === 'REVOKED' ? new Date(Date.now() - 3600000 * 5) : null,
          revokedById: item.registrationStatus === 'REVOKED' ? usersByUsername.director1.id : null,
          revocationReason:
            item.registrationStatus === 'REVOKED'
              ? 'Sustitución de representante solicitada por la empresa invitada.'
              : null,
          isDemo: true,
        },
      });
    } else {
      attendee = await prisma.eventAttendee.update({
        where: { id: attendee.id },
        data: {
          fullName: item.fullName,
          attendeeType: item.attendeeType,
          enrollmentNumber: item.enrollmentNumber || null,
          careerId,
          academicGradeId,
          departmentAreaId,
          organization: item.organization || null,
          registrationStatus: item.registrationStatus,
          isDemo: true,
        },
      });
    }
    seededAttendeeCount++;

    // Crear credencial QR individual determinística y su archivo PNG en ./storage/qrs/
    const { rawToken, tokenHash } = generateSecureQrToken(
      `${item.eventDemoCode}:${item.email}`
    );

    let qrCred = await prisma.attendeeQrCredential.findUnique({
      where: { tokenHash },
    });

    if (!qrCred) {
      qrCred = await prisma.attendeeQrCredential.create({
        data: {
          eventAttendeeId: attendee.id,
          tokenHash,
          qrImagePath: 'pending.png',
          isActive: item.registrationStatus !== 'REVOKED',
          revokedAt: item.registrationStatus === 'REVOKED' ? new Date() : null,
        },
      });
    }

    const savedImg = createAndSaveQrCredentialImage({
      credentialId: qrCred.id,
      rawToken,
      tokenHash,
    });

    await prisma.attendeeQrCredential.update({
      where: { id: qrCred.id },
      data: {
        qrImagePath: savedImg.qrImagePath,
        isActive: item.registrationStatus !== 'REVOKED',
      },
    });

    // Crear registro de envío de invitación si no existe
    const existingInvitation = await prisma.invitationDelivery.findFirst({
      where: { eventAttendeeId: attendee.id },
    });

    if (!existingInvitation) {
      await prisma.invitationDelivery.create({
        data: {
          eventAttendeeId: attendee.id,
          recipientEmail: attendee.email,
          status: item.deliveryStatus,
          attempts: 1,
          sentAt: item.deliveryStatus === 'SENT' ? new Date(Date.now() - 86400000) : null,
          lastAttemptAt: new Date(Date.now() - 86400000),
          errorMessage:
            item.deliveryStatus === 'FAILED'
              ? 'Buzón de correo del destinatario rechazó la conexión (550 Mailbox unavailable).'
              : item.deliveryStatus === 'PENDING'
              ? 'Pendiente de despacho SMTP; pase QR disponible para descarga directa.'
              : null,
        },
      });
    }

    // Crear check-in de asistencia si aplica (QR o MANUAL)
    if (item.checkedInMethod && item.registrationStatus !== 'REVOKED') {
      const existingCheckIn = await prisma.eventAttendance.findUnique({
        where: { eventAttendeeId: attendee.id },
      });

      const checkInTime = new Date();
      checkInTime.setHours(9 + (idx % 3), (idx * 7) % 60, 0, 0);

      if (!existingCheckIn) {
        await prisma.eventAttendance.create({
          data: {
            eventId: targetEv.id,
            eventAttendeeId: attendee.id,
            checkedInAt: checkInTime,
            checkedInById: usersByUsername.extuni.id,
            registrationMethod: item.checkedInMethod,
            notes:
              item.checkedInMethod === 'MANUAL'
                ? 'Contingencia: validación de identidad con credencial institucional en mesa de acceso.'
                : 'Validación por escaneo de código QR individual.',
          },
        });

        await prisma.attendanceScanLog.create({
          data: {
            eventId: targetEv.id,
            attendeeId: attendee.id,
            operatorId: usersByUsername.extuni.id,
            attemptedAt: checkInTime,
            result: 'AUTHORIZED',
            method: item.checkedInMethod,
            details:
              item.checkedInMethod === 'QR'
                ? 'Acceso autorizado mediante escaneo QR.'
                : 'Acceso autorizado mediante registro manual por contingencia.',
          },
        });
      }
      seededCheckInCount++;
    }
  }

  // Registrar intentos rechazados de demostración en AttendanceScanLog (DUPLICATE y REVOKED)
  const demo14Ev = seededPhase2Events['DEMO-14'];
  if (demo14Ev) {
    const existingLogsCount = await prisma.attendanceScanLog.count({
      where: { eventId: demo14Ev.id, result: { not: 'AUTHORIZED' } },
    });
    if (existingLogsCount === 0) {
      const firstStudent = await prisma.eventAttendee.findFirst({
        where: { eventId: demo14Ev.id, email: 'valeria.morales23@utc.edu.mx' },
      });
      const revokedGuest = await prisma.eventAttendee.findFirst({
        where: { eventId: demo14Ev.id, registrationStatus: 'REVOKED' },
      });

      if (firstStudent) {
        await prisma.attendanceScanLog.create({
          data: {
            eventId: demo14Ev.id,
            attendeeId: firstStudent.id,
            operatorId: usersByUsername.extuni.id,
            result: 'DUPLICATE',
            method: 'QR',
            details: 'Intento de segundo reingreso detectado y bloqueado automáticamente.',
          },
        });
      }
      if (revokedGuest) {
        await prisma.attendanceScanLog.create({
          data: {
            eventId: demo14Ev.id,
            attendeeId: revokedGuest.id,
            operatorId: usersByUsername.extuni.id,
            result: 'REVOKED',
            method: 'QR',
            details: 'Presentación de código QR cuya invitación fue revocada previamente.',
          },
        });
      }
    }
  }

  console.log(
    `✔ ${seededAttendeeCount} asistentes demo procesados (${seededCheckInCount} con entrada registrada por QR/Manual) y credenciales PNG creadas en ./storage/qrs/.`
  );
  console.log('==========================================================');
  console.log(' Seed Aditivo Fase 2 completado exitosamente.');
  console.log('==========================================================');
}

if (require.main === module) {
  runSeed()
    .catch((e) => {
      console.error('Error durante el seed:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
