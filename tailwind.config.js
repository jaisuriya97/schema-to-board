/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: {
          50: '#ffffff', // Excalidraw Light Canvas
          100: '#f1f3f5', // Excalidraw Light Panel
          200: '#e9ecef', // Light border
          300: '#dee2e6',
          400: '#ced4da',
          500: '#adb5bd',
          600: '#868e96',
          700: '#363640', // Excalidraw Dark Border
          800: '#232329', // Excalidraw Dark Panel/Element
          900: '#121212', // Excalidraw Dark Canvas
          950: '#0a0a0a',
        },
        accent: {
          50: '#eefcf5',
          100: '#d5f7e7',
          200: '#aef0d1',
          300: '#7be5b7',
          400: '#4bd399',
          500: '#6965db', // Exact Excalidraw Purple
          600: '#5551c9', 
          700: '#403ea4',
          800: '#312f81',
          900: '#28276b',
          950: '#15143e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        hand: ['Kalam', 'cursive'],
      },
    },
  },
  plugins: [],
}
