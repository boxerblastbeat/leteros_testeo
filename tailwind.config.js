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
          red: '#dc2626',
          redHover: '#ef4444',
          redDark: '#991b1b',
          black: '#050505',
          surface: '#0f0f11',
          card: '#18181b',
          border: '#27272a',
          white: '#ffffff'
        }
      }
    },
  },
  plugins: [],
}
