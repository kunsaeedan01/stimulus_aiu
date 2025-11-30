/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      keyframes: {
        shake: {
          "0%": { transform: "translate(0, 0)" },
          "25%": { transform: "translate(-0.12rem, 0)" },
          "50%": { transform: "translate(0, 0)" },
          "75%": { transform: "translate(0.12rem, 0)" },
          "100%": { transform: "translate(0, 0)" },
        },
      },
      animation: {
        shake: "shake 0.2s ease-in-out infinite",
      },
      colors: {
        error: "#e7483d",
        primary: "#2C59F8",
        secondary: "#717C9E",
        success: "#6DD24A",
        warning: "#F45B2B",
        sheet: "#f7f7fa",
        "sheet-gray": "#E9ECF5",
        pdf: "#f40f02",
        brown: "#C9B291",
        yellow: {
          landing: "#F8DF83",
        },
        black: {
          landing: "#121233",
        },
        blue: {
          landing: "#6C8CE3",
        },
        orange: {
          landing: "#ED7051",
        },
        gray: {
          landing: "#F7F1FD",
        },
      },
      fontFamily: {
        sfpro: "SF Pro",
        sfproBold: "SF Pro bold",
        circe: "circe",
      },
      backgroundPosition: {
        center: "center",
      },
      maxWidth: {
        th: "8rem", // You can adjust the value here
      },
      // fontFamily: {
      //   apercu: ['Apercu', ...defaultTheme.fontFamily.sans],
      //   ubuntu: ['Ubuntu', ...defaultTheme.fontFamily.sans],
      // },
    },
  },
  plugins: [require("@headlessui/tailwindcss"), require("@tailwindcss/forms")],
};
