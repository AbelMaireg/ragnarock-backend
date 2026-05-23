#!/bin/sh
set -e

# Only the main backend service runs migrations — admin skips to avoid a race.
# Prisma uses advisory locks so concurrent runs are safe, but this keeps logs clean.
if [ "$APP" != "admin" ]; then
  echo "Running database migrations..."
  i=0
  max=45
  until bunx prisma migrate deploy; do
    i=$((i + 1))
    if [ "$i" -ge "$max" ]; then
      echo "prisma migrate deploy failed after $max attempts — check DATABASE_URL and postgres logs."
      exit 1
    fi
    echo "  DB not ready ($i/$max), retrying in 2s..."
    sleep 2
  done
  echo "Migrations complete."
fi

if [ "$APP" = "admin" ]; then
  echo "Starting admin app on port ${ADMIN_PORT:-3001}..."
  exec node dist/apps/admin/main
else
  echo "Starting main app on port ${PORT:-3000}..."
  exec node dist/apps/main/main
fi
