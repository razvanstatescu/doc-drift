#!/usr/bin/env bash
# Replay PSP webhook events from webhook_dead_letters through the internal replay endpoint.
# Usage: ./scripts/replay-webhooks.sh [--since <ISO-8601>] [--limit <n>] [--dry-run]
set -euo pipefail

NAMESPACE="${PAYMENTS_NAMESPACE:-payments}"
CLUSTER="${PAYMENTS_DB_CLUSTER:-payments-pg}"
SINCE="1970-01-01T00:00:00Z"
LIMIT=500
DRY_RUN=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --since) SINCE="$2"; shift 2 ;;
    --limit) LIMIT="$2"; shift 2 ;;
    --dry-run) DRY_RUN=1; shift ;;
    *) echo "unknown flag: $1" >&2; exit 2 ;;
  esac
done

ids=$(kubectl -n "$NAMESPACE" exec "statefulset/${CLUSTER}" -- \
  psql -U payments_app -d payments -tAc \
  "SELECT event_id FROM webhook_dead_letters WHERE created_at >= '${SINCE}' ORDER BY created_at LIMIT ${LIMIT}")

count=0
for id in $ids; do
  count=$((count + 1))
  if (( DRY_RUN )); then echo "would replay ${id}"; continue; fi
  kubectl -n "$NAMESPACE" exec deployment/payments-api -- \
    curl -fsS -X POST "http://localhost:8080/internal/webhooks/replay/${id}"
  echo
done
echo "events: ${count}"
