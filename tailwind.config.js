/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#0B1F19',
          800: '#102A22',
          700: '#173A2F',
          600: '#235243',
          500: '#3B6B58',
        },
        lime: {
          400: '#C8F169',
          500: '#B4E84F',
        },
        cream: '#F7F6F0',
        paper: '#FFFEFA',
        clay: '#E9E5DA',
        coral: '#FF7A45',
        sky: '#6FA8FF',
        wheat: '#F2C14E',
      },
      fontFamily: {
        display: ['"Instrument Serif"', 'Georgia', 'Songti SC', 'serif'],
        sans: [
          '"Inter"',
          '-apple-system',
          'BlinkMacSystemFont',
          '"PingFang SC"',
          '"Hiragino Sans GB"',
          '"Microsoft YaHei"',
          'sans-serif',
        ],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(11,31,25,.04), 0 12px 32px -12px rgba(11,31,25,.12)',
        lift: '0 24px 60px -24px rgba(11,31,25,.28)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        pulseRing: {
          '0%': { transform: 'scale(.9)', opacity: '.7' },
          '70%': { transform: 'scale(1.35)', opacity: '0' },
          '100%': { opacity: '0' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        fadeUp: 'fadeUp .7s cubic-bezier(.22,1,.36,1) both',
        fadeIn: 'fadeIn .6s ease both',
        float: 'float 6s ease-in-out infinite',
        pulseRing: 'pulseRing 2.4s cubic-bezier(.22,1,.36,1) infinite',
        shimmer: 'shimmer 2.2s linear infinite',
        marquee: 'marquee 28s linear infinite',
      },
    },
  },
  plugins: [],
}
