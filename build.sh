#!/bin/bash
set -e

echo "=== Building Frontend ==="
npm install
npm run build

echo "=== Installing Backend Dependencies ==="
cd backend
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
