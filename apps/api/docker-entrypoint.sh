#!/bin/sh
set -e

# Install dependencies if node_modules is empty or doesn't exist
if [ ! -d "node_modules" ] || [ -z "$(ls -A node_modules 2>/dev/null)" ]; then
  echo "Installing dependencies..."
  npm install
  echo "Generating Prisma client..."
  npx prisma generate
fi

# Run the command passed to docker
exec "$@"
