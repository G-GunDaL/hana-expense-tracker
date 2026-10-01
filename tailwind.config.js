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
          950: '#080d1a',
        }
      },
      fontFamily: {
        sans: ['Pretendard', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.08)',
        'glass-dark': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'card-hover': '0 12px 24px -4px rgba(0, 132, 133, 0.12), 0 8px 16px -4px rgba(0, 0, 0, 0.04)',
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
