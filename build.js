// build.js - Vite build script for root directory
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Set environment variables
process.env.VITE_API_URL = process.env.VITE_API_URL || 'https://school-crschool-crm-backendm.onrender.com/api';
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

console.log('Building with Vite...');
console.log('API URL:', process.env.VITE_API_URL);
console.log('Environment:', process.env.NODE_ENV);

try {
  // Run Vite build
  execSync('npx vite build', { stdio: 'inherit' });
  
  // Copy CSS file to the correct location if needed
  const srcCssPath = path.join(__dirname, 'index.css');
  const distCssPath = path.join(__dirname, 'dist', 'assets', 'index.css');
  
  if (fs.existsSync(srcCssPath)) {
    console.log('Copying custom CSS to dist...');
    const distAssetsDir = path.dirname(distCssPath);
    if (!fs.existsSync(distAssetsDir)) {
      fs.mkdirSync(distAssetsDir, { recursive: true });
    }
    fs.copyFileSync(srcCssPath, distCssPath);
    console.log('CSS copied successfully.');
  }
  
  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}