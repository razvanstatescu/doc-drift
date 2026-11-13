#!/usr/bin/env python3
"""Step 3: move payments-api's pull request counter so the real merge on screen is PR #482.

Opens a pull request from the scratch branch video/pr-counter into main and declines it, again and
again, until the last declined id is TARGET (481). Never merges. About one create and one decline
every 6 to 8 s; honours 429 and Retry-After; checks every response; logs every id to
pr-counter.jsonl and a line every 25 ids (and the first and last) to LOG.md.

  python3 -I tools/capture/pr_counter.py [--count N] [--target 481]
"""
import json
import random
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import cap as s  # noqa: E402

BRANCH = "video/pr-counter"
TITLE = "Scratch: pull request counter for the launch video"
DESC = "Opened and declined only to move the pull request counter for the launch video. Never merged."
JSONL = HERE / "pr-counter.jsonl"
RL_KEYS = ("x-ratelimit-limit", "x-ratelimit-remaining", "x-ratelimit-resource", "x-ratelimit-nearlimit", "retry-after")


def jl(rec):
    rec = {"at": s.now_iso(), **rec}
    with JSONL.open("a") as f:
        f.write(json.dumps(rec) + "\n")


def rl(headers):
    return {k: v for k, v in ((k.lower(), v) for k, v in (headers or {}).items()) if k in RL_KEYS}


def call(method, path, body=None, what=""):
    """One Bitbucket call with 429 / 5xx / network handling. Returns (status, data, headers)."""
    tries = 0
    while True:
        tries += 1
        try:
            st, d, h = s.bb(method, path, body)
        except Exception as e:  # network error: the caller re-syncs before retrying a create
            jl({"op": what, "error": str(e)[:200], "try": tries})
            if tries >= 4:
                raise
            time.sleep(15 * tries)
            continue
        if st == 429:
            ra = rl(h).get("retry-after")
            wait = int(float(ra)) + 1 if ra else 60
            jl({"op": what, "status": 429, "retryAfter": ra, "wait": wait, "rate": rl(h)})
            s.log(f"Bitbucket 429 on {what}; waiting {wait} s (Retry-After {ra})")
            time.sleep(wait)
            continue
        if st >= 500 and tries < 4:
            jl({"op": what, "status": st, "try": tries, "body": str(d)[:200]})
            time.sleep(10 * tries)
            continue
        return st, d, h


def open_from_branch():
    q = 'state="OPEN" AND source.branch.name="%s"' % BRANCH
    import urllib.parse
    st, d, _ = call("GET", s.bb_repo(f"/pullrequests?q={urllib.parse.quote(q)}&pagelen=50&fields=values.id,values.state"), what="list-open")
    return [v["id"] for v in (d or {}).get("values", [])] if st == 200 else None


def decline(pr_id):
    st, d, h = call("POST", s.bb_repo(f"/pullrequests/{pr_id}/decline"), what=f"decline #{pr_id}")
    ok = st in (200, 201) and isinstance(d, dict) and d.get("state") == "DECLINED"
    jl({"op": "decline", "id": pr_id, "status": st, "state": d.get("state") if isinstance(d, dict) else None, "rate": rl(h)})
    if not ok:
        raise SystemExit(f"decline #{pr_id} failed: {st} {str(d)[:300]}")
    return h


def create():
    body = {"title": TITLE, "description": DESC, "source": {"branch": {"name": BRANCH}},
            "destination": {"branch": {"name": "main"}}, "close_source_branch": False}
    st, d, h = call("POST", s.bb_repo("/pullrequests"), body, what="create")
    if st in (200, 201) and isinstance(d, dict) and d.get("id"):
        jl({"op": "create", "id": d["id"], "status": st, "state": d.get("state"), "rate": rl(h)})
        return d["id"], h
    jl({"op": "create", "status": st, "body": str(d)[:300], "rate": rl(h)})
    # Re-sync: a create that errored may still have opened one.
    opened = open_from_branch()
    if opened:
        jl({"op": "resync", "open": opened})
        return opened[0], h
    raise SystemExit(f"create failed: {st} {str(d)[:300]}")


def main():
    count = int(sys.argv[sys.argv.index("--count") + 1]) if "--count" in sys.argv else None
    target = int(sys.argv[sys.argv.index("--target") + 1]) if "--target" in sys.argv else 481
    stale = open_from_branch()
    if stale:
        for pid in stale:
            decline(pid)
            s.log(f"Bitbucket: declined leftover open counter PR #{pid}")
    highest, _ = s.bb_highest_pr()
    if highest >= target:
        s.log(f"PR counter: highest id is already {highest} (target {target}); nothing to do")
        return
    expected = highest + 1
    s.log(f"PR counter: start at #{expected}, target #{target} ({target - highest} to open and decline"
          + (f", this run {count}" if count else "") + ")")
    done = 0
    first = None
    while True:
        t0 = time.time()
        pid, h = create()
        if first is None:
            first = pid
        if pid != expected:
            s.log(f"PR counter: expected #{expected}, got #{pid} (someone else opened a PR?)")
        if pid > target:
            decline(pid)
            s.log(f"PR counter: STOP. Got #{pid}, beyond the target #{target}; declined it. The real PR will not be #{target + 1}.")
            sys.exit(2)
        time.sleep(random.uniform(2.5, 3.5))
        h2 = decline(pid)
        done += 1
        if pid == first or pid % 25 == 0 or pid == target:
            s.log(f"PR counter: opened and declined #{pid} ({done} this run){' rate ' + json.dumps(rl(h2)) if rl(h2) else ''}")
        if pid >= target:
            s.log(f"PR counter: done. Last declined #{pid}; the next pull request will be #{pid + 1}.")
            return
        expected = pid + 1
        if count and done >= count:
            s.log(f"PR counter: paused after {done} (last declined #{pid}).")
            return
        rest = random.uniform(6.0, 8.0) - (time.time() - t0)
        if rest > 0:
            time.sleep(rest)


if __name__ == "__main__":
    main()
