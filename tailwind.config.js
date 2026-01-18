/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,tsx,jsx}",
  ],
  theme: {
    extend: {},
  },
  darkMode: 'class',
  plugins: [require("daisyui")],
  daisyui: {
    themes: ["light", "dark"],
  },
}
