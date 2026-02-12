import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'liberty-red': '#B22234',
        'liberty-blue': '#3C3B6E',
        'liberty-gold': '#D4AF37',
        'liberty-dark': '#0A0A0F',
      },
      fontFamily: {
        'bebas': ['Bebas Neue', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
