#!/usr/bin/env bash
# Fail over the payments Postgres cluster (Patroni) to a replica, then restart the
# payments pods so their pools reconnect to the new primary.
# Usage: ./scripts/failover-db.sh --candidate <member> [--force]
set -euo pipefail

NAMESPACE="${PAYMENTS_NAMESPACE:-payments}"
CLUSTER="${PAYMENTS_DB_CLUSTER:-payments-pg}"
CANDIDATE=""
FORCE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --candidate) CANDIDATE="$2"; shift 2 ;;
    --force) FORCE="--force"; shift ;;
    *) echo "unknown flag: $1" >&2; exit 2 ;;
  esac
done

if [[ -z "$CANDIDATE" ]]; then
  echo "--candidate is required (see: patronictl list)" >&2
  exit 2
fi

kubectl -n "$NAMESPACE" exec "statefulset/${CLUSTER}" -- patronictl list "$CLUSTER"
kubectl -n "$NAMESPACE" exec "statefulset/${CLUSTER}" -- \
  patronictl failover "$CLUSTER" --candidate "$CANDIDATE" ${FORCE}

kubectl -n "$NAMESPACE" rollout restart deployment/payments-api deployment/payments-workers
kubectl -n "$NAMESPACE" rollout status deployment/payments-api --timeout=300s
