#!/usr/bin/env bash
# Roll back payments-api to the previous Helm release.
# Usage: ./scripts/rollback.sh --timeout $ROLLBACK_TIMEOUT
set -euo pipefail

TIMEOUT="${ROLLBACK_TIMEOUT:-300}"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --timeout) TIMEOUT="$2"; shift 2 ;;
    *) echo "unknown flag: $1" >&2; exit 2 ;;
  esac
done

helm rollback payments 0 --wait --timeout "${TIMEOUT}s"
