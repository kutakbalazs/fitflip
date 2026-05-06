import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          900: "#0a0a0a",
          700: "#1f1f1f",
          500: "#5a5a5a",
          300: "#a8a8a8",
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
