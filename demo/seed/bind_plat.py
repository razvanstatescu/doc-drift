#!/usr/bin/env python3
"""Bind the anchored PLAT pages through the core app's development-only `dds-dev` driver.

For each page in confluence/index.json with `anchored: true`, this resolves the page ID by title
in space PLAT, maps its anchors to the driver's `bind` payload (Jira tokens such as
{{PAY:rollback-epic}} resolved from jira/keymap.json, D25), and POSTs it to the dds-dev web
trigger. `bind` replaces the page's anchors and marks the page Verified, so a re-run leaves the
same bindings (it also closes any open drift events and records a new verification row). The
6 pages with `anchored: false` are never touched.

The driver answers with a static status only; results go to `forge logs` (DDS_DEV_BIND,
DDS_BINDINGS_SAVED, DDS_DEV_INSPECT). Development environment only.

Usage (from the repo root):
  set -a; . ./.env; set +a
  export ATLASSIAN_SITE=one-atlas-jzzf.atlassian.net
  python3 -I demo/seed/bind_plat.py --dry-run                 # print the payloads, POST nothing
  python3 -I demo/seed/bind_plat.py                           # bind all 18 anchored pages
  python3 -I demo/seed/bind_plat.py --only "Payments rollback runbook"
  python3 -I demo/seed/bind_plat.py --inspect "Payments rollback runbook" "Scale payment workers"

Environment and local files:
  ATLASSIAN_EMAIL, ATLASSIAN_API_TOKEN   Confluence REST (page lookup by title)
  ATLASSIAN_SITE                          default one-atlas-jzzf.atlassian.net
  DDS_DEV_URL / apps/core/.dev-url        dds-dev web trigger URL (forge webtrigger create -f dds-dev ...)
  DDS_DEV_TOKEN / apps/core/.dev-token    value of the DDS_DEV_TOKEN Forge variable (development)

REST: GET /wiki/api/v2/spaces?keys=PLAT, GET /wiki/api/v2/spaces/{id}/pages?limit=250.
No token is ever printed.
"""
import argparse
import base64
import json
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
CORE = ROOT / "apps" / "core"
INDEX = HERE / "confluence" / "index.json"
KEYMAP = HERE / "jira" / "keymap.json"
SITE = os.environ.get("ATLASSIAN_SITE", "one-atlas-jzzf.atlassian.net").removeprefix("https://").rstrip("/")
BASE = f"https://{SITE}"
DEMO_SITE = "one-atlas-jzzf.atlassian.net"
TOKEN = re.compile(r"^\{\{PAY:([a-z0-9-]+)\}\}$")


def _auth():
    email, token = os.environ.get("ATLASSIAN_EMAIL"), os.environ.get("ATLASSIAN_API_TOKEN")
    if not email or not token:
        sys.exit("ATLASSIAN_EMAIL and ATLASSIAN_API_TOKEN must be set (load .env)")
    return "Basic " + base64.b64encode(f"{email}:{token}".encode()).decode()


def confluence_get(path):
    req = urllib.request.Request(path if path.startswith("http") else BASE + path)
    req.add_header("Authorization", _auth())
    req.add_header("Accept", "application/json")
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        sys.exit(f"HTTP {e.code} GET {path.split('?')[0]}: {e.read().decode(errors='replace')[:300]}")


def paged(path):
    while path:
        d = confluence_get(path)
        yield from d.get("results", [])
        nxt = d.get("_links", {}).get("next")
        path = (nxt if nxt.startswith("/wiki") else "/wiki" + nxt) if nxt else None


def page_ids(space_key):
    spaces = confluence_get(f"/wiki/api/v2/spaces?keys={space_key}").get("results", [])
    if not spaces:
        sys.exit(f"Space {space_key} not found on {SITE}. Run seed_confluence.py first.")
    ids = {}
    for p in paged(f"/wiki/api/v2/spaces/{spaces[0]['id']}/pages?limit=250&status=current"):
        ids.setdefault(p["title"], p["id"])
    return ids


def jira_keys():
    if not KEYMAP.exists():
        sys.exit("jira/keymap.json not found. Run `seed_jira.py keymap` first (D25).")
    km = json.loads(KEYMAP.read_text())
    if km.get("site") != SITE:
        sys.exit(f"keymap.json is for {km.get('site')}, not {SITE}.")
    return km["keys"]


def to_anchor(a, keys, title):
    """index.json anchor -> driver AnchorInput {anchorType, repo, pattern, jiraKey, weight}."""
    weight = a.get("weight", "normal")
    if a["type"] == "jira":
        m = TOKEN.match(a["key"])
        if m and m.group(1) not in keys:
            sys.exit(f"{title}: no key for {a['key']} in keymap.json")
        return {"anchorType": "jira", "jiraKey": keys[m.group(1)] if m else a["key"], "weight": weight}
    if a["type"] in ("path", "glob"):
        return {"anchorType": a["type"], "repo": a["repo"], "pattern": a["pattern"], "weight": weight}
    if a["type"] == "repo":
        return {"anchorType": "repo", "repo": a["repo"], "weight": weight}
    sys.exit(f"{title}: unknown anchor type {a['type']!r}")


def _local(env, name):
    if os.environ.get(env):
        return os.environ[env].strip()
    f = CORE / name
    if not f.exists():
        sys.exit(f"{env} not set and apps/core/{name} not found")
    return f.read_text().strip()


def post(url, token, body):
    req = urllib.request.Request(url, data=json.dumps(body).encode(), method="POST")
    req.add_header("Content-Type", "application/json")
    req.add_header("x-dds-dev-token", token)
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, r.read().decode(errors="replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode(errors="replace")


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--dry-run", action="store_true", help="print the payloads, POST nothing")
    ap.add_argument("--only", nargs="+", metavar="TITLE", help="bind only these page titles")
    ap.add_argument("--inspect", nargs="+", metavar="TITLE", help="send `inspect` for these titles instead of binding")
    args = ap.parse_args()

    if SITE != DEMO_SITE:
        print(f"warning: ATLASSIAN_SITE is {SITE}, not the demo site {DEMO_SITE}", file=sys.stderr)
    index = json.loads(INDEX.read_text())
    space_key = index["space"]["key"]
    pages = {p["title"]: p for p in index["pages"]}
    ids = page_ids(space_key)

    if args.inspect:
        targets = args.inspect
    else:
        targets = args.only or [t for t, p in pages.items() if p.get("anchored")]
    unknown = [t for t in targets if t not in pages]
    if unknown:
        sys.exit(f"Not in index.json: {unknown}")
    missing = [t for t in targets if t not in ids]
    if missing:
        sys.exit(f"Not found in space {space_key}: {missing}")

    url = token = None
    if not args.dry_run:
        url, token = _local("DDS_DEV_URL", ".dev-url"), _local("DDS_DEV_TOKEN", ".dev-token")

    keys = None if args.inspect else jira_keys()
    failures = 0
    for title in targets:
        page = pages[title]
        if args.inspect:
            body = {"action": "inspect", "pageId": ids[title]}
        else:
            if not page.get("anchored") or not page.get("anchors"):
                print(f"skip  {title}: intentionally Unanchored")
                continue
            body = {
                "action": "bind",
                "pageId": ids[title],
                "spaceKey": space_key,
                "anchors": [to_anchor(a, keys, title) for a in page["anchors"]],
            }
        label = f"{body['action']:<7} {ids[title]:>10}  {title}"
        if args.dry_run:
            print(f"{label}\n        {json.dumps(body.get('anchors', []))}")
            continue
        status, text = post(url, token, body)
        ok = status == 202
        failures += not ok
        print(f"{'ok  ' if ok else 'FAIL'} {status} {label}" + ("" if ok else f"  {text[:200]}"))

    if not args.dry_run:
        print(f"\n{len(targets) - failures} of {len(targets)} accepted. Results: `forge logs -e development` "
              "(DDS_BINDINGS_SAVED, DDS_DEV_INSPECT).")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
