#!/usr/bin/env python3
"""Seed the Doc Drift Sentinel demo repo payments-api in Bitbucket Cloud.

Usage (from the repo root, with .env loaded):
  set -a; . ./.env; set +a
  python3 -I demo/seed/bb_seed.py reset payments-api              # main = base/, one "Reset demo baseline" commit
  python3 -I demo/seed/bb_seed.py prepare payments-api            # (re)create the branches that only need base
  python3 -I demo/seed/bb_seed.py prepare payments-api 02-raise-db-pool   # one branch, from the current main
  python3 -I demo/seed/bb_seed.py pr payments-api 01-rename-rollback-script    # open the PR
  python3 -I demo/seed/bb_seed.py merge payments-api <pr-id>                   # merge it
  python3 -I demo/seed/bb_seed.py status payments-api             # branches, open PRs, main head
  python3 -I demo/seed/bb_seed.py base payments-api               # first import into an empty repo
`scenario` is kept as an alias of `prepare` with exactly one scenario id.

Jira keys in repo files and PR text are tokens like {{PAY:remove-v1-refunds}} (D25). They are
replaced from demo/seed/jira/keymap.json, which `seed_jira.py seed` writes. Run Jira first.

Needs BITBUCKET_EMAIL and BITBUCKET_API_TOKEN (repository read/write, pull request read/write).
Uses the /src endpoint, so no git credentials are stored anywhere. Never prints the token.
"""
import base64
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
import uuid
from pathlib import Path

WORKSPACE = os.environ.get("BITBUCKET_WORKSPACE", "nano-soft-dev")
API = "https://api.bitbucket.org/2.0"
SEED = Path(__file__).resolve().parent
KEYMAP = SEED / "jira" / "keymap.json"
TOKEN = re.compile(r"\{\{PAY:([a-z0-9-]+)\}\}")
AUTHOR = "Doc Drift Demo <demo@example.com>"
RESET_MESSAGE = "Reset demo baseline"
SKIP_NAMES = {"scenario.json", ".DS_Store"}

# Scenarios that must wait for an earlier one to merge. `prepare` with no ids skips them, and
# `prepare <id>` refuses to build one until main holds the files of the scenario it needs.
# 02 and 08 rewrite deploy/helm/values.yaml as left by 01 and 02; 10 rewrites the 3 files 03
# changes. 03 itself only needs base: it waits for 02 so the dashboard chain merges in order
# (01, 02, 03, ...). `--force` builds any of them from the current main regardless.
REQUIRES = {
    "02-raise-db-pool": "01-rename-rollback-script",
    "03-remove-v1-refunds": "02-raise-db-pool",
    "08-revert-db-pool": "02-raise-db-pool",
    "10-structured-logging": "03-remove-v1-refunds",
}


def _auth():
    email, token = os.environ.get("BITBUCKET_EMAIL"), os.environ.get("BITBUCKET_API_TOKEN")
    if not email or not token:
        sys.exit("BITBUCKET_EMAIL and BITBUCKET_API_TOKEN must be set (load .env)")
    return "Basic " + base64.b64encode(f"{email}:{token}".encode()).decode()


def call(method, path, body=None, content_type=None, ok404=False, raw=False):
    url = path if path.startswith("http") else API + path
    req = urllib.request.Request(url, data=body, method=method)
    req.add_header("Authorization", _auth())
    req.add_header("Accept", "application/json")
    if content_type:
        req.add_header("Content-Type", content_type)
    try:
        with urllib.request.urlopen(req) as r:
            data = r.read()
            if raw:
                return r.status, data
            return r.status, (json.loads(data) if data and data[:1] in b"{[" else data.decode())
    except urllib.error.HTTPError as e:
        data = e.read()
        if ok404 and e.code == 404:
            return 404, None
        try:
            msg = json.loads(data).get("error", {}).get("message", data.decode())
        except Exception:
            msg = data.decode(errors="replace")
        sys.exit(f"HTTP {e.code} {method} {url.split('?')[0].removeprefix(API)}: {msg}")


def paged(path):
    while path:
        _, d = call("GET", path)
        yield from d.get("values", [])
        path = d.get("next")


# ---------- Jira key tokens (D25) ----------

_keys = None


def resolve(data: bytes, where: str) -> bytes:
    """Replace {{PAY:ref}} tokens with the real keys from keymap.json."""
    global _keys
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError:
        return data
    if not TOKEN.search(text):
        return data
    if _keys is None:
        if not KEYMAP.exists():
            sys.exit(f"{where} cites Jira tokens but {KEYMAP.relative_to(SEED.parent.parent)} is missing. "
                     "Run `seed_jira.py seed` (or `keymap`) first.")
        _keys = json.loads(KEYMAP.read_text())["keys"]
    missing = sorted({m for m in TOKEN.findall(text) if m not in _keys})
    if missing:
        sys.exit(f"{where}: no key for {', '.join(missing)} in keymap.json")
    return TOKEN.sub(lambda m: _keys[m.group(1)], text).encode("utf-8")


def files_under(root: Path):
    return {p.relative_to(root).as_posix(): resolve(p.read_bytes(), p.relative_to(SEED).as_posix())
            for p in sorted(root.rglob("*")) if p.is_file() and p.name not in SKIP_NAMES}


def scenario_meta(repo, sid):
    path = SEED / repo / "scenarios" / sid / "scenario.json"
    if not path.exists():
        sys.exit(f"unknown scenario {sid} (no {path.relative_to(SEED)})")
    return json.loads(resolve(path.read_bytes(), path.relative_to(SEED).as_posix()))


def scenario_ids(repo):
    return sorted(p.name for p in (SEED / repo / "scenarios").iterdir() if (p / "scenario.json").exists())


# ---------- Bitbucket primitives ----------

def commit(repo, files, message, branch, parents=None, delete=()):
    boundary = uuid.uuid4().hex
    parts = []

    def field(name, value: bytes, filename=None):
        disp = f'form-data; name="{name}"' + (f'; filename="{filename}"' if filename else "")
        parts.append(f"--{boundary}\r\nContent-Disposition: {disp}\r\n\r\n".encode() + value + b"\r\n")

    field("message", message.encode())
    field("branch", branch.encode())
    field("author", AUTHOR.encode())
    if parents:
        field("parents", parents.encode())
    for path, data in files.items():
        field(path, data, filename=path.split("/")[-1])
    for path in delete:
        field("files", path.encode())
    body = b"".join(parts) + f"--{boundary}--\r\n".encode()
    status, _ = call("POST", f"/repositories/{WORKSPACE}/{repo}/src", body,
                     f"multipart/form-data; boundary={boundary}")
    return status


def branch_head(repo, branch):
    status, d = call("GET", f"/repositories/{WORKSPACE}/{repo}/refs/branches/{urllib.parse.quote(branch, safe='')}",
                     ok404=True)
    return None if status == 404 else d["target"]["hash"]


def head(repo, branch="main"):
    h = branch_head(repo, branch)
    if not h:
        sys.exit(f"branch {branch} not found in {repo}")
    return h


def tree(repo, rev):
    """Every file path at rev."""
    return sorted(v["path"] for v in paged(f"/repositories/{WORKSPACE}/{repo}/src/{rev}/?max_depth=50&pagelen=100")
                  if v["type"] == "commit_file")


def file_at(repo, rev, path):
    status, data = call("GET", f"/repositories/{WORKSPACE}/{repo}/src/{rev}/{urllib.parse.quote(path)}",
                        ok404=True, raw=True)
    return None if status == 404 else data


def open_prs_from(repo, branch):
    q = urllib.parse.quote(f'state="OPEN" AND source.branch.name="{branch}"')
    return list(paged(f"/repositories/{WORKSPACE}/{repo}/pullrequests?q={q}&pagelen=50"))


def drop_branch(repo, branch):
    """Decline open PRs from branch, then delete it. No-op if it does not exist."""
    if not branch_head(repo, branch):
        return False
    for pr in open_prs_from(repo, branch):
        call("POST", f"/repositories/{WORKSPACE}/{repo}/pullrequests/{pr['id']}/decline")
        print(f"  declined open PR #{pr['id']} from {branch}")
    call("DELETE", f"/repositories/{WORKSPACE}/{repo}/refs/branches/{urllib.parse.quote(branch, safe='')}")
    return True


# ---------- commands ----------

def cmd_reset(repo):
    """One commit on main that makes it equal to base/: writes every base file, deletes the rest."""
    files = files_under(SEED / repo / "base")
    parent = head(repo)
    current = tree(repo, parent)
    delete = [p for p in current if p not in files]
    commit(repo, files, RESET_MESSAGE, "main", parents=parent, delete=delete)
    new = head(repo)
    print(f"reset: {repo}@main {parent[:12]} -> {new[:12]}: wrote {len(files)} files, deleted {len(delete)}"
          + (f" ({', '.join(delete)})" if delete else ""))
    after = set(tree(repo, new))
    if after != set(files):
        sys.exit(f"reset check failed: main has {sorted(after ^ set(files))} out of step with base/")
    dropped = [m["branch"] for m in (scenario_meta(repo, s) for s in scenario_ids(repo)) if drop_branch(repo, m["branch"])]
    if dropped:
        print(f"reset: deleted stale scenario branches: {', '.join(dropped)}")
    others = [b["name"] for b in paged(f"/repositories/{WORKSPACE}/{repo}/refs/branches?pagelen=100")
              if b["name"] != "main"]
    if others:
        print(f"reset: left untouched (not scenario branches): {', '.join(others)}")
    print("Next: `prepare` to rebuild the scenario branches. Re-verify anchored pages if the app is installed.")


def requirement_met(repo, sid):
    """True when main holds every file the required scenario writes, and none it deletes."""
    need = REQUIRES.get(sid)
    if not need:
        return True, ""
    sdir = SEED / repo / "scenarios" / need
    meta = scenario_meta(repo, need)
    main = head(repo)
    for path, data in files_under(sdir).items():
        if file_at(repo, main, path) != data:
            return False, f"{need} is not merged yet (main's {path} differs)"
    for path in meta.get("delete", []):
        if file_at(repo, main, path) is not None:
            return False, f"{need} is not merged yet (main still has {path})"
    return True, ""


def cmd_prepare(repo, ids, force):
    explicit = bool(ids)
    ids = ids or [s for s in scenario_ids(repo) if s not in REQUIRES]
    main = head(repo)
    done = []
    for sid in ids:
        meta = scenario_meta(repo, sid)
        ok, why = requirement_met(repo, sid)
        if not ok and not force:
            print(f"{sid}: skipped, {why}. Merge it first, or pass --force.")
            if explicit:
                sys.exit(1)
            continue
        if drop_branch(repo, meta["branch"]):
            print(f"{sid}: deleted the old {meta['branch']}")
        files = files_under(SEED / repo / "scenarios" / sid)
        commit(repo, files, meta["title"], meta["branch"], parents=main, delete=meta.get("delete", []))
        print(f"{sid}: branch {meta['branch']} at {head(repo, meta['branch'])[:12]} "
              f"(from main {main[:12]}, {len(files)} written, {len(meta.get('delete', []))} deleted)")
        done.append(sid)
    held = [s for s in scenario_ids(repo) if s in REQUIRES and s not in ids]
    if held and not explicit:
        print(f"held back until their predecessor merges: {', '.join(held)}")
    return done


def cmd_status(repo):
    _, c = call("GET", f"/repositories/{WORKSPACE}/{repo}/commit/{head(repo)}")
    print(f"main {c['hash'][:12]}: {c['message'].strip().splitlines()[0]}")
    for b in paged(f"/repositories/{WORKSPACE}/{repo}/refs/branches?pagelen=100"):
        print(f"branch {b['name']:36} {b['target']['hash'][:12]} {b['target']['message'].strip().splitlines()[0][:60]}")
    for pr in paged(f"/repositories/{WORKSPACE}/{repo}/pullrequests?state=OPEN&pagelen=50"):
        print(f"open PR #{pr['id']} {pr['source']['branch']['name']} -> {pr['destination']['branch']['name']}: {pr['title']}")


def main(argv):
    force = "--force" in argv
    argv = [a for a in argv if a != "--force"]
    if len(argv) < 2:
        sys.exit(__doc__)
    cmd, repo = argv[0], argv[1]
    if cmd == "base":
        files = files_under(SEED / repo / "base")
        commit(repo, files, "Initial import of payments-api", "main")
        print(f"base: {len(files)} files committed to {repo}@main ({head(repo)[:12]})")
    elif cmd == "reset":
        cmd_reset(repo)
    elif cmd == "prepare":
        cmd_prepare(repo, argv[2:], force)
    elif cmd == "scenario":
        if len(argv) != 3:
            sys.exit("scenario takes exactly one scenario id")
        cmd_prepare(repo, argv[2:], force)
    elif cmd == "status":
        cmd_status(repo)
    elif cmd == "pr":
        meta = scenario_meta(repo, argv[2])
        body = json.dumps({"title": meta["title"], "description": meta["description"],
                           "source": {"branch": {"name": meta["branch"]}},
                           "destination": {"branch": {"name": "main"}},
                           "close_source_branch": True}).encode()
        _, d = call("POST", f"/repositories/{WORKSPACE}/{repo}/pullrequests", body, "application/json")
        print(f"PR #{d['id']} opened: {d['links']['html']['href']}")
    elif cmd == "merge":
        body = json.dumps({"type": "pullrequest", "merge_strategy": "merge_commit"}).encode()
        _, d = call("POST", f"/repositories/{WORKSPACE}/{repo}/pullrequests/{argv[2]}/merge", body, "application/json")
        print(f"PR #{d['id']} {d['state']}")
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main(sys.argv[1:])
