#!/usr/bin/env python3
"""Read-only snapshot of the demo state: PLAT bylines and versions, the runbook body, the Bitbucket
repo, and the Jira epics the shoot may touch. Writes JSON to the path given (before.json / after.json).

  set -a; . ../../../.env; set +a
  python3 -I tools/capture/state.py tools/capture/before.json [--body-file tools/capture/runbook-before.xhtml]
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import cap as s  # noqa: E402

EPICS = ["PAY-6", "PAY-18", "PAY-15"]


def confluence():
    sid, space, pages = s.plat_pages()
    rows = []
    for p in sorted(pages, key=lambda x: x["title"]):
        b = s.byline(p["id"])
        rows.append({
            "id": p["id"],
            "title": p["title"],
            "version": (p.get("version") or {}).get("number"),
            "parentId": p.get("parentId"),
            "bylineTitle": (b or {}).get("title"),
            "bylineTooltip": (b or {}).get("tooltip"),
            "state": s.state_of_title((b or {}).get("title")),
        })
    home = space.get("homepageId")
    counted = [r for r in rows if r["id"] != home]
    summary = {
        "pagesInListing": len(rows),
        "homepageId": home,
        "totalExcludingHome": len(counted),
        "anchored": sum(1 for r in counted if r["state"] in ("verified", "possibly_stale", "stale")),
        "verified": sum(1 for r in counted if r["state"] == "verified"),
        "possiblyStale": sum(1 for r in counted if r["state"] == "possibly_stale"),
        "stale": sum(1 for r in counted if r["state"] == "stale"),
        "unanchored": sum(1 for r in counted if r["state"].startswith("unanchored")),
    }
    return {"spaceId": sid, "spaceKey": "PLAT", "pages": rows, "summary": summary}


def runbook(body_file=None):
    d = s.page(s.RUNBOOK_ID, body=True)
    storage = d["body"]["storage"]["value"]
    if body_file:
        Path(body_file).write_text(storage)
    b = s.byline(s.RUNBOOK_ID)
    return {
        "id": s.RUNBOOK_ID,
        "title": d["title"],
        "version": d["version"]["number"],
        "versionMessage": d["version"].get("message"),
        "versionCreatedAt": d["version"].get("createdAt"),
        "ownerId": d.get("ownerId"),
        "bodyFile": str(Path(body_file).name) if body_file else None,
        "bodyLength": len(storage),
        "mentionsRollbackSh": "scripts/rollback.sh" in storage,
        "mentionsRollbackV2": "rollback-v2.sh" in storage,
        "mentionsTimeoutVar": "ROLLBACK_TIMEOUT" in storage,
        "mentionsTimeoutSecs": "ROLLBACK_TIMEOUT_SECS" in storage,
        "byline": b,
        "state": s.state_of_title((b or {}).get("title")),
    }


def bitbucket():
    st, repo, _ = s.bb("GET", s.bb_repo("?fields=mainbranch.name,full_name,slug,uuid,is_private"))
    main = (repo.get("mainbranch") or {}).get("name", "main")
    head = s.bb_branch_head(main)
    branches = [{"name": b["name"], "head": b["target"]["hash"][:12], "message": b["target"]["message"].strip().splitlines()[0][:80]}
                for b in s.bb_paged(s.bb_repo("/refs/branches?pagelen=100"))]
    highest, recent = s.bb_highest_pr()
    open_prs = [{"id": p["id"], "title": p["title"], "source": p["source"]["branch"]["name"], "destination": p["destination"]["branch"]["name"]}
                for p in s.bb_paged(s.bb_repo("/pullrequests?state=OPEN&pagelen=50"))]
    rollback = s.bb_file(head, "scripts/rollback.sh")
    values = s.bb_file(head, "deploy/helm/values.yaml")
    return {
        "repo": repo.get("full_name"),
        "uuid": repo.get("uuid"),
        "defaultBranch": main,
        "mainHead": head[:12] if head else None,
        "rollbackShOnMain": rollback is not None,
        "rollbackV2OnMain": s.bb_file(head, "scripts/rollback-v2.sh") is not None,
        "rollbackShUsesTimeoutVar": bool(rollback and b"ROLLBACK_TIMEOUT:-" in rollback),
        "valuesYamlHasRollbackTimeout": bool(values and b"ROLLBACK_TIMEOUT:" in values),
        "valuesYamlHasRollbackTimeoutSecs": bool(values and b"ROLLBACK_TIMEOUT_SECS" in values),
        "branches": branches,
        "highestPrId": highest,
        "recentPrs": recent,
        "openPrs": open_prs,
    }


def jira():
    out = {}
    for key in EPICS:
        st, d, _ = s.atl("GET", f"/rest/api/3/issue/{key}?fields=summary,status,resolution,issuetype,labels")
        if st != 200:
            out[key] = {"error": st}
            continue
        f = d["fields"]
        st2, t, _ = s.atl("GET", f"/rest/api/3/issue/{key}/transitions")
        out[key] = {
            "summary": f["summary"],
            "type": f["issuetype"]["name"],
            "status": f["status"]["name"],
            "statusCategory": f["status"]["statusCategory"]["key"],
            "resolution": (f.get("resolution") or {}).get("name"),
            "transitions": [{"id": x["id"], "name": x["name"], "to": x["to"]["name"]} for x in (t or {}).get("transitions", [])],
        }
    return out


def main():
    out = sys.argv[1]
    body_file = None
    if "--body-file" in sys.argv:
        body_file = sys.argv[sys.argv.index("--body-file") + 1]
    snap = {"takenAt": s.now_iso(), "site": s.SITE}
    snap["confluence"] = confluence()
    snap["runbook"] = runbook(body_file)
    snap["bitbucket"] = bitbucket()
    snap["jira"] = jira()
    prev = {}
    if Path(out).exists():
        try:
            prev = json.loads(Path(out).read_text())
        except Exception:
            prev = {}
    for k in ("settings", "runbookAnchors", "notes"):
        if k in prev:
            snap[k] = prev[k]
    s.write_json(out, snap)
    c = snap["confluence"]["summary"]
    print(json.dumps({"summary": c, "runbook": {k: snap["runbook"][k] for k in ("version", "state", "mentionsRollbackSh", "mentionsTimeoutVar")},
                      "bb": {k: snap["bitbucket"][k] for k in ("defaultBranch", "mainHead", "rollbackShOnMain", "rollbackV2OnMain", "highestPrId")},
                      "branches": [b["name"] for b in snap["bitbucket"]["branches"]],
                      "openPrs": snap["bitbucket"]["openPrs"],
                      "jira": {k: (v.get("status"), v.get("resolution")) for k, v in snap["jira"].items()}}, indent=1))


if __name__ == "__main__":
    main()
