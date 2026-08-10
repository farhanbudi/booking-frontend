/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#F7F8FA",
        ink: "#1B1F27",
        muted: "#6B7280",
        primary: {
          DEFAULT: "#2F3C7E",
          dark: "#232C5E",
          light: "#4A58A8",
        },
        accent: {
          DEFAULT: "#E2A83D",
          dark: "#C68F2A",
        },
        danger: "#C0392B",
        line: "#E4E6EB",
      },
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
