#!/usr/bin/env python3
"""Seed the Doc Drift Sentinel demo space PLAT in Confluence Cloud.

Creates the space (if missing), 5 section folders under the space homepage, the 24 pages
from index.json (storage format) inside their folders, and their labels. Idempotent: a space,
folder or page whose title already exists is skipped, never overwritten (unless --update).
Labels are re-applied to existing pages (adding a label twice is a no-op), and every PLAT page is
checked for view restrictions, which are removed (D20). Neither creates a page version.

Jira keys are tokens in the page files, for example {{PAY:rollback-epic}} (D25). They are
replaced from ../jira/keymap.json, which `seed_jira.py seed` writes, so run Jira first. An
offline --dry-run uses the illustrative exampleKey values from issues.json.

Usage (from the repo root, with .env loaded):
  set -a; . ./.env; set +a
  python3 -I demo/seed/confluence/seed_confluence.py --dry-run     # print the plan, write nothing
  python3 -I demo/seed/confluence/seed_confluence.py               # seed
  python3 -I demo/seed/confluence/seed_confluence.py --update      # also push changed bodies to existing pages
  python3 -I demo/seed/confluence/seed_confluence.py --validate     # only check that every page parses as XML
  python3 -I demo/seed/confluence/seed_confluence.py --verify       # check the live space against index.json; write nothing

Environment:
  ATLASSIAN_EMAIL, ATLASSIAN_API_TOKEN   required, except for --validate and an offline --dry-run
  ATLASSIAN_SITE                          default one-atlas-jzzf.atlassian.net

REST endpoints (checked against the Confluence REST v1/v2 OpenAPI specs, 2026-11-11):
  GET  /wiki/api/v2/spaces?keys=PLAT                    find the space, its id and homepageId
  POST /wiki/rest/api/space                             create the space (v1: v2 create needs RBAC tenants)
  GET  /wiki/api/v2/pages/{id}/direct-children          find existing folders under the homepage
  POST /wiki/api/v2/folders                             create a section folder {spaceId, title, parentId}
  GET  /wiki/api/v2/spaces/{id}/pages?limit=250         list existing page titles
  POST /wiki/api/v2/pages                               create a page {spaceId, status, title, parentId, body}
  GET/PUT /wiki/api/v2/pages/{id}?body-format=storage   --update only
  POST /wiki/rest/api/content/{id}/label                add labels (v2 has no label write)
  GET  /wiki/api/v2/pages/{id}/labels                   --verify
  GET/DELETE /wiki/rest/api/content/{id}/restriction/byOperation/read   D20 check and fix

No page gets view restrictions (D20). The token is never printed.
"""
import argparse
import base64
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

HERE = Path(__file__).resolve().parent
SITE = os.environ.get("ATLASSIAN_SITE", "one-atlas-jzzf.atlassian.net").removeprefix("https://").rstrip("/")
BASE = f"https://{SITE}"
KEYMAP = HERE.parent / "jira" / "keymap.json"
TOKEN = re.compile(r"\{\{PAY:([a-z0-9-]+)\}\}")
NS = 'xmlns:ac="http://atlassian.com/content" xmlns:ri="http://atlassian.com/resource/identifier"'


class ApiError(Exception):
    def __init__(self, status, method, path, message):
        super().__init__(f"HTTP {status} {method} {path}: {message}")
        self.status = status


def _auth():
    email, token = os.environ.get("ATLASSIAN_EMAIL"), os.environ.get("ATLASSIAN_API_TOKEN")
    if not email or not token:
        return None
    return "Basic " + base64.b64encode(f"{email}:{token}".encode()).decode()


def call(method, path, body=None):
    auth = _auth()
    if not auth:
        sys.exit("ATLASSIAN_EMAIL and ATLASSIAN_API_TOKEN must be set (load .env)")
    url = path if path.startswith("http") else BASE + path
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Authorization", auth)
    req.add_header("Accept", "application/json")
    if data is not None:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req) as r:
            raw = r.read()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        raw = e.read().decode(errors="replace")
        try:
            j = json.loads(raw)
            msg = j.get("message") or j.get("errors") or j.get("errorMessages") or raw
        except Exception:
            msg = raw[:500]
        raise ApiError(e.code, method, path.split("?")[0], msg) from None


def paged(path):
    """Yield results across v2 cursor pages (follows _links.next)."""
    while path:
        d = call("GET", path)
        yield from d.get("results", [])
        nxt = d.get("_links", {}).get("next")
        path = nxt if nxt else None
        if path and not path.startswith("/wiki"):
            path = "/wiki" + path


def load_index():
    return json.loads((HERE / "index.json").read_text())


def jira_keys(offline):
    """ref -> key. Live runs need keymap.json; offline runs use the illustrative exampleKey."""
    if offline:
        issues = json.loads((HERE.parent / "jira" / "issues.json").read_text())["issues"]
        return {i["ref"]: i["exampleKey"] for i in issues}
    if not KEYMAP.exists():
        sys.exit(f"{KEYMAP.relative_to(HERE.parent)} not found. Run `seed_jira.py seed` first (D25).")
    km = json.loads(KEYMAP.read_text())
    if km.get("site") != SITE:
        sys.exit(f"keymap.json was written for {km.get('site')}, not {SITE}. Run `seed_jira.py keymap`.")
    return km["keys"]


def resolve(text, keys, where):
    missing = sorted({m for m in TOKEN.findall(text) if m not in keys})
    if missing:
        sys.exit(f"{where}: no Jira key for {', '.join(missing)}")
    return TOKEN.sub(lambda m: keys[m.group(1)], text).replace("{{ATLASSIAN_SITE}}", SITE)


def body_for(page, keys):
    return resolve((HERE / page["file"]).read_text(), keys, page["file"])


def ensure_unrestricted(page_id, title, dry):
    """D20: no PLAT page may carry a view restriction. Returns True if the page is clean (now)."""
    d = call("GET", f"/wiki/rest/api/content/{page_id}/restriction/byOperation/read")
    r = d.get("restrictions", {})
    who = [u.get("displayName", u.get("accountId")) for u in r.get("user", {}).get("results", [])] + \
          [g.get("name") for g in r.get("group", {}).get("results", [])]
    if not who:
        return True
    if dry:
        print(f"  D20: '{title}' has a view restriction ({len(who)} entries); would remove it")
        return False
    call("DELETE", f"/wiki/rest/api/content/{page_id}/restriction/byOperation/read")
    print(f"  D20: '{title}' had a view restriction ({len(who)} entries); removed")
    return True


def add_labels(page_id, labels):
    call("POST", f"/wiki/rest/api/content/{page_id}/label", [{"prefix": "global", "name": l} for l in labels])


def verify(index, space):
    """Read-only: every index page exists, sits in its folder, has its labels, has no view restriction."""
    pages = {p["title"]: p for p in paged(f"/wiki/api/v2/spaces/{space['id']}/pages?limit=250&status=current")}
    folders = {c["id"]: c["title"] for c in paged(f"/wiki/api/v2/pages/{space['homepageId']}/direct-children?limit=250")}
    problems = 0
    for p in index["pages"]:
        live = pages.get(p["title"])
        if not live:
            print(f"MISSING  {p['title']}")
            problems += 1
            continue
        labels = {l["name"] for l in paged(f"/wiki/api/v2/pages/{live['id']}/labels?limit=100")}
        restricted = not ensure_unrestricted(live["id"], p["title"], dry=True)
        parent = folders.get(live.get("parentId"), live.get("parentId"))
        issues = []
        if parent != p["folder"]:
            issues.append(f"parent is {parent}")
        if not set(p["labels"]) <= labels:
            issues.append(f"labels missing {sorted(set(p['labels']) - labels)}")
        if restricted:
            issues.append("VIEW RESTRICTED")
        problems += bool(issues)
        print(f"{'ok      ' if not issues else 'PROBLEM '} {live['id']:>12}  {p['folder']:24} {p['title']}"
              + (f"  [{'; '.join(issues)}]" if issues else ""))
    known = {p["title"] for p in index["pages"]} | set(index["folders"])
    extra = sorted(t for t, v in pages.items() if t not in known and v["id"] != space["homepageId"])
    print(f"\n{len(index['pages']) - problems} of {len(index['pages'])} pages ok. "
          f"Other pages in the space: {', '.join(extra) if extra else 'none'}")
    return problems == 0


def validate(index):
    bad = 0
    for p in index["pages"]:
        try:
            ET.fromstring(f"<root {NS}>{(HERE / p['file']).read_text()}</root>")
        except ET.ParseError as e:
            bad += 1
            print(f"  not well-formed: {p['file']}: {e}")
    print(f"validate: {len(index['pages']) - bad} of {len(index['pages'])} pages well-formed")
    return bad == 0


def find_space(key):
    d = call("GET", f"/wiki/api/v2/spaces?keys={urllib.parse.quote(key)}")
    res = d.get("results", [])
    return res[0] if res else None


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dry-run", action="store_true", help="print the plan; only GET requests, and none without credentials")
    ap.add_argument("--update", action="store_true", help="push the local body to existing pages whose body differs")
    ap.add_argument("--validate", action="store_true", help="only check that page files are well-formed XML")
    ap.add_argument("--verify", action="store_true", help="read-only check of the live space against index.json")
    args = ap.parse_args()

    index = load_index()
    if not validate(index):
        sys.exit(1)
    if args.validate:
        return

    space_def = index["space"]
    key = space_def["key"]
    online = _auth() is not None
    if args.verify:
        space = find_space(key)
        if not space:
            sys.exit(f"space {key} not found on {SITE}")
        sys.exit(0 if verify(index, space) else 1)
    keys = jira_keys(offline=args.dry_run and not online)
    for p in index["pages"]:
        body_for(p, keys)  # fail early on an unknown token
    if args.dry_run and not online:
        print(f"\nOffline plan for {BASE} (no credentials, so existing content is not checked):")
        print(f"  space {key} '{space_def['name']}': create if missing")
        for f in index["folders"]:
            print(f"  folder '{f}': create under the space homepage if missing")
        for p in index["pages"]:
            print(f"  page '{p['title']}' in '{p['folder']}' labels={','.join(p['labels'])}")
        print(f"\n{len(index['folders'])} folders, {len(index['pages'])} pages.")
        return

    plan = {"create": 0, "skip": 0, "update": 0}

    # 1. Space
    space = find_space(key)
    if space:
        print(f"space {key}: exists (id {space['id']})")
    elif args.dry_run:
        print(f"space {key}: would create '{space_def['name']}'")
    else:
        call("POST", "/wiki/rest/api/space", {
            "key": key,
            "name": space_def["name"],
            "description": {"plain": {"value": space_def["description"], "representation": "plain"}},
        })
        space = find_space(key)
        print(f"space {key}: created (id {space['id']})")

    if not space:
        # Dry run against a site without the space: everything below would be created.
        for f in index["folders"]:
            print(f"folder '{f}': would create")
        for p in index["pages"]:
            print(f"page '{p['title']}': would create in '{p['folder']}' with labels {', '.join(p['labels'])}")
        print(f"\nplan: create 1 space, {len(index['folders'])} folders, {len(index['pages'])} pages")
        return

    space_id, home_id = space["id"], space.get("homepageId")

    # 2. Folders under the homepage
    existing_children = {}
    if home_id:
        for c in paged(f"/wiki/api/v2/pages/{home_id}/direct-children?limit=250"):
            existing_children[c["title"]] = c
    folder_ids = {}
    for title in index["folders"]:
        child = existing_children.get(title)
        if child:
            folder_ids[title] = child["id"]
            print(f"folder '{title}': exists ({child.get('type', '?')} {child['id']})")
            continue
        if args.dry_run:
            print(f"folder '{title}': would create")
            folder_ids[title] = None
            continue
        body = {"spaceId": space_id, "title": title}
        if home_id:
            body["parentId"] = home_id
        try:
            folder_ids[title] = call("POST", "/wiki/api/v2/folders", body)["id"]
            print(f"folder '{title}': created")
        except ApiError as e:
            # Fallback for sites without folders: a plain section page.
            print(f"folder '{title}': folder create failed ({e.status}); creating a section page instead")
            page = call("POST", "/wiki/api/v2/pages", {
                "spaceId": space_id, "status": "current", "title": title,
                **({"parentId": home_id} if home_id else {}),
                "body": {"representation": "storage",
                         "value": f"<p>{title} for the payments platform.</p><ac:structured-macro ac:name=\"children\" ac:schema-version=\"2\" />"},
            })
            folder_ids[title] = page["id"]

    # 3. Pages
    existing = {p["title"]: p for p in paged(f"/wiki/api/v2/spaces/{space_id}/pages?limit=250&status=current")}
    for p in index["pages"]:
        title, value = p["title"], body_for(p, keys)
        if title in existing:
            if not args.dry_run:
                add_labels(existing[title]["id"], p["labels"])
            ensure_unrestricted(existing[title]["id"], title, args.dry_run)
            if not args.update:
                plan["skip"] += 1
                print(f"page '{title}': exists, skipped (labels and restrictions checked)")
                continue
            cur = call("GET", f"/wiki/api/v2/pages/{existing[title]['id']}?body-format=storage")
            if cur.get("body", {}).get("storage", {}).get("value", "").strip() == value.strip():
                plan["skip"] += 1
                print(f"page '{title}': exists, body unchanged")
                continue
            plan["update"] += 1
            if args.dry_run:
                print(f"page '{title}': would update body (version {cur['version']['number'] + 1})")
                continue
            call("PUT", f"/wiki/api/v2/pages/{cur['id']}", {
                "id": cur["id"], "status": "current", "title": title,
                "body": {"representation": "storage", "value": value},
                "version": {"number": cur["version"]["number"] + 1, "message": "Doc Drift demo seed: content refresh"},
            })
            print(f"page '{title}': updated")
            continue
        plan["create"] += 1
        if args.dry_run:
            print(f"page '{title}': would create in '{p['folder']}' with labels {', '.join(p['labels'])}")
            continue
        body = {"spaceId": space_id, "status": "current", "title": title,
                "body": {"representation": "storage", "value": value}}
        parent = folder_ids.get(p["folder"]) or home_id
        if parent:
            body["parentId"] = parent
        created = call("POST", "/wiki/api/v2/pages", body)
        add_labels(created["id"], p["labels"])
        ensure_unrestricted(created["id"], title, False)
        print(f"page '{title}': created ({created['id']}), {len(p['labels'])} labels")

    verb = "would" if args.dry_run else "did"
    print(f"\npages: {verb} create {plan['create']}, update {plan['update']}, skip {plan['skip']}")
    print(f"space: {BASE}/wiki/spaces/{key}")


if __name__ == "__main__":
    try:
        main()
    except ApiError as e:
        sys.exit(str(e))
