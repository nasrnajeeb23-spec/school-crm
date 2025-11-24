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
  outdir: 'dist/assets',
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
    console.log('Copying CSS file...');
    const fs = require('fs');
    const path = require('path');
    
    // Ensure dist/assets directory exists
    const distDir = path.join(__dirname, 'dist/assets');
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
    }
    
    // Copy the CSS file
    const srcCss = path.join(__dirname, 'src/index.css');
    const destCss = path.join(distDir, 'index.css');
    
    if (fs.existsSync(srcCss)) {
      fs.copyFileSync(srcCss, destCss);
      console.log('CSS file copied successfully.');
    } else {
      console.log('No CSS file found to copy.');
    }
    
    // Copy the main CSS file from root if it exists
    const rootCss = path.join(__dirname, '../index.css');
    const rootDestCss = path.join(distDir, 'index.css');
    
    if (fs.existsSync(rootCss)) {
      fs.copyFileSync(rootCss, rootDestCss);
      console.log('Root CSS file copied successfully.');
    }
    
    // Copy the _redirects file for SPA routing
    const redirectsSrc = path.join(__dirname, 'public/_redirects');
    const redirectsDest = path.join(__dirname, 'dist/_redirects');
    
    if (fs.existsSync(redirectsSrc)) {
      fs.copyFileSync(redirectsSrc, redirectsDest);
      console.log('_redirects file copied successfully.');
    } else {
      console.log('No _redirects file found to copy.');
    }

    // Generate index.html with Tailwind CDN for styling
    const htmlPath = path.join(__dirname, 'dist/index.html');
    const htmlContent = [
      '<!DOCTYPE html>',
      '<html lang="ar" dir="rtl">',
      '<head>',
      '<meta charset="UTF-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
      '<title>SchoolSaaS - نظام إدارة المدارس</title>',
      '<link rel="preconnect" href="https://fonts.googleapis.com">',
      '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
      '<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">',
      '<script src="https://cdn.tailwindcss.com"></script>',
      '</head>',
      '<body class="bg-gray-100 dark:bg-gray-900">',
      '<div id="root"></div>',
      '<script type="module" src="/assets/index.js"></script>',
      '<link rel="stylesheet" href="/assets/index.css">',
      '</body>',
      '</html>'
    ].join('');
    fs.writeFileSync(htmlPath, htmlContent, 'utf8');
    console.log('index.html generated successfully.');
  } catch (e) {
    console.error('CSS copy failed:', e.message);
  }
}).catch((error) => {
  console.error('Build failed:', error);
  process.exit(1);
});
