/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        labor: {
          blue: "#1656D6",
          blueDark: "#1D61D2",
          blueLight: "#EFF6FF",
          blueBorder: "#BFDBFE",
          green: "#10B981",
          greenLight: "#ECFDF5",
          red: "#EF4444",
          redDark: "#DC2626",
          redLight: "#FEF2F2",
          amber: "#F59E0B",
          amberLight: "#FFFBEB",
          purple: "#8B5CF6",
          purpleLight: "#F5F3FF",
          bg: "#F8FAFC",
          card: "#FFFFFF",
          border: "#E2E8F0",
          textPrimary: "#0F172A",
          textSecondary: "#64748B",
          textMuted: "#94A3B8",
        }
      }
    },
  },
  plugins: [],
}
