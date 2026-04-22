/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#2B2931',
          peach: '#FAB784',
          gold: '#FBB040',
          teal: '#00A79D',
          gray: '#58595B',
          taupe: '#9B8579',
        },
      },
      fontFamily: {
        sans: ['Mulish', 'sans-serif'],
        heading: ['Montserrat', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
