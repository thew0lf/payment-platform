/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        coffee: {
          50: '#fdf8f3',
          100: '#f9ede1',
          200: '#f2d9c2',
          300: '#e8bf99',
          400: '#dc9c6b',
          500: '#d27f4b',
          600: '#c46840',
          700: '#a35136',
          800: '#844232',
          900: '#6b382b',
          950: '#3a1b14',
        },
        cream: {
          50: '#fefdf9',
          100: '#fefbf0',
          200: '#fcf5dc',
          300: '#f9ecbd',
          400: '#f4dc8a',
          500: '#efc857',
          600: '#e2ad33',
          700: '#bc8826',
          800: '#966b24',
          900: '#7a5822',
          950: '#442f0f',
        },
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
