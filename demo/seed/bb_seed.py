#!/usr/bin/env python3
"""Seed the Doc Drift Sentinel demo repos in Bitbucket Cloud.

Usage (from the repo root, with .env loaded):
  set -a; . ./.env; set +a
  python3 -I demo/seed/bb_seed.py base payments-api
  python3 -I demo/seed/bb_seed.py scenario payments-api 01-rename-rollback-script
  python3 -I demo/seed/bb_seed.py pr payments-api 01-rename-rollback-script     # open the PR
  python3 -I demo/seed/bb_seed.py merge payments-api <pr-id>                    # merge it

Needs BITBUCKET_EMAIL and BITBUCKET_API_TOKEN (repository read/write, pull request read/write).
Uses the /src endpoint, so no git credentials are stored anywhere. Never prints the token.
"""
import base64
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
import uuid
from pathlib import Path

WORKSPACE = os.environ.get("BITBUCKET_WORKSPACE", "nano-soft-dev")
API = "https://api.bitbucket.org/2.0"
SEED = Path(__file__).resolve().parent


def _auth():
    email, token = os.environ.get("BITBUCKET_EMAIL"), os.environ.get("BITBUCKET_API_TOKEN")
    if not email or not token:
        sys.exit("BITBUCKET_EMAIL and BITBUCKET_API_TOKEN must be set (load .env)")
    return "Basic " + base64.b64encode(f"{email}:{token}".encode()).decode()


def call(method, path, body=None, content_type=None):
    req = urllib.request.Request(API + path, data=body, method=method)
    req.add_header("Authorization", _auth())
    req.add_header("Accept", "application/json")
    if content_type:
        req.add_header("Content-Type", content_type)
    try:
        with urllib.request.urlopen(req) as r:
            raw = r.read()
            return r.status, (json.loads(raw) if raw and raw[:1] in b"{[" else raw.decode())
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            msg = json.loads(raw).get("error", {}).get("message", raw.decode())
        except Exception:
            msg = raw.decode(errors="replace")
        sys.exit(f"HTTP {e.code} {method} {path}: {msg}")


def files_under(root: Path):
    return {p.relative_to(root).as_posix(): p.read_bytes()
            for p in sorted(root.rglob("*")) if p.is_file() and p.name != "scenario.json"}


def commit(repo, files, message, branch, parents=None, delete=()):
    boundary = uuid.uuid4().hex
    parts = []

    def field(name, value: bytes, filename=None):
        disp = f'form-data; name="{name}"' + (f'; filename="{filename}"' if filename else "")
        parts.append(f"--{boundary}\r\nContent-Disposition: {disp}\r\n\r\n".encode() + value + b"\r\n")

    field("message", message.encode())
    field("branch", branch.encode())
    field("author", b"Doc Drift Demo <demo@example.com>")
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


def head(repo, branch="main"):
    _, d = call("GET", f"/repositories/{WORKSPACE}/{repo}/refs/branches/{urllib.parse.quote(branch, safe='')}")
    return d["target"]["hash"]


def main(argv):
    if len(argv) < 2:
        sys.exit(__doc__)
    cmd, repo = argv[0], argv[1]
    if cmd == "base":
        files = files_under(SEED / repo / "base")
        commit(repo, files, "Initial import of payments-api", "main")
        print(f"base: {len(files)} files committed to {repo}@main ({head(repo)[:12]})")
    elif cmd == "scenario":
        sdir = SEED / repo / "scenarios" / argv[2]
        meta = json.loads((sdir / "scenario.json").read_text())
        files = files_under(sdir)
        commit(repo, files, meta["title"], meta["branch"], parents=head(repo), delete=meta.get("delete", []))
        print(f"scenario {meta['id']}: branch {meta['branch']} at {head(repo, meta['branch'])[:12]}")
    elif cmd == "pr":
        meta = json.loads((SEED / repo / "scenarios" / argv[2] / "scenario.json").read_text())
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
