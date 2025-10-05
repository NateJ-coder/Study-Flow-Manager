#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create dist directory
const distDir = path.join(__dirname, 'dist');
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true });
}
fs.mkdirSync(distDir, { recursive: true });

// Copy HTML files
const htmlFiles = ['index.html', 'calendar.html', 'settings.html'];
htmlFiles.forEach(file => {
  if (fs.existsSync(file)) {
    fs.copyFileSync(file, path.join(distDir, file));
    console.log(`Copied ${file}`);
  }
});

// Copy assets directory
if (fs.existsSync('assets')) {
  copyDirectory('assets', path.join(distDir, 'assets'));
  console.log('Copied assets directory');
}

// Copy any other necessary files
const otherFiles = ['README.md'];
otherFiles.forEach(file => {
  if (fs.existsSync(file)) {
    fs.copyFileSync(file, path.join(distDir, file));
    console.log(`Copied ${file}`);
  }
});

console.log('Build complete! Files copied to dist/');

function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}