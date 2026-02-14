/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#e63b19',
        'primary-dark': '#b92b0e',
        'primary-hover': '#cc3214',
        'background-light': '#f9f9fa',
        'background-dark': '#18181b',
        'surface-dark': '#27272a',
        'surface-darker': '#222225',
        'surface-highlight': '#2d2d2e',
      },
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        body: ['Noto Sans', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        full: '9999px',
      },
      boxShadow: {
        neon: '0 0 10px rgba(230, 59, 25, 0.4)',
        'neon-sm': '0 0 5px rgba(230, 59, 25, 0.3)',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};