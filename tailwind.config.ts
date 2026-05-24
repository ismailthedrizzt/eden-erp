import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Eden Teknoloji Brand Colors
        eden: {
          blue:    '#216688',
          'blue-dk': '#174a61',
          'blue-lt': '#e8f3f8',
          green:   '#0e8c61',
          'green-dk': '#096646',
          'green-lt': '#e5f5ef',
          red:     '#d93025',
          'red-lt': '#fde8e7',
          gold:    '#f4c323',
          'gold-dk': '#c49a10',
          'gold-lt': '#fef8e3',
          navy:    '#0f2233',
          'navy-2': '#162b46',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        display: ['Syne', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
