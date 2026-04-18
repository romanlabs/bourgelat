/**
 * Tokens de diseño disponibles en componentes React.
 * Fuente de verdad: /frontend/theme.tokens.cjs
 *
 * Importar lo que necesites:
 *   import { colors, shadows, animation } from '@/lib/theme'
 *
 * Ejemplos de uso:
 *   // Inline style dinámico:
 *   style={{ boxShadow: shadows.card }}
 *
 *   // Animación con Motion:
 *   transition={{ duration: parseFloat(animation.duration.normal) / 1000, ease: [0.4, 0, 0.2, 1] }}
 *
 *   // Paleta en JS (ej. para Recharts):
 *   stroke={colors.clinical[500]}
 */

import tokens from '../../theme.tokens.cjs'

export const colors    = tokens.colors
export const typography = tokens.typography
export const shadows   = tokens.shadows
export const radius    = tokens.radius
export const spacing   = tokens.spacing
export const animation = tokens.animation

/**
 * Colores semánticos de estado para citas/pacientes.
 * Uso: statusColors.confirmed.bg → 'clinical-100'
 */
export const statusColors = {
  confirmed:  { bg: 'bg-clinical-100', border: 'border-clinical-300', text: 'text-clinical-700' },
  inProgress: { bg: 'bg-blue-100',     border: 'border-blue-300',     text: 'text-blue-700'     },
  completed:  { bg: 'bg-warm-100',     border: 'border-warm-300',     text: 'text-warm-600'     },
  cancelled:  { bg: 'bg-danger-light', border: 'border-red-200',      text: 'text-danger-dark'  },
  pending:    { bg: 'bg-warning-light',border: 'border-amber-200',    text: 'text-warning-dark' },
}

export default tokens
