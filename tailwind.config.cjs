/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3650D0',
        secondary: '#FF7B00',
      },
      borderColor: {
        DEFAULT: '#e5e7eb',
      },
    },
  },
  plugins: [],
}
