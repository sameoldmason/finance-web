export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        outfit: ['"Outfit"', "sans-serif"],
      },
      colors: {
        background: "#F9F3D6",
        sidebar: "#F4ECC9",
        cardGreen: "#CFE2C4",
        cardOrange: "#F4A16E",
        cardYellow: "#F4D9A4",
        cardDebt: "#F7F2D9",
        primaryButton: "#F2D59B",
        primaryButtonBorder: "#E3C690",
        textPrimary: "#1C1C1C",
        textMuted: "#676451",
        textSubtle: "#A39F8B",
        accent: "#E37B3F",
        toggleDark: "#2F3A30",
        borderSoft: "#E4DFC8",
        borderMedium: "#C9C3A6",
      },
    },
  },
  plugins: [],
};
