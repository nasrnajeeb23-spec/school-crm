// build.js - Build script with environment variable support
const { build } = require('esbuild');
const { execSync } = require('child_process');

// Get environment variables
const apiUrl = process.env.REACT_APP_API_URL || 'https://school-crm-backend.onrender.com/api';
const environment = process.env.REACT_APP_ENVIRONMENT || 'production';

console.log('Building with API URL:', apiUrl);
console.log('Environment:', environment);

// Build configuration
build({
  entryPoints: ['src/index.tsx'],
  bundle: true,
  format: 'esm',
  target: 'es2020',
  outdir: '../dist/assets',
  sourcemap: true,
  define: {
    'process.env.REACT_APP_API_URL': JSON.stringify(apiUrl),
    'process.env.REACT_APP_ENVIRONMENT': JSON.stringify(environment),
    'process.env.NODE_ENV': JSON.stringify(environment)
  },
  loader: {
    '.tsx': 'tsx',
    '.ts': 'ts',
    '.js': 'js',
    '.jsx': 'jsx'
  },
  external: [],
  minify: environment === 'production',
  treeShaking: true
}).then(() => {
  console.log('Build completed successfully!');
}).catch((error) => {
  console.error('Build failed:', error);
  process.exit(1);
});