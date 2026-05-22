/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#0071C5',
          dark: '#004A84',
          light: '#E6F2FB',
          accent: '#00C7FD',
        },
        surface: '#F5F7FA',
        border: '#E0E6ED',
        text: {
          primary: '#1A1A2E',
          secondary: '#6B7280',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
};
