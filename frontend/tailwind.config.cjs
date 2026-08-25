const tokens = require('./theme.tokens.cjs')

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Escalas numéricas de theme.tokens.cjs — fuente única de verdad.
        // Sin esto, clases como bg-warm-100 o bg-clinical-500 (usadas por
        // StatusBadge y por toda la app) no generan CSS.
        clinical: tokens.colors.clinical,
        warm: tokens.colors.warm,
        blue: tokens.colors.blue,

        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground, 0 0% 98%))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
        chart: {
          1: 'hsl(var(--chart-1))',
          2: 'hsl(var(--chart-2))',
          3: 'hsl(var(--chart-3))',
          4: 'hsl(var(--chart-4))',
          5: 'hsl(var(--chart-5))',
        },
        caramel: {
          ...tokens.colors.caramel,
          DEFAULT: 'hsl(var(--caramel))',
          foreground: 'hsl(var(--caramel-foreground))',
          muted: 'hsl(var(--caramel-muted))',
        },
      },
      borderRadius: {
        sm: 'calc(var(--radius) - 4px)',
        md: 'calc(var(--radius) - 2px)',
        lg: 'var(--radius)',
        xl: 'calc(var(--radius) + 4px)',
        '2xl': 'calc(var(--radius) + 8px)',
        '3xl': 'calc(var(--radius) + 12px)',
        '4xl': 'calc(var(--radius) + 16px)',
      },
      fontFamily: {
                sans: ['Geist Variable', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Spectral', 'Georgia', 'serif'],
        mono: ['Geist Mono', 'Fira Code', 'Cascadia Code', 'monospace'],
      },

      // Sin esto, `shadow-panel` y `shadow-dropdown` — declaradas en KpiCard,
      // DonutCard, LinePanel, BarPanel, DataTable, SectionCard y ChartTooltip —
      // no generan CSS y las tarjetas quedan planas, solo con borde.
      //
      // Ojo con el nombre: `boxShadow.card` colisionaria con `colors.card`
      // (ambos producen la clase .shadow-card) y ganaria la regla de color, que
      // solo tiñe la sombra — es decir, sombra blanca sobre tarjeta blanca.
      boxShadow: {
        panel: tokens.shadows.card,
        modal: tokens.shadows.modal,
        dropdown: tokens.shadows.dropdown,
      },

      // Idem para `text-h4` / `text-small`, usadas por EmptyState.
      fontSize: Object.fromEntries(
        Object.entries(tokens.typography.scale).map(([nombre, escala]) => [
          nombre,
          [escala.size, { lineHeight: escala.lineHeight, fontWeight: escala.weight, letterSpacing: escala.tracking }],
        ])
      ),

      zIndex: {
        60: '60',
      },

      transitionDuration: {
        fast: '120ms',
        normal: '200ms',
        slow: '350ms',
      },

      transitionTimingFunction: {
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        decel: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
        accel: 'cubic-bezier(0.4, 0.0, 1.0, 1)',
      },
    },
  },
  plugins: [],
}
