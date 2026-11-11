#!/usr/bin/env python3
"""Seed the Doc Drift Sentinel demo project PAY in Jira Cloud, and run the Jira demo beats.

Keys are templated (D25). issues.json names each issue by a stable `ref` (for example
`rollback-epic`), and pages cite it as the token `{{PAY:rollback-epic}}`. Jira assigns the real
key; `seed` records ref -> key in keymap.json next to this script, and seed_confluence.py and
bb_seed.py replace the tokens from it. keymap.json is site-specific and git-ignored.
`exampleKey` in issues.json is the illustrative key from the original plan (PAY-142 and so on).
It is used only by offline dry runs, never written to the site.

Idempotent: an issue whose summary already exists in PAY is reused, not created again, and the
keymap is rebuilt from what is there. Running `seed` twice creates nothing the second time.

Usage (from the repo root, with .env loaded):
  set -a; . ./.env; set +a
  python3 -I demo/seed/jira/seed_jira.py seed --dry-run        # print the plan, write nothing
  python3 -I demo/seed/jira/seed_jira.py seed                  # project, versions, epics, stories, keymap
  python3 -I demo/seed/jira/seed_jira.py keymap                # rebuild keymap.json only (no writes to Jira)
  python3 -I demo/seed/jira/seed_jira.py wontdo                # demo beat: multi-region-epic to Won't Do (ADR-015)
  python3 -I demo/seed/jira/seed_jira.py fixversion            # demo beat: remove-v1-refunds 2026.12 -> 2027.01 (ADR-009)
  python3 -I demo/seed/jira/seed_jira.py reset-demo            # undo both beats for another take
`wontdo` and `fixversion` also take an explicit ref or key, and `fixversion` a version name:
  python3 -I demo/seed/jira/seed_jira.py fixversion remove-v1-refunds 2027.01
Every command accepts --dry-run.

Environment:
  ATLASSIAN_EMAIL, ATLASSIAN_API_TOKEN   required, except for an offline --dry-run
  ATLASSIAN_SITE                          default one-atlas-jzzf.atlassian.net
The account needs the Administer Jira global permission to create the project.

REST endpoints (Jira Cloud REST v3):
  GET  /rest/api/3/myself                                       lead account id
  GET  /rest/api/3/project/{key}, POST /rest/api/3/project      project (company-managed)
  GET  /rest/api/3/project/{key}/versions, POST /rest/api/3/version
  GET  /rest/api/3/issue/createmeta/{key}/issuetypes[/{id}]     issue type ids, required fields
  POST /rest/api/3/search/jql                                   existing issues (enhanced search)
  POST /rest/api/3/issue
  GET/POST /rest/api/3/issue/{key}/transitions, PUT /rest/api/3/issue/{key}
The token is never printed.
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
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
SITE = os.environ.get("ATLASSIAN_SITE", "one-atlas-jzzf.atlassian.net").removeprefix("https://").rstrip("/")
BASE = f"https://{SITE}"
DATA = json.loads((HERE / "issues.json").read_text())
PKEY = DATA["project"]["key"]
KEYMAP = HERE / "keymap.json"
TOKEN = re.compile(r"\{\{PAY:([a-z0-9-]+)\}\}")
# Tried in order. Company-managed Scrum first: To Do / In Progress / Done, epics, versions.
TEMPLATES = [DATA["project"]["projectTemplateKey"],
             "com.pyxis.greenhopper.jira:gh-simplified-kanban-classic",
             "com.pyxis.greenhopper.jira:gh-simplified-basic"]


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
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method)
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
            msg = "; ".join(j.get("errorMessages", [])) or json.dumps(j.get("errors", j))
        except Exception:
            msg = raw[:500]
        raise ApiError(e.code, method, path.split("?")[0], msg) from None


def adf(text):
    return {"type": "doc", "version": 1,
            "content": [{"type": "paragraph", "content": [{"type": "text", "text": text}]}]}


def resolve_text(text, keys):
    """Replace {{PAY:ref}} tokens (issues.json text may mention other issues)."""
    return TOKEN.sub(lambda m: keys.get(m.group(1), m.group(0)), text)


def get_project():
    try:
        return call("GET", f"/rest/api/3/project/{PKEY}")
    except ApiError as e:
        if e.status == 404:
            return None
        raise


def existing_issues():
    """Map summary -> {key, status, fixVersions}."""
    out, token = {}, None
    while True:
        body = {"jql": f"project = {PKEY} ORDER BY key ASC", "maxResults": 100,
                "fields": ["summary", "status", "fixVersions"]}
        if token:
            body["nextPageToken"] = token
        d = call("POST", "/rest/api/3/search/jql", body)
        for i in d.get("issues", []):
            f = i["fields"]
            out.setdefault(f["summary"], {"key": i["key"], "status": f["status"]["name"],
                                          "fixVersions": [v["name"] for v in f.get("fixVersions") or []]})
        token = d.get("nextPageToken")
        if not token or d.get("isLast", True):
            return out


def issue_types():
    d = call("GET", f"/rest/api/3/issue/createmeta/{PKEY}/issuetypes?maxResults=200")
    return {t["name"]: t["id"] for t in d.get("issueTypes", d.get("createMetaIssueType", []))}


def required_extra_fields(type_id):
    """Required fields beyond the ones we always send (older sites still require Epic Name)."""
    d = call("GET", f"/rest/api/3/issue/createmeta/{PKEY}/issuetypes/{type_id}?maxResults=200")
    fields = d.get("fields", d.get("results", []))
    known = {"project", "issuetype", "summary", "reporter", "description", "parent", "labels", "fixVersions"}
    return [(f["fieldId"], f["name"]) for f in fields if f.get("required") and f["fieldId"] not in known
            and not f.get("hasDefaultValue")]


def transition_to(key, status, dry):
    ts = call("GET", f"/rest/api/3/issue/{key}/transitions")["transitions"]
    t = next((t for t in ts if t["to"]["name"].lower() == status.lower()), None)
    if not t:
        print(f"  {key}: no transition to '{status}' (available: {', '.join(x['to']['name'] for x in ts)})")
        return False
    if dry:
        print(f"  {key}: would transition to {status}")
        return True
    call("POST", f"/rest/api/3/issue/{key}/transitions", {"transition": {"id": t["id"]}})
    print(f"  {key}: moved to {status}")
    return True


def write_keymap(keys):
    missing = [i["ref"] for i in DATA["issues"] if i["ref"] not in keys]
    KEYMAP.write_text(json.dumps({
        "site": SITE, "project": PKEY,
        "generated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "keys": {i["ref"]: keys[i["ref"]] for i in DATA["issues"] if i["ref"] in keys},
    }, indent=2) + "\n")
    print(f"keymap: {len(keys)} refs written to {KEYMAP.relative_to(HERE.parent.parent.parent)}"
          + (f" (missing: {', '.join(missing)})" if missing else ""))


def load_keymap():
    if not KEYMAP.exists():
        sys.exit(f"{KEYMAP.name} not found. Run `seed_jira.py seed` (or `keymap`) first.")
    km = json.loads(KEYMAP.read_text())
    if km.get("site") != SITE:
        sys.exit(f"{KEYMAP.name} was written for {km.get('site')}, not {SITE}. Run `seed_jira.py keymap`.")
    return km["keys"]


def create_project(me):
    p = DATA["project"]
    last = None
    for tpl in TEMPLATES:
        try:
            call("POST", "/rest/api/3/project", {
                "key": PKEY, "name": p["name"], "description": p["description"],
                "projectTypeKey": p["projectTypeKey"], "projectTemplateKey": tpl,
                "leadAccountId": me["accountId"], "assigneeType": "UNASSIGNED"})
            print(f"project {PKEY}: created from template {tpl}")
            return get_project()
        except ApiError as e:
            print(f"project {PKEY}: template {tpl} refused ({e})")
            last = e
    raise last


def cmd_seed(dry):
    issues = DATA["issues"]
    if dry and _auth() is None:
        print(f"Offline plan for {BASE} (no credentials, so existing content is not checked):")
        print(f"  project {PKEY} '{DATA['project']['name']}' ({DATA['project']['projectTemplateKey']})")
        print(f"  versions: {', '.join(v['name'] for v in DATA['versions'])}")
        for i in issues:
            fv = f" fixVersion {','.join(i['fixVersions'])}" if i.get("fixVersions") else ""
            parent = f" parent {i['parent']}" if i.get("parent") else ""
            print(f"  {i['ref']:32} {i['type']:5} {i['status']:11} {i['summary']}{parent}{fv}")
        print(f"\n{len(issues)} issues. Keys are assigned by Jira and written to {KEYMAP.name}.")
        return

    me = call("GET", "/rest/api/3/myself")
    project = get_project()
    if project:
        print(f"project {PKEY}: exists (id {project['id']}, {project.get('style', '?')}, "
              f"{project.get('projectTypeKey', '?')})")
    elif dry:
        print(f"project {PKEY}: would create '{DATA['project']['name']}' with lead {me.get('displayName', 'you')}")
    else:
        project = create_project(me)

    if not project:
        print(f"versions: would create {', '.join(v['name'] for v in DATA['versions'])}")
        for i in issues:
            print(f"{i['ref']}: would create {i['type']} '{i['summary']}'")
        return

    have = {v["name"]: v["id"] for v in call("GET", f"/rest/api/3/project/{PKEY}/versions")}
    for v in DATA["versions"]:
        if v["name"] in have:
            print(f"version {v['name']}: exists")
        elif dry:
            print(f"version {v['name']}: would create")
        else:
            have[v["name"]] = call("POST", "/rest/api/3/version", {
                "name": v["name"], "projectId": int(project["id"]),
                "releaseDate": v["releaseDate"], "description": v["description"]})["id"]
            print(f"version {v['name']}: created")

    types = issue_types()
    extra = {name: required_extra_fields(tid) for name, tid in types.items() if name in ("Epic", "Story", "Task")}
    existing = existing_issues()
    keys = {i["ref"]: existing[i["summary"]]["key"] for i in issues if i["summary"] in existing}
    created = skipped = 0
    for i in issues:
        ref = i["ref"]
        if ref in keys:
            print(f"{ref}: exists as {keys[ref]}, skipped")
            skipped += 1
            continue
        tname = i["type"] if i["type"] in types else "Story" if "Story" in types else "Task"
        fields = {"project": {"key": PKEY}, "issuetype": {"id": types[tname]}, "summary": i["summary"],
                  "description": adf(resolve_text(i["description"], keys)), "labels": DATA["labels"]}
        if i.get("parent"):
            if i["parent"] not in keys and not dry:
                sys.exit(f"{ref}: parent {i['parent']} has no key yet; issues.json must list parents first")
            fields["parent"] = {"key": keys.get(i["parent"], i["parent"])}
        if i.get("fixVersions"):
            fields["fixVersions"] = [{"id": have[v]} if v in have else {"name": v} for v in i["fixVersions"]]
        for fid, fname in extra.get(tname, []):
            if fname.lower() == "epic name":
                fields[fid] = i["summary"]
            else:
                print(f"  note: {tname} requires '{fname}' ({fid}); not set by this script")
        if dry:
            print(f"{ref}: would create {tname} '{i['summary']}'"
                  + (f", then move to {i['status']}" if i["status"] != "To Do" else ""))
            created += 1
            continue
        d = call("POST", "/rest/api/3/issue", {"fields": fields})
        keys[ref] = d["key"]
        print(f"{ref}: created {d['key']} {tname} '{i['summary']}'")
        if i["status"] != "To Do":
            transition_to(d["key"], i["status"], dry)
        created += 1
    verb = "would create" if dry else "created"
    print(f"\nissues: {verb} {created}, skipped {skipped}. Board: {BASE}/jira/software/c/projects/{PKEY}/issues")
    if not dry:
        write_keymap(keys)


def cmd_keymap():
    existing = existing_issues()
    keys = {i["ref"]: existing[i["summary"]]["key"] for i in DATA["issues"] if i["summary"] in existing}
    for i in DATA["issues"]:
        print(f"  {i['ref']:32} {keys.get(i['ref'], 'MISSING')}")
    write_keymap(keys)


def to_key(ref_or_key):
    if re.fullmatch(rf"{PKEY}-\d+", ref_or_key):
        return ref_or_key
    keys = load_keymap()
    if ref_or_key not in keys:
        sys.exit(f"unknown ref '{ref_or_key}' (not in {KEYMAP.name})")
    return keys[ref_or_key]


WONT = re.compile(r"won.?t do", re.I)


def cmd_wontdo(key, dry):
    ts = call("GET", f"/rest/api/3/issue/{key}/transitions?expand=transitions.fields")["transitions"]
    t = next((t for t in ts if WONT.search(t["to"]["name"]) or WONT.search(t["name"])), None)
    fields = {}
    if not t:
        t = next((t for t in ts if t["to"].get("statusCategory", {}).get("key") == "done"), None)
        if not t:
            sys.exit(f"{key}: no Won't Do or Done transition available")
        if "resolution" in t.get("fields", {}):
            fields = {"resolution": {"name": "Won't Do"}}
    label = t["to"]["name"] + (" with resolution Won't Do" if fields else "")
    if dry:
        print(f"{key}: would move to {label}")
        return
    body = {"transition": {"id": t["id"]}}
    if fields:
        body["fields"] = fields
    call("POST", f"/rest/api/3/issue/{key}/transitions", body)
    print(f"{key}: moved to {label}")
    if not WONT.search(t["to"]["name"]) and not fields:
        print("  note: this workflow has no Won't Do status and no resolution screen, so the issue is Done. "
              "The Jira rule scores Done and Won't Do the same (0.7).")


def version_id(name):
    for v in call("GET", f"/rest/api/3/project/{PKEY}/versions"):
        if v["name"] == name:
            return v["id"]
    sys.exit(f"version {name} not found in {PKEY}; run seed first")


def cmd_fixversion(key, name, dry):
    vid = version_id(name)
    if dry:
        print(f"{key}: would set fixVersions to {name}")
        return
    call("PUT", f"/rest/api/3/issue/{key}", {"fields": {"fixVersions": [{"id": vid}]}})
    print(f"{key}: fixVersions set to {name}")


def cmd_reset(dry):
    demo = DATA["demo"]
    wref = demo["wontDo"]["ref"]
    status = next(i["status"] for i in DATA["issues"] if i["ref"] == wref)
    transition_to(to_key(wref), status, dry)
    f = demo["fixVersionChange"]
    cmd_fixversion(to_key(f["ref"]), f["from"], dry)
    print("Mark ADR-015 and ADR-009 as Verified again in the Doc Drift badge before the next take.")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("command", choices=["seed", "keymap", "wontdo", "fixversion", "reset-demo"])
    ap.add_argument("args", nargs="*")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    if a.command != "seed" and _auth() is None and a.dry_run:
        print(f"offline dry run: would run {a.command} {' '.join(a.args)} against {BASE}")
        return
    if a.command == "seed":
        cmd_seed(a.dry_run)
    elif a.command == "keymap":
        cmd_keymap()
    elif a.command == "wontdo":
        cmd_wontdo(to_key(a.args[0] if a.args else DATA["demo"]["wontDo"]["ref"]), a.dry_run)
    elif a.command == "fixversion":
        f = DATA["demo"]["fixVersionChange"]
        ref, name = (a.args + [None, None])[:2]
        cmd_fixversion(to_key(ref or f["ref"]), name or f["to"], a.dry_run)
    else:
        cmd_reset(a.dry_run)


if __name__ == "__main__":
    try:
        main()
    except ApiError as e:
        sys.exit(str(e))
