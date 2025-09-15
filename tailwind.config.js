/**
 * Update: Fixed object braces/commas and ensured NativeWind plugin placement.
 * Tailwind CSS config for React Native with NativeWind.
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
        // React Native requires numeric font sizes; avoid CSS units like rem
        // Approximate Tailwind web sizes with numeric values compatible with RN
        // 2xl ~ 24px, lineHeight ~ 32px
        // NativeWind expects lineHeight as string with units for array form
        '2xl': [24, { lineHeight: '32px', letterSpacing: -0.24 }],
        // 3xl ~ 30px, lineHeight ~ 36px
        '3xl': [30, { lineHeight: '36px', letterSpacing: -0.24 }],
      },
    },
  },
  plugins: [require("nativewind/tailwind/native")],
};
