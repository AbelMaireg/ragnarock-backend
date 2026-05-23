#!/bin/sh
set -e

echo "Installing dependencies..."
bun install

echo "Generating Prisma client..."
bun run prisma:generate

echo "Running Prisma migrations..."
# Even with depends_on + healthcheck, Prisma can occasionally connect before Postgres
# accepts TCP from this container on first boot. Retry a few times.
i=0
max=45
until bunx prisma migrate deploy; do
  i=$((i + 1))
  if [ "$i" -ge "$max" ]; then
    echo "Prisma migrate deploy failed after $max attempts. Check DATABASE_URL (use host 'postgres' inside Compose) and postgres logs."
    exit 1
  fi
  echo "  Database not ready yet, retrying ($i/$max) in 2s..."
  sleep 2
done

echo "Starting main app (PORT from env, default 8000)..."
bun run start:dev &

echo "Starting admin app on port 3001..."
bun run start:admin:dev &

wait
