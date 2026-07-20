/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        gold: {
          50: '#fbf7ed',
          100: '#f5ebd0',
          200: '#ecd79f',
          300: '#e0bd66',
          400: '#d4a73d',
          500: '#c4902a',
          600: '#a87322',
          700: '#85571f',
          800: '#6e461f',
          900: '#5d3c1f',
          950: '#36200d',
        },
        ink: {
          50: '#f6f6f7',
          100: '#e2e2e6',
          200: '#c5c6cc',
          300: '#9fa1ab',
          400: '#74768a',
          500: '#5a5c6f',
          600: '#494b5c',
          700: '#3c3d4b',
          800: '#262732',
          900: '#1a1b23',
          950: '#0f1015',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Cinzel"', 'serif'],
      },
      boxShadow: {
        gold: '0 0 0 1px rgba(196,144,42,0.35), 0 8px 30px -12px rgba(196,144,42,0.25)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.35s cubic-bezier(0.16,1,0.3,1)',
        'shimmer': 'shimmer 1.6s linear infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
    },
  },
  plugins: [],
};
