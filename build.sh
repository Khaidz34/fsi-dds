#!/bin/bash
set -e

echo "=== Force Clear Cache ==="
rm -rf node_modules backend/node_modules .cache

echo "=== Building Frontend ==="
npm install
npm run build

echo "=== Installing Backend Dependencies ==="
cd backend
# Force fresh install of all dependencies
rm -rf node_modules package-lock.json
npm install --production

echo "=== Copying Frontend Build to Backend Public ==="
rm -rf public
mkdir -p public
cp -r ../dist/* public/ || true

echo "=== Verifying Frontend Files ==="
if [ -f "public/index.html" ]; then
  echo "✓ index.html found"
  ls -lh public/index.html
else
  echo "✗ ERROR: index.html not found!"
  echo "Contents of public/:"
  ls -la public/
  echo "Contents of ../dist/:"
  ls -la ../dist/
  exit 1
fi

echo "=== Build Complete ==="
ls -la public/

