/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      keyframes: {
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '50%, 100%': { transform: 'translateY(200%)' },
        },
      },
      animation: {
        scan: 'scan 3s linear infinite',
      },
    },
  },
  plugins: [],
};