// Package.json dependencies to install
{
  "dependencies": {
    "@sentry/react": "^7.91.0",
    "@sentry/tracing": "^7.91.0",
    "redis": "^4.6.11",
    "express-rate-limit": "^7.1.5",
    "rate-limit-redis": "^4.2.0",
    "helmet": "^7.1.0",
    "csurf": "^1.11.0",
    "express-validator": "^7.0.1",
    "web-vitals": "^3.5.0",
    "react-joyride": "^2.7.2",
    "chart.js": "^4.4.1",
    "react-chartjs-2": "^5.2.0"
  },
  "devDependencies": {
    "@types/react-joyride": "^2.0.5"
  }
}

// Installation commands:
// Frontend (admin directory):
npm install @sentry/react @sentry/tracing web-vitals react-joyride chart.js react-chartjs-2
npm install -D @types/react-joyride

// Backend (backend directory):
npm install redis express-rate-limit rate-limit-redis helmet csurf express-validator
