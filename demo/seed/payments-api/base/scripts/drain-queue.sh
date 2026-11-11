#!/usr/bin/env bash
# Drain the settlement queue: hold new settlement jobs, then wait until no job is pending.
# --resume releases held jobs back to pending.
# Usage: ./scripts/drain-queue.sh [--timeout <seconds>] | ./scripts/drain-queue.sh --resume
set -euo pipefail

NAMESPACE="${PAYMENTS_NAMESPACE:-payments}"
CLUSTER="${PAYMENTS_DB_CLUSTER:-payments-pg}"
TIMEOUT=900

pending() {
  kubectl -n "$NAMESPACE" exec "statefulset/${CLUSTER}" -- \
    psql -U payments_app -d payments -tAc "SELECT count(*) FROM settlement_jobs WHERE status = 'pending'"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --timeout) TIMEOUT="$2"; shift 2 ;;
    --resume)
      kubectl -n "$NAMESPACE" set env deployment/payments-api SETTLEMENT_ENQUEUE_PAUSED=false
      kubectl -n "$NAMESPACE" rollout status deployment/payments-api --timeout=300s
      kubectl -n "$NAMESPACE" exec "statefulset/${CLUSTER}" -- \
        psql -U payments_app -d payments -tAc "UPDATE settlement_jobs SET status = 'pending' WHERE status = 'held'"
      echo "settlement enqueue resumed, held jobs released"
      exit 0 ;;
    *) echo "unknown flag: $1" >&2; exit 2 ;;
  esac
done

kubectl -n "$NAMESPACE" set env deployment/payments-api SETTLEMENT_ENQUEUE_PAUSED=true
kubectl -n "$NAMESPACE" rollout status deployment/payments-api --timeout=300s

deadline=$(( $(date +%s) + TIMEOUT ))
while :; do
  left="$(pending | tr -d '[:space:]')"
  echo "pending settlement jobs: ${left}"
  [[ "$left" == "0" ]] && break
  if (( $(date +%s) > deadline )); then
    echo "queue not drained after ${TIMEOUT}s" >&2
    exit 1
  fi
  sleep 10
done
echo "settlement queue drained"
