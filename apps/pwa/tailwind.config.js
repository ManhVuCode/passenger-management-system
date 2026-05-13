/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#2563eb',
          foreground: '#ffffff',
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          600: '#2563eb',
        },
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          600: '#16a34a',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          500: '#f59e0b',
        },
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          600: '#dc2626',
        },
        destructive: { DEFAULT: '#dc2626', foreground: '#ffffff' },
        muted: { DEFAULT: '#f1f5f9', foreground: '#64748b' },
        gray: {
          50: '#faf9f7',
          100: '#f5f3f0',
          200: '#e7e5e0',
          300: '#d6d3d1',
          400: '#a8a29e',
          500: '#78716c',
          600: '#57534e',
          700: '#44403c',
          800: '#292524',
          900: '#1c1917',
          950: '#0c0a09',
        },
        border: '#e2e8f0',
      },
      boxShadow: {
        card: '0 4px 16px rgba(0,0,0,0.08)',
      },
    },
  },
  plugins: [],
}
