import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Keep in sync with the :root custom properties in src/app/globals.css
      colors: {
        'liberty-red': '#D32331',
        'liberty-red-bright': '#F02A3B',
        'liberty-blue': '#1F2538',
        'liberty-gold': '#EBE7DC',
        'liberty-dark': '#10100F',
      },
      fontFamily: {
        'bebas': ['Bebas Neue', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
