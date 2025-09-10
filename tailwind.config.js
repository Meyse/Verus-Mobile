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
    extend: {
      fontSize: {
        '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.015em' }], 
        '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.015em' }],
      },
    },
  },
  plugins: [require("nativewind/tailwind/native")],
}

