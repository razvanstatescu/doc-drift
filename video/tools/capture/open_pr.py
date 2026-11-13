#!/usr/bin/env python3
"""Opens the real pull request for the shoot: scenario/rename-rollback-script -> main, with the seed's
title and description, and confirms its id is 482. Does not merge."""
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import cap as s  # noqa: E402

SCEN = HERE.parents[2] / "demo" / "seed" / "payments-api" / "scenarios" / "01-rename-rollback-script" / "scenario.json"
meta = json.loads(SCEN.read_text())
highest, recent = s.bb_highest_pr()
st, d, _ = s.bb("GET", s.bb_repo('/pullrequests?state=OPEN&pagelen=50&fields=values.id,values.title'))
open_now = (d or {}).get("values", [])
if highest != 481 or open_now:
    s.log(f"Open PR: NOT opening. Highest id {highest} (want 481), open PRs {open_now}")
    sys.exit(1)
body = {"title": meta["title"], "description": meta["description"], "source": {"branch": {"name": meta["branch"]}},
        "destination": {"branch": {"name": "main"}}, "close_source_branch": True}
st, pr, _ = s.bb("POST", s.bb_repo("/pullrequests"), body)
if st not in (200, 201):
    s.log(f"Open PR: failed {st} {str(pr)[:300]}")
    sys.exit(1)
ok = pr["id"] == 482
s.log(f"Bitbucket: opened PR #{pr['id']} \"{pr['title']}\" ({meta['branch']} -> main, close source branch on merge) "
      f"{'= 482 as required' if ok else 'IS NOT 482'}: {pr['links']['html']['href']}")
print(json.dumps({"id": pr["id"], "state": pr["state"], "url": pr["links"]["html"]["href"]}))
sys.exit(0 if ok else 2)
