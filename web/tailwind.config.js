/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#e6fffa',
          100: '#b2f5ea',
          400: '#02c39a',
          500: '#00a896',
          600: '#028090',
          700: '#05668d',
          800: '#1c2541',
          900: '#0b132b',
          accent: '#00f5d4',
        }
      }
    },
  },
  plugins: [],
}
