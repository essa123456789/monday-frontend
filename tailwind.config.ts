import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand accent. Driven by CSS variables so a workspace admin can retheme
        // the app at runtime; the channel-triplet form keeps `bg-primary/20` and
        // friends working. Defaults live in globals.css.
        primary: {
          DEFAULT: "rgb(var(--primary-rgb) / <alpha-value>)",
          hover: "rgb(var(--primary-hover-rgb) / <alpha-value>)",
          soft: "rgb(var(--primary-soft-rgb) / <alpha-value>)",
        },
        surface: {
          DEFAULT: "var(--surface)",
          raised: "var(--surface-raised)",
          sunken: "var(--surface-sunken)",
        },
        ink: {
          DEFAULT: "var(--ink)",
          muted: "var(--ink-muted)",
          faint: "var(--ink-faint)",
        },
        edge: "var(--edge)",
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.08)",
        "card-hover": "0 4px 12px rgba(15, 23, 42, 0.12), 0 2px 4px rgba(15, 23, 42, 0.08)",
        panel: "-8px 0 32px rgba(15, 23, 42, 0.14)",
        pop: "0 8px 24px rgba(15, 23, 42, 0.16)",
      },
      keyframes: {
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pop-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "slide-in-right": "slide-in-right 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        "fade-in": "fade-in 0.2s ease-out",
        "pop-in": "pop-in 0.15s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
