import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          500: '#3b4f8c',
          600: '#2d3f7c',
          700: '#1e2f6e',
          800: '#152460',
          900: '#0f1a50',
          950: '#0a1240',
        },
      },
    },
  },
  plugins: [],
};

export default config;
