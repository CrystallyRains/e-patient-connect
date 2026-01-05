#!/usr/bin/env node

/**
 * Build script for Vercel deployment
 * This script runs during the build process to set up the database
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting E-Patient Connect build process...');

try {
  // Ensure database directory exists
  const dbDir = path.join(__dirname, '..', 'database');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log('✅ Created database directory');
  }

  // Ensure uploads directory exists
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('✅ Created uploads directory');
  }

  // Initialize database
  console.log('🗄️ Initializing database...');
  execSync('npm run db:init', { stdio: 'inherit' });
  console.log('✅ Database initialized');

  // Seed database with demo data
  console.log('🌱 Seeding database...');
  execSync('npm run db:seed', { stdio: 'inherit' });
  console.log('✅ Database seeded with demo data');

  // Run Next.js build
  console.log('🏗️ Building Next.js application...');
  execSync('next build', { stdio: 'inherit' });
  console.log('✅ Next.js build completed');

  console.log('🎉 Build process completed successfully!');
} catch (error) {
  console.error('❌ Build process failed:', error.message);
  process.exit(1);
}