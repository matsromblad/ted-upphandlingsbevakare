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
        slate: {
          850: '#151f32',
        },
        wsp: {
          50: '#fff1f0',
          100: '#ffe1df',
          200: '#ffc7c4',
          300: '#ffa09b',
          400: '#ff6961',
          500: '#f1503c', // WSP Official Warm Red (Pantone Warm Red C)
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
          red: '#f1503c',
          dark: '#1e2229',
        },
        ted: {
          50: '#fff1f0',
          100: '#ffe1df',
          200: '#ffc7c4',
          300: '#ffa09b',
          400: '#ff6961',
          500: '#f1503c', // Mapped to WSP Warm Red for global brand alignment
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
        }
      }
    },
  },
  plugins: [],
}
