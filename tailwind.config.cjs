/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#F9A825',
        'primary-light': '#FDD835',
        secondary: '#FFD700',
        marine: '#0D47A1',
        'brand-green': '#37BD6B',
      },
      borderColor: {
        DEFAULT: '#e5e7eb',
      },
      fontFamily: {
        sans: ['Rajdhani', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
