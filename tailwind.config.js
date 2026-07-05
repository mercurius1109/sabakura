/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{vue,js}"],
  theme: {
    extend: {
      colors: {
        base: "#f5f2eb",
        ink: "#24231f",
        muted: "#70685c",
        line: "#d8d0c2",
        leaf: "#2d6a4f",
        moss: "#1b4332",
        ambered: "#a85724",
      },
      boxShadow: {
        panel: "0 10px 28px rgba(50, 43, 32, 0.11)",
      },
    },
  },
  plugins: [],
};
