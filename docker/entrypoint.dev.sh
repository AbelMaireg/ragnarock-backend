#!/bin/sh
set -e

echo "Installing dependencies..."
bun install

echo "Generating Prisma client..."
bun run prisma:generate

echo "Running Prisma migrations..."
bunx prisma migrate deploy

echo "Starting application..."
exec "$@"
