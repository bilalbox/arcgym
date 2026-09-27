/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["Geist", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
      },
      colors: {
        border: "#e0e2e8",
        input: "#e0e2e8",
        ring: "#0176d3",
        background: "#f7f8fa",
        foreground: "#1c1c1e",
        primary: {
          DEFAULT: "#1c1c1e",
          foreground: "#ffffff",
          hover: "#2c2c34",
        },
        secondary: {
          DEFAULT: "transparent",
          foreground: "#1c1c1e",
          border: "#c7cad5",
        },
        muted: {
          DEFAULT: "#f7f8fa",
          foreground: "#6b6f7e",
        },
        accent: {
          DEFAULT: "#eef0f3",
          foreground: "#1c1c1e",
        },
        card: {
          DEFAULT: "#ffffff",
          foreground: "#1c1c1e",
          border: "#e0e2e8",
        },
        miro: {
          primary: "#1c1c1e",
          charcoal: "#2c2c34",
          canvas: "#ffffff",
          surface: "#f7f8fa",
          surfaceSoft: "#fafbfc",
          hairline: "#e0e2e8",
          hairlineSoft: "#eef0f3",
          hairlineStrong: "#c7cad5",
          blue: "#0176d3",
          blueDeep: "#014486",
          yellow: "#ffd02f",
          tealLight: "#c3faf5",
          tealText: "#187574",
          roseLight: "#ffd8f4",
          roseText: "#9d174d",
          yellowLight: "#fff4c4",
          yellowText: "#746019",
          lavenderLight: "#f5f3ff",
          lavenderText: "#4338ca",
          successLight: "#dcfce7",
          successText: "#15803d",
          dangerLight: "#fee2e2",
          dangerText: "#991b1b",
        },
      },
      borderRadius: {
        "3xl": "28px", // Miro feature card radius
        feature: "32px",
        xxl: "20px",
        xl: "16px",
        lg: "12px",
        md: "8px",
        sm: "6px",
        full: "9999px", // Miro pill
      },
      boxShadow: {
        miro: "rgba(5, 0, 56, 0.06) 0px 8px 24px -4px",
        elevated: "rgba(5, 0, 56, 0.12) 0px 16px 36px -4px",
      },
      transitionDuration: {
        DEFAULT: "150ms",
      },
    },
  },
  plugins: [],
};
