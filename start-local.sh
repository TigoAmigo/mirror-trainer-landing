#!/bin/zsh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
START_PORT="${1:-4173}"
PORT="$START_PORT"
MAX_PORT="${2:-4193}"

cd "$ROOT_DIR"

port_in_use() {
  lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1
}

if port_in_use "$PORT"; then
  echo ""
  echo "Port ${PORT} is already in use."
  echo "Current listener:"
  lsof -nP -iTCP:"$PORT" -sTCP:LISTEN
  echo ""

  while port_in_use "$PORT" && [ "$PORT" -lt "$MAX_PORT" ]; do
    PORT=$((PORT + 1))
  done

  if port_in_use "$PORT"; then
    echo "Could not find a free port in range ${START_PORT}-${MAX_PORT}."
    echo "Stop the current process or run: bash \"$ROOT_DIR/start-local.sh\" 4200"
    exit 1
  fi

  echo "Using free port ${PORT} instead."
fi

echo ""
echo "Mirror Trainer local server started"
echo "Open:"
echo "  http://127.0.0.1:${PORT}/index.html"
echo "  http://127.0.0.1:${PORT}/admin.html"
echo ""
echo "Press Ctrl+C to stop"
echo ""

python3 -m http.server "$PORT"
