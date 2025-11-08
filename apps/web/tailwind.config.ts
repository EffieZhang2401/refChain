import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#6D5BFF',
          subtle: '#B9B3FF',
          dark: '#4C3BCF'
        }
      }
    }
  },
  plugins: []
};

export default config;
