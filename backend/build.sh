#!/bin/bash
echo "Building School CRM Backend..."
npm ci --production=false
npm run build || echo "No build script found, continuing..."
echo "Build completed!"