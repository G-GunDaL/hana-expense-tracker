/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#008485', // 하나은행 시그니처 청록/에메랄드
          600: '#006c6d',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          accent: '#e60050', // 하나 레드 포인트
        },
        slate: {
          850: '#151f30',
          900: '#0f172a',
          925: '#0b1120',
          950: '#070b14',
        }
      },
      fontFamily: {
        sans: ['Pretendard', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.25)',
        'glass-glow': '0 0 25px -5px rgba(0, 132, 133, 0.2)',
        'glass-dark': '0 8px 32px 0 rgba(0, 0, 0, 0.45)',
        'card-hover': '0 12px 28px -4px rgba(0, 132, 133, 0.16), 0 8px 16px -4px rgba(0, 0, 0, 0.2)',
        'glow-brand': '0 0 20px -2px rgba(0, 132, 133, 0.35)',
        'glow-accent': '0 0 20px -2px rgba(230, 0, 80, 0.35)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-up': 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'scale(0.98)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      }
    },
  },
  plugins: [],
}
