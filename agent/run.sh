#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")"

PORT="${APP_PORT:-8100}"
HOST="${APP_HOST:-0.0.0.0}"

if [ ! -x ".venv/bin/python" ]; then
  echo "Missing .venv. Create it with: python -m venv .venv && .venv/bin/python -m pip install -r requirements.txt" >&2
  exit 1
fi

.venv/bin/python -m uvicorn app.main:app --reload --host "$HOST" --port "$PORT"
