#!/bin/bash
# Drive the spike web trigger. Usage: scripts/call.sh '{"action":"inspect","pageId":"2752521"}'
# Needs .spike-url and .spike-token (gitignored). Results land in `forge logs -e development` (1-2 min lag).
cd "$(dirname "$0")/.."
curl -s -w ' HTTP %{http_code}\n' -X POST "$(cat .spike-url)" -H "x-spike-token: $(cat .spike-token)" \
  -H 'Content-Type: application/json' -d "$1"
