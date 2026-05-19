/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      // ── Ascent brand colors ─────────────────────────────────
      colors: {
        brand: {
          50:  "#eef5e6",
          100: "#d4e8be",
          200: "#b5d990",
          300: "#91c85e",
          400: "#74bb38",
          500: "#4a7c2f",   // ← primary brand green
          600: "#3a6022",
          700: "#2d4e1a",
          800: "#1f3c12",
          900: "#122a09",
        },
        // Status colors
        success: {
          light: "#e8f5e9",
          DEFAULT: "#2e7d32",
          dark: "#1b5e20",
        },
        danger: {
          light: "#ffebee",
          DEFAULT: "#c62828",
          dark: "#7f0000",
        },
        warning: {
          light: "#fff8e1",
          DEFAULT: "#e65100",
        },
        info: {
          light: "#e3f2fd",
          DEFAULT: "#1565c0",
        },
        // Surface colors
        surface: {
          DEFAULT: "#ffffff",
          2: "#f9f9f4",
          3: "#f4f4ee",
        },
        // Border
        line: {
          DEFAULT: "#e0e0d8",
          dark: "#c8c8bc",
        },
        // Text
        ink: {
          DEFAULT: "#1a1a1a",
          secondary: "#555555",
          muted: "#999999",
        },
      },

      // ── Fonts ───────────────────────────────────────────────
      fontFamily: {
        head: ["Sora", "sans-serif"],
        body: ["DM Sans", "sans-serif"],
        mono: ["Courier New", "monospace"],
      },

      // ── Sidebar width ───────────────────────────────────────
      width: {
        sidebar: "200px",
      },
      marginLeft: {
        sidebar: "200px",
      },
      minHeight: {
        content: "calc(100vh - 52px)",
      },

      // ── Box shadows ─────────────────────────────────────────
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,.06)",
        nav:  "0 2px 8px rgba(0,0,0,.08)",
        lg:   "0 8px 24px rgba(0,0,0,.12)",
      },
    },
  },
  plugins: [],
};
