/**
 * New file: Tailwind CSS config with NativeWind preset and React Native globs.
 * Enables Tailwind className usage across ./src and App.
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [require("nativewind/tailwind/native")],
}

