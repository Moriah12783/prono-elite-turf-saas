import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        slate: {
          950: "#0b1220"
        },
        brand: {
          50: "#f7f4ed",
          100: "#efe6d5",
          200: "#e3d1ab",
          300: "#d4b679",
          400: "#c49a4b",
          500: "#b57e2a",
          600: "#96631f",
          700: "#744917",
          800: "#533112",
          900: "#321c0b"
        }
      },
      boxShadow: {
        panel: "0 18px 60px rgba(11, 18, 32, 0.12)"
      },
      fontFamily: {
        sans: ["'Segoe UI Variable'", "'Segoe UI'", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;

