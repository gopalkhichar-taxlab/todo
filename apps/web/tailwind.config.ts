import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // KUDO brand palette — feature stories can extend.
        primary: {
          DEFAULT: '#4f46e5',
          foreground: '#ffffff',
        },
      },
    },
  },
  plugins: [],
};

export default config;
