import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#060606",
          900: "#0a0a0a",
          800: "#1a1a1a",
          700: "#1f1f1f",
          500: "#5a5a5a",
          400: "#767676",
          300: "#a8a8a8",
          200: "#d1d1d1",
          100: "#e8e8e8",
          50: "#f5f5f5",
        },
        accent: {
          DEFAULT: "#0a0a0a",
          hover: "#1f1f1f",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
export default config;
