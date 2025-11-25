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
    'process.env.REACT_APP_HASH_ROUTER': JSON.stringify(process.env.REACT_APP_HASH_ROUTER || ''),
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
    console.log('Building Tailwind CSS...');
    const fs = require('fs');
    const path = require('path');
    
    // Ensure dist/assets directory exists
    const distDir = path.join(__dirname, 'dist/assets');
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
    }
    
    // Compile Tailwind CSS for production using local binary (Windows compatible)
    let useCdn = false;
    try {
      const tailwindBin = path.join(
        __dirname,
        'node_modules',
        '.bin',
        process.platform === 'win32' ? 'tailwindcss.cmd' : 'tailwindcss'
      );
      const envOpts = { ...process.env, NODE_OPTIONS: process.env.NODE_OPTIONS || '--max-old-space-size=1536' };
      execSync(`"${tailwindBin}" -c tailwind.config.js -i src/index.css -o dist/assets/index.css --minify`, { stdio: 'inherit', env: envOpts });
      console.log('Tailwind CSS built successfully.');
    } catch (err) {
      console.warn('Tailwind CLI build failed, trying npx fallback:', err?.message || err);
      try {
        const envOpts = { ...process.env, NODE_OPTIONS: process.env.NODE_OPTIONS || '--max-old-space-size=1536' };
        execSync(`npx tailwindcss -c tailwind.config.js -i src/index.css -o dist/assets/index.css --minify`, { stdio: 'inherit', env: envOpts });
        console.log('Tailwind CSS built successfully via npx.');
      } catch (err2) {
        console.warn('Tailwind build failed, falling back to production CSS copy:', err2?.message || err2);
        const rootCss = path.join(__dirname, '../index.css');
        const srcCss = path.join(__dirname, 'src/index.css');
        const destCss = path.join(distDir, 'index.css');
        if (fs.existsSync(rootCss)) {
          fs.copyFileSync(rootCss, destCss);
          console.log('Production CSS copied successfully.');
        } else if (fs.existsSync(srcCss)) {
          fs.copyFileSync(srcCss, destCss);
          console.log('Raw CSS copied successfully.');
        }
        useCdn = true;
      }
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

    // Generate index.html linking compiled CSS (no Tailwind CDN in production)
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
      '<link rel="icon" href="/favicon.svg" type="image/svg+xml">',
      useCdn ? '<script src="https://cdn.tailwindcss.com"></script>' : '',
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

    const notFoundPath = path.join(__dirname, 'dist/404.html');
    const notFoundContent = [
      '<!DOCTYPE html>',
      '<html lang="ar" dir="rtl">',
      '<head>',
      '<meta charset="UTF-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
      '<meta http-equiv="refresh" content="0; url=/">',
      '<title>إعادة التوجيه</title>',
      '</head>',
      '<body>',
      '<script>try{var p=location.pathname+location.search+location.hash; if(!location.hash){location.replace("/#"+p);}else{location.replace("/"+location.hash);} }catch(e){ location.replace("/"); }</script>',
      '</body>',
      '</html>'
    ].join('');
    fs.writeFileSync(notFoundPath, notFoundContent, 'utf8');
    console.log('404.html generated successfully.');

    // Mirror build output to repository root's dist for Render publish
    const rootDist = path.join(__dirname, '../dist');
    const adminAssets = path.join(__dirname, 'dist/assets');
    const rootAssets = path.join(rootDist, 'assets');
    const rootRedirects = path.join(rootDist, '_redirects');
    const rootIndexHtml = path.join(rootDist, 'index.html');

    if (!fs.existsSync(rootDist)) {
      fs.mkdirSync(rootDist, { recursive: true });
    }

    // Copy index.html to root dist
    fs.writeFileSync(rootIndexHtml, htmlContent, 'utf8');
    fs.writeFileSync(path.join(rootDist, '404.html'), notFoundContent, 'utf8');

    // Ensure root/assets exists
    if (!fs.existsSync(rootAssets)) {
      fs.mkdirSync(rootAssets, { recursive: true });
    }

    // Copy all assets from admin/dist/assets to root/dist/assets
    if (fs.existsSync(adminAssets)) {
      const copyRecursive = (src, dest) => {
        const entries = fs.readdirSync(src, { withFileTypes: true });
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        for (const entry of entries) {
          const s = path.join(src, entry.name);
          const d = path.join(dest, entry.name);
          if (entry.isDirectory()) copyRecursive(s, d);
          else fs.copyFileSync(s, d);
        }
      };
      copyRecursive(adminAssets, rootAssets);
      console.log('Root dist assets synchronized successfully.');
    } else {
      console.warn('Admin assets directory not found; skipping root assets sync.');
    }

    // Copy _redirects to root dist
    if (fs.existsSync(redirectsDest)) {
      fs.copyFileSync(redirectsDest, rootRedirects);
      console.log('Root _redirects copied successfully.');
    }

    const faviconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#4f46e5"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="34" fill="#fff">S</text></svg>';
    fs.writeFileSync(path.join(__dirname, 'dist/favicon.svg'), faviconSvg, 'utf8');
    fs.writeFileSync(path.join(rootDist, 'favicon.svg'), faviconSvg, 'utf8');

    // Generate static.json for Render SPA rewrites (Render format)
    const staticJson = {
      routes: [
        { type: 'rewrite', source: '/superadmin/**', destination: '/index.html' },
        { type: 'rewrite', source: '/login', destination: '/index.html' },
        { type: 'rewrite', source: '/teacher/**', destination: '/index.html' },
        { type: 'rewrite', source: '/school/**', destination: '/index.html' },
        { type: 'rewrite', source: '/parent/**', destination: '/index.html' },
        { type: 'rewrite', source: '/**', destination: '/index.html' }
      ],
      headers: [
        { path: '/*', name: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        { path: '/assets/*', name: 'Cache-Control', value: 'public, max-age=31536000, immutable' }
      ]
    };
    fs.writeFileSync(path.join(__dirname, 'dist/static.json'), JSON.stringify(staticJson, null, 2), 'utf8');
    fs.writeFileSync(path.join(rootDist, 'static.json'), JSON.stringify(staticJson, null, 2), 'utf8');
    console.log('static.json generated for SPA rewrites (Render format).');
  } catch (e) {
    console.error('CSS copy failed:', e.message);
  }
}).catch((error) => {
  console.error('Build failed:', error);
  process.exit(1);
});
