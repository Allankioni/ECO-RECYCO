/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e6f7ea',
          100: '#c3eacc',
          200: '#9fdcad',
          300: '#7bce8e',
          400: '#57c16f',
          500: '#38b255', // Main primary color
          600: '#2e9c47',
          700: '#25863a',
          800: '#1c702c',
          900: '#135a1e',
        },
        secondary: {
          50: '#e6f4f9',
          100: '#c3e4ef',
          200: '#9fd3e5',
          300: '#7bc2db',
          400: '#57b1d1',
          500: '#38a0c7', // Main secondary color
          600: '#2e8aad',
          700: '#257493',
          800: '#1c5e79',
          900: '#13485f',
        },
        neutral: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'card': '0 0 25px -5px rgba(0, 0, 0, 0.1), 0 0 10px -5px rgba(0, 0, 0, 0.04)',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
      },
    },
  },
  plugins: [],
}