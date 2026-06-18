/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#13202E",        // primary text / headers
        slate: {
          850: "#16212E",
        },
        brand: {
          DEFAULT: "#2C5F4F",  // deep signal-green (status / trust)
          dark: "#1E4A3C",
          light: "#E7F0EC",
        },
        amber: {
          signal: "#B6772E",
        },
        sky: {
          signal: "#2E5FB6",
        },
      },
      fontFamily: {
        display: ["'Space Grotesk'", "system-ui", "sans-serif"],
        body: ["'Inter'", "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
