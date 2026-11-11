#!/usr/bin/env bash
# Scale payment workers.
# Usage: ./scripts/scale-workers.sh --replicas <n> [--namespace <ns>]
# The replica count must stay inside workers.min and workers.max from deploy/helm/values.yaml.
set -euo pipefail

NAMESPACE="${PAYMENTS_NAMESPACE:-payments}"
REPLICAS=""
MIN=2
MAX=8

while [[ $# -gt 0 ]]; do
  case "$1" in
    --replicas) REPLICAS="$2"; shift 2 ;;
    --count) echo "--count was renamed to --replicas" >&2; exit 2 ;;
    --namespace) NAMESPACE="$2"; shift 2 ;;
    *) echo "unknown flag: $1" >&2; exit 2 ;;
  esac
done

if [[ -z "$REPLICAS" ]]; then
  echo "--replicas is required" >&2
  exit 2
fi
if (( REPLICAS < MIN || REPLICAS > MAX )); then
  echo "replicas must be between $MIN and $MAX (workers.min and workers.max in deploy/helm/values.yaml)" >&2
  exit 2
fi

kubectl -n "$NAMESPACE" scale deployment payments-workers --replicas="$REPLICAS"
kubectl -n "$NAMESPACE" rollout status deployment payments-workers --timeout=180s
