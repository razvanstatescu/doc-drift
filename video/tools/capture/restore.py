#!/usr/bin/env python3
"""Step 11: put the demo back. Sub-commands (each logs what it did):

  body     PUT the runbook's pre-shoot storage (runbook-before.xhtml) as a new version
  pay18    move PAY-18 back to its pre-shoot status (To Do) through the transitions API
  check    compare the live state with before.json (prints the differences)
"""
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import cap as s  # noqa: E402

BEFORE = json.loads((HERE / "before.json").read_text())


def body():
    want = (HERE / "runbook-before.xhtml").read_text()
    cur = s.page(s.RUNBOOK_ID, body=True)
    if cur["body"]["storage"]["value"] == want:
        s.log("Restore: runbook body already equals the pre-shoot version; nothing written")
        return
    v = s.put_page(s.RUNBOOK_ID, want, "Restore the demo text after the video capture")
    after = s.page(s.RUNBOOK_ID, body=True)
    same = after["body"]["storage"]["value"] == want
    s.log(f"Restore: runbook 2720100 body PUT back to the pre-shoot text as version {v} (was v{cur['version']['number']}); "
          f"storage equals runbook-before.xhtml: {same}")


def pay18():
    target = BEFORE["jira"]["PAY-18"]["status"]
    st, d, _ = s.atl("GET", "/rest/api/3/issue/PAY-18?fields=status")
    now = d["fields"]["status"]["name"]
    if now == target:
        s.log(f"Restore: PAY-18 already {target}")
        return
    st, t, _ = s.atl("GET", "/rest/api/3/issue/PAY-18/transitions")
    tr = next((x for x in t["transitions"] if x["to"]["name"] == target), None)
    if not tr:
        raise SystemExit(f"no transition to {target}")
    st, d, _ = s.atl("POST", "/rest/api/3/issue/PAY-18/transitions", {"transition": {"id": tr["id"]}})
    st2, d2, _ = s.atl("GET", "/rest/api/3/issue/PAY-18?fields=status,resolution")
    s.log(f"Restore: Jira PAY-18 {now} -> {d2['fields']['status']['name']} (transition {tr['id']}, HTTP {st}); "
          f"resolution {(d2['fields'].get('resolution') or {}).get('name')}")


def check():
    sid, space, pages = s.plat_pages()
    diffs = []
    before = {p["id"]: p for p in BEFORE["confluence"]["pages"]}
    for p in sorted(pages, key=lambda x: x["title"]):
        b = s.byline(p["id"]) or {}
        old = before.get(p["id"], {})
        if (b.get("title") or None) != old.get("bylineTitle"):
            diffs.append({"id": p["id"], "title": p["title"], "before": old.get("bylineTitle"), "now": b.get("title"), "tooltip": b.get("tooltip")})
        elif p.get("version", {}).get("number") != old.get("version"):
            diffs.append({"id": p["id"], "title": p["title"], "versionBefore": old.get("version"), "versionNow": p["version"]["number"]})
    print(json.dumps(diffs, indent=1))


if __name__ == "__main__":
    {"body": body, "pay18": pay18, "check": check}[sys.argv[1]]()
