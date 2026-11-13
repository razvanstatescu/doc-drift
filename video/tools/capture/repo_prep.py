#!/usr/bin/env python3
"""Step 2 of the capture plan: make `main` hold scripts/rollback.sh and ROLLBACK_TIMEOUT again (one
direct commit: no pull request, so the relay sends nothing), rebuild the seed's scenario branch for
demo-01 from that main, and create the scratch branch for the pull request counter.

  python3 -I tools/capture/repo_prep.py restore-main | scenario-branch | counter-branch | check
"""
import difflib
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parents[2] / "demo" / "seed"))
import cap as s  # noqa: E402
import bb_seed as seed  # noqa: E402

SEED = HERE.parents[2] / "demo" / "seed" / "payments-api"
SCEN = SEED / "scenarios" / "01-rename-rollback-script"
COUNTER = "video/pr-counter"


def restore_main():
    head = s.bb_branch_head("main")
    base_rb = (SEED / "base" / "scripts" / "rollback.sh").read_bytes()
    base_vals = (SEED / "base" / "deploy" / "helm" / "values.yaml").read_bytes()
    live_vals = s.bb_file(head, "deploy/helm/values.yaml")
    # Only the one line differs; anything else would mean main moved since the check.
    diff = list(difflib.unified_diff(live_vals.decode().splitlines(), base_vals.decode().splitlines(), lineterm="", n=0))
    changed = [l for l in diff if l[:1] in "+-" and not l.startswith(("+++", "---"))]
    if changed != ['-  ROLLBACK_TIMEOUT_SECS: "300"', '+  ROLLBACK_TIMEOUT: "300"']:
        sys.exit(f"values.yaml on main differs from the expected one-line rename: {changed}")
    if s.bb_file(head, "scripts/rollback.sh") is not None:
        sys.exit("main already has scripts/rollback.sh; nothing to restore")
    msg = "Restore scripts/rollback.sh and ROLLBACK_TIMEOUT for the demo take"
    st = seed.commit("payments-api", {"scripts/rollback.sh": base_rb, "deploy/helm/values.yaml": base_vals}, msg, "main",
                     parents=head, delete=["scripts/rollback-v2.sh"])
    new = s.bb_branch_head("main")
    s.log(f"Bitbucket: direct commit on payments-api main {head[:12]} -> {new[:12]} ({st}): \"{msg}\" "
          "(writes scripts/rollback.sh and deploy/helm/values.yaml from the seed base, deletes scripts/rollback-v2.sh; no PR, so no relay event)")


def scenario_branch():
    if s.bb_branch_head("scenario/rename-rollback-script"):
        sys.exit("scenario/rename-rollback-script exists; inspect it first")
    done = seed.cmd_prepare("payments-api", ["01-rename-rollback-script"], False)
    s.log(f"Bitbucket: created branch scenario/rename-rollback-script from main with the seed's scenario 01 files "
          f"(bb_seed prepare: {done}) at {s.bb_branch_head('scenario/rename-rollback-script')[:12]}")


def counter_branch():
    if s.bb_branch_head(COUNTER):
        sys.exit(f"{COUNTER} exists already")
    text = ("Scratch branch for the launch video: pull requests from it are opened and declined to move the\n"
            "pull request counter. Never merged.\n").encode()
    main = s.bb_branch_head("main")
    st = seed.commit("payments-api", {"video/pr-counter.txt": text}, "Scratch: pull request counter for the launch video", COUNTER, parents=main)
    s.log(f"Bitbucket: created scratch branch {COUNTER} from main {main[:12]} with one commit adding video/pr-counter.txt "
          f"({st}) at {s.bb_branch_head(COUNTER)[:12]}")


def check():
    main = s.bb_branch_head("main")
    br = s.bb_branch_head("scenario/rename-rollback-script")
    out = {"main": main and main[:12], "scenario": br and br[:12], "counter": (s.bb_branch_head(COUNTER) or "")[:12],
           "mainHasRollbackSh": s.bb_file(main, "scripts/rollback.sh") is not None,
           "mainHasRollbackV2": s.bb_file(main, "scripts/rollback-v2.sh") is not None}
    if br:
        st, d, _ = s.bb("GET", s.bb_repo(f"/diffstat/{br}..{main}?pagelen=50"))
        out["diffstat"] = [{"status": v["status"], "old": (v.get("old") or {}).get("path"), "new": (v.get("new") or {}).get("path"),
                            "+": v.get("lines_added"), "-": v.get("lines_removed")} for v in (d or {}).get("values", [])]
        req = s._request("GET", s.BB_API + s.bb_repo(f"/diff/{br}..{main}"), s._basic("BITBUCKET_EMAIL", "BITBUCKET_API_TOKEN"))
        out["diff"] = req[1] if isinstance(req[1], str) else json.dumps(req[1])
    print(json.dumps(out, indent=1))


if __name__ == "__main__":
    {"restore-main": restore_main, "scenario-branch": scenario_branch, "counter-branch": counter_branch, "check": check}[sys.argv[1]]()
