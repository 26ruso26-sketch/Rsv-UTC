import type { Config } from 'tailwindcss';

/**
 * Sistema visual "Papel y tinta" (docs/dashboard-taste/SKILL.md) con el verde
 * institucional de la UTC como único acento. Los valores viven como variables
 * CSS en src/app/globals.css; aquí solo se exponen como utilidades.
 */
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts}',
  ],
  theme: {
    extend: {
      colors: {
        paper: token('paper'),
        surface: token('surface'),
        sunk: token('sunk'),
        line: {
          DEFAULT: token('line'),
          strong: token('line-strong'),
        },
        ink: {
          DEFAULT: token('ink'),
          2: token('ink-2'),
          3: token('ink-3'),
        },
        accent: {
          DEFAULT: token('accent'),
          hover: token('accent-hover'),
          soft: token('accent-soft'),
        },
        'on-accent': token('on-accent'),
        ok: { DEFAULT: token('ok'), soft: token('ok-soft') },
        warn: { DEFAULT: token('warn'), soft: token('warn-soft') },
        bad: { DEFAULT: token('bad'), soft: token('bad-soft') },
      },
      fontFamily: {
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Helvetica Neue', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        xs: ['12.5px', { lineHeight: '1.45' }],
        label: ['11px', { lineHeight: '1.2', letterSpacing: '0.08em' }],
        hero: ['56px', { lineHeight: '1', letterSpacing: '-0.02em' }],
      },
      boxShadow: {
        float: '0 8px 24px rgb(29 26 22 / 0.12)',
      },
      transitionDuration: {
        DEFAULT: '150ms',
      },
      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(0, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
