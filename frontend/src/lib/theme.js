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
 * Siguen el modo claro/oscuro vía los tokens de src/index.css.
 * Uso: statusColors.confirmed.bg → 'bg-success-soft'
 */
export const statusColors = {
  confirmed:  { bg: 'bg-success-soft', border: 'border-success/30', text: 'text-success'          },
  inProgress: { bg: 'bg-info-soft',    border: 'border-info/30',    text: 'text-info'             },
  completed:  { bg: 'bg-muted',        border: 'border-border',     text: 'text-muted-foreground' },
  cancelled:  { bg: 'bg-danger-soft',  border: 'border-danger/30',  text: 'text-danger'           },
  pending:    { bg: 'bg-warning-soft', border: 'border-warning/30', text: 'text-warning'          },
}

export default tokens
