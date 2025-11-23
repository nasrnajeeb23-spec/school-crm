// build.js - Build script with environment variable support
const { build } = require('esbuild');
const { execSync } = require('child_process');

// Get environment variables
const apiUrl = process.env.REACT_APP_API_URL || 'https://school-crschool-crm-backendm.onrender.com/api';
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
  try {
    console.log('Running Tailwind CSS build...');
    execSync('npx tailwindcss -i ./src/index.css -o ../dist/assets/index.css --minify -c tailwind.config.js', { stdio: 'inherit', cwd: __dirname });
    console.log('Tailwind CSS build completed.');
  } catch (e) {
    console.error('Tailwind build failed:', e.message);
  }
}).catch((error) => {
  console.error('Build failed:', error);
  process.exit(1);
});
