/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        segoe: ['"Segoe UI"', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
      },
      colors: {
        metro: {
          blue: '#0078D7',
          teal: '#00B7C3',
          red: '#E81123',
          green: '#107C10',
          orange: '#F09609',
          purple: '#8E5AA5',
          pink: '#E3008C',
          lime: '#8CBD18',
        },
      },
    },
  },
  plugins: [],
}
