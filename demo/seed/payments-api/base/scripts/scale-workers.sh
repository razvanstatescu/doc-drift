#!/usr/bin/env bash
# Scale payment workers.
# Usage: ./scripts/scale-workers.sh --count <n> [--namespace <ns>]
# The count must stay inside workers.min and workers.max from deploy/helm/values.yaml.
set -euo pipefail

NAMESPACE="${PAYMENTS_NAMESPACE:-payments}"
COUNT=""
MIN=2
MAX=8

while [[ $# -gt 0 ]]; do
  case "$1" in
    --count) COUNT="$2"; shift 2 ;;
    --namespace) NAMESPACE="$2"; shift 2 ;;
    *) echo "unknown flag: $1" >&2; exit 2 ;;
  esac
done

if [[ -z "$COUNT" ]]; then
  echo "--count is required" >&2
  exit 2
fi
if (( COUNT < MIN || COUNT > MAX )); then
  echo "count must be between $MIN and $MAX (workers.min and workers.max in deploy/helm/values.yaml)" >&2
  exit 2
fi

kubectl -n "$NAMESPACE" scale deployment payments-workers --replicas="$COUNT"
kubectl -n "$NAMESPACE" rollout status deployment payments-workers --timeout=180s
