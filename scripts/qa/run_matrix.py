#!/usr/bin/env python3
"""Live QA matrix for Doc Drift Sentinel (development environment, demo site, DDSTEST space only).

Runs the headless cases of docs/testing/test-plan.md through the dev driver and REST, and appends one
JSON line per case to scripts/qa/out/results.jsonl (case id, verdict, evidence). Each group creates
or resets its own DDSTEST pages (title prefix "QA ") and binds them to the sandbox repo
`nano-soft-dev/qa-sandbox`, which no PLAT page anchors, so PLAT's demo state is never touched.

Usage (repo root, Node not needed):
  python3 -I scripts/qa/run_matrix.py all
  python3 -I scripts/qa/run_matrix.py ingest matcher review fix tools lifecycle dashboard settings concurrency
Groups that need real product events (jira, lifecycle) poll for up to 90 s.
Never prints a token or secret.
"""
import json
import sys
import threading
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import ddsqa as q  # noqa: E402

OUT = Path(__file__).resolve().parent / "out"
OUT.mkdir(exist_ok=True)
RESULTS = OUT / "results.jsonl"
SANDBOX = "nano-soft-dev/qa-sandbox"
SANDBOX_SLUG = "qa-sandbox"


def record(case, verdict, evidence, note=""):
    line = {"case": case, "verdict": verdict, "evidence": evidence, "note": note, "at": time.strftime("%H:%M:%S")}
    with RESULTS.open("a") as f:
        f.write(json.dumps(line, ensure_ascii=False, default=str) + "\n")
    ev = json.dumps(evidence, ensure_ascii=False, default=str)
    print(f"[{verdict:<4}] {case}: {ev[:400]}{' | ' + note if note else ''}")


def check(case, cond, evidence, note=""):
    record(case, "PASS" if cond else "FAIL", evidence, note)
    return cond


def rec(files, **kw):
    return q.bb_record(files, repo_slug=SANDBOX_SLUG, **kw)


def ingest(record_, title=None):
    st, res = q.driver("ingest", record=record_, sync=True, **({"title": title} if title else {}))
    return res if isinstance(res, dict) else {"_status": st, "_raw": res}


def inspect(pid):
    return q.driver("inspect", pageId=pid)[1]


def drift(pid):
    return q.driver("drift", pageId=pid)[1]


def open_events(pid):
    snap = inspect(pid) or {}
    evs = (snap.get("sql") or {}).get("drift_events") or []
    return [e for e in evs if e.get("status") == "open"], snap


def state_of(pid):
    snap = inspect(pid) or {}
    ps = (snap.get("sql") or {}).get("page_state") or []
    return (ps[0]["status"] if ps else None), snap


def bind(pid, anchors, space="DDSTEST"):
    return q.driver("bind", pageId=pid, spaceKey=space, anchors=anchors)[1]


def path_anchor(pattern, weight="normal", repo=SANDBOX, kind="path"):
    return {"anchorType": kind, "repo": repo, "pattern": pattern, "weight": weight}


def page(title, body):
    return q.ensure_page(f"QA {title}", body)


# ---------------------------------------------------------------------------
# Group: ingest web trigger and driver auth (no secret needed for the negative paths)
# ---------------------------------------------------------------------------
def g_ingest():
    body = json.dumps(rec([q.fmod("scripts/a.sh")]))
    st, txt = q.ingest_post(body)
    check("ING-01 unsigned record is 401", st == 401, {"status": st, "body": txt})
    st, txt = q.ingest_post(body, signature="zz", timestamp=str(int(time.time())))
    check("ING-02 malformed signature is 401", st == 401, {"status": st, "body": txt})
    st, txt = q.ingest_post(body, signature="a" * 64, timestamp=str(int(time.time())))
    check("ING-03 wrong signature is 401", st == 401, {"status": st, "body": txt})
    st, txt = q.ingest_post(body, signature="a" * 64, timestamp=str(int(time.time()) - 3600))
    check("ING-04 stale timestamp is 401", st == 401, {"status": st, "body": txt})
    st, txt = q.ingest_post(body, signature="A" * 64, timestamp=str(int(time.time() * 1000)))
    check("ING-05 millisecond timestamp / uppercase hex is 401", st == 401, {"status": st, "body": txt})
    big = json.dumps({"source": "bitbucket", "pad": "x" * (600 * 1024)})
    st, txt = q.ingest_post(big, signature="a" * 64, timestamp=str(int(time.time())))
    check("ING-06 body over 512 KB is 400 before the signature check", st == 400, {"status": st, "bytes": len(big), "body": txt})
    st, txt = q.ingest_post("not json", signature="a" * 64, timestamp=str(int(time.time())))
    check("ING-07 non-JSON with a bad signature is 401 (signature first)", st == 401, {"status": st, "body": txt})
    st, txt = q.ingest_post("")
    check("ING-08 empty body is 401", st == 401, {"status": st, "body": txt})
    st, txt = q.http("GET", q.INGEST_URL, auth=False, raw=True)
    record("ING-09 GET on the ingest URL", "OBS", {"status": st, "body": txt[:200]}, "method is not checked; the static output answers")
    st, txt = q.driver_raw({"action": "changes"})
    check("DRV-01 driver without token is 401", st == 401, {"status": st})
    st, txt = q.driver_raw({"action": "changes"}, token="x" * 43)
    check("DRV-02 driver with a wrong token is 401", st == 401, {"status": st})
    st, txt = q.driver_raw({"action": "nope"}, token=q.DEV_TOKEN)
    check("DRV-03 unknown driver action is 400", st == 400, {"status": st})
    # Driver-level record validation (the same parseChangeRecord as the web trigger).
    bad = rec([{"status": "modified", "path": "../etc/passwd", "linesAdded": 1, "linesRemoved": 1}])
    st, res = q.driver("ingest", record=bad)
    check("ING-10 '..' path refused by the validator", isinstance(res, dict) and res.get("ok") is False, res)
    bad = rec([q.fmod(f"f{i}") for i in range(501)])
    st, res = q.driver("ingest", record=bad)
    check("ING-11 501 files refused", isinstance(res, dict) and res.get("ok") is False, res)
    bad = rec([{"status": "renamed", "path": "b.sh", "linesAdded": 0, "linesRemoved": 0}])
    st, res = q.driver("ingest", record=bad)
    check("ING-12 renamed without oldPath refused", isinstance(res, dict) and res.get("ok") is False, res)
    bad = q.jira_record("pay-21", [{"field": "status", "to": "Done"}])
    st, res = q.driver("ingest", record=bad)
    check("ING-13 lowercase Jira key refused", isinstance(res, dict) and res.get("ok") is False, res)
    r = rec([q.fmod("x.sh")])
    r["hunks"] = "x" * 200_001
    st, res = q.driver("ingest", record=r)
    check("ING-14 hunks over 200,000 bytes refused", isinstance(res, dict) and res.get("ok") is False, res)
    r = rec([q.fmod("x.sh")])
    r["prId"] = 0
    st, res = q.driver("ingest", record=r)
    check("ING-15 prId 0 refused", isinstance(res, dict) and res.get("ok") is False, res)


# ---------------------------------------------------------------------------
# Group: matcher through the live pipeline
# ---------------------------------------------------------------------------
MATCH_BODY = (
    "<h2>Deploy</h2><p>Run <code>./scripts/qa-crit.sh</code> with <code>QA_DEPLOY_TIMEOUT</code> set.</p>"
    "<ac:structured-macro ac:name=\"code\"><ac:plain-text-body><![CDATA[./scripts/qa-crit.sh --retries 3]]></ac:plain-text-body></ac:structured-macro>"
    "<h2>Old</h2><p>Legacy helper <code>scripts/qa-old.sh</code> and <code>scripts/qa-gone.sh</code>.</p>"
)


def g_matcher():
    pid = page("matcher page", MATCH_BODY)
    anchors = [
        path_anchor("scripts/qa-crit.sh", "critical"),
        path_anchor("scripts/qa-norm.sh"),
        path_anchor("scripts/qa-old.sh"),
        path_anchor("scripts/qa-gone.sh"),
        path_anchor("qa/big/file-399.ts", "critical"),
        path_anchor("nothing/**", "critical", kind="glob"),
        path_anchor("docs/ünï.sh"),
    ]
    res = bind(pid, anchors)
    # Phase 2 (UX obs 2): Unicode paths are allowed; the matcher handles them.
    check("BND-01 a unicode anchor path is accepted", isinstance(res, dict) and res.get("ok") is True, res)
    res = bind(pid, anchors[:6])
    check("BND-02 6 valid anchors save and mark Verified", isinstance(res, dict) and res.get("ok") and res["state"]["status"] == "verified", {k: res.get(k) for k in ("ok", "added", "removed", "closedEvents")} if isinstance(res, dict) else res)

    # Unicode paths in a change: no crash, no event for files nobody anchors.
    out = ingest(rec([q.fmod("docs/日本語 ファイル/🚀.sh", 5, 5), q.fmod("docs/café.sh", 1, 1)]))
    check("MAT-01 unicode/emoji/space paths ingest and match with 0 events", out.get("match", {}).get("events") == 0, out)

    # A glob that matches 0 files.
    out = ingest(rec([q.fmod("src/zero.ts", 80, 80)]))
    st, _ = state_of(pid)
    check("MAT-02 glob anchor matching 0 files: no event, page stays Verified", out.get("match", {}).get("events") == 0 and st == "verified", {"match": out.get("match"), "state": st})

    # 400 files, one anchored (critical) deep in the list.
    files = [q.fmod(f"qa/big/file-{i}.ts", 1, 1) for i in range(400)]
    t0 = time.time()
    out = ingest(rec(files, title="QA 400 files"))
    big = [e for e in drift(pid).get("events", []) if "file-399" in (e.get("anchor") or "")]
    check("MAT-03 400-file PR: the anchored file #400 flags (High, critical)", len(big) == 1 and big[0]["severity"] == "high", {"match": out.get("match"), "secs": round(time.time() - t0, 1), "event": big[:1]})

    # Rename + modify of an anchored file.
    pr = q.next_pr()
    hunks = q.unified("scripts/qa-old-v2.sh", removed=["QA_OLD_FLAG=1"], added=["QA_NEW_FLAG=1"], old_path="scripts/qa-old.sh", status="renamed")
    out = ingest(rec([{"status": "renamed", "oldPath": "scripts/qa-old.sh", "path": "scripts/qa-old-v2.sh", "linesAdded": 3, "linesRemoved": 1}], pr=pr, hunks=hunks, title="QA rename helper"))
    d = drift(pid)
    ev = [e for e in d.get("events", []) if e.get("ref") == f"PR #{pr}"]
    props = d.get("renameProposals", [])
    check("MAT-04 rename + modify: High event, rename proposal old -> new", len(ev) == 1 and ev[0]["severity"] == "high" and any(p["to"] == "scripts/qa-old-v2.sh" for p in props),
          {"event": ev[:1] and {k: ev[0].get(k) for k in ("severity", "score", "files", "reasons")}, "proposals": props})
    # Same change re-matched (queue redelivery): idempotent.
    cid = out.get("changeRecordId")
    st, again = q.driver("match", changeRecordId=cid)
    evs, snap = open_events(pid)
    n_rename = len([e for e in evs if e.get("ref", "").endswith(f"#{pr}")])
    rp = (snap.get("sql") or {}).get("rename_proposals") or []
    check("CON-01 the same change matched twice: still 1 event and 1 proposal", n_rename == 1 and len([p for p in rp if p.get("to_path") == "scripts/qa-old-v2.sh" and p.get("status") == "open"]) == 1, {"rematch": again, "events": n_rename, "proposals": len(rp)})
    if props:
        prop = [p for p in props if p["to"] == "scripts/qa-old-v2.sh"][0]
        st, acc = q.driver("accept-rename", proposalId=prop["id"])
        st, acc2 = q.driver("accept-rename", proposalId=prop["id"])
        b = [x for x in drift(pid).get("bindings", []) if x["pattern"].startswith("scripts/qa-old")]
        check("REV-01 accept rename rewrites the anchor; a second accept is refused", acc.get("ok") and acc2.get("ok") is False and b and b[0]["pattern"] == "scripts/qa-old-v2.sh", {"first": acc, "second": acc2, "binding": b})

    # Delete of an anchored file (normal anchor) -> High 0.7.
    pr = q.next_pr()
    ingest(rec([{"status": "removed", "path": "scripts/qa-gone.sh", "linesAdded": 0, "linesRemoved": 40}], pr=pr, title="QA delete helper"))
    ev = [e for e in drift(pid).get("events", []) if e.get("ref") == f"PR #{pr}"]
    check("MAT-05 delete of a normally weighted anchored file: High, score 0.7", ev and ev[0]["severity"] == "high" and ev[0]["score"] == 0.7, ev[:1])

    # Identifier + snippet boosts on the critical anchor.
    pr = q.next_pr()
    hunks = q.unified("scripts/qa-crit.sh", removed=["./scripts/qa-crit.sh --retries 3", "QA_DEPLOY_TIMEOUT=30"], added=["./scripts/qa-crit.sh --attempts 3", "QA_DEPLOY_TIMEOUT_SECS=30"])
    ingest(rec([q.fmod("scripts/qa-crit.sh", 2, 2)], pr=pr, hunks=hunks, title="QA rename flag"))
    ev = [e for e in drift(pid).get("events", []) if e.get("ref") == f"PR #{pr}"]
    reasons = ev[0]["reasons"] if ev else []
    check("MAT-06 removed identifier and quoted line boost to 1.00 with both reasons", ev and ev[0]["score"] == 1 and any("mentions" in r for r in reasons) and any("quotes" in r or "code" in r for r in reasons), {"score": ev and ev[0]["score"], "reasons": reasons})

    # Non-default branch, all-ignored, cosmetic-only.
    out = ingest(rec([q.fmod("scripts/qa-crit.sh", 50, 50)], dest="release/2"))
    check("MAT-07 merge into a non-default branch is skipped", "non_default_branch" in str(out.get("match", {}).get("outcome")), out.get("match"))
    out = ingest(rec([q.fmod("scripts/qa-crit.test.sh", 50, 50), q.fmod("docs/README.md", 3, 1)]))
    check("MAT-08 only ignored files: skipped (all files ignored)", "no_relevant_files" in str(out.get("match", {}).get("outcome")), out.get("match"))
    pr = q.next_pr()
    hunks = q.unified("scripts/qa-norm.sh", removed=["# retrys the job"], added=["# retries the job"])
    out = ingest(rec([q.fmod("scripts/qa-norm.sh", 1, 1)], pr=pr, hunks=hunks))
    check("MAT-09 comment-only change on a normal anchor: no event", out.get("match", {}).get("events") == 0, out.get("match"))
    # State after 4 distinct changes: Stale (3+ distinct changes).
    st, _ = state_of(pid)
    check("STA-01 4 distinct open changes: Stale", st == "stale", {"state": st})
    q.driver("verify", pageId=pid, note="QA reset")
    return pid


# ---------------------------------------------------------------------------
# Group: reverts and delivery order
# ---------------------------------------------------------------------------
def g_revert():
    pid = page("revert page", "<p>Runs <code>scripts/qa-rev.sh</code>.</p>")
    bind(pid, [path_anchor("scripts/qa-rev.sh", "critical")])

    pr = q.next_pr()
    title = f"QA raise pool {pr}"
    ingest(rec([q.fmod("scripts/qa-rev.sh", 5, 5)], pr=pr, title=title))
    st1, _ = state_of(pid)
    out = ingest(rec([q.fmod("scripts/qa-rev.sh", 5, 5)], title=f'Revert "{title}" (pull request #{pr})'))
    st2, _ = state_of(pid)
    check("RVT-01 revert by PR number closes the original event", st1 == "possibly_stale" and st2 == "verified" and out.get("match", {}).get("outcome") == "revert", {"before": st1, "after": st2, "match": out.get("match")})

    # Revert by title only.
    pr = q.next_pr()
    title = f"QA bump timeout {pr}"
    ingest(rec([q.fmod("scripts/qa-rev.sh", 5, 5)], pr=pr, title=title))
    ingest(rec([q.fmod("scripts/qa-rev.sh", 5, 5)], title=f'Revert "{title}"'))
    st, _ = state_of(pid)
    check("RVT-02 revert by title only closes the original event", st == "verified", {"state": st})

    # Revert of a revert re-flags.
    pr = q.next_pr()
    title = f"QA change {pr}"
    ingest(rec([q.fmod("scripts/qa-rev.sh", 5, 5)], pr=pr, title=title))
    rpr = q.next_pr()
    ingest(rec([q.fmod("scripts/qa-rev.sh", 5, 5)], pr=rpr, title=f'Revert "{title}" (pull request #{pr})'))
    out = ingest(rec([q.fmod("scripts/qa-rev.sh", 5, 5)], title=f'Revert "Revert "{title}" (pull request #{pr})" (pull request #{rpr})'))
    st, _ = state_of(pid)
    check("RVT-03 revert of a revert scores as a change and re-flags", st == "possibly_stale" and out.get("match", {}).get("events") == 1, {"state": st, "match": out.get("match")})
    q.driver("verify", pageId=pid)

    # BUG-03 live: "#N" inside the original title.
    victim = q.next_pr()
    ingest(rec([q.fmod("scripts/qa-rev.sh", 5, 5)], pr=victim, title=f"QA unrelated {victim}"))
    pr = q.next_pr()
    title = f"Fix #{victim}: tune retries"
    ingest(rec([q.fmod("scripts/qa-rev.sh", 6, 6)], pr=pr, title=title))
    out = ingest(rec([q.fmod("scripts/qa-rev.sh", 6, 6)], title=f'Revert "{title}" (pull request #{pr})'))
    evs, _ = open_events(pid)
    refs = sorted(e["ref"] for e in evs)
    check("RVT-04 (BUG-03) revert of a PR whose title has '#N' closes that PR's events", any(r.endswith(f"#{victim}") for r in refs) and not any(r.endswith(f"#{pr}") for r in refs),
          {"open_refs": refs, "victim": victim, "reverted": pr, "match": out.get("match")}, "expected: PR #%d closed, PR #%d still open" % (pr, victim))
    q.driver("verify", pageId=pid)

    # Out of order: the revert arrives before the change it reverts.
    pr = q.next_pr()
    title = f"QA late delivery {pr}"
    ingest(rec([q.fmod("scripts/qa-rev.sh", 5, 5)], title=f'Revert "{title}" (pull request #{pr})'))
    ingest(rec([q.fmod("scripts/qa-rev.sh", 5, 5)], pr=pr, title=title))
    st, _ = state_of(pid)
    check("RVT-05 out-of-order: revert first, then the original: page ends flagged though the code is back", st == "verified", {"state": st}, "records the gap; the matcher has no memory of an earlier revert")
    q.driver("verify", pageId=pid)

    # BUG-02: a revert after the page was verified (and updated) is never scored.
    pr = q.next_pr()
    title = f"QA move flag {pr}"
    ingest(rec([q.fmod("scripts/qa-rev.sh", 9, 9)], pr=pr, title=title))
    q.driver("verify", pageId=pid, note="page updated for the change")
    out = ingest(rec([q.fmod("scripts/qa-rev.sh", 9, 9)], title=f'Revert "{title}" (pull request #{pr})'))
    st, _ = state_of(pid)
    check("RVT-06 (BUG-02) a revert of an already-verified change flags the page again", st == "possibly_stale",
          {"state": st, "match": out.get("match")}, "the revert changes the anchored file back, but nothing is scored")
    q.driver("verify", pageId=pid)
    return pid


# ---------------------------------------------------------------------------
# Group: review actions and escalation timing
# ---------------------------------------------------------------------------
def g_review():
    pid = page("review page", "<p>Uses <code>scripts/qa-review.sh</code>.</p>")
    # BUG-15: a re-save keeps the dampener unless asked, so reset it to make reruns comparable.
    bind(pid, [{**path_anchor("scripts/qa-review.sh", "critical"), "resetDismissCount": True}])
    before = drift(pid)["bindings"][0].get("dismissCount", 0)
    ingest(rec([q.fmod("scripts/qa-review.sh", 5, 5)]))
    d = drift(pid)
    eid = d["events"][0]["id"]
    st, r = q.driver("dismiss", eventId=eid, reason="because")
    check("REV-02 dismiss with an unknown reason is refused", r.get("ok") is False and r.get("error") == "bad_request", r)
    st, r = q.driver("dismiss", eventId="00000000-0000-0000-0000-000000000000", reason="not_relevant")
    check("REV-03 dismiss of an unknown event", r.get("ok") is False and r.get("error") == "not_found", r)
    st, r = q.driver("dismiss", eventId=eid, reason="false_positive")
    st, r2 = q.driver("dismiss", eventId=eid, reason="false_positive")
    check("REV-04 dismiss twice: second is not_open", r.get("ok") and r2.get("ok") is False and r2.get("error") == "not_open", {"first": r, "second": r2})
    b = drift(pid)["bindings"][0]
    check("REV-05 a dismissal raises the anchor's dismissCount", before == 0 and b["dismissCount"] == 1, {**b, "before": before})
    for days, label in ((0, "0"), (31, "31"), ("7.5", "7.5"), ("abc", "abc")):
        st, r = q.driver("snooze", pageId=pid, days=days)
        check(f"REV-06 snooze {label} days is refused", r.get("ok") is False, r)
    st, r = q.driver("snooze", pageId=pid, days=7)
    check("REV-07 snooze with no open changes is refused with a message", r.get("ok") is False and "Nothing to snooze" in str(r.get("message")), r)
    ingest(rec([q.fmod("scripts/qa-review.sh", 5, 5)]))
    st, r = q.driver("snooze", pageId=pid, days="7")
    bl = q.byline(pid)
    check("REV-08 snooze '7' (string) works; byline says Snoozed until", r.get("ok") and "Snoozed until" in str(bl), {"result": r, "byline": bl})
    st, r = q.driver("verify", pageId=pid, note="x" * 5000)
    snap = inspect(pid)
    ver = (snap.get("sql") or {}).get("verifications") or []
    check("REV-09 verify with a 5,000-character note: Verified, note clipped", r.get("ok") and r.get("state") == "verified", {"result": r, "verifications": len(ver)})
    upid = page("unanchored page", "<p>No anchors here.</p>")
    st, r = q.driver("verify", pageId=upid)
    record("REV-10 verify an Unanchored page", "OBS", r, "says 'Marked verified.' while the page stays Unanchored")

    # Escalation timing (D27): age the open event 6 then 8 days.
    ingest(rec([q.fmod("scripts/qa-review.sh", 5, 5)]))
    q.driver("age", pageId=pid, days=6)
    q.driver("escalate")
    st6, _ = state_of(pid)
    q.driver("age", pageId=pid, days=2)
    q.driver("escalate")
    st8, _ = state_of(pid)
    bl = q.byline(pid)
    check("ESC-01 6 days: Possibly stale; 8 days: Stale after the hourly job", st6 == "possibly_stale" and st8 == "stale", {"day6": st6, "day8": st8, "byline": bl})
    st, r = q.driver("snooze", pageId=pid, days=1)
    st2, _ = state_of(pid)
    check("ESC-02 snoozing a Stale page reads Possibly stale", r.get("ok") and st2 == "possibly_stale", {"snooze": r, "state": st2})
    q.driver("verify", pageId=pid)
    return pid


# ---------------------------------------------------------------------------
# Group: fix proposals on tricky storage
# ---------------------------------------------------------------------------
LINK = '<ac:link><ri:page ri:content-title="Doc Drift test Home" /><ac:plain-text-link-body><![CDATA[the test home]]></ac:plain-text-link-body></ac:link>'
CODE = lambda body: f'<ac:structured-macro ac:name="code" ac:schema-version="1"><ac:parameter ac:name="language">bash</ac:parameter><ac:plain-text-body><![CDATA[{body}]]></ac:plain-text-body></ac:structured-macro>'
TRICKY = "".join([
    '<p>🚀 Deploy guide for <code>scripts/qa-fix.sh</code>. <ac:emoticon ac:name="warning" /> Read carefully.</p>',
    '<h2>Flags</h2>',
    '<table><tbody><tr><th>Flag</th><th>Meaning</th></tr><tr><td><code>--retries</code></td><td>Attempts before giving up</td></tr></tbody></table>',
    '<h2>Steps</h2>',
    '<ol><li>Run <code>./scripts/qa-fix.sh</code><ul><li>Pass <code>--retries 3</code></li></ul></li><li>Check the logs</li></ol>',
    f'<p>Read {LINK} then run <code>--retries</code> <strong>twice</strong>.</p>',
    '<ac:structured-macro ac:name="info"><ac:rich-text-body><p>Set <code>QA_FIX_TIMEOUT</code> before <code>--retries</code>.</p>',
    CODE('export QA_FIX_TIMEOUT=30\n./scripts/qa-fix.sh --retries 3 # a]]]]><![CDATA[>b'),
    '</ac:rich-text-body></ac:structured-macro>',
    '<ac:structured-macro ac:name="expand"><ac:parameter ac:name="title">More</ac:parameter><ac:rich-text-body><table><tbody><tr><td>Use <code>--retries</code> with <ac:structured-macro ac:name="status"><ac:parameter ac:name="title">BETA</ac:parameter></ac:structured-macro> builds</td></tr></tbody></table></ac:rich-text-body></ac:structured-macro>',
    '<h2>Unrelated</h2><p>Nothing to see.</p>',
])


def g_fix():
    pid = page("tricky storage", TRICKY)
    bind(pid, [path_anchor("scripts/qa-fix.sh", "critical")])
    d = drift(pid)
    sugg = [s["label"] for s in d.get("suggestions", [])]
    record("FIX-00 auto-suggest on the tricky page", "OBS", {"suggestions": sugg})
    pr = q.next_pr()
    hunks = q.unified("scripts/qa-fix.sh", removed=['  --retries) RETRIES="$2" ;;', "QA_FIX_TIMEOUT=${QA_FIX_TIMEOUT:-30}"], added=['  --attempts) RETRIES="$2" ;;', "QA_FIX_TIMEOUT_SECS=${QA_FIX_TIMEOUT_SECS:-30}"])
    ingest(rec([q.fmod("scripts/qa-fix.sh", 2, 2)], pr=pr, hunks=hunks, title="QA rename retries flag"))
    st, ctx = q.driver("tool", tool="get-drift-context", input={"pageId": pid})
    secs = ctx.get("sections", [])
    blocks = {b["blockId"]: b for s in secs for b in s["blocks"]}
    size = len(json.dumps(ctx).encode())
    kinds = sorted({b["kind"] for b in blocks.values()})
    check("FIX-01 get-drift-context lists matched blocks of every kind under 15 KB", size <= 15000 and {"table-cell", "list-item", "code", "paragraph"} <= set(kinds),
          {"bytes": size, "sections": [s["heading"] for s in secs], "kinds": kinds, "evidenceLevel": ctx.get("evidenceLevel")})
    linked = [b for b in blocks.values() if b["text"].startswith("Read ")]
    record("FIX-02 (BUG-05) the linked paragraph as the agent sees it", "FAIL" if linked and "the test home" not in linked[0]["text"] else "PASS", {"block": linked[:1]}, "link text missing from block text")

    def find(kind, contains):
        return next((b for b in blocks.values() if b["kind"] == kind and contains in b["text"]), None)

    cell = find("table-cell", "--retries")
    li = find("list-item", "Pass --retries 3")
    codeb = find("code", "export QA_FIX_TIMEOUT")
    status_cell = find("table-cell", "BETA") or find("table-cell", "builds")
    subs = {}
    for name, b, text, orig in (
        ("cell", cell, "--attempts", None),
        ("list", li, "Pass --attempts 3", None),
        ("code-line", codeb, "./scripts/qa-fix.sh --attempts 3 # a]]>b", "./scripts/qa-fix.sh --retries 3 # a]]>b"),
        ("status-cell", status_cell, "Use the attempts flag on every build", None),
        ("linked", linked[0] if linked else None, "Read the test home, then run --attempts 3 times.", None),
    ):
        if not b:
            record(f"FIX-03 submit {name}", "FAIL", {"error": "block not in context"})
            continue
        inp = {"pageId": pid, "blockId": b["blockId"], "proposedText": text, "rationale": "QA"}
        if orig:
            inp["originalText"] = orig
        st, r = q.driver("tool", tool="submit-fix-proposal", input=inp, pageId=pid)
        subs[name] = r
        check(f"FIX-03 submit-fix-proposal ({name}, {b['blockId']})", r.get("ok") is True or (name == "status-cell" and r.get("error") == "unsupported_span"), r)
    st, r = q.driver("tool", tool="submit-fix-proposal", input={"pageId": pid, "originalText": "Run ./scripts/qa-fix.sh Pass --retries 3", "proposedText": "x"}, pageId=pid)
    check("FIX-04 a passage across 2 list items is refused with spans_blocks", r.get("error") == "spans_blocks", {k: r.get(k) for k in ("error", "blockIds")})
    st, r = q.driver("tool", tool="submit-fix-proposal", input={"pageId": pid, "originalText": "--retries", "proposedText": "--attempts"}, pageId=pid)
    check("FIX-05 text found in several blocks is ambiguous with candidates", r.get("error") == "ambiguous" and len(r.get("candidates", [])) >= 2, {k: r.get(k) for k in ("error",)} | {"candidates": len(r.get("candidates", []))})
    st, r = q.driver("tool", tool="submit-fix-proposal", input={"pageId": pid, "blockId": "b999", "proposedText": "x"}, pageId=pid)
    check("FIX-06 unknown blockId is not_found with candidates", r.get("error") == "not_found" and r.get("candidates"), {"error": r.get("error"), "guidance": r.get("guidance")})
    st, r = q.driver("tool", tool="submit-fix-proposal", input={"pageId": pid, "blockId": cell["blockId"], "proposedText": "--attempts"}, pageId=pid) if cell else (0, {})
    check("FIX-07 a second draft for the same block replaces the first", r.get("ok") and r.get("replaced"), {"replaced": r.get("replaced")})
    if cell:
        subs["cell"] = r

    # Apply each (driver writes asApp in development) and check the storage.
    applied = {}
    for name in ("cell", "list", "code-line"):
        r = subs.get(name)
        if not r or not r.get("ok"):
            continue
        st, a = q.driver("apply-proposal", proposalId=r["proposalId"])
        applied[name] = a
        check(f"FIX-08 apply {name}", a.get("ok") is True, {k: a.get(k) for k in ("ok", "version", "versionMessage", "closedEvents", "pendingDrafts", "status", "error", "message")})
    storage, ver = q.page_storage(pid)
    keep = {
        "emoticon": '<ac:emoticon ac:name="warning"' in storage,
        "rocket": "🚀" in storage,
        "status macro": 'ac:name="status"' in storage,
        "info panel": 'ac:name="info"' in storage,
        "inline code kept": "<code>--attempts</code>" in storage,
        "nested list": "<li>Pass <code>--attempts 3</code></li>" in storage,
        "CDATA ]]> kept": "a]]]]><![CDATA[>b" in storage,
        "code line edited": "--attempts 3 # a" in storage,
    }
    check("FIX-09 after accepts: macros, emoji, nested list and CDATA intact", all(keep.values()), keep)

    # The linked paragraph (BUG-05 live).
    r = subs.get("linked")
    if r and r.get("ok"):
        st, a = q.driver("apply-proposal", proposalId=r["proposalId"])
        storage, _ = q.page_storage(pid)
        n = storage.count("the test home")
        check("FIX-10 (BUG-05) accepting the linked-paragraph draft keeps exactly one 'the test home'", n == 1, {"apply": a.get("ok"), "occurrences": n, "paragraph": storage[storage.find("<p>Read"):storage.find("<p>Read") + 300]})

    # Conflict: draft, then the page is edited in that block, then accept.
    q.put_page(pid, TRICKY, message="QA reset tricky")
    ingest(rec([q.fmod("scripts/qa-fix.sh", 2, 2)], hunks=hunks, title="QA rename retries flag again"))
    st, ctx = q.driver("tool", tool="get-drift-context", input={"pageId": pid})
    blocks = {b["blockId"]: b for s in ctx.get("sections", []) for b in s["blocks"]}
    li = next((b for b in blocks.values() if b["kind"] == "list-item" and "Pass --retries 3" in b["text"]), None)
    st, r = q.driver("tool", tool="submit-fix-proposal", input={"pageId": pid, "blockId": li["blockId"], "proposedText": "Pass --attempts 3"}, pageId=pid)
    edited = TRICKY.replace("<li>Pass <code>--retries 3</code></li>", "<li>Pass <code>--retries 5</code></li>")
    q.put_page(pid, edited, message="QA concurrent edit")
    st, a = q.driver("apply-proposal", proposalId=r["proposalId"])
    check("FIX-11 conflict: the block was edited after the draft: not_found, page unchanged", a.get("ok") is False and a.get("error") == "not_found", a)
    # Edit elsewhere (IDs shift): still applies.
    st, r = q.driver("tool", tool="submit-fix-proposal", input={"pageId": pid, "blockId": li["blockId"], "proposedText": "Pass --attempts 5"}, pageId=pid)
    shifted = "<p>QA inserted first paragraph.</p>" + edited
    q.put_page(pid, shifted, message="QA insert above")
    st, a = q.driver("apply-proposal", proposalId=r.get("proposalId"))
    storage, _ = q.page_storage(pid)
    check("FIX-12 an edit elsewhere shifts block IDs: the draft still applies to its text", a.get("ok") is True and "<li>Pass <code>--attempts 5</code></li>" in storage, {"apply": {k: a.get(k) for k in ("ok", "error", "pendingDrafts")}})
    st, a2 = q.driver("apply-proposal", proposalId=r.get("proposalId"))
    check("FIX-13 applying an accepted draft again is not_open", a2.get("error") == "not_open", a2)
    st, rj = q.driver("reject-proposal", proposalId="nope")
    check("FIX-14 reject an unknown draft", rj.get("ok") is False, rj)
    # Too many drafts: a page with 12 plain paragraphs (BUG-05 refuses drafts on the tricky page's link blocks).
    MANY = "<h2>Flags</h2>" + "".join(f"<p>Step {i}: run <code>scripts/qa-fix.sh --retries {i}</code>.</p>" for i in range(1, 13))
    q.put_page(pid, TRICKY, message="QA reset tricky")
    q.driver("verify", pageId=pid)
    pid = page("draft cap", MANY)
    q.put_page(pid, MANY, message="QA reset draft cap")
    bind(pid, [path_anchor("scripts/qa-fix.sh", "critical")])
    ingest(rec([q.fmod("scripts/qa-fix.sh", 2, 2)], hunks=hunks, title="QA rename retries flag 3"))
    st, ctx = q.driver("tool", tool="get-drift-context", input={"pageId": pid})
    ids = [b["blockId"] for s in ctx.get("sections", []) for b in s["blocks"] if b["kind"] != "heading"]
    results = []
    # BUG-05: blocks with links or mentions refuse a plain-text draft (unsupported_span); keep going
    # until 10 drafts are open, then the next must be too_many.
    for bid in ids:
        st, r = q.driver("tool", tool="submit-fix-proposal", input={"pageId": pid, "blockId": bid, "proposedText": f"QA draft for {bid}"}, pageId=pid)
        results.append(r.get("error") or "ok")
        if results[-1] == "too_many":
            break
    check("FIX-15 an 11th open draft on a page is refused (too_many)", results[-1:] == ["too_many"], {"results": results})
    st, props = q.driver("proposals", pageId=pid)
    for p in props if isinstance(props, list) else []:
        if p.get("status") == "open":
            q.driver("reject-proposal", proposalId=p["id"])
    q.driver("verify", pageId=pid)

    # Long page: 400 paragraphs, the token far down.
    long_body = "".join(f"<p>Filler paragraph {i} about nothing in particular, with some words to make it long enough.</p>" for i in range(400))
    long_body += "<h2>Deep section</h2>" + "".join(f"<p>Step {i}: run <code>./scripts/qa-fix.sh --retries {i}</code>.</p>" for i in range(60))
    lpid = page("very long page", long_body)
    bind(lpid, [path_anchor("scripts/qa-fix.sh", "critical")])
    ingest(rec([q.fmod("scripts/qa-fix.sh", 2, 2)], hunks=hunks, title="QA long page change"))
    st, ctx = q.driver("tool", tool="get-drift-context", input={"pageId": lpid})
    size = len(json.dumps(ctx).encode())
    secs = ctx.get("sections", [])
    check("FIX-16 very long page: context under 15 KB, matched section kept, truncation flagged", size <= 15000 and secs and secs[0]["heading"] == "Deep section",
          {"bytes": size, "truncated": ctx.get("truncated"), "sections": [(s["heading"], len(s["blocks"]), s.get("blocksOmitted")) for s in secs]})
    q.driver("verify", pageId=lpid)
    return pid


# ---------------------------------------------------------------------------
# Group: agent/MCP tools (driver runs them asApp; consent and asUser need a browser)
# ---------------------------------------------------------------------------
def g_tools():
    t = lambda tool, inp, ctx=None: q.driver("tool", tool=tool, input=inp, **({"pageId": ctx} if ctx else {}))[1]
    r = t("check-page-freshness", {"pageId": "999999999"})
    check("TOL-01 unknown page: status unknown, no title", r.get("status") == "unknown" and r.get("title") is None, r)
    r = t("check-page-freshness", {})
    check("TOL-02 no input and no context: no_page", r.get("error") == "no_page", r)
    r = t("check-page-freshness", {"pageUrl": f"{q.BASE}/wiki/spaces/DDSTEST/pages/edit-v2/2752731"})
    check("TOL-03 edit-v2 URL resolves", r.get("pageId") == "2752731", {k: r.get(k) for k in ("pageId", "status")})
    r = t("check-page-freshness", {"pageUrl": f"{q.BASE}/wiki/pages/viewpage.action?pageId=2752731"})
    check("TOL-04 viewpage.action URL resolves", r.get("pageId") == "2752731", {k: r.get(k) for k in ("pageId", "status")})
    r = t("check-page-freshness", {"pageUrl": f"{q.BASE}/wiki/x/gQBH"}, ctx="3080280")
    check("TOL-05 (BUG-04) a tiny link with a Rovo page context does not answer for the context page", r.get("pageId") != "3080280",
          {k: r.get(k) for k in ("pageId", "title", "status", "error")}, "the tool answered for the page Rovo is on")
    r = t("check-page-freshness", {"pageId": "DDS test: Payments rollback runbook"}, ctx="3080280")
    check("TOL-06 (BUG-04) a title passed as pageId with a context does not answer for the context page", r.get("pageId") != "3080280", {k: r.get(k) for k in ("pageId", "title", "status", "error")})
    r = t("check-page-freshness", {"title": "DDS test: Payments rollback runbook"})
    check("TOL-07 exact title resolves", r.get("pageId") == "2752731", {k: r.get(k) for k in ("pageId", "status")})
    r = t("check-page-freshness", {"title": "dds test: payments rollback runbook"})
    record("TOL-08 title with different case", "OBS", {k: r.get(k) for k in ("pageId", "status", "error", "guidance")}, "title search is case-insensitive (resolved)")
    # Ambiguous title: the same title in DDSTEST and in another space.
    a = q.ensure_page("QA duplicate title", "<p>One</p>", "DDSTEST")
    b = q.ensure_page("QA duplicate title", "<p>Two</p>", "ENGS")
    r = t("check-page-freshness", {"title": "QA duplicate title"})
    check("TOL-09 a title in 2 spaces is ambiguous_title with both candidates", r.get("error") == "ambiguous_title" and len(r.get("candidates", [])) == 2, {k: r.get(k) for k in ("error", "candidates", "guidance")})
    r = t("find-docs-for-path", {"repo": "nano-soft-dev/qa-sandbox", "path": "scripts/qa-crit.sh"})
    check("TOL-10 find-docs-for-path exact", any(p["match"] == "exact" for p in r.get("pages", [])), {"pages": [(p["title"], p["match"], p["status"]) for p in r.get("pages", [])]})
    r = t("find-docs-for-path", {"repo": "https://bitbucket.org/nano-soft-dev/qa-sandbox/src/main/", "path": "scripts/"})
    check("TOL-11 folder query with a Bitbucket URL repo", len(r.get("pages", [])) >= 1 and all(p["match"] in ("folder", "exact", "glob", "repo") for p in r["pages"]), {"pages": [(p["title"], p["match"]) for p in r.get("pages", [])]})
    r = t("find-docs-for-path", {"repo": "payments-api", "path": "**/*.sh"})
    globbed = [(p["title"], p["anchor"]) for p in r.get("pages", []) if p["match"] == "glob"]
    check("TOL-12 (BUG-07) '**/*.sh' does not list pages anchored only to src/** or deploy/helm/**", not any("src/**" in a or "deploy/helm/**" in a for _, a in globbed), {"glob_matches": globbed})
    r = t("find-docs-for-path", {"repo": "nano-soft-dev/qa-sandbox", "path": "docs/日本語 ファイル/🚀.sh"})
    check("TOL-13 unicode path query: ok, no pages", r.get("ok") is True and r.get("pages") == [], r)
    r = t("find-docs-for-path", {"repo": "not a repo", "path": "x"})
    check("TOL-14 bad repo is bad_request with guidance", r.get("error") == "bad_request", r)
    r = t("find-docs-for-path", {"repo": "nano-soft-dev/qa-sandbox", "path": "  "})
    check("TOL-15 blank path is bad_request", r.get("error") == "bad_request", r)
    for lim in (0, 51, "abc", -3):
        r = t("list-stale-pages", {"limit": lim})
        record(f"TOL-16 list-stale-pages limit={lim}", "OBS", {"pages": len(r.get("pages", [])), "ok": r.get("ok")})
    r1 = t("list-stale-pages", {"spaceKey": "PLAT", "limit": 50})
    r2 = t("list-stale-pages", {"spaceKey": "plat", "limit": 50})
    check("TOL-17 spaceKey is case-insensitive", len(r1.get("pages", [])) == len(r2.get("pages", [])), {"PLAT": len(r1.get("pages", [])), "plat": len(r2.get("pages", [])), "guidance_lower": r2.get("guidance")})
    r = t("list-stale-pages", {"spaceKey": "NOPE"})
    check("TOL-18 unknown space: empty with guidance", r.get("ok") and r.get("pages") == [], r)
    r = t("get-drift-context", {"pageId": "2818508"})
    record("TOL-19 get-drift-context on a page with no anchors", "OBS", {k: r.get(k) for k in ("ok", "status", "guidance")})
    r = t("record-verification", {"pageId": "999999999"})
    record("TOL-20 record-verification on an unknown page (driver gate is open)", "OBS", {k: r.get(k) for k in ("ok", "status", "error", "guidance")})
    q.trash_page(b)
    q.trash_page(a)


# ---------------------------------------------------------------------------
# Group: page lifecycle (real Confluence events)
# ---------------------------------------------------------------------------
def wait_for(fn, timeout=90, every=5):
    t0 = time.time()
    while time.time() - t0 < timeout:
        v = fn()
        if v:
            return v, round(time.time() - t0)
        time.sleep(every)
    return None, round(time.time() - t0)


def g_lifecycle():
    pid = page("lifecycle page", "<p>Uses <code>scripts/qa-life.sh</code>.</p>")
    q.put_page(pid, "<p>Uses <code>scripts/qa-life.sh</code>.</p>", title="QA lifecycle page")
    bind(pid, [path_anchor("scripts/qa-life.sh", "critical")])
    ingest(rec([q.fmod("scripts/qa-life.sh", 5, 5)]))
    # Rename: bindings are by ID, title search follows the new title.
    q.rename_page(pid, "QA lifecycle page renamed")
    r = q.driver("tool", tool="check-page-freshness", input={"title": "QA lifecycle page renamed"})[1]
    check("LIF-01 rename: state kept, new title resolves", r.get("pageId") == pid and r.get("status") == "possibly_stale", {k: r.get(k) for k in ("pageId", "status")})
    q.rename_page(pid, "QA lifecycle page")
    # Trash: the real avi:confluence:trashed:page event drops bindings and state.
    q.trash_page(pid)
    gone, secs = wait_for(lambda: not (inspect(pid).get("sql") or {}).get("bindings"), timeout=120)
    check("LIF-04 trash: bindings and state dropped by the trashed event", gone is not None, {"seconds": secs})
    # Restore: no event is handled, so the byline property keeps the pre-trash state.
    rs = q.restore_page(pid)
    time.sleep(5)
    bl = q.byline(pid)
    st_now, snap = state_of(pid)
    fr = q.driver("tool", tool="check-page-freshness", input={"pageId": pid})[1]
    check("LIF-05 (BUG-09) restore from trash: byline matches the stored state", bl is None or "Unanchored" in str(bl.get("title")),
          {"restore": rs[0], "byline": bl, "page_state": st_now, "bindings": len((snap.get("sql") or {}).get("bindings", [])), "tool_status": fr.get("status")},
          "the badge still reads the pre-trash state while the tools say Unanchored")

    # Move to another space and back (separate page).
    mid = page("move page", "<p>Uses <code>scripts/qa-move.sh</code>.</p>")
    bind(mid, [path_anchor("scripts/qa-move.sh", "critical")])
    ingest(rec([q.fmod("scripts/qa-move.sh", 5, 5)]))
    mv = q.http("PUT", f"/wiki/rest/api/content/{mid}/move/append/{engs_home()}")
    time.sleep(3)
    snap = inspect(mid)
    bspace = [b.get("space_key") for b in (snap.get("sql") or {}).get("bindings", [])]
    dd = drift(mid)
    d_eng = q.driver("dashboard", spaceKey="ENGS")[1]
    d_dds = q.driver("dashboard", spaceKey="DDSTEST")[1]
    listed = lambda d: [p["pageId"] for p in d.get("pages", [])]
    check("LIF-02 (BUG-11) move to another space: the page counts in the space it is now in", mid in listed(d_eng),
          {"move": mv[0], "binding.space_key": bspace, "getPageDrift.space.key": (dd.get("space") or {}).get("key"), "in ENGS dashboard": mid in listed(d_eng), "in DDSTEST dashboard": mid in listed(d_dds), "ENGS kpis": d_eng.get("kpis")},
          "no move event: bindings keep DDSTEST; the drifted page is on neither dashboard")
    back = q.http("PUT", f"/wiki/rest/api/content/{mid}/move/append/2818508")
    record("LIF-03 move back to DDSTEST", "OBS", {"status": back[0]}, "403: the API user cannot move pages out of ENGS; the page is trashed instead")
    q.driver("verify", pageId=mid)
    if back[0] >= 300:
        q.trash_page(mid)
    return pid


_engs = []


def engs_home():
    if not _engs:
        st, d = q.http("GET", "/wiki/api/v2/spaces?keys=ENGS")
        _engs.append(d["results"][0]["homepageId"])
    return _engs[0]


# ---------------------------------------------------------------------------
# Group: dashboard counts
# ---------------------------------------------------------------------------
def g_dashboard():
    st, d = q.driver("dashboard", spaceKey="DDSTEST")
    k = d.get("kpis", {})
    listed = d.get("pages", [])
    n_ps = len([p for p in listed if p["status"] == "possibly_stale"])
    n_st = len([p for p in listed if p["status"] == "stale"])
    st2, dd = q.http("GET", f"/wiki/api/v2/spaces/{q.space_id('DDSTEST')}/pages?limit=250&status=current")
    rest_total = len(dd.get("results", [])) - 1
    check("DSH-01 DDSTEST KPIs agree with the listed pages and REST", k.get("possiblyStale") == n_ps and k.get("stale") == n_st and k.get("total") == rest_total and k.get("anchored", 0) <= k.get("total", 0),
          {"kpis": k, "listed": {"possibly_stale": n_ps, "stale": n_st}, "rest_total_minus_home": rest_total, "owners": d.get("owners"), "truncated": d.get("truncated")})
    st, d = q.driver("dashboard", spaceKey="PLAT")
    record("DSH-02 PLAT KPIs (demo state)", "OBS", {"kpis": d.get("kpis"), "pages": [(p["title"], p["status"], p["maxSeverity"]) for p in d.get("pages", [])]})
    st, d = q.driver("dashboard", spaceKey="plat")
    record("DSH-03 lowercase space key", "OBS", {"ok": d.get("ok"), "kpis": d.get("kpis"), "message": d.get("message")})
    st, d = q.driver("dashboard", spaceKey="NOPE")
    record("DSH-04 unknown space key", "OBS", d)


# ---------------------------------------------------------------------------
# Group: settings validation (driver merges into stored settings; invalid input saves nothing)
# ---------------------------------------------------------------------------
def g_settings():
    st, r = q.driver("settings", settings={"escalationDays": 45, "notifyDebounceMinutes": 90, "ignoreGlobs": ["src/[a"], "spaceMode": "selected", "spaceKeys": []})
    check("SET-01 4 bad fields at once: every fieldError, nothing saved", r.get("ok") is False and set(r.get("fieldErrors", {})) >= {"escalationDays", "notifyDebounceMinutes", "ignoreGlobs", "spaceKeys"}, r)
    st, r = q.driver("settings", settings={"spaceKeys": ["PLAT", "bad key!"]})
    check("SET-02 bad space key refused", r.get("ok") is False and "spaceKeys" in r.get("fieldErrors", {}), r)
    st, r = q.driver("settings", settings={"sensitivity": "BALANCED"})
    check("SET-03 sensitivity is case-sensitive ('BALANCED' refused)", r.get("ok") is False, r)
    st, r = q.driver("settings", settings={})
    check("SET-04 an empty update keeps the stored settings (defaults)", r.get("ok") is True and r["value"]["sensitivity"] == "balanced" and r["value"]["spaceMode"] == "all", r.get("value"))


# ---------------------------------------------------------------------------
# Group: concurrency
# ---------------------------------------------------------------------------
def g_concurrency():
    pid = page("concurrency page", "<p>Uses <code>scripts/qa-conc.sh</code> and <code>scripts/qa-conc2.sh</code>.</p>")
    bind(pid, [path_anchor("scripts/qa-conc.sh", "normal"), path_anchor("scripts/qa-conc2.sh", "normal")])
    outs = []

    def go(path):
        outs.append(q.driver("ingest", record=rec([q.fmod(path, 30, 30)]), sync=True, wait=False))

    ths = [threading.Thread(target=go, args=(p,)) for p in ("scripts/qa-conc.sh", "scripts/qa-conc2.sh")]
    [t.start() for t in ths]
    [t.join() for t in ths]
    time.sleep(8)
    evs, snap = open_events(pid)
    st, _ = state_of(pid)
    check("CON-02 two PRs at once on one page: 2 events, Possibly stale (2 changes)", len(evs) == 2 and st == "possibly_stale", {"http": [o[0] for o in outs], "events": len(evs), "state": st, "byline": q.byline(pid)})
    outs.clear()
    ths = [threading.Thread(target=go, args=("scripts/qa-conc.sh",)) for _ in range(3)]
    [t.start() for t in ths]
    [t.join() for t in ths]
    time.sleep(8)
    evs, _ = open_events(pid)
    st, _ = state_of(pid)
    bl = q.byline(pid)
    check("CON-03 three more PRs at once: Stale, byline agrees", st == "stale" and "Stale" in str(bl.get("title") if bl else ""), {"events": len(evs), "state": st, "byline": bl})
    # Same change record delivered twice in parallel (queue redelivery): match it twice at once.
    out = ingest(rec([q.fmod("scripts/qa-conc2.sh", 30, 30)], title="QA dup delivery"))
    cid = out.get("changeRecordId")
    res = []
    ths = [threading.Thread(target=lambda: res.append(q.driver("match", changeRecordId=cid, wait=False)[0])) for _ in range(2)]
    [t.start() for t in ths]
    [t.join() for t in ths]
    time.sleep(6)
    evs, _ = open_events(pid)
    mine = [e for e in evs if e.get("change_record_id") == cid]
    check("CON-04 one change matched twice in parallel: 1 event (unique dedupe key holds)", len(mine) == 1, {"http": res, "events_for_change": len(mine)})
    q.driver("verify", pageId=pid)
    return pid


# ---------------------------------------------------------------------------
# Group: Jira beats (real avi:jira:updated:issue events on a dds-test issue)
# ---------------------------------------------------------------------------
JIRA_SUMMARY = "Doc Drift QA: Jira beats"


def jira_issue():
    import urllib.parse

    jql = urllib.parse.quote(f'project = PAY AND labels = dds-test AND summary ~ "\\"{JIRA_SUMMARY}\\""')
    st, d = q.http("GET", f"/rest/api/3/search/jql?jql={jql}&fields=summary,status")
    for i in (d or {}).get("issues", []):
        if i["fields"]["summary"] == JIRA_SUMMARY:
            return i["key"]
    st, d = q.http("POST", "/rest/api/3/issue", {"fields": {"project": {"key": "PAY"}, "issuetype": {"id": "10002"}, "summary": JIRA_SUMMARY, "labels": ["dds-test"]}})
    if st >= 300:
        raise RuntimeError(f"create issue: {st} {d}")
    return d["key"]


def transition(key, name):
    st, d = q.http("GET", f"/rest/api/3/issue/{key}/transitions")
    t = next(t for t in d["transitions"] if t["to"]["name"] == name)
    return q.http("POST", f"/rest/api/3/issue/{key}/transitions", {"transition": {"id": t["id"]}})[0]


def edit(key, fields):
    return q.http("PUT", f"/rest/api/3/issue/{key}", {"fields": fields})[0]


def adf(text):
    return {"type": "doc", "version": 1, "content": [{"type": "paragraph", "content": [{"type": "text", "text": text}]}]}


def wait_state(pid, want, timeout=100):
    v, secs = wait_for(lambda: (state_of(pid)[0] == want) and want, timeout=timeout, every=5)
    return v is not None, secs


def g_jira():
    key = jira_issue()
    # Start from To Do with no fix version.
    st, d = q.http("GET", f"/rest/api/3/issue/{key}?fields=status,fixVersions")
    if d["fields"]["status"]["name"] != "To Do":
        transition(key, "To Do")
    edit(key, {"fixVersions": []})
    time.sleep(20)
    pid = page("jira page", f"<p>Tracks {key}. Rollout is planned for 2026.12.</p>")
    bind(pid, [{"anchorType": "jira", "jiraKey": key.lower(), "weight": "normal"}])
    record("JIR-00 issue and page", "OBS", {"issue": key, "page": pid})

    transition(key, "In Progress")
    ok, secs = wait_state(pid, "possibly_stale", timeout=45)
    check("JIR-01 To Do -> In Progress: no event", not ok, {"seconds_waited": secs, "state": state_of(pid)[0]})

    transition(key, "Done")
    ok, secs = wait_state(pid, "possibly_stale")
    ev = drift(pid).get("events", [])
    check("JIR-02 -> Done flags the page (0.7, Medium on a normal anchor)", ok and ev and ev[0]["score"] == 0.7 and ev[0]["severity"] == "medium", {"seconds": secs, "event": ev[:1] and {k: ev[0].get(k) for k in ("ref", "summary", "score", "severity", "reasons", "changelog")}})
    q.driver("verify", pageId=pid)

    transition(key, "To Do")
    ok, secs = wait_state(pid, "possibly_stale", timeout=45)
    check("JIR-03 reopened (Done -> To Do): no event", not ok, {"seconds_waited": secs})

    edit(key, {"fixVersions": [{"name": "2026.12"}]})
    ok, secs = wait_state(pid, "possibly_stale")
    ev = drift(pid).get("events", [])
    check("JIR-04 fix version set: flags (0.6)", ok and ev and ev[0]["score"] == 0.6, {"seconds": secs, "event": ev[:1] and {k: ev[0].get(k) for k in ("summary", "score", "changelog")}})
    q.driver("verify", pageId=pid)

    edit(key, {"fixVersions": [{"name": "2027.01"}]})
    ok, secs = wait_state(pid, "possibly_stale")
    ev = drift(pid).get("events", [])
    check("JIR-05 fix version slipped 2026.12 -> 2027.01: flags with both values", ok and ev and "2027.01" in json.dumps(ev[0]), {"seconds": secs, "summary": ev and ev[0].get("summary"), "changelog": ev and ev[0].get("changelog")})
    q.driver("verify", pageId=pid)

    edit(key, {"description": adf("QA description edit at " + time.strftime("%H:%M:%S"))})
    ok, secs = wait_state(pid, "possibly_stale")
    ev = drift(pid).get("events", [])
    check("JIR-06 description edited: flags (0.5 at Balanced)", ok and ev and ev[0]["score"] == 0.5, {"seconds": secs, "event": ev[:1] and {k: ev[0].get(k) for k in ("summary", "score", "changelog")}})
    q.driver("verify", pageId=pid)

    edit(key, {"summary": JIRA_SUMMARY + " (renamed)"})
    ok, secs = wait_state(pid, "possibly_stale", timeout=45)
    check("JIR-07 summary only: no event (0.3)", not ok, {"seconds_waited": secs})
    edit(key, {"summary": JIRA_SUMMARY})

    # Same changelog delivered twice (Forge redelivery): one change record, one event.
    jr = q.jira_record(key, [{"field": "status", "from": "To Do", "to": "Done"}], status_category="done", changelog_id="qa-dup-1")
    a = ingest(jr)
    b = ingest(jr)
    evs, _ = open_events(pid)
    record("JIR-08 the same Jira changelog ingested twice via the driver", "OBS", {"first": a.get("match"), "second": b.get("match"), "open_events": len(evs)},
           "the driver gives every ingest a fresh dedupe key, so this is a reopen, not a dedupe; the real trigger dedupes on jira#KEY#changelogId")
    q.driver("verify", pageId=pid)
    transition(key, "To Do")
    return pid


GROUPS = {
    "ingest": g_ingest,
    "matcher": g_matcher,
    "revert": g_revert,
    "review": g_review,
    "fix": g_fix,
    "tools": g_tools,
    "lifecycle": g_lifecycle,
    "jira": g_jira,
    "dashboard": g_dashboard,
    "settings": g_settings,
    "concurrency": g_concurrency,
}


def main(argv):
    q.RESULT_PAGE = q.ensure_page("QA 2026-11-11: driver results", "<p>Driver result sink for scripts/qa. Not a test subject.</p>")
    names = list(GROUPS) if not argv or argv == ["all"] else argv
    for n in names:
        print(f"\n=== {n} ===")
        try:
            GROUPS[n]()
        except Exception as e:  # keep going: a broken group is itself a finding
            record(f"{n.upper()}-CRASH", "FAIL", {"error": repr(e)[:500]})


if __name__ == "__main__":
    main(sys.argv[1:])
