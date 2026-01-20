import('tailwindcss').Config;

module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        albert: ['"Arial"', 'sans-serif'],
        mono: ["JetBrains Mono", "monospace"],
        sans: ["General Sans", 'sans-serif'],
      },
      colors: {
        customBlue: 'hsl(210, 100%, 50%)',
        customGreen: 'hsl(120, 100%, 50%)',
        customRed: 'hsl(0, 100%, 50%)',
      },
    },
  },
  plugins: [
    require("tailwind-scrollbar")
  ],
};
