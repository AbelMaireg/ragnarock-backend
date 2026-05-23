#!/bin/sh
set -e

echo "Starting admin app..."
exec node dist/apps/admin/main
