// Demo mode: the seeded change record for scenario 01, replayed through the normal ingest path.
// Built from demo/seed/payments-api (base -> scenarios/01-rename-rollback-script) with `git diff -M`:
// scripts/rollback.sh renamed to scripts/rollback-v2.sh, ROLLBACK_TIMEOUT renamed to ROLLBACK_TIMEOUT_SECS.
// It is the same record as fixtures/scenarios/01-rename-rollback-script.json. PR #482 is the demo PR number.
// The repo UUID is a placeholder: bindings match on the slug or workspace/slug too.
import type { BitbucketChangeRecord } from '@dds/shared';

export const DEMO_PR_ID = 482;

export const DEMO_CHANGE_RECORD: BitbucketChangeRecord = {
  "source": "bitbucket",
  "workspace": "nano-soft-dev",
  "repoSlug": "payments-api",
  "repoUuid": "{6f1d1c3e-0b8a-4e57-9f0a-2d5b1c7e4820}",
  "prId": 482,
  "title": "Rename rollback script and timeout variable",
  "author": "Sam Rivera",
  "mergeCommit": "8694b6072ff19fcb5824ab673eb846e7015ac85d",
  "sourceBranch": "scenario/rename-rollback-script",
  "destinationBranch": "main",
  "defaultBranch": "main",
  "files": [
    {
      "status": "modified",
      "path": "deploy/helm/values.yaml",
      "linesAdded": 1,
      "linesRemoved": 1
    },
    {
      "status": "renamed",
      "path": "scripts/rollback-v2.sh",
      "oldPath": "scripts/rollback.sh",
      "linesAdded": 3,
      "linesRemoved": 3
    }
  ],
  "hunks": "diff --git a/deploy/helm/values.yaml b/deploy/helm/values.yaml\nindex 476d054..af404da 100644\n--- a/deploy/helm/values.yaml\n+++ b/deploy/helm/values.yaml\n@@ -9,5 +9,5 @@ workers:\n   max: 8\n \n env:\n-  ROLLBACK_TIMEOUT: \"300\"\n+  ROLLBACK_TIMEOUT_SECS: \"300\"\n   PAYMENTS_DB_POOL: \"20\"\ndiff --git a/scripts/rollback.sh b/scripts/rollback-v2.sh\nsimilarity index 56%\nrename from scripts/rollback.sh\nrename to scripts/rollback-v2.sh\nindex a41f113..212a59e 100644\n--- a/scripts/rollback.sh\n+++ b/scripts/rollback-v2.sh\n@@ -1,9 +1,9 @@\n #!/usr/bin/env bash\n # Roll back payments-api to the previous Helm release.\n-# Usage: ./scripts/rollback.sh --timeout $ROLLBACK_TIMEOUT\n+# Usage: ./scripts/rollback-v2.sh --timeout $ROLLBACK_TIMEOUT_SECS\n set -euo pipefail\n \n-TIMEOUT=\"${ROLLBACK_TIMEOUT:-300}\"\n+TIMEOUT=\"${ROLLBACK_TIMEOUT_SECS:-300}\"\n while [[ $# -gt 0 ]]; do\n   case \"$1\" in\n     --timeout) TIMEOUT=\"$2\"; shift 2 ;;\n@@ -11,4 +11,4 @@ while [[ $# -gt 0 ]]; do\n   esac\n done\n \n-helm rollback payments 0 --wait --timeout \"${TIMEOUT}s\"\n+helm rollback payments 0 --wait --timeout \"${TIMEOUT}s\" --cleanup-on-fail\n"
};
