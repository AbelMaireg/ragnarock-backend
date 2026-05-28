#!/bin/sh
set -e

echo "Starting MCP server..."
exec node dist/apps/mcp/main
