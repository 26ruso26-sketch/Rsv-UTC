# BITÁCORA DE ACTUALIZACIONES — SREU

> **Qué es este archivo:** el lugar donde **tú** registras lo que vas cambiando en el proyecto. No lo genera ningún script; se edita a mano.
>
> **Para qué sirve:** que cualquiera (incluido tú en tres días) sepa qué se tocó, por qué, y qué hay que correr después de hacer `git pull`.
>
> Para entender el sistema tal como está, ve a [CONTEXTO.md](CONTEXTO.md).

---

## Cómo usar esta bitácora

1. **Agrega las entradas nuevas arriba**, justo debajo de esta sección (orden cronológico inverso: lo más reciente primero).
2. Copia la plantilla, llena los campos que aplican y **borra las líneas que no uses**.
3. Si tu cambio obliga a otros a correr algo (`npm install`, `npm run setup`, editar `.env`), ponlo en **Acciones requeridas tras `git pull`**. Es el campo más importante del archivo.
4. Si tocaste `prisma/schema.prisma`, dilo explícitamente y anota la migración.
5. **Nunca escribas contraseñas, tokens ni `SESSION_SECRET` aquí.** Este archivo sí se sube a Git. Los secretos van en `.env` y en `docs/privado/CREDENCIALES_ACCESO.md` (ambos ignorados por Git).

### Etiquetas sugeridas

`feat` nueva funcionalidad · `fix` corrección · `db` esquema o seed · `docs` documentación · `refactor` reorganización sin cambio funcional · `config` entorno o build · `ui` interfaz · `security` seguridad

### Plantilla (copiar y pegar)

```markdown
## AAAA-MM-DD — [etiqueta] Título corto del cambio

**Autor:** 

**Qué cambié**
- 

**Por qué**
- 

**Archivos tocados**
- `ruta/al/archivo.ts` — 

**Acciones requeridas tras `git pull`**
- [ ] Ninguna
- [ ] `npm install`
- [ ] `npm run setup` (regenera Prisma Client y aplica el esquema)
- [ ] Agregar variable nueva a `.env`: `NOMBRE_VARIABLE`
- [ ] Otra: 

**¿Cambió `prisma/schema.prisma`?** No / Sí → migración: `prisma/migrations/______`

**Cómo lo probé**
- 

**Pendiente / riesgos conocidos**
- 
```

---
<!-- ↓↓↓ AGREGA TUS ENTRADAS NUEVAS AQUÍ ↓↓↓ -->

## 2026-11-12 — [ui][feat] Sistema visual del dashboard y formatos institucionales de reporte

**Autor:** Diego (con Claude Code)

**Qué cambié**
- Implementé el sistema de tokens de [dashboard_ui_style_guide.md](dashboard_ui_style_guide.md): colores, tipografía Inter, radios, sombras y espaciados. El verde profundo (`#114B36`) y el oro (`#C5A049`) se tomaron de la plantilla institucional de reportes para que el dashboard y los PDF usen la misma identidad.
- Rediseñé el shell de la aplicación (`AppShell`): fondo gris claro, contenedor blanco redondeado, barra lateral clara con navegación agrupada (MENU / GENERAL) e indicador verde del elemento activo, banner inferior de escáner QR, topbar compacta con buscador de secciones y perfil. Se conservaron la navegación inferior móvil, el bottom sheet «Más» y las notificaciones.
- Rediseñé el dashboard con el sistema de tarjetas: cuatro métricas (la primera destacada en verde oscuro), gráfico de barras del ciclo de vida, dona de asistencia efectiva, recordatorios, lista de eventos y bandeja de autorizaciones. No se inventaron métricas: todo sale de `/api/dashboard`.
- Rediseñé la pantalla de reportes y agregué un **centro de exportación** con cuatro salidas, todas respetando los filtros activos.
- **PDF:** nueva vista imprimible `/reportes/imprimir` que reproduce `Plantilla_Reporte_Metricas_ERM_UTC` en A4 (banda verde/oro, folio, sello QR de verificación, 6 KPIs, tablas, observación editable y firma), con paginación automática para carreras, espacios y detalle de eventos. Se imprime con Ctrl/Cmd + P → Guardar como PDF.
- **Excel:** `/api/reports/export?format=xlsx` rellena la plantilla real `templates/reporte-eventos-erm-utc.xlsx`, conservando estilos, hoja «Resumen Gráfico» y el gráfico de barras. Se escribió un lector/escritor ZIP propio (`src/lib/xlsx/zip.ts`) para no agregar dependencias.
- **CSV:** mismo diseño de la plantilla en texto plano, más el padrón nominal de asistentes, ambos generados en el servidor.
- Extraje la lógica de `/api/reports` a `src/lib/reports-service.ts` para que la vista JSON, las exportaciones y el PDF usen exactamente los mismos filtros y métricas.
- Moví las plantillas fuera de `branch assets/` (carpeta que se va a eliminar): el `.xlsx` a `templates/`, el HTML y el PDF de referencia a `docs/plantillas/`, y la guía de estilo a `docs/`.

**Por qué**
- La interfaz tenía estilos sueltos por pantalla (slate/emerald) sin tokens centralizados, y los reportes se exportaban con formatos propios en lugar de los institucionales de la UTC.

**Archivos tocados**
- `src/app/globals.css` — tokens CSS, fuente Inter, componentes `ui-*` y utilidades.
- `tailwind.config.ts` — paleta, radios y sombras del sistema (en hexadecimal, para permitir modificadores de opacidad).
- `src/app/layout.tsx` — fondo y color de texto base.
- `src/components/layout/AppShell.tsx` — shell completo + reglas de impresión.
- `src/app/(protected)/dashboard/page.tsx` — rediseño del panel.
- `src/app/(protected)/reportes/page.tsx` — rediseño + centro de exportación.
- `src/app/(protected)/reportes/imprimir/page.tsx` y `report-print.css` — plantilla PDF imprimible.
- `src/lib/reports-service.ts` — servicio compartido de reportes (extraído de la ruta API).
- `src/lib/report-export.ts` — mapeo a la plantilla y generación de CSV.
- `src/lib/report-xlsx.ts` y `src/lib/xlsx/zip.ts` — generación del Excel sobre la plantilla.
- `src/app/api/reports/route.ts` — ahora es un envoltorio del servicio.
- `src/app/api/reports/export/route.ts` — descarga de xlsx / csv / padrón.
- `src/app/api/reports/verification-qr/route.ts` — sello QR del reporte en SVG.
- `src/types/reports.ts` — tipo compartido de la respuesta de `/api/reports`.
- `templates/reporte-eventos-erm-utc.xlsx`, `docs/plantillas/`, `docs/dashboard_ui_style_guide.md` — plantillas reubicadas.

**Acciones requeridas tras `git pull`**
- [x] Ninguna (no hay dependencias nuevas ni cambios de esquema)

**¿Cambió `prisma/schema.prisma`?** No

**Cómo lo probé**
- `npx tsc --noEmit` y `npx next build` sin errores.
- Generación real de los tres archivos contra `prisma/dev.db`: el `.xlsx` abre con openpyxl conservando ambas hojas y el gráfico, con fórmulas de totales y promedios vivas; CSV y padrón con el contenido esperado.
- Verifiqué que las clases y tokens del sistema se compilan en el CSS de producción.

**Pendiente / riesgos conocidos**
- La columna «Ejes Univ. Pertinente» del Excel se entrega vacía (conserva la lista desplegable): el eje universitario no se captura al registrar el evento. Si se agrega ese campo al formulario, la exportación puede llenarlo.
- Las pantallas de eventos, calendario, autorizaciones, escáner y administración siguen con los estilos anteriores; funcionan dentro del nuevo shell pero aún no usan los tokens `ui-*`.
- El PDF se produce con el diálogo de impresión del navegador (sin dependencias extra). Para generarlo en el servidor habría que agregar un motor headless.

---

## 2026-11-12 — [config][docs] Puesta en marcha local y documentos de contexto

**Autor:** Diego (con Claude Code)

**Qué cambié**
- Creé el archivo `.env` local a partir de `.env.example`, con `SESSION_SECRET` generado y `SEED_DEFAULT_PASSWORD` definida. El archivo está en `.gitignore`, no se sube.
- Inicialicé la base de datos con `npm run setup`: se creó `prisma/dev.db`, se aplicó el esquema y corrió el seed (4 edificios, 6 usuarios, 9 espacios, catálogos, 2 eventos demo, 24 asistentes con QR).
- Agregué [CONTEXTO.md](CONTEXTO.md): resumen de arquitectura, roles, reglas de negocio, superficie de API y datos para recorrido de demo.
- Agregué este archivo de bitácora.

**Por qué**
- El repo no incluye `.env` ni `prisma/dev.db` (están en `.gitignore`, correctamente). Sin ellos no existe base de datos y **ningún login funciona**, lo que explica por qué `director1` era rechazado en un clon recién bajado.

**Archivos tocados**
- `.env` — creado (local, no versionado)
- `prisma/dev.db` — creado por `npm run setup` (local, no versionado)
- `storage/qrs/`, `storage/evidences/` — creados por el seed (locales, no versionados)
- `docs/CONTEXTO.md` — nuevo
- `docs/BITACORA_ACTUALIZACIONES.md` — nuevo

**Acciones requeridas tras `git pull`**
- [x] `cp .env.example .env` y definir `SESSION_SECRET` y `SEED_DEFAULT_PASSWORD`
- [x] `npm install`
- [x] `npm run setup`

**¿Cambió `prisma/schema.prisma`?** No

**Cómo lo probé**
- Las 6 cuentas (`director1`..`director4`, `extuni`, `admin`) responden `200` en `POST /api/auth/login`.
- Las 11 páginas de la app responden `200` (`/login`, `/dashboard`, `/eventos`, `/eventos/nuevo`, `/calendario`, `/autorizaciones`, `/escaner`, `/reportes`, `/admin`, `/registro/[token]`).
- Los endpoints `/api/auth/me`, `/api/dashboard`, `/api/events`, `/api/authorizations`, `/api/reports`, `/api/notifications`, `/api/catalogs`, `/api/admin/users`, `/api/admin/audit` y `/api/public/registro/[token]` responden `200`.

**Pendiente / riesgos conocidos**
- `prisma/seed.ts` es **aditivo** sobre un dataset de Fase 1 que no está en el repo: referencia `DEMO-01`..`DEMO-13` y `DEMO-HIST-01`, pero solo crea `DEMO-14` y `DEMO-15`. En instalación limpia quedan solo 2 eventos, ambos aprobados, con `AuditLog` y `Notification` en 0 y la bandeja de `/autorizaciones` vacía. Decidir si se repone ese dataset en el seed o si los escenarios de demo se generan a mano.

---
