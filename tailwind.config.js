export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        outfit: ['"Outfit"', "sans-serif"],
      },
      colors: {
        brand: {
          primary: "#9EB6BD",
          secondary: "#715B64",
          accent: "#F5FEFA",
          fifth: "#D1C7BD",
        },
      },
    },
  },
  plugins: [],
};
