# Dashboard UI --- Guía de estilo y especificación visual

> **Propósito:** documento de referencia para reproducir el lenguaje
> visual del dashboard de la imagen de inspiración e integrarlo en una
> aplicación existente.\
> **Dirección visual:** SaaS moderno, minimalista, limpio y profesional;
> predominan superficies blancas, fondos gris muy claro, verde esmeralda
> oscuro, bordes suaves, sombras discretas y una composición modular.

------------------------------------------------------------------------

## 1. Identidad visual

### Concepto

El diseño transmite una interfaz de productividad/gestión de proyectos.
Su personalidad visual se apoya en:

-   **Claridad:** jerarquía tipográfica sencilla y contenido fácil de
    escanear.
-   **Modularidad:** tarjetas independientes organizadas en una
    cuadrícula.
-   **Ligereza:** mucho espacio en blanco, separaciones consistentes y
    contornos suaves.
-   **Acento verde:** el verde identifica acciones principales, estados
    positivos, datos destacados y elementos activos.
-   **Profundidad sutil:** sombras difusas y fondos ligeramente
    diferenciados, sin efectos pesados.

No se debe convertir el diseño en una interfaz oscura. La referencia es
predominantemente clara; el negro/verde oscuro se reserva para acentos,
texto y algunos módulos especiales.

## 2. Paleta de colores

Los valores siguientes son aproximaciones visuales tomadas de la
referencia. Se recomienda centralizarlos como variables o tokens para
poder ajustarlos desde un solo lugar.

  -------------------------------------------------------------------------
  Token                     Color                   Uso
  ------------------------- ----------------------- -----------------------
  `--color-primary`         `#08764F`               Botones principales,
                                                    navegación activa,
                                                    barras y gráficos

  `--color-primary-dark`    `#064B35`               Tarjetas verdes, fondos
                                                    de alto contraste y
                                                    texto sobre verde

  `--color-primary-deep`    `#073B2C`               Verde casi negro para
                                                    módulos destacados

  `--color-primary-soft`    `#DDF1E8`               Fondos suaves, estados
                                                    positivos y elementos
                                                    secundarios

  `--color-mint`            `#62B99A`               Gráficos y acentos
                                                    secundarios

  `--color-background`      `#F1F3F2`               Fondo exterior de la
                                                    aplicación

  `--color-surface`         `#FFFFFF`               Panel principal y
                                                    tarjetas

  `--color-sidebar`         `#F7F8F7`               Fondo de la barra
                                                    lateral

  `--color-surface-muted`   `#F5F7F6`               Campos, contenedores
                                                    secundarios y hover

  `--color-text`            `#111715`               Títulos y texto
                                                    principal

  `--color-text-muted`      `#89918D`               Descripciones,
                                                    etiquetas y texto
                                                    auxiliar

  `--color-border`          `#E8ECE9`               Bordes discretos y
                                                    separadores

  `--color-success`         `#23845D`               Completado / éxito

  `--color-warning`         `#D6A83D`               En progreso /
                                                    advertencia

  `--color-danger`          `#D66B68`               Pendiente crítico /
                                                    error

  `--color-info`            `#6D91C6`               Información / elementos
                                                    informativos
  -------------------------------------------------------------------------

### Reglas de uso del color

1.  Mantener el fondo general en gris casi blanco, no blanco puro.
2.  Usar blanco para la mayoría de tarjetas.
3.  Reservar el verde oscuro para la acción primaria o un módulo que
    deba destacar.
4.  No colorear todas las tarjetas: la mayoría deben permanecer blancas.
5.  Usar verde claro para indicadores positivos y estados completados.
6.  Los colores amarillo, rojo y azul aparecen como pequeños
    indicadores, no como grandes fondos.
7.  Asegurar contraste suficiente entre texto y fondo.

## 3. Tipografía

### Familia

Usar una tipografía sans-serif moderna y legible. Preferencia:

-   `Inter` como primera opción.
-   Alternativas: `Manrope`, `DM Sans` o la sans-serif del sistema.

### Escala tipográfica sugerida

  Elemento                   Tamaño orientativo       Peso
  ------------------------ -------------------- ----------
  Título de página                    26--30 px   600--700
  Título de tarjeta                   14--16 px        600
  Métrica principal                   34--40 px        600
  Texto normal                        13--14 px        400
  Texto auxiliar                      10--12 px        400
  Etiquetas / navegación              12--14 px   400--500
  Microetiquetas                       9--10 px        500

### Reglas tipográficas

-   Mantener títulos breves y con peso semibold.
-   Usar texto auxiliar en gris medio, sin reducir demasiado el
    contraste.
-   Evitar bloques largos dentro de las tarjetas.
-   Usar números grandes para métricas y datos clave.
-   Mantener una jerarquía consistente entre títulos, subtítulos y
    metadatos.

## 4. Estructura general de la aplicación

La interfaz se organiza dentro de un contenedor principal blanco, con
esquinas redondeadas, centrado sobre un fondo gris claro.

### Distribución de alto nivel

``` text
┌────────────────────────────────────────────────────────────────────┐
│ CONTENEDOR PRINCIPAL                                               │
│ ┌────────────────┐ ┌─────────────────────────────────────────────┐ │
│ │ SIDEBAR        │ │ TOPBAR                                      │ │
│ │                │ ├─────────────────────────────────────────────┤ │
│ │ Logo           │ │ TÍTULO DE PÁGINA + ACCIONES                  │ │
│ │                │ ├─────────────────────────────────────────────┤ │
│ │ Navegación     │ │ CONTENIDO EN GRID DE TARJETAS                │ │
│ │                │ │                                             │ │
│ │ Banner inferior│ │ Métricas / gráficos / listas / actividad     │ │
│ └────────────────┘ └─────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

### Contenedor principal

-   Fondo blanco.
-   Radio de borde aproximado: 22--28 px.
-   Padding exterior: 12--18 px.
-   Sombra muy suave, principalmente para separarlo del fondo.
-   En escritorio ocupa casi todo el ancho disponible, dejando un margen
    exterior visible.
-   En pantallas pequeñas debe adaptarse al ancho completo y eliminar
    márgenes excesivos.

### Sidebar

-   Ancho de escritorio aproximado: 165--180 px en la referencia.
-   Fondo gris muy claro, ligeramente distinto del panel principal.
-   Esquinas redondeadas.
-   Logo en la parte superior: símbolo verde y nombre de marca en negro.
-   Navegación agrupada por secciones, por ejemplo `MENU` y `GENERAL`.
-   Cada opción contiene icono lineal y etiqueta.
-   Opción activa: texto más oscuro, icono verde y una barra vertical
    verde en el borde izquierdo.
-   Opciones inactivas: gris medio.
-   Banner promocional o informativo en la parte inferior, con fondo
    verde muy oscuro y texto blanco.

### Topbar

-   Altura compacta, alrededor de 60--66 px.
-   Buscador horizontal a la izquierda.
-   Acciones de mensajes y notificaciones a la derecha.
-   Perfil de usuario con avatar, nombre y dato secundario.
-   Fondo blanco o gris muy claro.
-   Controles con forma circular o cápsula y bordes sutiles.

### Encabezado de contenido

-   Título grande alineado a la izquierda.
-   Descripción breve debajo del título.
-   Acciones principales alineadas a la derecha.
-   Botón primario verde sólido.
-   Botón secundario blanco con borde gris/verde.
-   En móvil, permitir que las acciones bajen a una segunda línea.

## 5. Sistema de tarjetas

Las tarjetas son el componente visual central del dashboard.

### Apariencia

-   Fondo blanco.
-   Radio de borde: 14--18 px.
-   Padding interno: 14--18 px.
-   Sin borde visible o con borde gris muy tenue.
-   Sombra casi imperceptible; evitar sombras negras marcadas.
-   Separación uniforme entre tarjetas: 8--12 px.
-   Títulos alineados arriba a la izquierda.

### Variantes de tarjeta

1.  **Tarjeta estándar:** superficie blanca, título oscuro y contenido.
2.  **Tarjeta destacada:** fondo verde oscuro, texto blanco y métricas
    en alto contraste.
3.  **Tarjeta compacta:** menos padding para listas o indicadores
    pequeños.
4.  **Tarjeta de gráfico:** espacio suficiente para visualizaciones y
    leyendas.
5.  **Tarjeta de actividad:** filas compactas con iconos, títulos y
    metadatos.
6.  **Tarjeta oscura promocional:** fondo casi negro/verde, detalles
    gráficos sutiles y CTA verde.

### Estados de interacción

-   Hover: elevar ligeramente la tarjeta o aclarar su fondo.
-   Transición: 150--220 ms, `ease-out`.
-   No mover tarjetas de forma exagerada.
-   En tarjetas clicables, usar cursor y foco visible.
-   Mantener el mismo radio y espaciado en todo el producto.

## 6. Cuadrícula y composición del dashboard

En escritorio, el contenido utiliza una cuadrícula de varias columnas
con tarjetas de diferentes tamaños. La referencia se puede interpretar
como una composición de **12 columnas** o como una cuadrícula CSS
equivalente.

Distribución orientativa:

-   Primera fila: cuatro tarjetas de métricas.
-   Segunda fila: un gráfico ancho, un módulo de recordatorios y una
    lista de proyectos.
-   Tercera fila: colaboración de equipo, progreso general y seguimiento
    de tiempo.
-   Algunas tarjetas pueden abarcar dos o más columnas y varias filas.

Ejemplo conceptual:

``` text
┌──────────┬──────────┬──────────┬──────────┐
│ Métrica  │ Métrica  │ Métrica  │ Métrica  │
├────────────────────┼──────────┼──────────┤
│ Gráfico de actividad│ Record.  │ Proyectos│
│                    │          │          │
├────────────────────┼──────────┼──────────┤
│ Equipo             │ Progreso │ Tiempo   │
│                    │          │          │
└────────────────────┴──────────┴──────────┘
```

No es obligatorio conservar los mismos módulos de la referencia. La
composición debe adaptarse al contenido real del programa sin perder el
sistema de tarjetas, la jerarquía y los espacios.

## 7. Componentes visuales

### 7.1 Navegación lateral

-   Iconos lineales, preferentemente de una sola familia.
-   Tamaño de icono: 15--18 px.
-   Etiquetas de 12--14 px.
-   Altura de cada enlace: 32--38 px.
-   Separación vertical pequeña y consistente.
-   Activo con indicador verde lateral y texto oscuro.

### 7.2 Buscador

-   Campo tipo cápsula o rectángulo muy redondeado.
-   Fondo gris muy claro.
-   Icono de lupa al inicio.
-   Placeholder gris.
-   Atajo de teclado opcional a la derecha.
-   Sin borde oscuro.

### 7.3 Botones

**Primario** - Verde principal o verde oscuro. - Texto blanco. - Radio
tipo cápsula o 12--16 px. - Altura aproximada: 36--42 px. - Icono
opcional antes del texto. - Hover: verde ligeramente más oscuro.

**Secundario** - Fondo blanco. - Borde fino verde/gris. - Texto
oscuro. - Mismo tamaño y radio que el primario.

**Icon button** - Circular o cuadrado redondeado. - Fondo blanco o gris
muy claro. - Icono lineal. - Hover con fondo gris suave.

### 7.4 Tarjetas de métricas

-   Etiqueta pequeña en la parte superior.
-   Número grande debajo.
-   Indicador de tendencia o periodo en la zona inferior.
-   Icono circular de navegación o detalle en la esquina superior
    derecha.
-   La primera métrica puede usar el fondo verde oscuro para crear un
    punto focal.
-   Las demás permanecen blancas.

### 7.5 Gráficos

-   Gráficos limpios, sin cuadrículas dominantes.
-   Ejes y etiquetas en gris medio.
-   Verde oscuro para la serie principal.
-   Verde medio y verde claro para variaciones.
-   Patrones rayados o tramados pueden representar datos pendientes o
    categorías secundarias, siempre que exista una leyenda clara.
-   Gráficos circulares o de dona con centro despejado y porcentaje
    grande.
-   Leyendas pequeñas al pie.

### 7.6 Listas y actividad

Cada fila puede incluir:

-   Avatar o icono de categoría.
-   Nombre o título en texto oscuro.
-   Descripción secundaria o fecha en gris.
-   Estado a la derecha mediante una etiqueta pequeña.
-   Separación por espacio, no necesariamente por líneas.

### 7.7 Etiquetas de estado

Usar chips pequeños, con fondo pastel y texto de color correspondiente.

  Estado        Fondo sugerido   Texto sugerido
  ------------- ---------------- ----------------
  Completado    `#E4F3EA`        `#287B55`
  En progreso   `#FBF2D9`        `#A47B1E`
  Pendiente     `#F9E8E7`        `#B85D59`
  Informativo   `#E9EFF8`        `#5E7EAE`

Las etiquetas deben ser compactas y no competir visualmente con el
contenido principal.

### 7.8 Avatares

-   Forma circular.
-   Tamaños habituales: 28--34 px.
-   En listas, alinear verticalmente con el texto.
-   Si no hay imagen, usar iniciales sobre un fondo pastel.
-   No mezclar estilos de ilustración o fotografías dentro del mismo
    grupo.

### 7.9 Temporizador o módulo destacado

-   Fondo verde casi negro.
-   Texto blanco.
-   Métrica o tiempo de gran tamaño.
-   Controles circulares con iconos claros.
-   Se pueden usar líneas curvas o patrones de baja opacidad como
    decoración.
-   La decoración nunca debe dificultar la lectura.

## 8. Iconografía e ilustración

-   Preferir iconos lineales, sencillos y consistentes.
-   Usar una sola biblioteca o familia de iconos en toda la aplicación.
-   Evitar emojis como sustituto de iconos de interfaz.
-   Los iconos activos pueden usar verde; los inactivos, gris.
-   Los avatares pueden tener un estilo ilustrado, pero deben mantener
    tamaño y tratamiento coherentes.
-   Los elementos decorativos deben ser discretos y no distraer de los
    datos.

## 9. Bordes, radios y sombras

  Elemento                   Radio recomendado
  ---------------------- ---------------------
  Contenedor principal               22--28 px
  Tarjetas                           14--18 px
  Campos                   18--24 px o cápsula
  Botones                  12--22 px o cápsula
  Chips                     6--10 px o cápsula
  Avatares                                 50%

Sombras sugeridas:

-   Contenedor principal: `0 12px 40px rgba(20, 35, 28, 0.05)`.
-   Tarjetas: `0 2px 12px rgba(20, 35, 28, 0.025)`.
-   Hover: `0 6px 18px rgba(20, 35, 28, 0.06)`.

Los bordes deben ser suaves (`#E8ECE9`) y usarse solo cuando ayuden a
separar superficies.

## 10. Espaciado

Usar una escala basada en múltiplos de 4 px:

  Token          Valor
  ------------ -------
  `space-1`       4 px
  `space-2`       8 px
  `space-3`      12 px
  `space-4`      16 px
  `space-5`      20 px
  `space-6`      24 px
  `space-8`      32 px
  `space-10`     40 px

Reglas:

-   Padding de tarjeta: 14--18 px.
-   Separación entre tarjetas: 8--12 px.
-   Separación entre título y descripción: 4--6 px.
-   Separación entre secciones: 18--24 px.
-   No comprimir demasiado el contenido: el espacio en blanco es parte
    esencial del estilo.

## 11. Diseño responsivo

La referencia muestra una vista de escritorio. La adaptación móvil debe
conservar el mismo lenguaje visual, no intentar encoger la composición
completa.

### Escritorio (≥ 1200 px)

-   Sidebar fija dentro del contenedor.
-   Topbar horizontal.
-   Cuadrícula de múltiples columnas.
-   Métricas en una fila cuando exista espacio.
-   Tarjetas con tamaños variados.

### Tablet (768--1199 px)

-   Sidebar más estrecha o colapsable.
-   Reducir el número de columnas.
-   Mantener las métricas en dos columnas si es necesario.
-   Reordenar los módulos según importancia.
-   Evitar que títulos, botones o listas se compriman.

### Móvil (\< 768 px)

-   Sidebar convertida en menú desplegable, drawer o navegación
    inferior.
-   Topbar compacta.
-   Perfil y acciones secundarias pueden agruparse.
-   Cuadrícula de una columna.
-   Tarjetas a ancho completo.
-   Métricas en dos columnas solo si siguen siendo legibles; de lo
    contrario, una columna.
-   Gráficos con scroll horizontal únicamente si es imprescindible.
-   Botones táctiles con altura mínima aproximada de 42--44 px.
-   Sin scroll horizontal de toda la página.

## 12. Accesibilidad y usabilidad

-   Contraste legible para textos y controles.
-   No comunicar estados únicamente por color: incluir texto o icono.
-   Todos los botones y enlaces deben tener estados hover, focus y
    disabled.
-   Navegación por teclado.
-   Foco visible y consistente.
-   Etiquetas accesibles en botones que solo tengan iconos.
-   Áreas táctiles suficientes en móvil.
-   Respetar la preferencia `prefers-reduced-motion`.
-   Evitar texto auxiliar excesivamente pequeño.

## 13. Movimiento y microinteracciones

La interfaz debe sentirse fluida, pero tranquila.

-   Hover de botones: cambio sutil de color.
-   Hover de tarjetas: elevación mínima.
-   Navegación activa: transición corta del indicador verde.
-   Aparición de paneles: fade-in ligero.
-   Gráficos: animación breve al cargar, si no distrae.
-   Duración general: 150--220 ms.
-   Curva: `ease-out`.
-   Desactivar o reducir animaciones cuando el usuario lo solicite.

Evitar rebotes, escalados grandes, parallax innecesario o animaciones
permanentes.

## 14. Variables CSS de referencia

Este bloque puede servir como punto de partida para implementar el tema.
Ajustar nombres y valores según la arquitectura del proyecto.

``` css
:root {
  /* Colores */
  --color-primary: #08764f;
  --color-primary-dark: #064b35;
  --color-primary-deep: #073b2c;
  --color-primary-soft: #ddf1e8;
  --color-mint: #62b99a;

  --color-background: #f1f3f2;
  --color-surface: #ffffff;
  --color-sidebar: #f7f8f7;
  --color-surface-muted: #f5f7f6;

  --color-text: #111715;
  --color-text-muted: #89918d;
  --color-border: #e8ece9;

  --color-success: #23845d;
  --color-warning: #d6a83d;
  --color-danger: #d66b68;
  --color-info: #6d91c6;

  /* Tipografía */
  --font-family: "Inter", "Manrope", sans-serif;
  --font-size-page-title: 28px;
  --font-size-card-title: 15px;
  --font-size-body: 13px;
  --font-size-caption: 11px;

  /* Radios */
  --radius-shell: 24px;
  --radius-card: 16px;
  --radius-control: 20px;
  --radius-chip: 999px;

  /* Espaciado */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;

  /* Sombras */
  --shadow-shell: 0 12px 40px rgba(20, 35, 28, 0.05);
  --shadow-card: 0 2px 12px rgba(20, 35, 28, 0.025);
  --shadow-hover: 0 6px 18px rgba(20, 35, 28, 0.06);

  /* Movimiento */
  --transition-ui: 180ms ease-out;
}
```

## 15. Prompt de implementación para un asistente de programación

Al integrar este estilo en un proyecto existente, utilizar las
siguientes instrucciones:

1.  **Primero inspecciona el proyecto.** Identifica framework, lenguaje,
    estructura de carpetas, sistema de estilos, componentes existentes y
    punto de entrada.
2.  **No reemplaces la aplicación completa.** Integra el diseño en la
    estructura actual y conserva la lógica, rutas, datos, autenticación
    y funcionalidades existentes.
3.  **Separa presentación y lógica.** Reutiliza componentes y evita
    duplicar estilos.
4.  **Implementa tokens globales.** Centraliza colores, tipografía,
    radios, sombras y espaciados.
5.  **Construye la estructura visual.** Contenedor principal, sidebar,
    topbar, encabezado y cuadrícula de tarjetas.
6.  **Adapta los módulos al contenido real.** No inventes métricas,
    usuarios, proyectos ni datos. Usa los datos disponibles en el
    programa.
7.  **Prioriza responsive.** La vista de escritorio debe acercarse a la
    referencia; tablet y móvil deben reorganizar los módulos de manera
    natural.
8.  **Respeta la identidad del programa.** Conserva nombre, logotipo,
    textos y colores de marca cuando existan. El verde de esta guía es
    una referencia visual, no una obligación si la marca ya tiene una
    paleta definida.
9.  **Mantén accesibilidad.** Contraste, foco, navegación por teclado y
    controles táctiles.
10. **Valida antes de terminar.** Comprueba que no se rompieron
    funciones existentes, que no hay desbordamientos y que todos los
    componentes responden correctamente.

### Criterio de fidelidad

El resultado debe conservar estos rasgos reconocibles:

-   Fondo exterior gris claro.
-   Gran superficie principal blanca y redondeada.
-   Sidebar clara con navegación vertical.
-   Topbar compacta con buscador y perfil.
-   Título de página prominente y acciones alineadas.
-   Tarjetas blancas con radios amplios y sombras muy sutiles.
-   Verde esmeralda como acento principal.
-   Una tarjeta de métrica o módulo destacado en verde oscuro.
-   Gráficos minimalistas y listas compactas.
-   Abundante espacio en blanco y jerarquía tipográfica limpia.

No se busca copiar literalmente los datos, nombres o módulos de la
imagen. Se busca trasladar su **sistema visual** al contenido y
funcionamiento de la aplicación existente.

------------------------------------------------------------------------

## 16. Checklist de revisión

-   [ ] El fondo general es gris muy claro.
-   [ ] El contenedor principal tiene fondo blanco y esquinas
    redondeadas.
-   [ ] La sidebar se distingue sutilmente del área de contenido.
-   [ ] La navegación activa utiliza el verde principal.
-   [ ] La topbar mantiene buscador, acciones y perfil bien alineados.
-   [ ] Los títulos y métricas tienen jerarquía clara.
-   [ ] Las tarjetas mantienen radios, padding y sombras consistentes.
-   [ ] El verde se utiliza como acento, no como fondo de todo.
-   [ ] Los gráficos son limpios y tienen leyendas comprensibles.
-   [ ] Las listas y estados son compactos y legibles.
-   [ ] La vista tablet reorganiza las columnas.
-   [ ] La vista móvil no presenta desbordamiento horizontal.
-   [ ] Los controles tienen estados hover, focus y disabled.
-   [ ] La lógica y los datos originales del programa siguen
    funcionando.
