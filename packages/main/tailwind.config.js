/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#0F46D6',
          tint: '#EAF0FC',
        },
        save: {
          DEFAULT: '#1F7A4D',
          tint: '#EAF6EE',
        },
      },
    },
  },
  plugins: [],
}
