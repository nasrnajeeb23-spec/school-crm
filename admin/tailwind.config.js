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
    { pattern: /p-[0-9]+/ },
    { pattern: /px-[0-9]+/ },
    { pattern: /py-[0-9]+/ },
    { pattern: /m-[0-9]+/ },
    { pattern: /mx-[0-9]+/ },
    { pattern: /my-[0-9]+/ },
    { pattern: /gap-[0-9]+/ },
    { pattern: /grid-cols-[0-9]+/ },
    { pattern: /rounded-[a-z0-9]+/ },
    { pattern: /shadow-[a-z0-9]+/ },
    { pattern: /w-[\[\]a-z0-9%-]+/ },
    { pattern: /h-[\[\]a-z0-9%-]+/ },
    { pattern: /container/ },
  ],
  plugins: [
    require('tailwindcss-rtl'),
  ],
};
