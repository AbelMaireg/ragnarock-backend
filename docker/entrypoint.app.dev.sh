#!/bin/sh
set -e

echo "Installing dependencies..."
bun install

echo "Generating Prisma client..."
bun run prisma:generate

echo "Running Prisma migrations..."
bunx prisma migrate deploy

echo "Starting main app (PORT from env, default 8000)..."
bun run start:dev &

echo "Starting admin app on port 3001..."
bun run start:admin:dev &

wait
