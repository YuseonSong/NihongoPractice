/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Pretendard', 'Noto Sans KR', 'system-ui', 'sans-serif'] },
      colors: { ink: '#292524', cream: '#fffaf5' },
      boxShadow: { soft: '0 18px 45px rgba(120, 53, 15, 0.09)' },
    },
  },
  plugins: [],
}
