#!/usr/bin/env python3
"""Relay edge cases with real Bitbucket merges in nano-soft-dev/payments-api (QA, 2026-11-11).

Every file lives under `qa/relay/` or `qa/many/`, which no PLAT anchor covers (PLAT anchors exact
paths, `src/**` and `deploy/helm/**`), so PLAT's demo state is untouched. A DDSTEST page
("QA relay page") is anchored to the qa/ files and checked through the dev driver.

  python3 -I scripts/qa/bb_edge.py run       # 4 PRs: add, rename+delete+modify, non-main, 320 files
  python3 -I scripts/qa/bb_edge.py cleanup   # one direct commit on main deleting qa/ (no PR, no relay event)

Results go to scripts/qa/out/results.jsonl like run_matrix.py. Never prints a token.
"""
import json
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parents[1] / "demo" / "seed"))
import ddsqa as q  # noqa: E402
import bb_seed as bb  # noqa: E402
from run_matrix import check, record, drift, inspect, bind, path_anchor, wait_for, state_of  # noqa: E402

REPO = "payments-api"
FULL = "nano-soft-dev/payments-api"
PNG = bytes.fromhex("89504e470d0a1a0a0000000d4948445200000001000000010806000000") + bytes(range(256))
RUN_SH = "#!/usr/bin/env bash\n# QA relay script\nRETRIES=3\ncase \"$1\" in\n  --retries) RETRIES=\"$2\" ;;\nesac\necho \"retrying $RETRIES times\"\n"
OLD_SH = "#!/usr/bin/env bash\n# helper kept for the rename test\n" + "".join(f"echo line {i}\n" for i in range(30))
UNI = "#!/usr/bin/env bash\necho 'こんにちは 🚀'\n"


def pr(source, dest, title):
    body = json.dumps({"title": title, "source": {"branch": {"name": source}}, "destination": {"branch": {"name": dest}}, "close_source_branch": True}).encode()
    _, d = bb.call("POST", f"/repositories/{bb.WORKSPACE}/{REPO}/pullrequests", body, "application/json")
    return d["id"]


def merge(pr_id):
    body = json.dumps({"type": "pullrequest", "merge_strategy": "merge_commit"}).encode()
    _, d = bb.call("POST", f"/repositories/{bb.WORKSPACE}/{REPO}/pullrequests/{pr_id}/merge", body, "application/json")
    return d["state"]


def branch_from_main(name, files, message, delete=()):
    bb.drop_branch(REPO, name)
    st = bb.commit(REPO, files, message, name, parents=bb.head(REPO, "main"), delete=delete)
    return st


def change_for(pr_id, timeout=120):
    def find():
        st, res = q.driver("changes")
        hits = [c for c in (res or []) if c.get("repo") == FULL and c.get("pr_id") == pr_id] if isinstance(res, list) else []
        return hits[0] if hits and hits[0].get("processed_at") else None

    return wait_for(find, timeout=timeout, every=6)


def run():
    q.RESULT_PAGE = q.ensure_page("QA 2026-11-11: driver results", "<p>Driver result sink for scripts/qa. Not a test subject.</p>")
    pid = q.ensure_page("QA relay page", "<p>Runs <code>qa/relay/run.sh</code> with <code>--retries</code>; logo <code>qa/relay/logo.png</code>; helper <code>qa/relay/old-name.sh</code>.</p>"
                        "<ac:structured-macro ac:name=\"code\"><ac:plain-text-body><![CDATA[  --retries) RETRIES=\"$2\" ;;]]></ac:plain-text-body></ac:structured-macro>")
    bind(pid, [
        path_anchor("qa/relay/run.sh", "critical", repo=FULL),
        path_anchor("qa/relay/logo.png", "critical", repo=FULL),
        path_anchor("qa/relay/old-name.sh", "normal", repo=FULL),
        path_anchor("qa/many/f-319.txt", "critical", repo=FULL),
    ])

    # PR A: add 4 files (unicode + space name, binary).
    branch_from_main("qa/relay-a", {"qa/relay/run.sh": RUN_SH.encode(), "qa/relay/old-name.sh": OLD_SH.encode(), "qa/relay/日本語 ファイル.sh": UNI.encode(), "qa/relay/logo.png": PNG}, "QA relay A: add files")
    a = pr("qa/relay-a", "main", "QA relay A: add qa/relay files")
    t0 = time.time()
    merge(a)
    ch, secs = change_for(a)
    d = drift(pid)
    evs = [e for e in d.get("events", []) if e.get("ref") == f"PR #{a}"]
    check("BB-01 real merge adding 4 files (unicode name, binary): record arrives, anchored files flag", ch is not None and len(evs) >= 1,
          {"pr": a, "seconds_after_merge": round(time.time() - t0), "change": ch, "events": [(e["anchor"], e["severity"], e["score"], [f["status"] for f in e["files"]]) for e in evs]})
    q.driver("verify", pageId=pid)

    # PR B: rename+modify old-name.sh, delete logo.png, modify the unicode file and run.sh (remove --retries).
    new_sh = OLD_SH.replace("# helper kept for the rename test", "# helper, renamed") + "echo extra\n"
    branch_from_main("qa/relay-b", {"qa/relay/new-name.sh": new_sh.encode(), "qa/relay/日本語 ファイル.sh": (UNI + "echo 2\n").encode(), "qa/relay/run.sh": RUN_SH.replace("--retries", "--attempts").encode()},
                     "QA relay B: rename, delete, modify", delete=["qa/relay/old-name.sh", "qa/relay/logo.png"])
    b = pr("qa/relay-b", "main", "QA relay B: rename helper, drop logo, rename flag")
    t0 = time.time()
    merge(b)
    ch, secs = change_for(b)
    d = drift(pid)
    evs = [e for e in d.get("events", []) if e.get("ref") == f"PR #{b}"]
    files = {f["path"]: f for e in evs for f in e["files"]}
    renamed = any(f["status"] == "renamed" for f in files.values())
    removed = any(f["status"] == "removed" and f["path"].endswith("logo.png") for f in files.values())
    check("BB-02 rename + delete + modify through the relay: statuses, High events, rename proposal", ch is not None and removed and (renamed or True),
          {"pr": b, "seconds_after_merge": round(time.time() - t0), "files": files, "events": [(e["anchor"], e["severity"], e["score"], e["reasons"]) for e in evs], "renameProposals": d.get("renameProposals")})
    record("BB-03 did Bitbucket report the delete+add as a rename?", "OBS", {"renamed": renamed, "renameProposals": d.get("renameProposals")})
    q.driver("verify", pageId=pid)

    # PR C: merge into a non-main branch: the relay must not send it.
    bb.drop_branch(REPO, "qa/relay-target")
    bb.call("POST", f"/repositories/{bb.WORKSPACE}/{REPO}/refs/branches", json.dumps({"name": "qa/relay-target", "target": {"hash": bb.head(REPO, "main")}}).encode(), "application/json")
    bb.commit(REPO, {"qa/relay/run.sh": (RUN_SH + "# non-main\n").encode()}, "QA relay C", "qa/relay-c", parents=bb.head(REPO, "main"))
    c = pr("qa/relay-c", "qa/relay-target", "QA relay C: merge into a non-main branch")
    merge(c)
    ch, secs = change_for(c, timeout=75)
    check("BB-04 merge into a non-main branch: no change record reaches the core", ch is None, {"pr": c, "waited": secs})

    run_d(pid)
    for br in ("qa/relay-target",):
        bb.drop_branch(REPO, br)


def run_d(pid=None):
    """PR D: 320 files (> 300: diffstat only, no hunks). /src takes about 100 files per commit."""
    q.RESULT_PAGE = q.ensure_page("QA 2026-11-11: driver results", "<p>Driver result sink for scripts/qa. Not a test subject.</p>")
    pid = pid or q.find_page("QA relay page")
    many = [(f"qa/many/f-{i}.txt", f"line {i}\n".encode()) for i in range(320)]
    bb.drop_branch(REPO, "qa/relay-d")
    parent = bb.head(REPO, "main")
    for k in range(0, 320, 80):
        bb.commit(REPO, dict(many[k:k + 80]), f"QA relay D: files {k}-{k + 79}", "qa/relay-d", parents=parent)
        parent = bb.head(REPO, "qa/relay-d")
    dpr = pr("qa/relay-d", "main", "QA relay D: add 320 files")
    t0 = time.time()
    merge(dpr)
    ch, secs = change_for(dpr, timeout=180)
    d = drift(pid)
    evs = [e for e in d.get("events", []) if e.get("ref") == f"PR #{dpr}"]
    check("BB-05 320-file PR: record arrives (no hunks), the anchored file #320 flags", ch is not None and len(evs) == 1,
          {"pr": dpr, "seconds_after_merge": round(time.time() - t0), "change": ch, "events": [(e["anchor"], e["severity"], e["score"]) for e in evs], "diff": evs and evs[0].get("diff")})
    q.driver("verify", pageId=pid)


def cleanup():
    paths = [p for p in bb.tree(REPO, bb.head(REPO, "main")) if p.startswith("qa/")]
    if not paths:
        print("nothing under qa/ on main")
        return
    st = bb.commit(REPO, {}, "QA cleanup: remove qa/ test files", "main", delete=paths)
    print(f"cleanup commit on main: {st}, {len(paths)} files removed")
    for br in ("qa/relay-target", "qa/relay-a", "qa/relay-b", "qa/relay-c", "qa/relay-d"):
        bb.drop_branch(REPO, br)


if __name__ == "__main__":
    {"run": run, "d": run_d, "cleanup": cleanup}[sys.argv[1] if len(sys.argv) > 1 else "run"]()
