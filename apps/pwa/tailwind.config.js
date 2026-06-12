/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        // Space Grotesk: dùng cho tiêu đề trang và số liệu lớn (font-display)
        display: ['"Space Grotesk"', '"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#0369A1',
          foreground: '#ffffff',
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0369A1',
          700: '#075985',
          800: '#0c4a6e',
          900: '#0a3a59',
        },
        navy: {
          50: '#f1f5f9',
          100: '#e2e8f0',
          200: '#cbd5e1',
          300: '#94a3b8',
          400: '#64748b',
          500: '#475569',
          600: '#334155',
          700: '#1e293b',
          800: '#0f172a',
          900: '#0F172A',
          950: '#020617',
        },
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          500: '#f59e0b',
          600: '#d97706',
        },
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          500: '#ef4444',
          600: '#dc2626',
        },
        destructive: { DEFAULT: '#dc2626', foreground: '#ffffff' },
        muted: { DEFAULT: '#f1f5f9', foreground: '#64748b' },
        gray: {
          50: '#F8FAFC',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        border: '#e2e8f0',
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,23,42,0.04), 0 4px 16px rgba(15,23,42,0.06)',
        'card-hover': '0 4px 8px rgba(15,23,42,0.06), 0 16px 32px rgba(15,23,42,0.10)',
        glow: '0 0 0 1px rgba(3,105,161,0.08), 0 8px 24px rgba(3,105,161,0.18)',
        // Bóng màu cho nút primary gradient (xanh đại dương)
        btn: '0 1px 2px rgba(2,6,23,0.10), 0 4px 14px rgba(14,165,233,0.30)',
        'btn-hover': '0 2px 4px rgba(2,6,23,0.10), 0 8px 20px rgba(14,165,233,0.40)',
        // Nâng cao hơn card: dùng cho FAB / phần tử nổi
        float: '0 8px 16px rgba(15,23,42,0.08), 0 24px 48px rgba(15,23,42,0.14)',
        // Bóng hắt lên trên: dùng cho bottom-sheet / thanh hành động dính đáy
        sheet: '0 -8px 32px rgba(15,23,42,0.14)',
        // Bóng màu theo trạng thái (JOIN / ABSENT-CANCELLED)
        'glow-success': '0 0 0 1px rgba(34,197,94,0.12), 0 8px 24px rgba(34,197,94,0.25)',
        'glow-danger': '0 0 0 1px rgba(239,68,68,0.12), 0 8px 24px rgba(239,68,68,0.25)',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        // Nền aurora trôi nhẹ (dùng kèm .bg-aurora)
        aurora: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        // Lơ lửng nhẹ cho minh hoạ / icon trạng thái rỗng
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        // Nhấp nháy mềm cho chấm "live" realtime
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
        // Vòng sóng lan toả quanh chấm live
        livePing: {
          '0%': { transform: 'scale(1)', opacity: '0.6' },
          '100%': { transform: 'scale(2.4)', opacity: '0' },
        },
        // Bật nảy khi đánh dấu thành công (JOIN)
        successPop: {
          '0%': { transform: 'scale(0.5)', opacity: '0' },
          '60%': { transform: 'scale(1.15)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        // Hiện lên từ dưới 16px — entrance chuẩn cho section/card
        rise: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
        shimmer: 'shimmer 1.5s infinite',
        aurora: 'aurora 16s ease-in-out infinite',
        float: 'float 5s ease-in-out infinite',
        'pulse-soft': 'pulseSoft 2.4s ease-in-out infinite',
        'live-ping': 'livePing 1.6s cubic-bezier(0, 0, 0.2, 1) infinite',
        'success-pop': 'successPop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        rise: 'rise 0.35s ease-out both',
      },
    },
  },
  plugins: [],
}
