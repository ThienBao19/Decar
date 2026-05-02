import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── Supabase-inspired design system ──────────────────
        // Surface / background
        surface: {
          DEFAULT: '#171717',  // page background
          dark:    '#0f0f0f',  // deepest — button bg
          card:    '#1c1c1c',  // slightly lifted card surface
          glass:   'rgba(41, 41, 41, 0.84)',
        },
        // Brand green
        brand: {
          DEFAULT:  '#3ecf8e',
          link:     '#00c573',
          border:   'rgba(62, 207, 142, 0.30)',
          glow:     'rgba(62, 207, 142, 0.15)',
          // Legacy alias for pages not yet migrated
          50:  '#f0fdf4',
          100: '#dcfce7',
          500: '#3ecf8e',
          600: '#00c573',
          700: '#009e5c',
          900: '#064e3b',
        },
        // Border scale (dark → prominent)
        border: {
          subtle:   '#242424',
          DEFAULT:  '#2e2e2e',
          strong:   '#363636',
          stronger: '#393939',
        },
        // Neutral text scale
        ink: {
          primary:   '#fafafa',
          secondary: '#b4b4b4',
          muted:     '#898989',
          faint:     '#4d4d4d',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Helvetica Neue', 'Helvetica', 'Arial', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'Source Code Pro', 'Office Code Pro', 'Menlo', 'monospace'],
      },
      borderRadius: {
        pill: '9999px',
      },
      // Supabase-style section spacing
      spacing: {
        section: '96px',
        'section-sm': '64px',
      },
      keyframes: {
        'fade-in': {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.6' },
          '50%':      { opacity: '1' },
        },
        marquee: {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        'fade-in':    'fade-in 0.6s ease-out both',
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
        marquee:      'marquee 30s linear infinite',
      },
    },
  },
  plugins: [],
}

export default config
