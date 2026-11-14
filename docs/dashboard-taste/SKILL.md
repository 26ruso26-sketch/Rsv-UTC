---
name: dashboard-taste
description: Guía de gusto visual para dashboards con estilo claro y cálido que no parezca generado por IA. Úsala antes de crear o modificar cualquier pantalla, componente, gráfica o estilo de un dashboard en este proyecto.
---

# Dashboard Taste — "Papel y tinta"

Lee este archivo completo antes de escribir una sola línea de UI. Si una decisión no está cubierta aquí, elige la opción más sobria y más específica al contenido.

## 1. La idea

Un dashboard que se siente **hecho por una persona con criterio**: papel cálido, tinta oscura, un solo color de acento, números grandes y una retícula con jerarquía. Menos "plantilla SaaS", más "reporte bien impreso".

Viene de tres referencias; de cada una se toma algo y se descarta algo:

| Referencia | Se conserva | Se descarta |
|---|---|---|
| Cursos (morado claro) | Sidebar con secciones rotuladas, chips de categoría, panel lateral derecho, barra de progreso bajo cada item | Morado, banner con destellos, avatares 3D, emoji en saludos, todo redondeado igual |
| Proyectos (verde) | UNA tarjeta KPI rellena de acento y las demás neutras, textura rayada para "pendiente", botones píldora con contorno, retícula tipo bento | Tarjeta promo "descarga la app", gauge decorativo |
| Oscuro (degradado) | Números enormes como protagonista, riel de iconos compacto, un panel de alto contraste, densidad de contenido | Degradado neón, vidrio/blur, fotos de stock |

## 2. Reglas duras

1. **Un solo acento.** Terracota. Nada de segundo color de marca. Verde/ámbar/rojo solo para estados.
2. **Cero degradados**, cero blur/glassmorphism, cero brillos, cero texto con degradado.
3. **Bordes antes que sombras.** Las tarjetas se separan con línea de 1px. Sombra solo en elementos flotantes (menús, modales, tooltips).
4. **Una sola pieza de énfasis por pantalla**: una tarjeta rellena (acento o tinta). Si hay dos, sobra una.
5. **Jerarquía por tamaño, no por decoración.** El dato más importante es el más grande de la pantalla.
6. **Sin emoji, sin iconos de destellos/varita/robot**, sin "✨".
7. **Todas las tarjetas comparten el mismo marco** (sección 5). Los radios varían entre tipos de elemento (input, tarjeta, botón), nunca entre tarjetas.
8. **Retícula asimétrica.** No tres o cuatro tarjetas idénticas en fila como único recurso; mezcla anchos (2/1, 3/2/1).
9. **Datos y textos reales o verosímiles** del dominio del proyecto. Nada de "Lorem", "John Doe" ni "Acme".
10. **Alineado a la izquierda.** Nada centrado salvo estados vacíos.

## 3. Tokens

```css
:root {
  /* Superficie */
  --paper:        #F3EEE4;  /* fondo de la app */
  --surface:      #FBF8F2;  /* tarjetas */
  --surface-sunk: #EAE3D5;  /* inputs, pistas de barras, hover */
  --line:         #DCD3C2;  /* bordes 1px */
  --line-strong:  #BDB29D;

  /* Tinta */
  --ink:          #1D1A16;  /* texto principal, tarjeta de contraste */
  --ink-2:        #5E574C;  /* texto secundario */
  --ink-3:        #8C8475;  /* rótulos, ejes, placeholders */

  /* Acento (único) */
  --accent:       #B8431F;
  --accent-hover: #9C3717;
  --accent-soft:  #F1DCD0;  /* fondo de chips y selección */
  --on-accent:    #FFF9F3;

  /* Estados (solo significado, nunca decoración) */
  --ok:   #2F6B4F;  --ok-soft:   #DCE9DF;
  --warn: #9A6400;  --warn-soft: #F3E6C4;
  --bad:  #A32A2A;  --bad-soft:  #F2D9D5;

  /* Tipografía */
  --font-display: "Bricolage Grotesque", "Helvetica Neue", sans-serif;
  --font-body:    "Hanken Grotesk", system-ui, sans-serif;
  --font-mono:    "JetBrains Mono", ui-monospace, monospace;

  /* Escala tipográfica */
  --t-hero: 56px;  /* el número protagonista */
  --t-h1:   28px;
  --t-h2:   18px;
  --t-body: 14px;
  --t-small:12.5px;
  --t-label:11px;  /* rótulos en mayúsculas */

  /* Espaciado (base 4) */
  --s-1: 4px; --s-2: 8px; --s-3: 12px; --s-4: 16px;
  --s-5: 24px; --s-6: 32px; --s-7: 48px;

  /* Radios */
  --r-sm:   6px;    /* inputs, chips cuadrados, celdas */
  --r-md:   12px;   /* tarjetas */
  --r-lg:   20px;   /* contenedor principal / panel lateral */
  --r-pill: 999px;  /* botones y chips de estado */

  --shadow-float: 0 8px 24px rgba(29, 26, 22, .12);
}
```

Tipografía:
- **Display** (títulos y números grandes): peso 600, `letter-spacing: -0.02em`, `line-height: 1.05`.
- **Cuerpo**: peso 400/500, `line-height: 1.45`.
- **Mono**: rótulos, fechas, IDs, ejes y deltas. Rótulos en mayúsculas con `letter-spacing: .08em`, color `--ink-3`.
- Números siempre con `font-variant-numeric: tabular-nums`.

## 4. Estructura de pantalla

```
┌────────┬──────────────────────────────────┬───────────┐
│ Sidebar│ Barra superior (título + acciones)│           │
│ 220px  ├──────────────────────────────────┤  Panel    │
│        │ Fila KPI: 1 rellena + 2–3 neutras │  lateral  │
│        ├───────────────────┬──────────────┤  300px    │
│        │ Gráfica principal │ Lista corta  │ (opcional)│
│        │ (2/3)             │ (1/3)        │           │
│        ├───────────────────┴──────────────┤           │
│        │ Tabla                            │           │
└────────┴──────────────────────────────────┴───────────┘
```

- Fondo `--paper`; sidebar sin tarjeta, directamente sobre el papel, separada por una línea vertical.
- Separación entre tarjetas `--s-4`; padding interno `--s-5`.
- Ancho máximo del contenido 1440px. En <1100px el panel lateral baja al final; en <760px la sidebar se vuelve riel de iconos.

## 5. La tarjeta base (lo más importante del sistema)

**Todas las tarjetas del dashboard son la misma tarjeta.** KPI, gráfica, lista, tabla, recordatorio: comparten esqueleto, borde, radio, padding y encabezado. Lo único que cambia es el contenido y, en casos contados, la variante de color. Si una tarjeta nueva necesita estilos propios de contenedor, está mal planteada.

### Lo que nunca cambia

| Propiedad | Valor | Nota |
|---|---|---|
| Fondo | `--surface` | Siempre sobre `--paper` |
| Borde | `1px solid var(--line)` | Sin sombra |
| Radio | `--r-md` (12px) | El mismo en todas, sin excepción |
| Padding | `--s-5` (24px) | 16px solo en modo compacto |
| Separación entre tarjetas | `--s-4` (16px) | Igual horizontal y vertical |
| Encabezado | rótulo a la izquierda, acción a la derecha | Misma altura (28px) en todas |
| Separación encabezado → cuerpo | `--s-4` | |
| Pie (opcional) | línea superior `--line`, texto mono `--t-small` | Fuente del dato, fecha o "Ver todo" |

### Anatomía

```
┌──────────────────────────────────────────┐
│ RÓTULO EN MONO                  [acción] │  ← encabezado: siempre igual
│                                          │
│ Cuerpo: número, gráfica, lista o tabla   │  ← lo único que varía
│                                          │
├──────────────────────────────────────────┤
│ pie opcional · mono · ink-3              │
└──────────────────────────────────────────┘
```

- **Rótulo**: mono, 11px, mayúsculas, `--ink-3`. Es un nombre de dato ("ASISTENCIA", "PEDIDOS ABIERTOS"), no una frase.
- **Acción**: una sola por tarjeta, arriba a la derecha: un enlace de texto ("Ver todo"), un icono de 28px con borde, o un selector de periodo. Nunca menú de tres puntos decorativo.
- **Cuerpo**: empieza siempre a la misma distancia del encabezado, alineado al borde izquierdo del rótulo.

### CSS de referencia

```css
.card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  padding: var(--s-5);
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
  min-width: 0;
}
.card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 28px;
}
.card__label {
  font: 500 var(--t-label)/1 var(--font-mono);
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.card__body { flex: 1; min-height: 0; }
.card__foot {
  margin: 0 calc(var(--s-5) * -1) calc(var(--s-5) * -1);
  padding: var(--s-3) var(--s-5);
  border-top: 1px solid var(--line);
  font: 400 var(--t-small)/1.4 var(--font-mono);
  color: var(--ink-3);
}

/* Variantes: solo cambian color, nunca forma */
.card--accent { background: var(--accent); border-color: var(--accent); color: var(--on-accent); }
.card--ink    { background: var(--ink);    border-color: var(--ink);    color: var(--paper); }
.card--accent .card__label,
.card--ink .card__label { color: inherit; opacity: .7; }
.card--accent .card__foot,
.card--ink .card__foot { border-color: rgba(255,255,255,.18); color: inherit; opacity: .8; }

/* Interactiva: solo si toda la tarjeta es clicable */
.card--link { cursor: pointer; transition: border-color 140ms ease-out; }
.card--link:hover { border-color: var(--ink); }
.card--link:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }

/* Compacta: para paneles laterales y listas densas */
.card--compact { padding: var(--s-4); gap: var(--s-3); }
```

### Variantes permitidas (y solo estas)

| Variante | Cuándo | Límite |
|---|---|---|
| `.card` | Por defecto | — |
| `.card--accent` | El KPI protagonista | 1 por pantalla |
| `.card--ink` | Lo urgente o en curso | 1 por pantalla |
| `.card--link` | Toda la tarjeta navega | Combinable |
| `.card--compact` | Panel lateral, listas densas | Combinable |

### Reglas de consistencia

1. **Un solo componente `Card`** en el código. Todo lo demás (`KpiCard`, `ChartCard`, `ListCard`) lo envuelve; ninguno redefine borde, radio, fondo ni padding.
2. **Sin tarjetas dentro de tarjetas.** Para agrupar dentro del cuerpo usa líneas de 1px o `--surface-sunk`, nunca otro contenedor con borde y radio.
3. **Los rótulos de una misma fila quedan alineados** en la misma línea base; los cuerpos también.
4. **Las tarjetas de una misma fila tienen la misma altura** (`align-items: stretch`); el cuerpo absorbe el espacio sobrante.
5. **La variedad viene del ancho en la retícula y del contenido**, no de cambiar el contenedor. Mismo marco, distinto tamaño.
6. **Hover solo en `.card--link`.** Una tarjeta que no navega no reacciona al cursor.
7. **Estados dentro de la tarjeta**: cargando = bloques `--surface-sunk` con la forma del contenido (sin shimmer); vacío = una línea en `--ink-2` y una acción; error = texto `--bad` y "Reintentar". El marco no cambia en ninguno.

## 6. Componentes

**Sidebar.** Grupos con rótulo mono en mayúsculas. Item activo: texto `--ink` peso 600 y una barra vertical de 3px en `--accent` a la izquierda. Sin fondo de color en el activo. Iconos de trazo 1.5px, un solo set (Lucide o Phosphor regular).

**Barra superior.** Título de página en display `--t-h1` a la izquierda con una línea de contexto debajo en `--ink-2` (fecha, periodo o conteo real). A la derecha: búsqueda, una acción primaria y máximo una secundaria. El usuario se muestra con iniciales en un círculo `--surface-sunk`, sin avatares ilustrados.

**Tarjeta KPI.** Sobre la tarjeta base: rótulo mono arriba, número en display 36–56px, debajo delta en mono con flecha (`↑ 12% vs. mes anterior`) en `--ok` o `--bad`. La KPI protagonista va rellena de `--accent` con texto `--on-accent`; las demás en `--surface` con borde.

**Tarjeta de contraste.** Máximo una por pantalla, fondo `--ink`, texto `--paper`. Úsala para lo urgente o en curso (próximo evento, temporizador, pendiente crítico). No coexiste con otra tarjeta rellena del mismo tamaño junto a ella.

**Botones.** Altura 36px, radio píldora.
- Primario: fondo `--ink`, texto `--paper`. (El acento se reserva para datos y selección.)
- Secundario: borde `--line-strong`, fondo transparente.
- Terciario: solo texto subrayado al hover.

**Chips.** Categoría: radio `--r-sm`, fondo `--surface-sunk`, texto mono 11px. Estado: píldora con fondo `-soft` y texto del color de estado, con un punto de 6px delante. Nunca más de tres estados distintos en una misma lista.

**Tablas.** Sin zebra. Encabezado en rótulo mono, filas de 44px separadas por línea de 1px, números alineados a la derecha, hover `--surface-sunk`. La acción de fila es texto o icono simple, sin botón relleno.

**Listas con progreso.** Barra de 3px bajo el título: pista `--surface-sunk`, avance `--ink` (o `--accent` solo en el item destacado).

**Inputs.** Fondo `--surface-sunk`, sin borde en reposo, borde `--ink` de 1.5px en foco. Sin anillos de brillo de color.

## 7. Gráficas

- Barras con esquinas superiores de 4px (no cápsulas completas), separación generosa.
- Serie principal en `--ink`; el dato destacado (hoy, máximo, seleccionado) en `--accent`. Lo demás no compite.
- **Rayado diagonal** para proyectado, pendiente o sin datos:
  ```css
  background: repeating-linear-gradient(-45deg,
    var(--ink-3) 0 1.5px, transparent 1.5px 7px);
  ```
- Líneas de 2px sin relleno de área ni curvas exageradas; puntos solo en el valor final o al hover.
- Rejilla horizontal punteada en `--line`, sin eje Y dibujado; etiquetas en mono `--ink-3`.
- Etiqueta directa sobre el dato antes que leyenda. Sin 3D, sin donas decorativas; un porcentaje se dice mejor con un número grande y una barra.

## 8. Texto de interfaz

- Español neutro, en tú, frases cortas. Verbos concretos: "Exportar PDF", "Agregar evento", no "Comenzar ahora".
- Títulos que informan, no saludos: "Semana del 9 al 15 de noviembre", no "¡Buenos días!".
- Estados vacíos: una línea que explica y una acción. Sin ilustraciones.
- Cifras con formato local (es-MX): `1,284`, `$12,450.00`, `12 nov 2026`.

## 9. Movimiento

Transiciones de 120–180ms `ease-out` en color, borde y opacidad. Sin rebotes, sin entradas escalonadas, sin contadores animados. Respeta `prefers-reduced-motion`.

## 10. Señales de "hecho por IA" — prohibidas

- Degradados morado/azul/rosa, fondos con manchas de color o "aurora".
- Tarjetas de vidrio, blur, bordes luminosos.
- Emoji en títulos, saludos con fuego o manos.
- Iconos de destellos para cualquier cosa.
- Filas de tarjetas todas del mismo ancho como único recurso de composición.
- Tarjetas con marcos distintos entre sí (radios, sombras o paddings que cambian de una a otra).
- Sombra suave difusa en todo.
- Inter/Roboto por defecto con todo en peso 500.
- Avatares 3D o fotos de stock de laptops.
- Banner hero con eslogan dentro de un dashboard.
- Tarjeta promocional ("Descarga la app", "Hazte Pro").
- Chips de colores pastel distintos por cada categoría.
- Gauges y donas que ocupan una tarjeta para decir un solo número.

## 11. Revisión antes de entregar

- [ ] ¿Hay exactamente un color de acento y una sola pieza rellena protagonista?
- [ ] ¿El dato más importante es lo más grande de la pantalla?
- [ ] ¿Cero degradados, blur y emoji?
- [ ] ¿Todas las tarjetas usan el mismo componente base, con el mismo borde, radio, padding y encabezado?
- [ ] ¿No hay tarjetas dentro de tarjetas?
- [ ] ¿La retícula mezcla anchos distintos?
- [ ] ¿Los textos y cifras son del dominio real del proyecto?
- [ ] ¿Contraste de texto ≥ 4.5:1 y foco visible con teclado?
- [ ] ¿Funciona a 1100px y a 760px?
