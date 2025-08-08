/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        business: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#1e40af',
          600: '#1e3a8a',
          700: '#1e3a8a',
          800: '#1e3a8a',
          900: '#1e3a8a',
        },
        success: '#059669',
        danger: '#dc2626',
        warning: '#d97706',
      },
      animation: {
        'pulse-red': 'pulse-red 1.5s infinite',
        'bounce-in': 'bounce-in 0.3s ease-out',
        'wave': 'wave 1.5s infinite ease-in-out',
      },
      keyframes: {
        'pulse-red': {
          '0%, 100%': { 
            transform: 'scale(1)', 
            boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.7)' 
          },
          '50%': { 
            transform: 'scale(1.05)', 
            boxShadow: '0 0 0 20px rgba(239, 68, 68, 0)' 
          },
        },
        'bounce-in': {
          '0%': { 
            transform: 'translateX(-50%) translateY(-10px) scale(0.8)', 
            opacity: '0' 
          },
          '100%': { 
            transform: 'translateX(-50%) translateY(0) scale(1)', 
            opacity: '1' 
          },
        },
        'wave': {
          '0%, 60%, 100%': { transform: 'scale(1)' },
          '30%': { transform: 'scale(1.5)' },
        },
      },
    },
  },
  plugins: [],
}