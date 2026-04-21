/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        felt: { 1: '#0e5a3a', 2: '#0a4a30', 3: '#073a25' },
        wood: { 1: '#7a4a24', 2: '#5c3517', 3: '#3d230f', hl: '#c88a4c' },
        brass: { DEFAULT: '#e8b86b', deep: '#b1813f' },
        cream: { DEFAULT: '#f5ead2', 2: '#efe1bf' },
        ink: '#1a1410',
        tile: { DEFAULT: '#f7efde', edge: '#2a1f14' },
      },
      fontFamily: {
        display: ['Fraunces', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      keyframes: {
        tilePlop: {
          '0%': { transform: 'translateY(-40px) rotate(-4deg)', opacity: '0' },
          '100%': { transform: 'translateY(0) rotate(0)', opacity: '1' },
        },
        pulsePlayable: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '1' },
        },
        spin: {
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'tile-plop': 'tilePlop .35s cubic-bezier(.2,.9,.3,1.2)',
        'pulse-playable': 'pulsePlayable 1.6s infinite',
        spin: 'spin 1s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
