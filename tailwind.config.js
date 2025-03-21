/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0, transform: 'translateY(5px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' }
        },
        slideInUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        fadeInDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        progress: {
          '0%': { width: '0%' },
          '100%': { width: '100%' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        progressGlow: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' }
        },
        borderGlow: {
          '0%': { opacity: 0.5 },
          '50%': { opacity: 1 },
          '100%': { opacity: 0.5 }
        },
        audioWave: {
          '0%, 100%': { height: '15px' },
          '50%': { height: '45px' },
        },
        progressPulse: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.5 },
        },
        pulsate: {
          '0%, 100%': { opacity: 1, transform: 'scale(1)' },
          '50%': { opacity: 0.5, transform: 'scale(0.95)' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0.8)', opacity: 0 },
          '80%': { transform: 'scale(1.03)', opacity: 0.8 },
          '100%': { transform: 'scale(1)', opacity: 1 }
        },
        particleFloat: {
          '0%': { transform: 'translateY(0) translateX(0)', opacity: 0 },
          '50%': { opacity: 0.5 },
          '100%': { transform: 'translateY(-20px) translateX(10px)', opacity: 0 }
        }
      },
      animation: {
        fadeIn: 'fadeIn 0.5s ease-out',
        slideInUp: 'slideInUp 0.6s ease-out',
        scaleIn: 'scaleIn 0.3s ease-out',
        float: 'float 3s ease-in-out infinite',
        fadeInDown: 'fadeInDown 0.3s ease-out',
        progress: 'progress 2s ease-out forwards',
        pulse: 'pulse 2s ease-in-out infinite',
        shimmer: 'shimmer 2s linear infinite',
        progressGlow: 'progressGlow 2s ease-in-out infinite',
        borderGlow: 'borderGlow 2s ease-in-out infinite',
        'progressPulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'progressShimmer': 'shimmer 2s linear infinite',
        'fadeIn': 'fadeIn 0.5s ease-in forwards',
        'audioWave': 'audioWave 1.2s ease-in-out infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'fadeIn': 'fadeIn 0.3s ease-out',
        'progressPulse': 'progressPulse 2s ease-in-out infinite',
        pulsate: 'pulsate 2s ease-in-out infinite',
        shimmer: 'shimmer 2s ease-in-out infinite',
        fadeIn: 'fadeIn 0.5s ease-out forwards',
        progressPulse: 'progressPulse 2s infinite',
        bounceIn: 'bounceIn 0.5s ease-out forwards',
        particleFloat: 'particleFloat 3s ease-in-out infinite'
      },
      screens: {
        'xs': '320px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
      },
    },
  },
  plugins: [],
} 