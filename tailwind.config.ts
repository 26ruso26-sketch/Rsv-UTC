import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Manrope', 'system-ui', 'sans-serif'],
      },
      colors: {
        /* ---------------------------------------------------------------
           Tokens del dashboard (dashboard_ui_style_guide.md §2 y §14).

           Se declaran en hexadecimal para que Tailwind pueda aplicar
           modificadores de opacidad (bg-brand/40). Los mismos valores viven
           como variables CSS en src/app/globals.css para el CSS plano, los
           estilos en línea y la plantilla imprimible: si cambia uno, debe
           cambiar el otro.
           --------------------------------------------------------------- */
        brand: {
          DEFAULT: '#08764f',
          dark: '#064b35',
          deep: '#114b36',
          soft: '#ddf1e8',
          mint: '#62b99a',
          gold: '#c5a049',
          'gold-soft': '#f6eed9',
        },
        app: '#f1f3f2',
        surface: {
          DEFAULT: '#ffffff',
          muted: '#f5f7f6',
          sidebar: '#f7f8f7',
        },
        ink: '#111715',
        muted: '#89918d',
        line: '#e8ece9',
        state: {
          success: '#23845d',
          warning: '#d6a83d',
          danger: '#d66b68',
          info: '#6d91c6',
        },

        /* Paletas previas conservadas para no romper vistas existentes */
        utc: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc8fb',
          400: '#36aaf5',
          500: '#0c8ee6',
          600: '#0070c4',
          700: '#01599f',
          800: '#064b83',
          900: '#0b3f6d',
          950: '#072849',
        },
        institutional: {
          green: '#114b36',
          gold: '#c5a049',
          navy: '#0f172a',
        },
      },
      borderRadius: {
        shell: 'var(--radius-shell)',
        card: 'var(--radius-card)',
        control: 'var(--radius-control)',
      },
      boxShadow: {
        shell: 'var(--shadow-shell)',
        card: 'var(--shadow-card)',
        hover: 'var(--shadow-hover)',
      },
      transitionTimingFunction: {
        ui: 'ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
