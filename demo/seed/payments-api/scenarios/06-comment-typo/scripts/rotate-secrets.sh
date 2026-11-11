#!/usr/bin/env bash
# Rotate one payments secret in Vault and restart the pods that read it.
# Usage: ./scripts/rotate-secrets.sh --secret <psp-api-key|webhook-signing-secret|db-password> --value-file <path>
# Pods receive the new value on restart; this script restarts them for you.
set -euo pipefail

NAMESPACE="${PAYMENTS_NAMESPACE:-payments}"
VAULT_PATH="${PAYMENTS_VAULT_PATH:-secret/payments}"
SECRET=""
VALUE_FILE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --secret) SECRET="$2"; shift 2 ;;
    --value-file) VALUE_FILE="$2"; shift 2 ;;
    *) echo "unknown flag: $1" >&2; exit 2 ;;
  esac
done

case "$SECRET" in
  psp-api-key) FIELD="PSP_API_KEY" ;;
  webhook-signing-secret) FIELD="WEBHOOK_SIGNING_SECRET" ;;
  db-password) FIELD="PAYMENTS_DB_PASSWORD" ;;
  *) echo "--secret must be psp-api-key, webhook-signing-secret or db-password" >&2; exit 2 ;;
esac

[[ -r "$VALUE_FILE" ]] || { echo "--value-file is required and must be readable" >&2; exit 2; }

vault kv patch "$VAULT_PATH" "${FIELD}=@${VALUE_FILE}"
kubectl -n "$NAMESPACE" annotate externalsecret payments-secrets force-sync="$(date +%s)" --overwrite
kubectl -n "$NAMESPACE" rollout restart deployment/payments-api deployment/payments-workers
kubectl -n "$NAMESPACE" rollout status deployment/payments-api --timeout=300s
