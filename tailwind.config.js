/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        display: [
          'Space Grotesk',
          'Inter',
          'ui-sans-serif',
          'system-ui',
          'sans-serif',
        ],
      },
      colors: {
        ink: {
          50: '#f6f7f9',
          100: '#eceef2',
          200: '#d5d9e2',
          300: '#aeb5c4',
          400: '#818aa0',
          500: '#606a83',
          600: '#4b546b',
          700: '#3d4457',
          800: '#232838',
          900: '#141826',
          950: '#0b0e18',
        },
        lime: {
          50: '#f4ffe6',
          100: '#e6ffbf',
          200: '#d1ff8a',
          300: '#b5f74a',
          400: '#9ae819',
          500: '#7bc90b',
          600: '#5da004',
          700: '#477908',
          800: '#39600d',
          900: '#305010',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,23,42,0.05), 0 6px 24px -12px rgba(15,23,42,0.10)',
        pop: '0 12px 30px -12px rgba(15,23,42,0.25)',
        glow: '0 0 0 4px rgba(154,232,25,0.15)',
      },
      borderRadius: {
        xl: '14px',
        '2xl': '20px',
        '3xl': '28px',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-out',
        'slide-up': 'slide-up 240ms cubic-bezier(0.16,1,0.3,1)',
        'pulse-soft': 'pulseSoft 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
