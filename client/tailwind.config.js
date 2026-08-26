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
        ted: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc7fb',
          400: '#36a8f6',
          500: '#0c8de4',
          600: '#0270c3',
          700: '#03589e',
          800: '#074c82',
          900: '#0c3f6d',
          950: '#082848',
        }
      }
    },
  },
  plugins: [],
}
