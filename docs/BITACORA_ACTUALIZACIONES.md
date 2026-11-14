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

## 2026-11-13 — [ui] Rediseño completo "Papel y tinta" con verde UTC, en todas las pantallas

**Autor:** Diego (con Claude Code)

**Qué cambié**
- Apliqué el sistema de [dashboard-taste/SKILL.md](dashboard-taste/SKILL.md) a **toda** la aplicación, no solo a dashboard y reportes: login, registro público, inicio, eventos (lista, alta y expediente), calendario, autorizaciones, escáner, reportes y administración.
- Único desvío del skill: el acento es el **verde institucional de la UTC** (`#0E6842`, tomado del logo) en lugar de terracota, como pide el §15.8 de `dashboard_ui_style_guide.md` (respetar la marca). Se cambia en tres variables: `--accent`, `--accent-hover`, `--accent-soft` en `globals.css`.
- **Tokens:** papel, superficie, hundido, línea, tinta (3 niveles), acento y tres estados, como variables CSS expuestas en Tailwind (`bg-paper`, `bg-surface`, `text-ink`, `border-line`, `bg-accent`, `text-warn`…). Ya no queda ninguna clase `slate-*`, `emerald-*`, `rose-*`, `amber-*`, etc. fuera de la plantilla imprimible.
- **Tipografía:** Bricolage Grotesque (títulos y cifras), Hanken Grotesk (cuerpo), JetBrains Mono (rótulos, fechas, IDs), cargadas con `next/font` (autoalojadas, sin `@import`).
- **Armazón:** barra lateral directamente sobre el papel con el logo UTC, ítem activo con barra de 3px en acento; usuario con iniciales; cabecera y barra inferior móvil en el mismo lenguaje.
- **Chips:** `StatusBadge.tsx` reescrito: píldora con punto de 6px para estados (ok / pendiente / rechazado / neutro), chip mono cuadrado para criticidad. Se acabó el arcoíris de morado, índigo y azul cielo.
- **Dashboard:** recompuesto con una sola pieza rellena (Total Eventos en acento, número a 56px), retícula de anchos mezclados y métricas QR separadas por líneas en vez de tarjetas dentro de tarjetas.
- Sin degradados, sin blur, sin sombras salvo en menús flotantes, sin iconos de destellos.
- **No cambió** ningún texto, etiqueta, ruta, llamada a la API ni lógica. La plantilla A4 de `/reportes/imprimir` quedó intacta.

**Por qué**
- El intento anterior migró dos pantallas y dejó cinco con el estilo viejo, por eso se revirtió. Esta vez la migración fue de todo el sistema a la vez.

**Archivos tocados**
- Base: `tailwind.config.ts`, `src/app/globals.css`, `src/app/layout.tsx`.
- Reescritos a mano: `AppShell.tsx`, `NotificationBell.tsx`, `StatusBadge.tsx`, `dashboard/page.tsx`, `login/login.css`, encabezado de `registro/[token]/page.tsx`.
- Migrados por codemod (solo clases): `eventos/page.tsx`, `eventos/nuevo/page.tsx`, `eventos/[id]/page.tsx`, `calendario/page.tsx`, `autorizaciones/page.tsx`, `escaner/page.tsx`, `reportes/page.tsx`, `admin/page.tsx`, `registro/[token]/page.tsx`, y las clases de badge en `src/lib/lifecycle.ts` y `src/lib/utils.ts`.

**Acciones requeridas tras `git pull`**
- [x] Ninguna. Sin dependencias nuevas. La primera vez que arranca, `next/font` descarga las tres fuentes (necesita internet esa vez).

**¿Cambió `prisma/schema.prisma`?** No

**Cómo lo probé**
- `npx tsc --noEmit` sin errores; las 9 rutas protegidas, `/login` y `/registro/[token]` responden 200 sin errores en el log.
- Revisión visual con capturas de Chrome headless de las 12 pantallas a 1440px y de 9 a 390px (móvil): sin desborde horizontal en ninguna.

**Pendiente / riesgos conocidos**
- **Bug previo, no tocado:** en `eventos/page.tsx` la lista lee `data.lifecycleCounters` y `ev.lifecycle.state`, pero la API devuelve `lifecycleCounts` y `ev.lifecycle.lifecycleStatus`. Por eso las pestañas marcan 0 y todos los eventos aparecen como «Pendiente de autorización» aunque estén programados. Son dos líneas.
- Quedan cajas con borde dentro de tarjetas en escáner, reportes y el expediente (el skill pide separarlas con líneas). Se ven coherentes, pero es el siguiente pulido.
- El expediente del evento (2,100 líneas, 4 pestañas y varios modales) se migró por codemod; revisé la pestaña 1, no cada modal.
- El índice de git trae preparados (staged) restos del intento anterior, incluido `Motion.tsx` que ya no existe en disco. Conviene `git add -A` antes de hacer commit.

---

## 2026-11-13 — [ui] Vuelta al diseño slate/emerald original, conservando los reportes

**Autor:** Diego (con Claude Code)

**Qué cambié**
- Revertí el diseño al original del commit `ebae202` (slate/emerald), que es el que ya tenían eventos, calendario, autorizaciones, escáner y administración. Todo el sistema vuelve a ser consistente.
- Restaurados tal cual desde `ebae202`: `globals.css`, `tailwind.config.ts`, `layout.tsx`, `AppShell.tsx`, `NotificationBell.tsx`, `StatusBadge.tsx` y el dashboard.
- Eliminado `src/components/ui/Card.tsx` (la tarjeta base del skill "Papel y tinta"). Ya se había eliminado `Motion.tsx` con los contadores animados.
- **Toda la funcionalidad de reportes se conservó**, solo cambió su apariencia a slate/emerald:
  - La página de reportes volvió a su diseño original y se le injertaron las cuatro exportaciones del servidor: PDF de la plantilla institucional, Excel de la plantilla ERM, CSV con el mismo diseño y CSV del padrón nominal. Sustituyen a los dos CSV que antes se armaban en el cliente.
  - Se extrajo `queryString` a un `useMemo` para que la consulta de la pantalla, las descargas y la vista imprimible compartan exactamente los mismos filtros.
  - La vista `/reportes/imprimir` conserva intacta la plantilla A4 (verde y oro institucionales, folio, sello QR, firma); solo su barra de acciones pasó a slate/emerald.
  - Se re-aplicaron al `AppShell` restaurado las seis reglas `print:` que el PDF necesita para ocultar el armazón al imprimir.
- `docs/dashboard-taste/SKILL.md` se queda como documento de referencia, sin aplicarse.

**Por qué**
- El sistema "Papel y tinta" quedaba desparejo frente a las cinco pantallas que no se habían migrado, y mantener dos lenguajes visuales a la vez era peor que volver al original.

**Archivos tocados**
- Restaurados: `src/app/globals.css`, `tailwind.config.ts`, `src/app/layout.tsx`, `src/components/layout/AppShell.tsx`, `src/components/layout/NotificationBell.tsx`, `src/components/ui/StatusBadge.tsx`, `src/app/(protected)/dashboard/page.tsx`, `src/app/(protected)/reportes/page.tsx`.
- Modificados: `src/app/(protected)/reportes/page.tsx` (exportaciones injertadas), `src/app/(protected)/reportes/imprimir/page.tsx` y su `report-print.css` (barra de acciones).
- Eliminados: `src/components/ui/Card.tsx`, `src/components/ui/Motion.tsx`.
- Intactos: `src/lib/reports-service.ts`, `report-export.ts`, `report-xlsx.ts`, `xlsx/zip.ts`, `src/types/reports.ts`, las rutas `api/reports/*` y `templates/reporte-eventos-erm-utc.xlsx`.

**Acciones requeridas tras `git pull`**
- [x] Ninguna

**¿Cambió `prisma/schema.prisma`?** No

**Cómo lo probé**
- `npx next build` sin errores, 30/30 páginas.
- En el CSS de producción: **cero** coincidencias de `card--accent`, `card__label`, `t-hero`, `#b8431f`, `#f3eee4`, `Bricolage` y `bento`; y de vuelta `bg-slate-50`, `bg-slate-900`, `bg-emerald-600`, `text-emerald-700`, `border-slate-200` y `font-black`.
- Las nueve rutas compilan con 0 errores en el servidor de desarrollo.
- Generación real de los tres archivos contra `prisma/dev.db`: el .xlsx abre con las dos hojas y el gráfico intacto; CSV de 15 líneas y padrón de 26.

**Pendiente / riesgos conocidos**
- **iCloud sigue vaciando `node_modules`.** En esta sesión tuve que reinstalar el binario SWC de Next dos veces y Prisma una vez; un `build` falló a mitad porque `node_modules/.prisma/client/index.d.ts` desapareció entre el typecheck y la compilación. Mientras el proyecto viva en `~/Documents` (iCloud Drive) esto se repetirá. Mover el repo a `~/Hackathon` es la única solución de fondo.
- iCloud también está creando copias en conflicto (`* 2*.icloud`), incluida una del índice de git en `.git/.index 2.icloud`.

---

## 2026-11-13 — [ui] Rediseño "Papel y tinta" según docs/dashboard-taste/SKILL.md

**Autor:** Diego (con Claude Code)

**Qué cambié**
- Implementé el sistema del `SKILL.md` que dejaste en `branch assets` (lo moví a [docs/dashboard-taste/SKILL.md](dashboard-taste/SKILL.md)). Sustituye por completo al sistema bento+colorful del día anterior.
- **Tokens (§3):** papel `#F3EEE4`, superficie `#FBF8F2`, hundido `#EAE3D5`, tinta `#1D1A16`/`#5E574C`/`#8C8475`, un solo acento terracota `#B8431F` y los tres colores de estado. Radios 6/12/20/píldora. Sin sombras salvo `--shadow-float` para elementos flotantes.
- **Tipografía (§3):** Bricolage Grotesque (display, `-0.02em`), Hanken Grotesk (cuerpo), JetBrains Mono (rótulos en mayúsculas con `.08em`). Números con `tabular-nums`.
- **Tarjeta base única (§5):** nuevo [src/components/ui/Card.tsx](../src/components/ui/Card.tsx) con `Card`, `CardHead`, `CardBody`, `CardFoot`, `CardAction`, y los envoltorios `KpiCard` y `ProgressRow`. Variantes `--accent`, `--ink`, `--link`, `--compact`, `--flush`: solo cambian color o padding, nunca el marco.
- **Dashboard:** el banner con degradado pasó a ser la barra superior del §6 (título display + línea de contexto con datos reales + una acción primaria y una secundaria), porque el §10 prohíbe el banner hero. La única pieza rellena de la pantalla es el KPI «Total eventos» en acento con el número a 56px (§2.4, §2.5). Se eliminaron las tarjetas dentro de tarjetas del bloque QR: ahora los cuatro datos se separan con líneas de 1px (§5.2).
- **Movimiento (§9):** quedó solo el hover de borde (140ms) y el crecimiento de las barras. Se eliminaron los contadores animados, las entradas escalonadas y el shimmer de los esqueletos; `src/components/ui/Motion.tsx` se borró.
- **Badges:** `StatusBadge.tsx` pasó a los chips del §6 (píldora con punto de 6px para estado, chip cuadrado neutro para categoría) y se quitó el icono de destellos de `CriticalityBadge`, prohibido por el §10.
- **Shell:** la barra lateral va directamente sobre el papel con una línea vertical, sin tarjeta; item activo con texto tinta 600 y barra de 3px en acento, sin fondo de color. Se eliminó la tarjeta promocional del escáner (§10). Iconos de trazo 1.5px.
- **Reportes y campana de notificaciones** quedaron en el mismo sistema.

**Por qué**
- Lo pediste con el `SKILL.md` como referencia final. El documento es un sistema cerrado y contradecía el rediseño previo (un acento contra ocho, cero animación de entrada contra contadores y stagger), así que se resolvió con tus tres decisiones: papel en vez de negro, punto medio en color y movimiento, y la tipografía del skill.

**Archivos tocados**
- `src/app/globals.css` — tokens y componentes de "Papel y tinta".
- `tailwind.config.ts` — paleta, radios, tipografías y escala del §3.
- `src/components/ui/Card.tsx` — nuevo; la tarjeta base única.
- `src/components/ui/StatusBadge.tsx` — chips del §6.
- `src/components/ui/Motion.tsx` — eliminado.
- `src/app/(protected)/dashboard/page.tsx`, `src/app/(protected)/reportes/page.tsx`, `src/components/layout/AppShell.tsx`, `src/components/layout/NotificationBell.tsx`.
- `docs/dashboard-taste/SKILL.md` — el skill, reubicado fuera de `branch assets`.

**Acciones requeridas tras `git pull`**
- [x] Ninguna (sin dependencias nuevas ni cambios de esquema). Las tres fuentes se cargan desde Google Fonts en `globals.css`.

**¿Cambió `prisma/schema.prisma`?** No

**Cómo lo probé**
- `npx tsc --noEmit` y `npx next build` sin errores; 30/30 páginas.
- En el CSS de producción: están las cinco variantes de la tarjeta, los puntos de 6px de los cuatro chips de estado, los seis colores de estado, las tres tipografías y `bar-grow`; y **cero** coincidencias de degradado, `backdrop-filter: blur` o restos del sistema bento.
- Servidor de desarrollo: las nueve rutas compilan con 0 errores.

**Pendiente / riesgos conocidos**
- Eventos, calendario, autorizaciones, escáner y administración siguen con los estilos viejos (slate/emerald). Ahora chocan de frente con el papel y la terracota: es la deuda visual más visible que queda.
- Dos desvíos conscientes del skill: el título dice «Bienvenido, {nombre}» cuando el §8 pide títulos que informen y no saluden; y la fila de seis KPIs se conserva porque pediste no mover las tarjetas, aunque el §2.8 prefiere anchos mezclados (la pantalla sí los mezcla en las demás filas).
- La verificación es de compilación y CSS, no visual: no tengo navegador en esta sesión.

---

## 2026-11-12 — [ui] Rediseño con los skills bento + colorful y capa de animación

**Autor:** Diego (con Claude Code)

**Qué cambié**
- Instalé dos colecciones de skills de diseño: `taste-skill` (de Leonxlnx/taste-skill) y los 68 lenguajes de diseño de `bergside/awesome-design-skills`, en `~/.claude/skills/`. Sin colisiones con los skills previos.
- Rediseñé el sistema visual combinando tres de ellos:
  - **`bento`** — bloques modulares, escala de espaciado 4/8/12/16/24/32, tipografía 12/14/16/20/24/32, JetBrains Mono para etiquetas en versalitas.
  - **`colorful`** — paleta semántica multicolor de alto contraste. Cada familia de tarjeta tiene su acento: esmeralda, azul, violeta, ámbar, rojo, teal, oro y pizarra.
  - **`taste-skill`** — solo sus reglas de micro-interacción (la tarjeta enlazada sube 2px, se hunde al presionar, nada se inclina, todo descansa bajo `prefers-reduced-motion`). El resto de ese skill es para sitios de marketing y no aplica a un dashboard.
- Los acentos se aplican con `data-accent="azul|violeta|…"` sobre variables CSS, así que una tarjeta cambia de color con un atributo y no con veinte clases.
- Nueva capa de animación en `src/components/ui/Motion.tsx`: `AnimatedNumber` (las métricas cuentan desde cero), `ProgressRing` (anillos que se dibujan), `Meter` (barras que crecen) y `stagger()` (entrada escalonada de las rejillas). Todo con detección de `prefers-reduced-motion`, que pinta el valor final sin animar.
- **Restauré la arquitectura original del dashboard**, que en el cambio anterior había reordenado por error: banner de bienvenida, alerta de cierre documental, el título de sección con las **seis** tarjetas de ciclo de vida en una fila, el bloque de métricas QR con sus cuatro cajas y las cuatro categorías de asistente, y las dos columnas (eventos 2/3 + bandeja 1/3). Solo se cambió el diseño, no la composición.
- La navegación lateral ahora da un color por sección y el indicador activo toma ese acento.
- Reportes quedó con el mismo lenguaje: KPIs con icono y acento propio, tarjetas de exportación por color, esqueletos con brillo.

**Por qué**
- El rediseño anterior cambiaba el orden de las tarjetas y usaba un solo color. El encargo era conservar la arquitectura y, sobre esa base, aportar variedad cromática y movimiento.

**Archivos tocados**
- `src/app/globals.css` — sistema bento + acentos + animaciones (`bento`, `bento-rail`, `bento-link`, `bento-feature`, `bento-enter`, `bento-skeleton`, `bento-bar`).
- `tailwind.config.ts` — paleta `accent.*`, superficies y JetBrains Mono.
- `src/components/ui/Motion.tsx` — nuevo; capa de movimiento.
- `src/app/(protected)/dashboard/page.tsx` — arquitectura original restaurada con el diseño nuevo.
- `src/app/(protected)/reportes/page.tsx` — mismo lenguaje visual.
- `src/components/layout/AppShell.tsx` — color por sección y entrada animada.

**Acciones requeridas tras `git pull`**
- [x] Ninguna (sin dependencias nuevas ni cambios de esquema)

**¿Cambió `prisma/schema.prisma`?** No

**Cómo lo probé**
- `npx tsc --noEmit` y `npx next build` sin errores; 30/30 páginas generadas.
- Verifiqué en el CSS de producción que las clases y los `@keyframes` se compilan y que `[data-accent]` queda después de `.bento`, para que el acento gane por orden de cascada.
- Servidor de desarrollo: las nueve rutas compilan con **0** errores en el log.

**Pendiente / riesgos conocidos**
- Falta aplicar el sistema a eventos, calendario, autorizaciones, escáner y administración: funcionan y heredan el shell, pero sus tarjetas siguen con los estilos viejos.
- `taste-skill` trae un hook `Stop` que corre su `gate.mjs`; solo se activa si se invoca ese skill, y aquí no se usó.
- No pude revisar el resultado en pantalla (no tengo navegador en esta sesión): la validación es de compilación, CSS y rutas, no visual.

---

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
