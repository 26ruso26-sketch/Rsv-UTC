# Sistema de Reservación de Espacios Universitarios (SREU)

Plataforma web institucional full-stack para administrar eventos universitarios, solicitudes de espacios y equipamiento, flujos de autorización por rol, control transaccional de disponibilidad con **1 hora obligatoria de limpieza**, **ciclo de vida formal con cierre documental PDF** y **control de asistencia mediante códigos QR individuales**.

---

## Funcionalidades Principales

- **Gestión de Eventos y Solicitudes**: Registro de eventos, solicitudes independientes de espacio y equipo, propuestas de cambio de horario y control automático de conflictos con 1 hora de limpieza posterior.
- **Autorizaciones Multinivel**: Bandeja diferenciada para Directores de Edificio (`DIRECTOR`), Coordinación de Extensión Universitaria (`EXTENSION`) y Administración General (`SUPER_ADMIN`).
- **Calendario Institucional**: Vistas diaria, semanal y mensual con diferenciación visual de reservaciones aprobadas, pendientes, propuestas de cambio y bloques de limpieza.
- **Ciclo de Vida y Cierre Documental**: Transiciones automáticas de estado (`PENDING_APPROVAL`, `SCHEDULED`, `IN_PROGRESS`, `COMPLETED_PENDING_EVIDENCE`, `CLOSED`, `REJECTED`, `EXPIRED`) y resguardo privado de evidencias PDF (`SUPPORTING_DOCUMENT` y `CLOSURE_EVIDENCE`).
- **Eventos Abiertos y Restringidos**:
  - **Abiertos (`OPEN`)**: Enlace público `/registro/[token]` para registro previo de alumnos, docentes, administrativos e invitados externos con emisión instantánea de pase QR (PNG y PDF).
  - **Restringidos (`RESTRICTED`)**: Padrón privado de invitados administrado por el organizador dentro del detalle del evento.
- **Escáner QR Móvil (`/escaner`)**: Validación en puerta exclusivamente mediante la cámara del dispositivo, contador de asistencias en tiempo real e historial reciente de escaneos.
- **Reportes y Auditoría**: Indicadores de ocupación y asistencia, exportación a CSV y bitácora completa de acciones del sistema.

---

## Tecnologías Utilizadas

- **Framework Full-Stack**: Next.js 14 (App Router + API Route Handlers)
- **Frontend**: React 18, TypeScript 5, Tailwind CSS 3, Lucide Icons
- **ORM y Base de Datos**: Prisma ORM 5 + SQLite (`prisma/dev.db`)
- **Seguridad y QR**: `PBKDF2-SHA512` (100,000 iteraciones), sesiones `HMAC-SHA256` en cookies `HTTP-only`, generación de QR (`qrcode`) y lectura por cámara (`jsQR` / `BarcodeDetector`)

---

## Estructura General del Proyecto

```text
├── docs/
│   ├── INSTALACION_Y_DESPLIEGUE.md   # Guía completa de instalación en Windows y Ngrok
│   ├── ARQUITECTURA.md               # Arquitectura y decisiones técnicas
│   └── DICCIONARIO_DATOS.md          # Modelo relacional Prisma / SQLite
├── prisma/
│   ├── schema.prisma                 # Esquema de base de datos
│   ├── migrations/                   # Migraciones SQL versionadas
│   └── seed.ts                       # Inicialización idempotente de catálogos y datos base
├── scripts/
│   └── bootstrap-sqlite.py           # Script auxiliar de inicialización SQLite
├── src/
│   ├── app/                          # Páginas App Router (públicas, protegidas y /api/*)
│   ├── components/                   # Componentes UI reutilizables y navegación responsiva
│   ├── lib/                          # Autenticación, disponibilidad, QR, PDF y utilidades
│   └── types/                        # Tipos TypeScript compartidos
├── .env.example                      # Plantilla de variables de entorno
└── package.json                      # Dependencias y scripts oficiales
```

---

## Instalación Rápida (Windows PowerShell)

1. **Clonar el repositorio e instalar dependencias**:
   ```powershell
   git clone https://github.com/26ruso26-sketch/Rsv-UTC.git
   cd Rsv-UTC
   npm install
   ```

2. **Configurar variables de entorno**:
   ```powershell
   Copy-Item .env.example .env
   ```
   Edite `.env` para establecer `SESSION_SECRET` y las contraseñas iniciales de seed (`SEED_DEFAULT_PASSWORD` o por rol).

3. **Inicializar la base de datos e iniciar el servidor**:
   ```powershell
   npm run setup
   npm run dev
   ```

4. Abrir en el navegador: `http://localhost:3000`

> **Documentación completa paso a paso**: Consulte [docs/INSTALACION_Y_DESPLIEGUE.md](docs/INSTALACION_Y_DESPLIEGUE.md) para ver requisitos detallados, variables de entorno, configuración de Ngrok para pruebas con cámara en móviles, respaldos y solución de problemas.

---

## Estado de las Funcionalidades

| Módulo | Estado | Notas |
|---|---|---|
| Autenticación, roles y auditoría | Implementado | Sesiones `HTTP-only` firmadas con `HMAC-SHA256` |
| Eventos, solicitudes y disponibilidad | Implementado | Validación transaccional + 1 hora de limpieza |
| Autorizaciones y cambios de horario | Implementado | Flujo separado de espacio y equipo |
| Evidencias PDF y cierre documental | Implementado | Almacenamiento privado fuera de `public/` |
| Registro público, invitados y QR | Implementado | Descarga de pases PNG y PDF institucional |
| Escáner QR con cámara (`/escaner`) | Implementado | Lectura en vivo mediante cámara del navegador |
| Reportes y exportaciones CSV | Implementado | Ocupación, asistencia y exportación |
| Envío SMTP automático | Opcional | Si `MAIL_HOST` no se configura, el sistema opera normalmente con descarga directa de pases |

---

## Consideraciones de Seguridad

- No publique archivos `.env`, bases de datos locales (`prisma/dev.db`), respaldos SQLite, credenciales privadas ni archivos generados en `storage/`.
- Defina una clave robusta para `SESSION_SECRET` y contraseñas seguras para los usuarios iniciales antes de desplegar o exponer la aplicación mediante túneles como Ngrok.
- Para uso fuera de `localhost` con cámara móvil en `/escaner`, utilice siempre **HTTPS**.

---

## Documentación Técnica

- [Guía de Instalación y Despliegue](docs/INSTALACION_Y_DESPLIEGUE.md)
- [Arquitectura del Sistema](docs/ARQUITECTURA.md)
- [Diccionario de Datos](docs/DICCIONARIO_DATOS.md)
