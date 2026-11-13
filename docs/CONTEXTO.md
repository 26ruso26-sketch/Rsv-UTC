# CONTEXTO.md — Guía de Contexto Rápido del Proyecto SREU

> **Qué es este archivo:** resumen operativo y conceptual de todo el sistema, pensado para ponerse al día rápido (hackathon, onboarding, demo). Es un documento de **lectura**; para registrar tus propios cambios usa [BITACORA_ACTUALIZACIONES.md](BITACORA_ACTUALIZACIONES.md).
>
> Documentos fuente: [README.md](../README.md), [ARQUITECTURA.md](ARQUITECTURA.md), [DICCIONARIO_DATOS.md](DICCIONARIO_DATOS.md), [INSTALACION_Y_DESPLIEGUE.md](INSTALACION_Y_DESPLIEGUE.md).
>
> Última verificación contra el código: **2026-11-12**.

---

## 1. En una frase

**SREU** (Sistema de Reservación de Espacios Universitarios) es una app web institucional donde un organizador registra un evento, el sistema valida que el espacio esté libre **+1 hora obligatoria de limpieza**, un autorizador (Director de edificio o Extensión Universitaria) aprueba o rechaza, y al terminar el evento se exige **evidencia PDF de cierre**. En paralelo gestiona **asistencia con credenciales QR individuales** validadas con la cámara del celular.

---

## 2. Stack y forma del proyecto

| Pieza | Tecnología |
|---|---|
| Framework | Next.js 14 — App Router, monolito full-stack (UI + API en el mismo proceso, puerto `3000`) |
| Lenguaje | TypeScript 5 |
| UI | React 18, Tailwind CSS 3, Lucide Icons |
| Datos | Prisma ORM 5 + SQLite (`prisma/dev.db`) |
| Contraseñas | PBKDF2-SHA512, 100 000 iteraciones |
| Sesión | Cookie `HTTP-only` firmada con HMAC-SHA256 (`SESSION_SECRET`) |
| QR | Generación propia (sin dependencias externas de QR); lectura con `BarcodeDetector` + fallback `jsQR` embebido |
| PDF | Generador propio (`src/lib/pdf-generator.ts`), sin librería externa |
| Correo | SMTP **opcional**; si `MAIL_HOST` está vacío, el sistema opera igual y el pase se descarga directo |

**Dato importante:** `package.json` solo trae 5 dependencias de producción (`@prisma/client`, `lucide-react`, `next`, `react`, `react-dom`). QR y PDF están implementados a mano en `src/lib/`. Los docs mencionan `qrcode`/`jsQR` como técnicas, no como paquetes npm instalados.

---

## 3. Mapa del código

```text
src/
├── app/
│   ├── page.tsx                      # Redirige (307) a /login o /dashboard
│   ├── login/page.tsx                # Login por USUARIO (no por email)
│   ├── registro/[token]/page.tsx     # PÚBLICO: auto-registro + descarga de QR (eventos OPEN)
│   ├── (protected)/                  # Requiere sesión; envuelto en AppShell
│   │   ├── dashboard/                #   Inicio: métricas y alertas
│   │   ├── eventos/                  #   Lista, detalle [id] y alta /nuevo
│   │   ├── calendario/               #   Vistas día / semana / mes
│   │   ├── autorizaciones/           #   Bandeja (solo DIRECTOR / EXTENSION / SUPER_ADMIN)
│   │   ├── escaner/                  #   Escáner QR con cámara
│   │   ├── reportes/                 #   Tableros + exportación CSV
│   │   └── admin/                    #   Solo SUPER_ADMIN
│   └── api/                          # 30+ Route Handlers (ver §7)
├── components/layout/AppShell.tsx    # Sidebar en escritorio + barra inferior en móvil
└── lib/
    ├── auth.ts          # Sesión, cookie firmada, guardas de rol
    ├── crypto.ts        # hashPassword / verifyPassword (PBKDF2)
    ├── availability.ts  # MOTOR de disponibilidad (+1h limpieza, bloqueos provisionales)
    ├── lifecycle.ts     # MOTOR de ciclo de vida y vencimientos automáticos
    ├── qr-service.ts    # Token de alta entropía, hash SHA-256, PNG del QR
    ├── pdf-generator.ts # PDFs institucionales (pases y evidencias)
    ├── mail-service.ts  # SMTP opcional
    ├── bootstrap.ts     # Auto-seed si la BD está vacía al primer request
    ├── prisma.ts        # Singleton de PrismaClient
    └── utils.ts         # addCleaningMinutes(), timeToMinutes(), fechas America/Monterrey
```

Fuera de `src/`:

```text
prisma/schema.prisma   # 25 modelos
prisma/seed.ts         # Seed ADITIVO e idempotente (ojo: ver §9)
prisma/reset-demo.ts   # Requiere CONFIRM_DEMO_RESET="true"
storage/evidences/     # PDFs privados (NO está en /public)
storage/qrs/           # PNGs de credenciales QR (NO está en /public)
```

---

## 4. Los 3 roles y qué puede hacer cada uno

| Rol | Cuentas | Alcance |
|---|---|---|
| `DIRECTOR` | `director1`..`director4` | Autoriza **solo el auditorio de su propio edificio**. Puede crear eventos. |
| `EXTENSION` | `extuni` | Autoriza **espacios comunes** (Domo, Explanada, Auditorio Vinculación, canchas) y **todo el equipamiento**. |
| `SUPER_ADMIN` | `admin` | Ve todas las bandejas, módulo `/admin` (usuarios, edificios, espacios, catálogos, bitácora) y es el único que puede reemplazar evidencias. |

El autorizador no se elige a mano: cada `Space` tiene `authorizerUserId` y el evento hereda ese autorizador al crear la solicitud ([src/app/api/events/route.ts:356](../src/app/api/events/route.ts#L356)). El equipamiento siempre va a `extuni` ([línea 402](../src/app/api/events/route.ts#L402)).

**Mapa real de autorización por espacio:**

| Espacio | Categoría | Cap. | Autoriza |
|---|---|---|---|
| AUD-EDIF-1 | AUDITORIO | 180 | `director1` |
| AUD-EDIF-2 | AUDITORIO | 160 | `director2` |
| AUD-EDIF-3 | AUDITORIO | 200 | `director3` |
| AUD-EDIF-4 | AUDITORIO | 150 | `director4` |
| DOMO | EXPLANADA_DOMO | 600 | `extuni` |
| EXPLANADA | EXPLANADA_DOMO | 800 | `extuni` |
| AUD-VINCULACION | AUDITORIO | 350 | `extuni` |
| CANCHA-FUTBOL | DEPORTIVO | 250 | `extuni` |
| CANCHA-SOFTBALL | DEPORTIVO | 200 | `extuni` |

---

## 5. Las 4 reglas de negocio que definen el sistema

### 5.1 Regla +1 hora de limpieza
Un espacio no queda libre al terminar el evento: `cleaningEndTime = endTime + 60 min` ([src/lib/utils.ts:167](../src/lib/utils.ts#L167)). El motor de disponibilidad compara **minutos desde medianoche** (`startMinutes`, `endMinutes`, `cleaningEndMinutes`), no cadenas de texto, y la validación corre dentro de una transacción Prisma para evitar dobles reservas por concurrencia.

### 5.2 Ciclo de vida en 7 estados
`PENDING_APPROVAL` → `SCHEDULED` → `IN_PROGRESS` → `COMPLETED_PENDING_EVIDENCE` → `CLOSED`, más las ramas `REJECTED` y `EXPIRED`. Se **calcula** en [src/lib/lifecycle.ts](../src/lib/lifecycle.ts) con objetos `Date` reales en `America/Monterrey`; es independiente del estado de la solicitud de espacio, de equipo y del check-in.

Dos comportamientos derivados:
- `syncExpiredRequests()` corre **antes** de listar eventos o autorizaciones: toda solicitud `PENDING` cuya hora de inicio ya pasó se marca `EXPIRED`, libera las reservaciones provisionales (`RELEASED`), notifica y escribe `AuditLog`.
- `hasEventStarted()` bloquea registrar o aprobar cambios de horario una vez que `ahora >= fechaHoraInicio`.

### 5.3 Cierre documental obligatorio
Para pasar a `CLOSED` se exige que el evento haya terminado **y** que exista al menos una evidencia activa (`isArchived = false`) de categoría `CLOSURE_EVIDENCE` subida **después** de la hora de término. Las evidencias se clasifican en `SUPPORTING_DOCUMENT` (previas) y `CLOSURE_EVIDENCE` (probatorias).

**No hay borrado libre de evidencias.** Un reemplazo excepcional requiere `SUPER_ADMIN` + `replacementReason` obligatorio; el archivo anterior se conserva como `isArchived = true` y queda vinculado con `replacedById`.

### 5.4 Cero datos personales en el QR
El QR solo codifica `SREU-QR:<rawToken>`, con `rawToken = crypto.randomBytes(24)`. Ni nombre, ni matrícula, ni correo. En la BD solo vive el `tokenHash` (SHA-256, índice único). El PNG se guarda en `./storage/qrs/` y se sirve exclusivamente vía `GET /api/qrs/[attendeeId]` validando sesión o token de descarga.

El check-in es transaccional con `@unique` sobre `eventAttendeeId`, y cada intento queda en `AttendanceScanLog` con uno de estos resultados: `SUCCESS`, `DUPLICATE`, `INVALID_TOKEN`, `WRONG_EVENT`, `REVOKED_CREDENTIAL`, `CHECKIN_CLOSED`.

---

## 6. Modelo de datos (25 modelos)

**Catálogos (8):** `Building`, `User`, `Space`, `AudienceType`, `EquipmentType`, `Career`, `AcademicGrade`, `DepartmentArea`

**Núcleo de eventos y reservas (7):** `Event`, `EventAudience`, `SpaceRequest`, `EquipmentRequest`, `EquipmentRequestType`, `ScheduleChangeRequest`, `Reservation`

**Documental (1):** `EventEvidence`

**Asistencia QR — Fase 2 (7):** `EventAttendanceConfig`, `EventAttendee`, `AttendeeQrCredential`, `EventAttendance`, `InvitationDelivery`, `EventAccessOperator`, `AttendanceScanLog`

**Transversales (2):** `Notification`, `AuditLog`

Dos tipos de evento, definidos por `EventAttendanceConfig.accessMode`:
- **`OPEN`** → genera `publicRegistrationToken` y habilita `/registro/[token]` para auto-registro de `STUDENT`, `TEACHER`, `ADMIN_STAFF`, `EXTERNAL_GUEST`.
- **`RESTRICTED`** → sin registro público; padrón privado administrado desde `/eventos/[id]`.

Detalle campo por campo en [DICCIONARIO_DATOS.md](DICCIONARIO_DATOS.md).

---

## 7. Superficie de API (`src/app/api/`)

| Grupo | Rutas |
|---|---|
| Auth | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` |
| Eventos | `GET,POST /events`, `GET,PATCH /events/[id]`, `/events/[id]/schedule-change`, `/events/[id]/resend-space`, `/events/[id]/resend-equipment` |
| Autorizaciones | `GET /authorizations`, `PATCH /authorizations/space/[id]`, `/authorizations/equipment/[id]`, `/authorizations/schedule-change/[id]` |
| Disponibilidad | `GET /availability` (alimenta el calendario y el alta de eventos) |
| Asistencia | `/events/[id]/attendance-config`, `/events/[id]/attendees`, `/events/[id]/check-in`, `/events/[id]/operators` |
| Evidencias | `/events/[id]/evidences`, `GET /evidences/[id]` (descarga privada) |
| QR | `GET /qrs/[attendeeId]` (PNG privado) |
| Público | `GET,POST /public/registro/[token]` |
| Panel | `GET /dashboard`, `GET /reports`, `GET /notifications`, `GET /catalogs` |
| Admin | `/admin/users`, `/admin/users/[id]`, `/admin/buildings`, `/admin/spaces`, `/admin/catalogs`, `/admin/audit` |

---

## 8. Arrancar desde cero

El repo **no incluye** `.env` ni `prisma/dev.db` (ambos en `.gitignore`), así que un `git clone` recién bajado no puede loguear a nadie hasta ejecutar esto:

```bash
cp .env.example .env
# editar .env: SESSION_SECRET y SEED_DEFAULT_PASSWORD
npm install
npm run setup      # prisma generate && prisma db push && tsx prisma/seed.ts
npm run dev        # http://localhost:3000
```

Variables mínimas en `.env`:

| Variable | Para qué |
|---|---|
| `DATABASE_URL` | `"file:./dev.db"` — sin esto Prisma falla con *Unable to open the database file* |
| `SESSION_SECRET` | Firma HMAC de la cookie de sesión |
| `SEED_DEFAULT_PASSWORD` | Contraseña inicial de las 6 cuentas. **Si queda vacía, el seed genera contraseñas aleatorias que nadie ve** |
| `APP_TIMEZONE` | `"America/Monterrey"` |
| `STORAGE_DIR` / `QR_STORAGE_DIR` | Carpetas privadas de PDFs y QRs |

Las contraseñas **no** se publican en el repo por diseño; en la instalación original viven en `docs/privado/CREDENCIALES_ACCESO.md`, que está en `.gitignore`.

El login se hace con **usuario**, no con correo: `director1`, no `director1@utc.edu.mx` ([src/app/api/auth/login/route.ts](../src/app/api/auth/login/route.ts)).

Para probar el escáner desde un celular hace falta **HTTPS** (`ngrok http 3000`), porque los navegadores bloquean `getUserMedia` en orígenes no seguros fuera de `localhost`.

---

## 9. Qué trae el seed realmente (y qué no)

Después de `npm run setup` en una instalación limpia:

| Dato | Cantidad |
|---|---|
| Edificios | 4 |
| Usuarios | 6 |
| Espacios | 9 |
| Carreras / Grados / Departamentos | 6 / 11 / 10 |
| **Eventos** | **2** (`DEMO-14` abierto, `DEMO-15` restringido) |
| Asistentes | 24 (con sus 24 PNG de QR) |
| Asistencias registradas | 18 |
| Evidencias PDF | 2 (ambas `SUPPORTING_DOCUMENT`) |
| Solicitudes espacio / equipo | 2 / 2 (todas `APPROVED`) |
| Operadores de acceso | 6 |
| Bitácora de escaneos | 20 |

> ⚠️ **Limitación conocida.** `prisma/seed.ts` está escrito como **aditivo** sobre un dataset de Fase 1 que ya no vive en el repo: busca `DEMO-01`..`DEMO-13` y `DEMO-HIST-01` para completarlos, pero solo **crea** `DEMO-14` y `DEMO-15`. En una instalación nueva esos 13 eventos no existen, así que la BD arranca con 2 eventos, ambos ya aprobados.
>
> Consecuencia práctica para una demo: `/autorizaciones` arranca **sin pendientes**, `AuditLog` y `Notification` arrancan en **0**, y no hay eventos en estado `PENDING_APPROVAL`, `REJECTED`, `EXPIRED` ni `CLOSED`. Esos escenarios hay que generarlos a mano creando un evento desde `/eventos/nuevo`.

---

## 10. Datos útiles para un recorrido de demo

- Ambos eventos demo los organiza **`director1`** y ambos tienen espacio y equipo ya aprobados.
- Token de registro público del evento abierto: `/registro/reg_congreso_ia_ciberseguridad_utc2026`
- Operadores de acceso asignados en los dos eventos: `director1`, `director2`, `extuni`.
- Asistentes **sin check-in** (sirven para probar el escáner):

| Evento | Asistente | Tipo | Estado |
|---|---|---|---|
| DEMO-14 | Jorge Eduardo Salinas Peña | STUDENT | REGISTERED |
| DEMO-14 | Luis Fernando Cepeda Arredondo | STUDENT | REGISTERED |
| DEMO-14 | Mtro. Arturo Gabriel Domínguez Lira | TEACHER | REGISTERED |
| DEMO-14 | C.P. Raúl Ernesto Villarreal Mora | EXTERNAL_GUEST | **REVOKED** ← sirve para provocar `REVOKED_CREDENTIAL` |
| DEMO-15 | C.P. Daniel Humberto Barrera Cantú | ADMIN_STAFF | INVITED |
| DEMO-15 | Emiliano Gael Méndez Rocha | STUDENT | INVITED |

- Para generar pendientes de autorización: entra como `director1`, crea un evento en **AUD-EDIF-2** (lo autoriza `director2`) o en el **DOMO** (lo autoriza `extuni`), y la solicitud aparecerá en la bandeja del otro rol.
- Para ver la regla de limpieza en acción: pide el mismo espacio y día con una hora de inicio **dentro de los 60 min** posteriores al fin de un evento aprobado; el sistema debe rechazarlo por conflicto.

---

## 11. Decisiones de diseño que conviene no romper

1. **Un solo proceso y puerto.** Todo usa rutas relativas (`/api/...`) para que un túnel Ngrok funcione sin reconfigurar nada.
2. **Nada sensible bajo `/public`.** PDFs y PNGs se sirven por Route Handler con validación de sesión. Mover esos archivos a `public/` rompería el modelo de privacidad.
3. **Fechas como `Date` reales, nunca comparación de cadenas**, y minutos desde medianoche para los horarios.
4. **Todo lo que afecta disponibilidad va en `$transaction`.**
5. **Auditoría en vez de borrado.** Evidencias archivadas, credenciales revocadas, solicitudes expiradas: el sistema marca estados, no elimina filas.
6. **Seed idempotente.** Se puede volver a correr sin duplicar; `predev`/`prestart` lo ejecutan en cada arranque, y `src/lib/bootstrap.ts` lo dispara en el primer request si la tabla `User` está vacía.
7. **El seed solo sobrescribe contraseñas cuando la variable de entorno está definida explícitamente** (`isExplicit`), para no pisar contraseñas cambiadas desde `/admin`.

---

## 12. Dónde seguir leyendo

| Necesito... | Archivo |
|---|---|
| Instalar, respaldar, Ngrok, solución de problemas | [INSTALACION_Y_DESPLIEGUE.md](INSTALACION_Y_DESPLIEGUE.md) |
| Decisiones y diagrama de arquitectura | [ARQUITECTURA.md](ARQUITECTURA.md) |
| Cada tabla y cada campo | [DICCIONARIO_DATOS.md](DICCIONARIO_DATOS.md) |
| Panorama general y estado de módulos | [README.md](../README.md) |
| Registrar mis propios cambios | [BITACORA_ACTUALIZACIONES.md](BITACORA_ACTUALIZACIONES.md) |
