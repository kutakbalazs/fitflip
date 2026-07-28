import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Custom breakpoint used by the marketing landing (design spec: 860px).
      screens: {
        dt: "860px",
      },
      colors: {
        ink: {
          // Existing app scale — DO NOT change; used everywhere as ink-900 … ink-50.
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
          // Landing additions (bg-ink / text-ink-soft / bg-ink-2).
          DEFAULT: "#0a0a0a",
          soft: "#3a3a3a",
          2: "#2a2a2a",
        },
        accent: {
          DEFAULT: "#0a0a0a",
          hover: "#1f1f1f",
        },
        // Landing-only tokens (namespaced so they can't collide with app styles).
        off: "#f5f5f5",
        line: {
          DEFAULT: "#ededed",
          2: "#dcdcdc",
          3: "#e4e4e4",
          dark: "#262626",
        },
        muted: {
          DEFAULT: "#8a8a8a",
          2: "#9a9a9a",
          body: "#b5b5b5",
        },
        // amber / emerald deep-merge with Tailwind's default scales, so the
        // app's amber-400 (dark-mode CTA) etc. keep working.
        amber: {
          DEFAULT: "#f59e0b",
          press: "#d98806",
        },
        emerald: {
          DEFAULT: "#10b981",
        },
        water: {
          1: "#eef3f7",
          2: "#e6edf3",
        },
      },
      fontFamily: {
        // App fonts — unchanged.
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
        // Landing fonts — scoped so the app typography is untouched.
        "l-display": ["var(--font-playfair)", "Georgia", "serif"],
        "l-sans": ["var(--font-archivo)", "Helvetica", "Arial", "sans-serif"],
        "l-mono": ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      maxWidth: {
        shell: "1560px",
      },
      boxShadow: {
        float: "0 24px 60px rgba(10,10,10,0.14)",
        "float-sm": "0 16px 40px rgba(10,10,10,0.14)",
      },
      animation: {
        float: "ff-float 9s ease-in-out infinite",
        "water-a": "ff-water-a 22s ease-in-out infinite",
        "water-b": "ff-water-b 17s ease-in-out infinite",
        shine: "ff-shine 11s linear infinite",
      },
      keyframes: {
        "ff-float": {
          "0%,100%": { transform: "translate3d(0,0,0) rotate(-0.5deg)" },
          "33%": { transform: "translate3d(2px,-9px,0) rotate(0.4deg)" },
          "66%": { transform: "translate3d(-2px,-4px,0) rotate(0.8deg)" },
        },
        "ff-water-a": {
          "0%,100%": { transform: "translate3d(-6%,0,0) scale(1.15)" },
          "50%": { transform: "translate3d(6%,-2%,0) scale(1.22)" },
        },
        "ff-water-b": {
          "0%,100%": { transform: "translate3d(5%,1%,0) scale(1.2)" },
          "50%": { transform: "translate3d(-5%,-1%,0) scale(1.12)" },
        },
        "ff-shine": {
          "0%": { transform: "translate3d(-70%,0,0) rotate(8deg)" },
          "100%": { transform: "translate3d(120%,0,0) rotate(8deg)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
