# Guía de Instalación, Configuración y Despliegue — SREU

Guía técnica completa para descargar, instalar, configurar, inicializar y ejecutar el **Sistema de Reservación de Espacios Universitarios (SREU)** en una computadora con **Windows**.

---

## SECCIÓN A. Descripción del Proyecto

### ¿Qué es SREU?
El **Sistema de Reservación de Espacios Universitarios (SREU)** es una plataforma web institucional full-stack diseñada para administrar eventos académicos y universitarios, solicitudes de espacios y equipamiento, flujos de autorización multinivel, control de disponibilidad horaria, cierre documental con evidencias PDF y control de asistencia mediante códigos QR individuales.

### ¿Qué problema resuelve?
En una institución educativa con múltiples edificios, auditorios, espacios comunes y equipamiento compartido, la gestión manual o mediante calendarios genéricos provoca traslapes de horarios, falta de tiempo de limpieza entre eventos, autorizaciones informales, ausencia de trazabilidad documental y descontrol en el acceso de asistentes. SREU centraliza y automatiza estos procesos bajo reglas de negocio estrictas:

- **Integridad de disponibilidad**: Bloqueo provisional automático para solicitudes pendientes y propuestas de cambio de horario, más **1 hora obligatoria de limpieza** posterior a cada evento en el mismo espacio.
- **Autorizaciones independientes**: Flujo separado para la autorización del espacio (Directores de edificio o Extensión Universitaria) y la autorización de equipo (exclusiva de Extensión Universitaria).
- **Ciclo de vida formal y cierre documental**: Seguimiento automático de estados hasta la conclusión y cierre formal con evidencia PDF obligatoria.
- **Control de acceso QR**: Registro de asistentes para eventos abiertos y restringidos, emisión de credenciales QR individuales (PNG y pase PDF) y validación en puerta mediante cámara.

### Funcionalidades Principales
- Autenticación institucional con roles (`DIRECTOR`, `EXTENSION`, `SUPER_ADMIN`).
- Dashboard operativo con métricas de reservaciones, autorizaciones pendientes y asistencia.
- Gestión integral de eventos, solicitudes de espacio, solicitudes de equipo y cambios de horario.
- Calendario institucional con vista por día, semana y mes, y código de colores por estado.
- Carga y resguardo privado de evidencias PDF (`SUPPORTING_DOCUMENT` y `CLOSURE_EVIDENCE`).
- Registro público para eventos abiertos (`/registro/[token]`) y padrón privado para eventos restringidos.
- Escáner QR exclusivo con cámara del navegador (`/escaner`) para operadores autorizados.
- Reportes gerenciales, bitácora de auditoría y exportación a CSV.

### Tecnologías Utilizadas
- **Framework Full-Stack**: Next.js 14 (`14.2.18`) con App Router y Route Handlers (`/api/*`).
- **Frontend**: React 18, TypeScript 5, Tailwind CSS 3, Lucide Icons.
- **Backend y ORM**: Prisma ORM (`^5.22.0`) con base de datos **SQLite** local.
- **Seguridad y QR**: `PBKDF2-SHA512` (100,000 iteraciones) para contraseñas, sesiones firmadas `HMAC-SHA256` en cookies `HTTP-only`, generación de credenciales QR (`qrcode`) y escaneo con cámara (`jsQR` / `BarcodeDetector`).

### Arquitectura General
La aplicación opera como un monolito modular en Next.js donde el frontend (Server y Client Components en `src/app/`) y la API REST (`src/app/api/`) comparten la capa de acceso a datos (`src/lib/prisma.ts`) y servicios de negocio (`src/lib/`). Los archivos binarios generados (evidencias PDF y códigos QR) se almacenan fuera de `public/` en `./storage/` para proteger la privacidad mediante rutas autenticadas. Para mayor detalle técnico, consulte [ARQUITECTURA.md](ARQUITECTURA.md) y [DICCIONARIO_DATOS.md](DICCIONARIO_DATOS.md).

---

## SECCIÓN B. Requisitos

Antes de comenzar, asegúrese de contar con lo siguiente en el equipo Windows:

| Requisito | Versión mínima / recomendada | Notas |
|---|---|---|
| **Sistema Operativo** | Windows 10 / Windows 11 (64 bits) | Compatible con PowerShell 5.1 o PowerShell 7+ |
| **Node.js** | v18.18+ (Recomendado: **v20 LTS** o **v22/v24 LTS**, probado en `v24.14.1`) | Incluye `npm` |
| **npm** | v9+ (Probado en `11.11.0`) | Gestor de paquetes |
| **Git** | v2.30+ (Probado en `2.53.0`) | Para clonar y actualizar el repositorio |
| **Python** *(opcional)* | Python 3.10+ | Solo necesario si se ejecuta manualmente el script de respaldo `scripts/bootstrap-sqlite.py`; el flujo principal `npm run setup` utiliza Node.js/TypeScript |
| **Navegador compatible** | Google Chrome, Microsoft Edge o Firefox actualizados | Con soporte de WebRTC / `getUserMedia` para el módulo `/escaner` |
| **Almacenamiento** | Mínimo 500 MB libres | Para dependencias `node_modules`, compilación `.next` y almacenamiento local |
| **Acceso a Internet** | Requerido durante la instalación | Para clonar el repositorio y descargar paquetes npm |

---

## SECCIÓN C. Descargar el Proyecto

### Opción 1: Clonar con Git (recomendado)

Abra una terminal **PowerShell** en la carpeta donde desea alojar el proyecto y ejecute:

```powershell
git clone https://github.com/26ruso26-sketch/Rsv-UTC.git
cd Rsv-UTC
```

### Opción 2: Descargar como archivo ZIP desde GitHub

1. Ingrese al repositorio en GitHub: `https://github.com/26ruso26-sketch/Rsv-UTC`
2. Haga clic en el botón verde **Code** y seleccione **Download ZIP**.
3. Descomprima el archivo `.zip` en una ruta local (por ejemplo, `C:\Proyectos\Rsv-UTC`).
4. Abra **PowerShell** y navegue a la carpeta extraída:

```powershell
cd C:\Proyectos\Rsv-UTC
```

---

## SECCIÓN D. Instalar Dependencias

Dentro de la raíz del proyecto, ejecute:

```powershell
npm install
```

### ¿Qué instala este comando?
Descarga e instala todas las dependencias de producción y desarrollo declaradas en `package.json` (Next.js, React, Prisma Client, Prisma CLI, Tailwind CSS, TypeScript, `tsx`, `lucide-react`, `qrcode`, `jsqr`, entre otras) dentro de la carpeta `node_modules/`.

### Importancia de conservar `package-lock.json`
El archivo `package-lock.json` fija las versiones exactas de cada paquete y sus subdependencias. Conservarlo garantiza que todas las instalaciones en distintas computadoras reproduzcan exactamente el mismo árbol de dependencias sin incompatibilidades inesperadas.

---

## SECCIÓN E. Configurar Variables de Entorno

Cree el archivo local `.env` a partir de la plantilla `.env.example`:

```powershell
Copy-Item .env.example .env
```

Abra `.env` con su editor de texto y configure los valores correspondientes. **Nunca suba el archivo `.env` a GitHub.**

### Variables Obligatorias
| Variable | Ejemplo / Valor | Descripción |
|---|---|---|
| `DATABASE_URL` | `"file:./dev.db"` | Ruta de la base de datos SQLite relativa al directorio `prisma/`. |
| `SESSION_SECRET` | Cadena aleatoria larga | Clave secreta para firmar cookies de sesión `HMAC-SHA256`. Genere una clave única y robusta en cada instalación. |
| `APP_TIMEZONE` | `"America/Monterrey"` | Zona horaria institucional usada para calcular estados del ciclo de vida y vigencias. |

### Variables de Inicialización (Seed)
| Variable | Descripción |
|---|---|
| `SEED_DEFAULT_PASSWORD` | Contraseña inicial por defecto para las cuentas creadas por `prisma/seed.ts` si no se especifica una contraseña individual. |
| `SEED_ADMIN_PASSWORD` | Contraseña inicial para la cuenta `admin` (`SUPER_ADMIN`). |
| `SEED_DIRECTOR1_PASSWORD` .. `SEED_DIRECTOR4_PASSWORD` | Contraseñas iniciales para `director1`..`director4` (`DIRECTOR`). |
| `SEED_EXTENSION_PASSWORD` | Contraseña inicial para `extuni` (`EXTENSION`). |

> Si estas variables quedan vacías al ejecutar el seed por primera vez, el script generará contraseñas aleatorias seguras automáticamente en lugar de usar contraseñas débiles fijas.

### Variables de Almacenamiento y Reglas Locales (Opcionales con valor por defecto)
| Variable | Valor por defecto | Descripción |
|---|---|---|
| `STORAGE_DIR` | `"./storage/evidences"` | Carpeta privada donde se guardan las evidencias PDF. |
| `QR_STORAGE_DIR` | `"./storage/qrs"` | Carpeta privada donde se almacenan los PNG de credenciales QR. |
| `MAX_PDF_SIZE_MB` | `"15"` | Tamaño máximo permitido (en MB) al subir evidencias PDF. |
| `INSTITUTIONAL_EMAIL_DOMAIN` | `"utc.edu.mx"` | Dominio institucional sugerido para validaciones. |
| `DEMO_MODE` | `"true"` | Indicador interno de entorno. |

### Variables de Correo SMTP (Opcionales)
| Variable | Descripción |
|---|---|
| `MAIL_HOST` | Servidor SMTP (si se deja vacío, el sistema opera normalmente sin enviar correos y permite descarga directa de pases QR/PDF). |
| `MAIL_PORT` | Puerto SMTP (ej. `"587"`). |
| `MAIL_USER` | Usuario SMTP. |
| `MAIL_PASSWORD` | Contraseña SMTP. |
| `MAIL_FROM` | Remitente visible (ej. `"SREU Universidad <notificaciones@utc.edu.mx>"`). |
| `MAIL_SECURE` | `"true"` para SSL/TLS directo (puerto 465) o `"false"` para STARTTLS. |

### Configuración para Acceso con Ngrok
La aplicación utiliza rutas relativas (`/api/...`) y cookies `HTTP-only` compatibles con túneles HTTPS como Ngrok sin requerir variables adicionales. Asegúrese únicamente de mantener `SESSION_SECRET` configurado con un valor seguro antes de exponer el puerto `3000`.

---

## SECCIÓN F. Inicializar Base de Datos

Los scripts oficiales definidos en `package.json` para preparar la base de datos son:

- `npm run setup`: ejecuta `prisma generate && prisma db push && tsx prisma/seed.ts`.
- `npm run db:generate`: ejecuta `prisma generate`.
- `npm run db:push`: ejecuta `prisma db push`.
- `npm run db:migrate`: ejecuta `prisma migrate deploy`.
- `npm run db:seed`: ejecuta `tsx prisma/seed.ts`.

Para inicializar el sistema por primera vez desde cero, ejecute:

```powershell
npm run setup
```

### ¿Qué realiza `npm run setup`?
1. **Genera Prisma Client** (`prisma generate`) con los tipos y modelos definidos en `prisma/schema.prisma`.
2. **Crea la base de datos SQLite** y aplica el esquema (`prisma db push`) en la ubicación:
   ```text
   prisma/dev.db
   ```
3. **Inicializa catálogos y datos base** (`tsx prisma/seed.ts`): crea edificios, espacios, equipamiento, catálogos académicos/administrativos (`Career`, `AcademicGrade`, `DepartmentArea`), usuarios iniciales, eventos de muestra, **documentos PDF de evidencia** en `storage/evidences/` y **códigos QR individuales** en `storage/qrs/`.

> Nota: Si prefiere aplicar las migraciones SQL versionadas en `prisma/migrations/` antes del seed, puede ejecutar `npm run db:generate`, luego `npm run db:migrate` y finalmente `npm run db:seed`.

---

## SECCIÓN G. Iniciar el Sistema

Para iniciar el servidor de desarrollo en el puerto `3000`, ejecute:

```powershell
npm run dev
```

*(Nota: el script `predev` definido en `package.json` verifica automáticamente el cliente Prisma, el esquema y el seed idempotente antes de levantar Next.js).*

### Acceder al Sistema
Abra su navegador y visite:

```text
http://localhost:3000
```

### Detener el Servidor
En la terminal PowerShell donde está corriendo el servidor, presione:

```text
Ctrl + C
```

Confirme con `S` (o `Y`) si Windows pregunta si desea terminar el trabajo por lotes.

---

## SECCIÓN H. Cuentas Iniciales de Acceso

El script `prisma/seed.ts` crea automáticamente las 6 cuentas base del sistema (`director1`, `director2`, `director3`, `director4`, `extuni`, `admin`) asociadas a sus respectivos edificios y roles (`DIRECTOR`, `EXTENSION`, `SUPER_ADMIN`).

- **Por seguridad, las contraseñas no se publican en el repositorio ni en esta guía.**
- En la instalación original, las credenciales se encuentran resguardadas exclusivamente en el archivo privado local `docs/privado/CREDENCIALES_ACCESO.md` (excluido de Git).
- En **nuevas instalaciones**, defina las contraseñas locales deseadas en su archivo `.env` mediante las variables `SEED_DEFAULT_PASSWORD` o `SEED_<ROL>_PASSWORD` antes de ejecutar `npm run setup`. Posteriormente, el usuario `SUPER_ADMIN` puede administrar usuarios y contraseñas desde el módulo `/admin`.

---

## SECCIÓN I. Uso de Funcionalidades

- **Login (`/login`)**: Acceso institucional con usuario y contraseña.
- **Dashboard (`/dashboard`)**: Resumen ejecutivo con métricas de eventos, solicitudes pendientes, alertas de limpieza y ocupación.
- **Eventos (`/eventos` y `/eventos/[id]`)**: Registro de nuevos eventos, consulta de detalle, descarga/carga de documentos PDF, gestión de asistentes y cierre documental.
- **Solicitudes de espacio y equipo**: Creación y seguimiento independiente; el sistema valida automáticamente disponibilidad horaria + 1 hora de limpieza posterior.
- **Autorizaciones (`/autorizaciones`)**: Bandeja para que Directores (auditorios de su edificio) y Extensión Universitaria (espacios comunes y todo el equipamiento) aprueben, rechacen o propongan cambios de horario.
- **Calendario (`/calendario`)**: Vista diaria, semanal y mensual con bloques diferenciados por color (aprobado, pendiente, propuesta de cambio, limpieza).
- **Modificaciones**: Solicitud de cambio de horario (bloqueada automáticamente una vez iniciada la fecha/hora del evento).
- **Evidencias y Cierre documental**: Carga de PDFs clasificables como documento de soporte (`SUPPORTING_DOCUMENT`) o evidencia de cierre (`CLOSURE_EVIDENCE`), indispensable para pasar un evento concluido al estado `CLOSED`.
- **Registro QR, Eventos Abiertos y Restringidos**:
  - **Eventos Abiertos (`OPEN`)**: Generan un enlace público `/registro/[token]` para auto-registro de alumnos, docentes, administrativos e invitados externos con emisión inmediata de QR (PNG y pase PDF).
  - **Eventos Restringidos (`RESTRICTED`)**: Bloquean el registro público y habilitan el padrón privado de invitados dentro de `/eventos/[id]` para alta manual y descarga de pases QR.
- **Administración de invitados y Operadores**: Desde el detalle del evento se gestionan invitados y se asignan usuarios operadores autorizados para controlar el acceso en puerta.
- **Escáner (`/escaner`)**: Módulo móvil/web optimizado que utiliza exclusivamente la cámara del dispositivo para leer códigos QR en vivo, mostrar el resultado de validación, actualizar el contador de ingresos y consultar el historial reciente de escaneos.
- **Reportes y Exportaciones (`/reportes`)**: Tableros analíticos de ocupación, asistencia por tipo de asistente/carrera y exportación de reportes e historiales a CSV.

---

## SECCIÓN J. Configurar Ngrok (Acceso desde Teléfonos / Cámara)

Para probar el escáner QR desde un teléfono móvil conectado a otra red o usar la cámara del celular, es necesario exponer la aplicación local mediante **HTTPS**.

### 1. Exponer el puerto local 3000
Con el servidor SREU ejecutándose (`npm run dev`), abra una segunda terminal y ejecute:

```powershell
ngrok http 3000
```

### 2. Obtener la URL HTTPS
Ngrok mostrará en consola una línea `Forwarding` similar a:
```text
https://xxxx-xx-xx-xx.ngrok-free.app -> http://localhost:3000
```
Copie esa URL `https://...` y ábrala desde el navegador del teléfono o tableta (por ejemplo `https://.../escaner`).

### 3. Permitir el uso de la cámara y por qué requiere HTTPS
Los navegadores modernos bloquean el acceso a `navigator.mediaDevices.getUserMedia` (cámara) en orígenes no seguros (`http://`) fuera de `localhost`. Por ello, al acceder desde un teléfono en red local o internet, **es obligatorio usar la URL HTTPS de Ngrok** y aceptar el permiso de cámara cuando el navegador lo solicite.

### 4. Consideraciones importantes
- La computadora donde corre `npm run dev` y `ngrok` debe **permanecer encendida y con acceso a internet** durante toda la sesión.
- **Ngrok es una herramienta temporal de túnel para pruebas/demostraciones** y **no sustituye un servidor de producción** con dominio institucional, certificado TLS permanente y respaldo automatizado.

---

## SECCIÓN K. Almacenamiento y Respaldos

### Ubicación de archivos críticos
- **Base de datos SQLite**: `prisma/dev.db`
- **Evidencias PDF**: `storage/evidences/` (configurable con `STORAGE_DIR`)
- **Imágenes PNG de códigos QR**: `storage/qrs/` (configurable con `QR_STORAGE_DIR`)

### Cómo respaldar la instalación
1. Detenga el servidor (`Ctrl + C`) para evitar escrituras activas sobre SQLite.
2. Copie `prisma/dev.db` hacia una carpeta externa de respaldo con fecha (ej. `backup-dev-YYYYMMDD.db`).
3. Copie íntegras las carpetas `storage/evidences/` y `storage/qrs/`, además de su archivo `.env` (en un lugar seguro).

### Cómo restaurar una instalación
1. Instale dependencias (`npm install`) y genere Prisma Client (`npm run db:generate`).
2. Coloque el archivo respaldado en `prisma/dev.db`.
3. Restaure las carpetas `storage/evidences/` y `storage/qrs/` y su archivo `.env`.
4. Inicie el sistema con `npm run dev`.

### Archivos que NO deben subirse a GitHub
- `.env` y `.env*.local`
- `docs/privado/CREDENCIALES_ACCESO.md`
- `prisma/dev.db`, archivos `-wal`/`-shm` y backups `.db.bak` / `.backup*`
- `storage/evidences/` y `storage/qrs/`
- `node_modules/` y `.next/`

---

## SECCIÓN L. Problemas Frecuentes

| Problema | Causa probable | Solución |
|---|---|---|
| **Prisma Client no generado** (`@prisma/client did not initialize yet`) | No se ejecutó la generación tras instalar dependencias. | Ejecute `npm run db:generate` o `npm run setup`. |
| **Error de conexión SQLite** (`Unable to open the database file`) | Falta `.env`, `DATABASE_URL` incorrecta o `prisma/dev.db` no ha sido creada. | Verifique `.env` (`DATABASE_URL="file:./dev.db"`) y ejecute `npm run setup`. |
| **Dependencias faltantes** (`Cannot find module ...`) | `node_modules` incompleto o no instalado. | Ejecute `npm install`. |
| **Puerto 3000 ocupado** (`EADDRINUSE: address already in use :::3000`) | Otro proceso está usando el puerto `3000`. | Cierre el otro proceso o libere el puerto en PowerShell antes de volver a ejecutar `npm run dev`. |
| **Error de permisos de cámara** | Se accedió por `http://` desde una IP o teléfono, o el usuario denegó el permiso. | Acceda por `https://` usando Ngrok (`ngrok http 3000`) o `http://localhost:3000`, y habilite el permiso de cámara en la barra del navegador. |
| **Ngrok no conectado** | El servidor local no está corriendo en el puerto 3000 o falta authtoken de Ngrok. | Verifique que `npm run dev` esté activo y que Ngrok esté autenticado (`ngrok config add-authtoken <TOKEN>`). |
| **Archivos PDF no encontrados** | La carpeta `storage/evidences/` fue borrada o movida respecto a `prisma/dev.db`. | Restaure `storage/evidences/` o ejecute `npm run setup` en una instalación limpia. |
| **Problemas de configuración de entorno** | Archivo `.env` ausente o con comillas/rutas inválidas. | Copie `.env.example` a `.env` (`Copy-Item .env.example .env`) y valide cada variable. |
