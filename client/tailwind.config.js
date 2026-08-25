/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        agri: {
          50: '#f2f9ee',
          100: '#e0f0d6',
          200: '#c2e1af',
          300: '#9bcd7d',
          400: '#78b856',
          500: '#579b39',
          600: '#427c2b',
          700: '#356124',
          800: '#2c4d21',
          900: '#26411f',
        },
        earth: {
          50: '#faf7f2',
          100: '#f0e8db',
          200: '#e0cdb1',
          300: '#cbaa80',
          400: '#b98c5d',
          500: '#a2714a',
          600: '#875a3d',
          700: '#6d4634',
          800: '#5b3a2e',
          900: '#4d3129',
        },
      },
    },
  },
  plugins: [],
};
