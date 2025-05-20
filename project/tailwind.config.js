/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0099ff',
        secondary: '#001e3c',
        'navy-800': '#001e3c',
        'navy-900': '#000c19',
      }
    },
  },
  plugins: [],
}