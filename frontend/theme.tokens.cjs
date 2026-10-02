/**
 * Bourgelat Design Tokens — fuente única de verdad
 *
 * Importado por:
 *   - tailwind.config.cjs  → genera clases utilitarias
 *   - src/lib/theme.js     → disponible en componentes React
 *
 * Identidad «Papel y pulso». Los colores de tema viven como variables HSL en
 * src/index.css (:root y .dark); aquí están las escalas fijas y la referencia.
 *
 * Roles (no mezclarlos):
 *   tinta     → estructura: texto, sidebar, botón secundario
 *   brand     → firma (caramelo): pulso, eyebrows, foco. Nunca un botón
 *   primary   → acción (pino) y estado "saludable / confirmada"
 *   success · warning · danger · info → estados, con su fondo -soft
 *
 * Convención de uso en JSX:
 *   bg-primary / bg-card / text-muted-foreground   tokens del tema
 *   bg-danger-soft text-danger                      en vez de bg-red-50 text-red-600
 *   bg-warning-soft text-warning                    en vez de bg-amber-50 text-amber-700
 *   bg-success-soft text-success                    en vez de bg-emerald-50 text-emerald-700
 *   bg-info-soft text-info                          en vez de bg-cyan-50 / bg-sky-50 / bg-blue-50
 *   text-brand-foreground                           eyebrows y detalles de marca
 *   shadow-panel                                    en vez de shadow-[0_18px_55px_rgba(...)]
 */

// ─────────────────────────────────────────────
// COLORES
// ─────────────────────────────────────────────

const colors = {
  /**
   * Pino — color de acción (= --primary en modo claro)
   * Usar en:
   *   - Botón primario / CTA
   *   - Estado "confirmada" / "saludable"
   *   - Iconos de acción positiva
   * NO usar como fondo de página ni en bloques grandes.
   * Se llama `clinical` por compatibilidad con las clases existentes.
   */
  clinical: {
    50:  '#edf6f2',
    100: '#d3eadf',
    200: '#a8d5c0',
    300: '#74b99c',
    400: '#45997a',
    500: '#1f7a5c', // ← pino, acción principal (5,3:1 con texto blanco)
    600: '#19664d',
    700: '#14523e',
    800: '#103f30',
    900: '#0b2d22',
    950: '#061a14',
  },

  /**
   * Tinta — estructura: texto, sidebar, encabezados de tabla.
   * 800 = --foreground, 900 = --sidebar.
   */
  tinta: {
    50:  '#f2f5f8',
    100: '#e1e8ee',
    200: '#c3d0db',
    300: '#9cb0c1',
    400: '#6f879c',
    500: '#4d6378',
    600: '#34495d',
    700: '#213649',
    800: '#10263a', // ← tinta principal
    900: '#0b1a26',
    950: '#06111a',
  },

  /**
   * Papel — fondos y bordes cálidos.
   * 50 = --card, 100 = --background, 300 = --border, 400 = --input.
   */
  papel: {
    50:  '#fffdf9',
    100: '#f8f4ee',
    200: '#efe9e0',
    300: '#e4dccf',
    400: '#d6ccbd',
  },

  /**
   * Azul — estados interactivos y acento secundario
   * Usar en:
   *   - Estado "en curso" / "en progreso"
   *   - Links, focus rings, badges informativos
   *   - Gráficas (serie principal)
   */
  blue: {
    50:  '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6', // ← acento principal
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554',
  },

  /**
   * Caramelo — firma de marca (= --brand)
   * Usar en:
   *   - Pulso ECG, eyebrows, ítem activo del sidebar, anillo de foco
   *   - Detalles decorativos (lengüeta de ficha, numerales en itálica)
   *   - Texto pequeño: usar 700 o text-brand-foreground (500 no pasa AA)
   * NO usar como color de acción ni en tablas de datos.
   */
  caramel: {
    50:  '#fdf6ee',
    100: '#f9e8d4',
    200: '#f3d0a8',
    300: '#eab97c',
    400: '#d49156',
    500: '#b07645', // ← login accent principal
    600: '#925e35',
    700: '#714726',
    800: '#50321a',
    900: '#301e0f',
    950: '#180f07',
  },

  /**
   * Grises cálidos — fondos, bordes y texto
   * Reemplazan slate-* y gray-* en contenido de UI.
   * Tienen un ligero tono cálido (evitan la frialdad clínica excesiva).
   */
  warm: {
    50:  '#fafaf9',
    100: '#f5f4f1',
    200: '#e8e5df',
    300: '#d4d0c8',
    400: '#afa99e',
    500: '#8a8378',
    600: '#6a6358',
    700: '#4f4940',
    800: '#36302a',
    900: '#1e1a15',
    950: '#0f0c09',
  },

  /**
   * Colores de estado — semánticos para citas, facturas, inventario.
   * Siguen el tema (claro/oscuro) vía variables CSS de src/index.css:
   *   DEFAULT → texto, borde, punto      soft → fondo del chip o aviso
   * Ver también: src/lib/theme.js → statusColors
   */
  success: { DEFAULT: 'hsl(var(--success) / <alpha-value>)', soft: 'hsl(var(--success-soft) / <alpha-value>)' }, // pino
  warning: { DEFAULT: 'hsl(var(--warning) / <alpha-value>)', soft: 'hsl(var(--warning-soft) / <alpha-value>)' }, // miel
  danger:  { DEFAULT: 'hsl(var(--danger) / <alpha-value>)',  soft: 'hsl(var(--danger-soft) / <alpha-value>)' },  // ladrillo
  info:    { DEFAULT: 'hsl(var(--info) / <alpha-value>)',    soft: 'hsl(var(--info-soft) / <alpha-value>)' },    // petróleo
}

// ─────────────────────────────────────────────
// TIPOGRAFÍA
// ─────────────────────────────────────────────

const typography = {
  fontFamily: {
    sans:  '"Geist Variable", system-ui, -apple-system, sans-serif',
    serif: '"Spectral", "Spectral Fallback", Georgia, serif', // = fontFamily.display de Tailwind
    mono:  '"Geist Mono", "Fira Code", "Cascadia Code", monospace',
  },
  /**
   * Escala tipográfica semántica
   * En Tailwind: text-h1, text-h2, ... text-caption, text-mono
   * En CSS:      clase .heading-1, .heading-2, ... .caption-text, .mono-text
   */
  scale: {
    h1:      { size: '2.25rem',   lineHeight: '2.75rem',  weight: '700', tracking: '-0.025em' },
    h2:      { size: '1.75rem',   lineHeight: '2.25rem',  weight: '600', tracking: '-0.02em'  },
    h3:      { size: '1.375rem',  lineHeight: '1.875rem', weight: '600', tracking: '-0.015em' },
    h4:      { size: '1.125rem',  lineHeight: '1.625rem', weight: '600', tracking: '-0.01em'  },
    body:    { size: '0.9375rem', lineHeight: '1.625rem', weight: '400', tracking: '0'        },
    small:   { size: '0.875rem',  lineHeight: '1.375rem', weight: '400', tracking: '0'        },
    caption: { size: '0.75rem',   lineHeight: '1.125rem', weight: '500', tracking: '0.01em'   },
    mono:    { size: '0.875rem',  lineHeight: '1.5rem',   weight: '400', tracking: '-0.01em'  },
  },
}

// ─────────────────────────────────────────────
// SOMBRAS — 3 niveles semánticos
// ─────────────────────────────────────────────

const shadows = {
  /**
   * card — elevación base. Cards, paneles, tablas.
   * Filosofía: borde fino + sombra casi imperceptible.
   * Más limpio que sombras grandes en entorno clínico.
   */
  card:     '0 1px 2px rgba(15,23,42,0.04), 0 4px 12px rgba(15,23,42,0.05)',

  /**
   * modal — overlays, drawers, diálogos.
   * Anula la sombra de cards cuando se superpone.
   */
  modal:    '0 8px 24px rgba(15,23,42,0.10), 0 24px 64px rgba(15,23,42,0.18)',

  /**
   * dropdown — menús flotantes, tooltips, popovers.
   * Entre card y modal: flota pero no es tan agresivo como un modal.
   */
  dropdown: '0 2px 8px rgba(15,23,42,0.07), 0 8px 24px rgba(15,23,42,0.11)',

  /**
   * Focus rings — accesibilidad
   */
  focusClinical: '0 0 0 3px rgba(16,185,129,0.30)',
  focusBlue:     '0 0 0 3px rgba(59,130,246,0.30)',
}

// ─────────────────────────────────────────────
// BORDES
// ─────────────────────────────────────────────

const radius = {
  none: '0',
  xs:   '0.25rem',   //  4px — chips pequeños, badges inline
  sm:   '0.375rem',  //  6px — inputs, botones small
  md:   '0.625rem',  // 10px — base (--radius actual)
  lg:   '0.875rem',  // 14px — cards, paneles
  xl:   '1.25rem',   // 20px — modales, drawers
  '2xl':'1.75rem',   // 28px — cards grandes del dashboard
  '3xl':'2.5rem',    // 40px — ilustraciones, avatares grandes
  full: '9999px',    //       — pills, avatares, tags
}

// ─────────────────────────────────────────────
// ESPACIADO SEMÁNTICO
// Complementa la escala numérica de Tailwind con tokens con nombre.
// Usar en componentes vía theme.spacing.pagePadding.md etc.
// ─────────────────────────────────────────────

const spacing = {
  pagePadding:  { sm: '1rem',    md: '1.5rem',  lg: '2.5rem'  },
  cardGap:      { sm: '0.75rem', md: '1rem',    lg: '1.25rem' },
  cardPadding:  { sm: '1rem',    md: '1.25rem', lg: '1.5rem'  },
  sectionGap:   { sm: '1.5rem',  md: '2rem',    lg: '3rem'    },
}

// ─────────────────────────────────────────────
// ANIMACIONES
// Usar con Motion (Framer) o transition CSS.
// ─────────────────────────────────────────────

const animation = {
  duration: {
    fast:   '120ms',  // micro-feedback (hover, active)
    normal: '200ms',  // transiciones de estado
    slow:   '350ms',  // página enter / drawer open
    enter:  '250ms',  // elementos que aparecen
    exit:   '160ms',  // elementos que desaparecen (siempre más rápido)
  },
  easing: {
    standard:   'cubic-bezier(0.4, 0, 0.2, 1)',  // movimiento general
    decelerate: 'cubic-bezier(0.0, 0.0, 0.2, 1)', // elementos que entran
    accelerate: 'cubic-bezier(0.4, 0.0, 1.0, 1)', // elementos que salen
    spring:     'cubic-bezier(0.34, 1.56, 0.64, 1)', // rebote sutil (botones, badges)
  },
}

// ─────────────────────────────────────────────

module.exports = { colors, typography, shadows, radius, spacing, animation }
