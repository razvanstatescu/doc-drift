#!/usr/bin/env python3
"""Seed the Doc Drift Sentinel demo project PAY in Jira Cloud, and run the Jira demo beats.

Pages in PLAT cite fixed keys (PAY-142, PAY-158, PAY-170, ...). Jira assigns keys itself, so
`seed` reserves the numbers in between: it creates placeholder issues and deletes them at once.
Deleted issues still use up their number, so the next real issue gets the key it should.
This assumes a fresh project (or one seeded only by this script). If a created key ever differs
from issues.json, the script stops and says so.

Usage (from the repo root, with .env loaded):
  set -a; . ./.env; set +a
  python3 -I demo/seed/jira/seed_jira.py seed --dry-run        # print the plan, write nothing
  python3 -I demo/seed/jira/seed_jira.py seed                  # project, versions, epics, stories
  python3 -I demo/seed/jira/seed_jira.py wontdo PAY-170        # demo beat: flips the ADR-015 page
  python3 -I demo/seed/jira/seed_jira.py fixversion PAY-158 2027.01   # flips the ADR-009 page
  python3 -I demo/seed/jira/seed_jira.py reset-demo            # undo both beats for a rehearsal
Every command accepts --dry-run.

Environment:
  ATLASSIAN_EMAIL, ATLASSIAN_API_TOKEN   required, except for an offline --dry-run
  ATLASSIAN_SITE                          default one-atlas-jzzf.atlassian.net
The account needs the Administer Jira global permission to create the project.

REST endpoints (Jira Cloud REST v3, checked against the OpenAPI spec, 2026-11-11):
  GET  /rest/api/3/myself                                       lead account id
  GET  /rest/api/3/project/{key}, POST /rest/api/3/project      project (company-managed scrum)
  GET  /rest/api/3/project/{key}/versions, POST /rest/api/3/version
  GET  /rest/api/3/issue/createmeta/{key}/issuetypes[/{id}]     issue type ids, required fields
  POST /rest/api/3/search/jql                                   existing issues (enhanced search)
  POST /rest/api/3/issue, POST /rest/api/3/issue/bulk, DELETE /rest/api/3/issue/{key}
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
from pathlib import Path

HERE = Path(__file__).resolve().parent
SITE = os.environ.get("ATLASSIAN_SITE", "one-atlas-jzzf.atlassian.net").removeprefix("https://").rstrip("/")
BASE = f"https://{SITE}"
PLACEHOLDER = "Key reservation placeholder (deleted by the demo seed)"
DATA = json.loads((HERE / "issues.json").read_text())
PKEY = DATA["project"]["key"]


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


def num(key):
    return int(key.rsplit("-", 1)[1])


def adf(text):
    return {"type": "doc", "version": 1,
            "content": [{"type": "paragraph", "content": [{"type": "text", "text": text}]}]}


def get_project():
    try:
        return call("GET", f"/rest/api/3/project/{PKEY}")
    except ApiError as e:
        if e.status == 404:
            return None
        raise


def existing_issues():
    """Map summary -> {key, status, fixVersions}, plus the highest key number seen."""
    out, token, top = {}, None, 0
    while True:
        body = {"jql": f"project = {PKEY} ORDER BY key ASC", "maxResults": 100,
                "fields": ["summary", "status", "fixVersions"]}
        if token:
            body["nextPageToken"] = token
        d = call("POST", "/rest/api/3/search/jql", body)
        for i in d.get("issues", []):
            f = i["fields"]
            out[f["summary"]] = {"key": i["key"], "status": f["status"]["name"],
                                 "fixVersions": [v["name"] for v in f.get("fixVersions") or []]}
            top = max(top, num(i["key"]))
        token = d.get("nextPageToken")
        if not token or d.get("isLast", True):
            return out, top


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


def reserve(task_type, start, stop, dry):
    """Use up key numbers start..stop-1 by creating and deleting placeholders."""
    count = stop - start
    if count <= 0:
        return
    if dry:
        print(f"  would reserve {PKEY}-{start} to {PKEY}-{stop - 1} ({count} placeholders, created then deleted)")
        return
    made = []
    while len(made) < count:
        n = min(50, count - len(made))
        d = call("POST", "/rest/api/3/issue/bulk", {"issueUpdates": [
            {"fields": {"project": {"key": PKEY}, "issuetype": {"id": task_type}, "summary": PLACEHOLDER}}
            for _ in range(n)]})
        if d.get("errors"):
            sys.exit(f"placeholder bulk create failed: {json.dumps(d['errors'])[:400]}")
        made += [i["key"] for i in d["issues"]]
    for k in made:
        call("DELETE", f"/rest/api/3/issue/{k}")
    last = max(num(k) for k in made)
    print(f"  reserved {PKEY}-{start} to {PKEY}-{last} ({len(made)} placeholders deleted)")
    if last != stop - 1:
        sys.exit(f"key counter is off: expected the last placeholder to be {PKEY}-{stop - 1}, got {PKEY}-{last}. "
                 "Someone else created issues in this project, or it is not fresh. Stopping.")


def cmd_seed(dry):
    online = _auth() is not None
    issues = sorted(DATA["issues"], key=lambda i: num(i["key"]))
    if dry and not online:
        print(f"Offline plan for {BASE} (no credentials, so existing content is not checked):")
        print(f"  project {PKEY} '{DATA['project']['name']}' ({DATA['project']['projectTemplateKey']})")
        print(f"  versions: {', '.join(v['name'] for v in DATA['versions'])}")
        nxt = 1
        for i in issues:
            gap = num(i["key"]) - nxt
            if gap:
                print(f"  reserve {gap} key numbers")
            fv = f" fixVersion {','.join(i['fixVersions'])}" if i.get("fixVersions") else ""
            parent = f" parent {i['parent']}" if i.get("parent") else ""
            print(f"  {i['key']} {i['type']:5} {i['status']:11} {i['summary']}{parent}{fv}")
            nxt = num(i["key"]) + 1
        print(f"\n{len(issues)} issues, {num(issues[-1]['key']) - len(issues)} placeholder keys.")
        return

    me = call("GET", "/rest/api/3/myself")
    project = get_project()
    if project:
        print(f"project {PKEY}: exists (id {project['id']})")
    elif dry:
        print(f"project {PKEY}: would create '{DATA['project']['name']}' with lead {me.get('displayName', 'you')}")
    else:
        p = DATA["project"]
        call("POST", "/rest/api/3/project", {
            "key": PKEY, "name": p["name"], "description": p["description"],
            "projectTypeKey": p["projectTypeKey"], "projectTemplateKey": p["projectTemplateKey"],
            "leadAccountId": me["accountId"], "assigneeType": "UNASSIGNED"})
        project = get_project()
        print(f"project {PKEY}: created (id {project['id']})")

    if not project:
        cmd_seed_plan_only(issues)
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
    task_type = types.get("Task") or types.get("Story")
    extra = {name: required_extra_fields(tid) for name, tid in types.items() if name in ("Epic", "Story", "Task")}
    existing, top = existing_issues()
    nxt = top + 1
    created = skipped = 0
    for i in issues:
        target = num(i["key"])
        if i["summary"] in existing:
            got = existing[i["summary"]]["key"]
            note = "" if got == i["key"] else f"  WARNING: expected {i['key']}, pages will cite the wrong key"
            print(f"{i['key']}: exists as {got}, skipped{note}")
            skipped += 1
            continue
        if target < nxt:
            sys.exit(f"{i['key']} cannot be created: the project counter is already past {target}. "
                     "Use a fresh project (delete PAY and run again).")
        reserve(task_type, nxt, target, dry)
        tname = i["type"] if i["type"] in types else "Story" if "Story" in types else "Task"
        fields = {"project": {"key": PKEY}, "issuetype": {"id": types[tname]}, "summary": i["summary"],
                  "description": adf(i["description"]), "labels": DATA["labels"]}
        if i.get("parent"):
            fields["parent"] = {"key": i["parent"]}
        if i.get("fixVersions"):
            fields["fixVersions"] = [{"id": have[v]} if v in have else {"name": v} for v in i["fixVersions"]]
        for fid, fname in extra.get(tname, []):
            if fname.lower() == "epic name":
                fields[fid] = i["summary"]
            else:
                print(f"  note: {tname} requires '{fname}' ({fid}); not set by this script")
        if dry:
            print(f"{i['key']}: would create {tname} '{i['summary']}'"
                  + (f", then move to {i['status']}" if i["status"] != "To Do" else ""))
            nxt = target + 1
            created += 1
            continue
        d = call("POST", "/rest/api/3/issue", {"fields": fields})
        if d["key"] != i["key"]:
            sys.exit(f"created {d['key']} but expected {i['key']}. Stopping so pages and Jira stay in step.")
        print(f"{i['key']}: created {tname} '{i['summary']}'")
        if i["status"] != "To Do":
            transition_to(i["key"], i["status"], dry)
        nxt = target + 1
        created += 1
    verb = "would create" if dry else "created"
    print(f"\nissues: {verb} {created}, skipped {skipped}. Board: {BASE}/jira/software/c/projects/{PKEY}/issues")


def cmd_seed_plan_only(issues):
    print(f"versions: would create {', '.join(v['name'] for v in DATA['versions'])}")
    nxt = 1
    for i in issues:
        gap = num(i["key"]) - nxt
        if gap:
            print(f"  would reserve {gap} key numbers")
        print(f"{i['key']}: would create {i['type']} '{i['summary']}'")
        nxt = num(i["key"]) + 1


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
    wkey = demo["wontDo"]["key"]
    status = next(i["status"] for i in DATA["issues"] if i["key"] == wkey)
    transition_to(wkey, status, dry)
    f = demo["fixVersionChange"]
    cmd_fixversion(f["key"], f["from"], dry)
    print("Mark ADR-015 and ADR-009 as Verified again in the Doc Drift badge before the next take.")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("command", choices=["seed", "wontdo", "fixversion", "reset-demo"])
    ap.add_argument("args", nargs="*")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    if a.command != "seed" and _auth() is None and a.dry_run:
        print(f"offline dry run: would run {a.command} {' '.join(a.args)} against {BASE}")
        return
    if a.command == "seed":
        cmd_seed(a.dry_run)
    elif a.command == "wontdo":
        cmd_wontdo(a.args[0] if a.args else DATA["demo"]["wontDo"]["key"], a.dry_run)
    elif a.command == "fixversion":
        f = DATA["demo"]["fixVersionChange"]
        key, name = (a.args + [None, None])[:2]
        cmd_fixversion(key or f["key"], name or f["to"], a.dry_run)
    else:
        cmd_reset(a.dry_run)


if __name__ == "__main__":
    try:
        main()
    except ApiError as e:
        sys.exit(str(e))
