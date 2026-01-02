/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {},
  },
  safelist: [
    { pattern: /bg-(gray|indigo|red|yellow|blue|teal|green|emerald|purple|violet|slate|neutral|orange|rose|pink|lime|cyan|fuchsia|sky|amber)-(50|100|200|300|400|500|600|700|800|900)/, variants: ['hover','focus','active'] },
    { pattern: /text-(gray|indigo|red|yellow|blue|teal|green|emerald|purple|violet|slate|neutral|orange|rose|pink|lime|cyan|fuchsia|sky|amber)-(50|100|200|300|400|500|600|700|800|900)/, variants: ['hover','focus','active'] },
    { pattern: /border-(gray|indigo|red|yellow|blue|teal|green|emerald|purple|violet|slate|neutral|orange|rose|pink|lime|cyan|fuchsia|sky|amber)-(50|100|200|300|400|500|600|700|800|900)/, variants: ['hover','focus','active'] },
    { pattern: /container/ },
  ],
  plugins: [
    require('tailwindcss-rtl'),
  ],
};
