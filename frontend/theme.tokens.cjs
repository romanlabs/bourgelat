/**
 * Bourgelat Design Tokens — fuente única de verdad
 *
 * Importado por:
 *   - tailwind.config.cjs  → genera clases utilitarias
 *   - src/lib/theme.js     → disponible en componentes React
 *
 * Convención de uso en JSX:
 *   bg-clinical-500   en vez de   bg-teal-500 / bg-emerald-500
 *   bg-warm-100       en vez de   bg-slate-100 / bg-gray-100
 *   shadow-card       en vez de   shadow-[0_18px_55px_rgba(...)]
 *   text-blue-600     en vez de   text-cyan-700 / text-sky-600
 */

// ─────────────────────────────────────────────
// COLORES
// ─────────────────────────────────────────────

const colors = {
  /**
   * Verde clínico — identidad de marca
   * Base: emerald-teal médico. Usar en:
   *   - Botón primario / CTA
   *   - Estado "confirmada" / "saludable"
   *   - Ítem activo del nav
   *   - Iconos de acción positiva
   * NO usar como fondo de página ni en bloques grandes.
   */
  clinical: {
    50:  '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981', // ← brand principal
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
    950: '#022c22',
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
   * Colores de estado — semánticos para citas/pacientes
   * Usar como referencia para construir badges y chips.
   * Ver también: src/lib/theme.js → status
   */
  success: {
    light: '#d1fae5',
    DEFAULT: '#10b981',
    dark:  '#065f46',
  },
  warning: {
    light: '#fef3c7',
    DEFAULT: '#f59e0b',
    dark:  '#92400e',
  },
  danger: {
    light: '#fee2e2',
    DEFAULT: '#ef4444',
    dark:  '#991b1b',
  },
}

// ─────────────────────────────────────────────
// TIPOGRAFÍA
// ─────────────────────────────────────────────

const typography = {
  fontFamily: {
    sans:  '"Geist Variable", system-ui, -apple-system, sans-serif',
    serif: '"Cormorant Garamond", Georgia, serif',
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
