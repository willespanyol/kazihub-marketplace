/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#0F766E",
        dark: "#0F172A",
        muted: "#64748B",
        soft: "#F8FAFC",
      },
    },
  },
  plugins: [],
};