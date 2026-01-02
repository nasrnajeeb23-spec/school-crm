// build.js - Build script with environment variable support
const esbuild = require('esbuild');
const { execSync } = require('child_process');

// Get environment variables
const apiUrl = process.env.REACT_APP_API_URL || '';
const args = process.argv.slice(2);
const hasServe = args.some(a => /^--serve(=|$)/.test(a));
const hasWatch = args.some(a => /^--watch(=|$)/.test(a));
const environment = process.env.REACT_APP_ENVIRONMENT || ((hasServe || hasWatch) ? 'development' : 'production');

console.log('Building with API URL:', apiUrl);
console.log('Environment:', environment);

const portArg = args.find(a => /^--serve=/.test(a));
const servePort = portArg ? Number(String(portArg).split('=')[1] || '3000') : 3000;

// Build configuration
const buildOptions = {
  entryPoints: ['src/index.tsx'],
  bundle: true,
  format: 'esm',
  target: 'es2020',
  outdir: 'dist/assets',
  sourcemap: environment !== 'production',
  define: {
    'process.env.REACT_APP_API_URL': JSON.stringify(apiUrl),
    'process.env.REACT_APP_ENVIRONMENT': JSON.stringify(environment),
    'process.env.REACT_APP_HASH_ROUTER': JSON.stringify(process.env.REACT_APP_HASH_ROUTER || 'false'),
    'process.env.NODE_ENV': JSON.stringify(environment),
    'import.meta.env.VITE_API_URL': JSON.stringify(apiUrl),
    'import.meta.env.VITE_ENVIRONMENT': JSON.stringify(environment),
    'import.meta.env.VITE_HASH_ROUTER': JSON.stringify(process.env.REACT_APP_HASH_ROUTER || 'false')
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
};

const runPostBuild = () => {
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
      const envOpts = { ...process.env, NODE_OPTIONS: '--max-old-space-size=4096' };
      const minifyFlag = environment === 'production' ? ' --minify' : '';
      execSync(`"${tailwindBin}" -c tailwind.config.js -i src/index.css -o dist/assets/index.css${minifyFlag}`, { stdio: 'inherit', env: envOpts });
      console.log('Tailwind CSS built successfully.');
    } catch (err) {
      console.warn('Tailwind CLI build failed, trying npx fallback:', err?.message || err);
      try {
        const envOpts = { ...process.env, NODE_OPTIONS: '--max-old-space-size=4096' };
        const minifyFlag = environment === 'production' ? ' --minify' : '';
        execSync(`npx tailwindcss -c tailwind.config.js -i src/index.css -o dist/assets/index.css${minifyFlag}`, { stdio: 'inherit', env: envOpts });
        console.log('Tailwind CSS built successfully via npx.');
      } catch (err2) {
        console.warn('Tailwind build failed. No CDN fallback will be used:', err2?.message || err2);
        const destCss = path.join(distDir, 'index.css');
        try { fs.writeFileSync(destCss, '/* Tailwind build failed. CSS not generated. */', 'utf8'); } catch {}
        useCdn = false;
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
      
      '<link rel="stylesheet" href="/assets/index.css">',
      '</head>',
      '<body class="bg-gray-100 dark:bg-gray-900">',
      '<div id="root"></div>',
      '',
      '<script type="module" src="/assets/index.js"></script>',
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
      '<script>try{location.replace("/");}catch(e){}</script>',
      '</body>',
      '</html>'
    ].join('');
    fs.writeFileSync(notFoundPath, notFoundContent, 'utf8');
    console.log('404.html generated successfully.');

    
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

    // Copy all assets from admin/dist/assets to root/dist/assets
    if (fs.existsSync(adminAssets)) {
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

    const parentWebDist = path.join(__dirname, '../mobile-parent/web-dist');
    const teacherWebDist = path.join(__dirname, '../mobile-teacher/web-dist');

    if (fs.existsSync(parentWebDist)) {
      const adminAppsParent = path.join(__dirname, 'dist/apps/parent');
      if (!fs.existsSync(adminAppsParent)) fs.mkdirSync(adminAppsParent, { recursive: true });
      const parentIndexSrc = path.join(parentWebDist, 'index.html');
      if (fs.existsSync(parentIndexSrc)) fs.copyFileSync(parentIndexSrc, path.join(adminAppsParent, 'index.html'));
      const expoSrc = path.join(parentWebDist, '_expo');
      const expoDestAdmin = path.join(__dirname, 'dist/_expo');
      if (fs.existsSync(expoSrc)) copyRecursive(expoSrc, expoDestAdmin);
      const parentAssetsSrc = path.join(parentWebDist, 'assets');
      if (fs.existsSync(parentAssetsSrc)) copyRecursive(parentAssetsSrc, rootAssets);
      const rootAppsParent = path.join(rootDist, 'apps/parent');
      if (!fs.existsSync(rootAppsParent)) fs.mkdirSync(rootAppsParent, { recursive: true });
      if (fs.existsSync(parentIndexSrc)) fs.copyFileSync(parentIndexSrc, path.join(rootAppsParent, 'index.html'));
      const expoDestRoot = path.join(rootDist, '_expo');
      if (fs.existsSync(expoSrc)) copyRecursive(expoSrc, expoDestRoot);
      console.log('Parent web app exported and copied.');
    } else {
      console.log('Parent web app export not found; skipping.');
    }

    if (fs.existsSync(teacherWebDist)) {
      const adminAppsTeacher = path.join(__dirname, 'dist/apps/teacher');
      if (!fs.existsSync(adminAppsTeacher)) fs.mkdirSync(adminAppsTeacher, { recursive: true });
      const teacherIndexSrc = path.join(teacherWebDist, 'index.html');
      if (fs.existsSync(teacherIndexSrc)) fs.copyFileSync(teacherIndexSrc, path.join(adminAppsTeacher, 'index.html'));
      const expoSrcT = path.join(teacherWebDist, '_expo');
      const expoDestAdminT = path.join(__dirname, 'dist/_expo');
      if (fs.existsSync(expoSrcT)) copyRecursive(expoSrcT, expoDestAdminT);
      const teacherAssetsSrc = path.join(teacherWebDist, 'assets');
      if (fs.existsSync(teacherAssetsSrc)) copyRecursive(teacherAssetsSrc, rootAssets);
      const rootAppsTeacher = path.join(rootDist, 'apps/teacher');
      if (!fs.existsSync(rootAppsTeacher)) fs.mkdirSync(rootAppsTeacher, { recursive: true });
      if (fs.existsSync(teacherIndexSrc)) fs.copyFileSync(teacherIndexSrc, path.join(rootAppsTeacher, 'index.html'));
      const expoDestRootT = path.join(rootDist, '_expo');
      if (fs.existsSync(expoSrcT)) copyRecursive(expoSrcT, expoDestRootT);
      console.log('Teacher web app exported and copied.');
    } else {
      console.log('Teacher web app export not found; skipping.');
    }

    // APK ingestion and SHA-256 fingerprint
    const crypto = require('crypto');
    const findFirstExisting = (candidates) => candidates.find(p => fs.existsSync(p));
    const parentReleaseApk = findFirstExisting([
      path.join(__dirname, '../mobile-parent/android/app/build/outputs/apk/release/app-release.apk'),
      path.join(__dirname, '../mobile-parent/apk-output/app-release.apk'),
      path.join(__dirname, '../mobile-parent/builds/app-release.apk'),
      path.join(__dirname, '../mobile-parent/dist/app-release.apk'),
      path.join(__dirname, '../mobile-parent/app-release.apk')
    ]);
    const parentDebugApk = findFirstExisting([
      path.join(__dirname, '../mobile-parent/android/app/build/outputs/apk/debug/app-debug.apk'),
      path.join(__dirname, '../mobile-parent/apk-output/app-debug.apk'),
      path.join(__dirname, '../mobile-parent/builds/app-debug.apk'),
      path.join(__dirname, '../mobile-parent/dist/app-debug.apk'),
      path.join(__dirname, '../mobile-parent/app-debug.apk')
    ]);
    const parentApkSrc = parentReleaseApk || parentDebugApk;
    const parentApkLabel = parentReleaseApk ? 'release' : (parentDebugApk ? 'debug' : '');

    const teacherReleaseApk = findFirstExisting([
      path.join(__dirname, '../mobile-teacher/android/app/build/outputs/apk/release/app-release.apk'),
      path.join(__dirname, '../mobile-teacher/apk-output/app-release.apk'),
      path.join(__dirname, '../mobile-teacher/builds/app-release.apk'),
      path.join(__dirname, '../mobile-teacher/dist/app-release.apk'),
      path.join(__dirname, '../mobile-teacher/app-release.apk')
    ]);
    const teacherDebugApk = findFirstExisting([
      path.join(__dirname, '../mobile-teacher/android/app/build/outputs/apk/debug/app-debug.apk'),
      path.join(__dirname, '../mobile-teacher/apk-output/app-debug.apk'),
      path.join(__dirname, '../mobile-teacher/builds/app-debug.apk'),
      path.join(__dirname, '../mobile-teacher/dist/app-debug.apk'),
      path.join(__dirname, '../mobile-teacher/app-debug.apk')
    ]);
    const teacherApkSrc = teacherReleaseApk || teacherDebugApk;
    const teacherApkLabel = teacherReleaseApk ? 'release' : (teacherDebugApk ? 'debug' : '');

    const adminAppsParentDir = path.join(__dirname, 'dist/apps/parent');
    const adminAppsTeacherDir = path.join(__dirname, 'dist/apps/teacher');
    const rootAppsParentDir = path.join(rootDist, 'apps/parent');
    const rootAppsTeacherDir = path.join(rootDist, 'apps/teacher');
    if (!fs.existsSync(adminAppsParentDir)) fs.mkdirSync(adminAppsParentDir, { recursive: true });
    if (!fs.existsSync(adminAppsTeacherDir)) fs.mkdirSync(adminAppsTeacherDir, { recursive: true });
    if (!fs.existsSync(rootAppsParentDir)) fs.mkdirSync(rootAppsParentDir, { recursive: true });
    if (!fs.existsSync(rootAppsTeacherDir)) fs.mkdirSync(rootAppsTeacherDir, { recursive: true });

    const appsMeta = { parent: { apkUrl: '', sha256: '', label: '' }, teacher: { apkUrl: '', sha256: '', label: '' } };

    const computeSha256 = (filePath) => {
      const hash = crypto.createHash('sha256');
      const data = fs.readFileSync(filePath);
      hash.update(data);
      return hash.digest('hex');
    };

    if (parentApkSrc) {
      const adminApkDest = path.join(adminAppsParentDir, 'app.apk');
      const rootApkDest = path.join(rootAppsParentDir, 'app.apk');
      fs.copyFileSync(parentApkSrc, adminApkDest);
      fs.copyFileSync(parentApkSrc, rootApkDest);
      const sha = computeSha256(parentApkSrc);
      appsMeta.parent.apkUrl = '/apps/parent/app.apk';
      appsMeta.parent.sha256 = sha;
      appsMeta.parent.label = parentApkLabel;
      console.log('Parent APK copied with SHA-256:', sha);
    } else {
      console.log('Parent APK not found; skipping copy.');
    }

    if (teacherApkSrc) {
      const adminApkDest = path.join(adminAppsTeacherDir, 'app.apk');
      const rootApkDest = path.join(rootAppsTeacherDir, 'app.apk');
      fs.copyFileSync(teacherApkSrc, adminApkDest);
      fs.copyFileSync(teacherApkSrc, rootApkDest);
      const sha = computeSha256(teacherApkSrc);
      appsMeta.teacher.apkUrl = '/apps/teacher/app.apk';
      appsMeta.teacher.sha256 = sha;
      appsMeta.teacher.label = teacherApkLabel;
      console.log('Teacher APK copied with SHA-256:', sha);
    } else {
      console.log('Teacher APK not found; skipping copy.');
    }

    // Write apps metadata to assets for frontend consumption
    const adminAssetsDir = path.join(__dirname, 'dist/assets');
    const rootAssetsDir = path.join(rootDist, 'assets');
    if (!fs.existsSync(adminAssetsDir)) fs.mkdirSync(adminAssetsDir, { recursive: true });
    if (!fs.existsSync(rootAssetsDir)) fs.mkdirSync(rootAssetsDir, { recursive: true });
    const appsJson = JSON.stringify(appsMeta, null, 2);
    fs.writeFileSync(path.join(adminAssetsDir, 'apps.json'), appsJson, 'utf8');
    fs.writeFileSync(path.join(rootAssetsDir, 'apps.json'), appsJson, 'utf8');
    console.log('apps.json written to assets.');

    // Generate static.json for Render SPA rewrites (Render format)
    const staticJson = {
      routes: [
        // Allow PWAs for apps to serve their own index without SPA rewrite
        { type: 'rewrite', source: '/apps/parent/**', destination: '/apps/parent/index.html' },
        { type: 'rewrite', source: '/apps/teacher/**', destination: '/apps/teacher/index.html' },
        { type: 'rewrite', source: '/superadmin/**', destination: '/index.html' },
        { type: 'rewrite', source: '/login', destination: '/index.html' },
        { type: 'rewrite', source: '/teacher/**', destination: '/index.html' },
        { type: 'rewrite', source: '/school/**', destination: '/index.html' },
        { type: 'rewrite', source: '/parent/**', destination: '/index.html' },
        { type: 'rewrite', source: '/*', destination: '/index.html' }
      ],
      headers: [
        { path: '/*', name: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        { path: '/assets/*', name: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        { path: '/apps/*', name: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }
      ]
    };
    fs.writeFileSync(path.join(__dirname, 'dist/static.json'), JSON.stringify(staticJson, null, 2), 'utf8');
    fs.writeFileSync(path.join(rootDist, 'static.json'), JSON.stringify(staticJson, null, 2), 'utf8');
    console.log('static.json generated for SPA rewrites (Render format).');
  } catch (e) {
    console.error('CSS copy failed:', e.message);
  }
};

(async () => {
  if (hasServe || hasWatch) {
    try {
      const ctx = await esbuild.context(buildOptions);
      if (hasWatch) await ctx.watch();
      runPostBuild();
      if (hasServe) {
        const srv = await ctx.serve({ port: servePort, servedir: 'dist' });
        const host = srv.host || 'localhost';
        const port = srv.port || servePort;
        console.log(`Dev server running at http://${host}:${port}/`);
      }
    } catch (error) {
      try {
        console.error('Build failed:', error && error.message ? error.message : error);
        if (error && error.errors) console.error('Errors:', JSON.stringify(error.errors, null, 2));
        if (error && error.warnings) console.warn('Warnings:', JSON.stringify(error.warnings, null, 2));
      } catch (e) {
        console.error('Build failed (logging error):', e.message || e);
      }
      process.exit(1);
    }
  } else {
    esbuild.build(buildOptions).then(runPostBuild).catch((error) => {
      try {
        console.error('Build failed:', error && error.message ? error.message : error);
        if (error && error.errors) console.error('Errors:', JSON.stringify(error.errors, null, 2));
        if (error && error.warnings) console.warn('Warnings:', JSON.stringify(error.warnings, null, 2));
      } catch (e) {
        console.error('Build failed (logging error):', e.message || e);
      }
      process.exit(1);
    });
  }
})();
