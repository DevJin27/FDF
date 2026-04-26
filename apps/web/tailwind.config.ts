import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#101418",
        mist: "#edf3ef",
        citrus: "#d8ff5e",
        ember: "#fb7a2f",
        pine: "#0c4b3a"
      },
      boxShadow: {
        panel: "0 18px 40px rgba(16, 20, 24, 0.08)"
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"]
      }
    }
  },
  plugins: []
};

export default config;
