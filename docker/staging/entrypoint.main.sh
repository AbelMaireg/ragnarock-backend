#!/bin/sh
set -e

echo "Running Prisma migrations..."
i=0
max=30
until ./node_modules/.bin/prisma migrate deploy --schema ./libs/prisma/src/schema.prisma; do
  i=$((i + 1))
  if [ "$i" -ge "$max" ]; then
    echo "Prisma migrate deploy failed after $max attempts. Check DATABASE_URL and postgres logs."
    exit 1
  fi
  echo "  Database not ready, retrying ($i/$max) in 3s..."
  sleep 3
done

echo "Starting main app..."
exec node dist/apps/main/main
