/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['"Inter"', 'sans-serif'],
            },
            colors: {
                // "Twisty" Theme Palette
                'theme-bg': '#E3E5E8', // Cool Grey Background
                'theme-surface': '#FFFFFF', // Pure White Surface
                primary: {
                    50: '#f0f9ff',
                    100: '#e0f2fe',
                    500: '#0ea5e9', // Sky 500
                    600: '#0284c7', // Sky 600
                    700: '#0369a1', // Sky 700
                    900: '#0c4a6e', // Sky 900
                }
            },
            borderRadius: {
                '4xl': '2rem',
                '5xl': '2.5rem',
            },
            boxShadow: {
                'soft': '0 10px 40px -10px rgba(0,0,0,0.08)',
                'inner-light': 'inset 0 2px 4px 0 rgba(255, 255, 255, 0.3)',
            }
        },
    },
    plugins: [],
}
