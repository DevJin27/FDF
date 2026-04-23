import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      boxShadow: {
        card: "0 18px 45px rgba(15, 23, 42, 0.08)",
      },
      colors: {
        brand: "#FFD000",
      },
    },
  },
  plugins: [],
};

export default config;
