/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Onest', 'sans-serif'],
            },
            colors: {
                primary: {
                    DEFAULT: '#8B52FF',
                    50: '#f4f0ff',
                    100: '#e9e1ff',
                    200: '#d3c2ff',
                    300: '#bfa3ff',
                    400: '#a885ff',
                    500: '#8B52FF',
                    600: '#7a42eb',
                    700: '#6432d1',
                    800: '#5024b0',
                    900: '#3e1b8a',
                },
                secondary: {
                    DEFAULT: '#EEE5FF',
                    foreground: '#8B52FF',
                },
                dark: {
                    50: '#f8fafc',
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
                }
            },
            animation: {
                'fade-in': 'fadeIn 0.5s ease-out',
                'slide-up': 'slideUp 0.3s ease-out',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
            },
        },
    },
    plugins: [],
}
