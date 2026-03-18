#!/bin/bash
set -e

echo "=== Building Frontend ==="
npm install
npm run build

echo "=== Installing Backend Dependencies ==="
cd backend
npm install --production

echo "=== Copying Frontend Build to Backend Public ==="
mkdir -p public
cp -r ../dist/* public/

echo "=== Build Complete ==="
ls -la public/
