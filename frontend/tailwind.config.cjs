/** @type {import('tailwindcss').Config} */
const { colors, typography, shadows, radius } = require('./theme.tokens.cjs')

module.exports = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      // ── Paleta de marca ──────────────────────────────────────────
      // Clases disponibles: bg-clinical-500, text-warm-700, border-blue-200, etc.
      colors: {
        clinical: colors.clinical,
        blue:     colors.blue,
        warm:     colors.warm,
        success:  colors.success,
        warning:  colors.warning,
        danger:   colors.danger,

        // Tokens shadcn/Radix (CSS variables — no tocar)
        border:     'hsl(var(--border))',
        input:      'hsl(var(--input))',
        ring:       'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT:    'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT:    'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT:    'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground, 0 0% 98%))',
        },
        muted: {
          DEFAULT:    'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT:    'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT:    'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT:    'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        sidebar: {
          DEFAULT:            'hsl(var(--sidebar))',
          foreground:         'hsl(var(--sidebar-foreground))',
          primary:            'hsl(var(--sidebar-primary))',
          'primary-foreground':'hsl(var(--sidebar-primary-foreground))',
          accent:             'hsl(var(--sidebar-accent))',
          'accent-foreground':'hsl(var(--sidebar-accent-foreground))',
          border:             'hsl(var(--sidebar-border))',
          ring:               'hsl(var(--sidebar-ring))',
        },
        chart: {
          1: 'hsl(var(--chart-1))',
          2: 'hsl(var(--chart-2))',
          3: 'hsl(var(--chart-3))',
          4: 'hsl(var(--chart-4))',
          5: 'hsl(var(--chart-5))',
        },
      },

      // ── Sombras semánticas ───────────────────────────────────────
      // Clases: shadow-card, shadow-modal, shadow-dropdown
      boxShadow: {
        card:          shadows.card,
        modal:         shadows.modal,
        dropdown:      shadows.dropdown,
        'focus-clinical': shadows.focusClinical,
        'focus-blue':  shadows.focusBlue,
      },

      // ── Bordes ───────────────────────────────────────────────────
      borderRadius: {
        xs:   radius.xs,
        sm:   radius.sm,
        md:   radius.md,
        lg:   radius.lg,
        xl:   radius.xl,
        '2xl':radius['2xl'],
        '3xl':radius['3xl'],
        full: radius.full,
      },

      // ── Escala tipográfica semántica ─────────────────────────────
      // Clases: text-h1, text-h2, text-h3, text-h4,
      //         text-body, text-small, text-caption, text-mono
      fontSize: {
        h1:      [typography.scale.h1.size,      { lineHeight: typography.scale.h1.lineHeight,      fontWeight: typography.scale.h1.weight,      letterSpacing: typography.scale.h1.tracking      }],
        h2:      [typography.scale.h2.size,      { lineHeight: typography.scale.h2.lineHeight,      fontWeight: typography.scale.h2.weight,      letterSpacing: typography.scale.h2.tracking      }],
        h3:      [typography.scale.h3.size,      { lineHeight: typography.scale.h3.lineHeight,      fontWeight: typography.scale.h3.weight,      letterSpacing: typography.scale.h3.tracking      }],
        h4:      [typography.scale.h4.size,      { lineHeight: typography.scale.h4.lineHeight,      fontWeight: typography.scale.h4.weight,      letterSpacing: typography.scale.h4.tracking      }],
        body:    [typography.scale.body.size,    { lineHeight: typography.scale.body.lineHeight,    fontWeight: typography.scale.body.weight,    letterSpacing: typography.scale.body.tracking    }],
        small:   [typography.scale.small.size,   { lineHeight: typography.scale.small.lineHeight,   fontWeight: typography.scale.small.weight,   letterSpacing: typography.scale.small.tracking   }],
        caption: [typography.scale.caption.size, { lineHeight: typography.scale.caption.lineHeight, fontWeight: typography.scale.caption.weight, letterSpacing: typography.scale.caption.tracking }],
        mono:    [typography.scale.mono.size,    { lineHeight: typography.scale.mono.lineHeight,    fontWeight: typography.scale.mono.weight,    letterSpacing: typography.scale.mono.tracking    }],
      },

      // ── Fuentes ──────────────────────────────────────────────────
      fontFamily: {
        sans:  ['Geist Variable', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['Cormorant Garamond', 'Georgia', 'serif'],
        mono:  ['Geist Mono', 'Fira Code', 'Cascadia Code', 'monospace'],
      },

      // ── Duración de transiciones ─────────────────────────────────
      // Clases: duration-fast, duration-normal, duration-slow
      transitionDuration: {
        fast:   '120ms',
        normal: '200ms',
        slow:   '350ms',
      },

      // ── Timing functions ─────────────────────────────────────────
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        decel:  'cubic-bezier(0.0, 0.0, 0.2, 1)',
        accel:  'cubic-bezier(0.4, 0.0, 1.0, 1)',
      },
    },
  },
  plugins: [],
}
