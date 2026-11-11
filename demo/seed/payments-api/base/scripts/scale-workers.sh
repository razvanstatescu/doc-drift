#!/usr/bin/env bash
# Scale payment workers. Usage: ./scripts/scale-workers.sh <count>
set -euo pipefail
kubectl scale deployment payments-workers --replicas="$1"
