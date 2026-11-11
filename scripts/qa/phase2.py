#!/usr/bin/env python3
"""Live checks for phase 2, Track A (docs/testing/backlog-phase2.md): the P0 fixes, the P1/P2 backend
fixes and the new resolvers, through the development-only dev driver and REST.

Same rules as run_matrix.py: DDSTEST pages titled "QA P2 ..." bound to the sandbox repo
`nano-soft-dev/qa-sandbox` (no PLAT page anchors it), so PLAT's demo state is never touched; PLAT is
only read (dashboard, tools). One JSON line per case goes to scripts/qa/out/phase2.jsonl.

Usage (repo root):  python3 -I scripts/qa/phase2.py [all | bylines tools links settings reverts
                    resolvers space dashboard notify lifecycle reset plat]
Never prints a token or secret.
"""
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import ddsqa as q  # noqa: E402
import run_matrix as rm  # noqa: E402

rm.RESULTS = rm.OUT / "phase2.jsonl"
record, check, rec, ingest, inspect, drift, open_events, state_of, bind, path_anchor = (
    rm.record, rm.check, rm.rec, rm.ingest, rm.inspect, rm.drift, rm.open_events, rm.state_of, rm.bind, rm.path_anchor,
)
ME = "5e8d4e6bacb63e0b834222ee"  # Razvan Statescu (owner of the QA pages)
PLAT_BASELINE = {"anchored": 18, "total": 24, "possiblyStale": 5, "stale": 0}


def page(title, body):
    return q.ensure_page(f"QA P2 {title}", body)


def tool(name, inp, context=None):
    body = {"tool": name, "input": inp}
    if context:
        body["pageId"] = context
    return q.driver("tool", **body)[1] or {}


def byline_title(pid):
    return (q.byline(pid) or {}).get("title")


# ---------------------------------------------------------------------------
def g_bylines():
    r = q.driver("refresh-all", limit=500)[1] or {}
    # 404: a page_state row for a page that no longer exists (the QA run's 999999999) has no byline.
    bad = [p for p in r.get("pages", []) if p.get("byline") not in (200, 201, 404)]
    check("P2-BYL-01 refresh-all rewrote every existing page's byline", r.get("refreshed", 0) > 0 and not bad,
          {"refreshed": r.get("refreshed"), "failed": bad[:5], "missing_pages": [p["pageId"] for p in r.get("pages", []) if p.get("byline") == 404]})
    titles = {pid: byline_title(pid) for pid in ("2752731", "3047452", "2720129")}
    check("P2-BYL-02 (UX-6) byline titles lead with the state word: '<State> · Doc Drift'", all(t and t.endswith(" · Doc Drift") for t in titles.values()), titles)


def g_tools():
    ctx = "3080280"
    t2752731 = "DDS test: Payments rollback runbook"
    r = tool("check-page-freshness", {"pageUrl": f"{q.BASE}/wiki/x/2wAq"}, ctx)
    check("P2-TOL-01 (BUG-04) a tiny link resolves to its page, not the Rovo context", r.get("pageId") == "2752731" and r.get("resolvedFrom") == "tinyUrl",
          {k: r.get(k) for k in ("pageId", "title", "resolvedFrom", "status", "citePolicy")})
    check("P2-TOL-02 (UX-1) guidance opens with the page title", str(r.get("guidance", "")).startswith(f'"{r.get("title")}" is '), {"guidance": r.get("guidance")})
    r = tool("check-page-freshness", {"pageId": t2752731}, ctx)
    check("P2-TOL-03 (BUG-04) a title passed as pageId is resolved as a title", r.get("pageId") == "2752731" and r.get("resolvedFrom") == "title", {k: r.get(k) for k in ("pageId", "resolvedFrom", "title")})
    r = tool("check-page-freshness", {"pageUrl": f"{q.BASE}/wiki/x/gQBH"}, ctx)
    check("P2-TOL-04 (BUG-04) the QA run's tiny link (page 4653185, not visible) is unknown, never the context page", r.get("status") == "unknown" and r.get("pageId") != ctx and r.get("title") is None,
          {k: r.get(k) for k in ("pageId", "status", "title", "error")})
    r = tool("check-page-freshness", {"pageUrl": f"{q.BASE}/wiki/spaces/PLAT/overview"}, ctx)
    check("P2-TOL-05 (BUG-04) an unreadable link asks which page", r.get("error") == "no_page" and r.get("pageId") is None, {k: r.get(k) for k in ("error", "guidance")})
    r = tool("check-page-freshness", {"pageUrl": "https://other-site.atlassian.net/wiki/spaces/PLAT/pages/2720129/X"}, ctx)
    check("P2-TOL-06 (obs 9) a link to another site is refused", r.get("error") == "other_site", {k: r.get(k) for k in ("error", "guidance")})
    r = tool("check-page-freshness", {}, ctx)
    check("P2-TOL-07 the context page is used only when no page was named", r.get("pageId") == ctx and r.get("resolvedFrom") == "context", {k: r.get(k) for k in ("pageId", "resolvedFrom")})
    r = tool("check-page-freshness", {"pageId": "2720129"})
    check("P2-TOL-08 (R-5) citePolicy and affectedSections on a Possibly stale PLAT page", r.get("citePolicy") == "cite_with_caveat" and isinstance(r.get("affectedSections"), list),
          {k: r.get(k) for k in ("title", "status", "citePolicy", "affectedSections", "guidance")})
    r = tool("list-stale-pages", {"spaceKey": "plat"})
    check("P2-TOL-09 (BUG-10) list-stale-pages with 'plat' finds PLAT's drifted pages and echoes the limit", r.get("spaceKey") == "PLAT" and len(r.get("pages", [])) == PLAT_BASELINE["possiblyStale"] and r.get("limit") == 10,
          {"spaceKey": r.get("spaceKey"), "pages": len(r.get("pages", [])), "limit": r.get("limit"), "guidance": str(r.get("guidance"))[:200]})
    r = tool("list-stale-pages", {"spaceKey": "PLAT", "limit": "abc"})
    check("P2-TOL-10 (obs 5) a bad limit is reported, not silently ignored", "was used" in str(r.get("guidance")), {"limit": r.get("limit"), "guidance": str(r.get("guidance"))[-120:]})
    r = tool("find-docs-for-path", {"repo": "payments-api", "path": "**/*.yaml"})
    src = [p for p in r.get("pages", []) if p.get("anchor", "").endswith("src/**")]
    check("P2-TOL-11 (BUG-07) a prefix-less glob no longer returns src/** pages", not src, {"pages": [(p["title"], p["anchor"], p["match"]) for p in r.get("pages", [])][:8]})


LINK = '<ac:link><ri:page ri:content-title="Doc Drift M2 test page" /><ac:plain-text-link-body><![CDATA[the test home]]></ac:plain-text-link-body></ac:link>'
LINKED = f'<h2>Retry</h2><p>Read {LINK} then run <code>scripts/p2-link.sh --retries</code> <strong>twice</strong>.</p>'


def g_links():
    pid = page("link page", LINKED)
    bind(pid, [path_anchor("scripts/p2-link.sh", "critical")])
    ingest(rec([q.fmod("scripts/p2-link.sh", 10, 10)], title="QA P2 link change"))
    ctx = tool("get-drift-context", {"pageId": pid})
    blocks = [b for s in ctx.get("sections", []) for b in s.get("blocks", [])]
    para = next((b for b in blocks if "--retries" in b.get("text", "")), {})
    check("P2-FIX-01 (BUG-05) get-drift-context shows the link text", "the test home" in para.get("text", ""), {"block": para, "title": ctx.get("title")})
    bad = tool("submit-fix-proposal", {"pageId": pid, "blockId": para.get("blockId"), "proposedText": "Open the docs and run scripts/p2-link.sh --attempts 3."})
    check("P2-FIX-02 (BUG-05) a draft that rewrites the link is refused (unsupported_span), nothing saved", bad.get("error") == "unsupported_span", {k: bad.get(k) for k in ("ok", "error", "guidance")})
    good = tool("submit-fix-proposal", {"pageId": pid, "blockId": para.get("blockId"), "proposedText": "Read the test home, then run scripts/p2-link.sh --attempts 3 times."})
    ap = q.driver("apply-proposal", proposalId=good.get("proposalId"))[1] or {}
    storage, _ = q.page_storage(pid)
    check("P2-FIX-03 (BUG-05) accepting a draft that keeps the link: link intact, text once", good.get("ok") and ap.get("ok") and storage.count("the test home") == 1 and "<ac:link>" in storage and "ri:content-title" in storage,
          {"proposal": good.get("ok"), "apply": {k: ap.get(k) for k in ("ok", "version", "versionMessage", "stateTitle")}, "storage": storage[:400]})
    q.put_page(pid, LINKED)  # reset the text for the next run
    q.driver("verify", pageId=pid)
    return pid


def g_settings():
    st, r = q.driver("settings", settings={"ignoreGlobs": ["**/*.md", "!docs/keep.md"]})
    check("P2-SET-01 (BUG-01) a negated ignore glob is refused with a field error; nothing saved", isinstance(r, dict) and r.get("ok") is False and "ignoreGlobs" in (r.get("fieldErrors") or {}),
          {"fieldErrors": (r or {}).get("fieldErrors") if isinstance(r, dict) else r})


def g_reverts():
    pid = page("revert page", "<p>Runs <code>scripts/p2-rev.sh</code>.</p>")
    bind(pid, [path_anchor("scripts/p2-rev.sh", "critical")])
    f = lambda n=5: [q.fmod("scripts/p2-rev.sh", n, n)]
    # BUG-02
    pr = q.next_pr()
    title = f"QA P2 move flag {pr}"
    ingest(rec(f(9), pr=pr, title=title))
    q.driver("verify", pageId=pid, note="page updated for the change")
    out = ingest(rec(f(9), title=f'Revert "{title}" (pull request #{pr})'))
    st, _ = state_of(pid)
    check("P2-RVT-06 (BUG-02) a revert of an already-verified change flags the page", st == "possibly_stale" and (out.get("match") or {}).get("outcome") == "revert+scored", {"state": st, "match": out.get("match")})
    q.driver("verify", pageId=pid)
    # Regression: a revert of an unreviewed change still closes it.
    pr = q.next_pr()
    title = f"QA P2 raise pool {pr}"
    ingest(rec(f(), pr=pr, title=title))
    out = ingest(rec(f(), title=f'Revert "{title}" (pull request #{pr})'))
    st, _ = state_of(pid)
    check("P2-RVT-01 a revert of an open change still closes it (no new event on that page)", st == "verified" and (out.get("match") or {}).get("outcome") == "revert", {"state": st, "match": out.get("match")})
    # BUG-03
    victim = q.next_pr()
    ingest(rec(f(), pr=victim, title=f"QA P2 unrelated {victim}"))
    pr = q.next_pr()
    title = f"Fix #{victim}: tune retries"
    ingest(rec(f(6), pr=pr, title=title))
    out = ingest(rec(f(6), title=f'Revert "{title}" (pull request #{pr})'))
    evs, _ = open_events(pid)
    refs = sorted(e["ref"] for e in evs)
    check("P2-RVT-04 (BUG-03) the revert closes the PR it names, not the '#N' in its title", any(r.endswith(f"#{victim}") for r in refs) and not any(r.endswith(f"#{pr}") for r in refs),
          {"open_refs": refs, "victim": victim, "reverted": pr})
    q.driver("verify", pageId=pid)
    # BUG-13
    pr = q.next_pr()
    title = f"QA P2 late delivery {pr}"
    ingest(rec(f(), title=f'Revert "{title}" (pull request #{pr})'))
    out = ingest(rec(f(), pr=pr, title=title))
    st, _ = state_of(pid)
    check("P2-RVT-05 (BUG-13) revert delivered first: the original is closed at once", st == "verified", {"state": st, "match": out.get("match")})
    # BUG-08
    out = ingest({**rec(f(7)), "filesTruncated": True, "totalFiles": 812})
    evs, _ = open_events(pid)
    d = drift(pid)
    reasons = [r for e in d.get("events", []) for r in e.get("reasons", [])]
    check("P2-ING-08 (BUG-08) a truncated diffstat says so on the event", any("812 files; only the first" in r for r in reasons), {"reasons": reasons[:6]})
    q.driver("verify", pageId=pid)
    return pid


RENAME_BODY = '<h2>Run</h2><p>Use <code>scripts/p2-old.sh</code> to start.</p><ac:structured-macro ac:name="code"><ac:plain-text-body><![CDATA[./scripts/p2-old.sh --go]]></ac:plain-text-body></ac:structured-macro>'


def g_resolvers():
    pid = page("rename page", RENAME_BODY)
    q.put_page(pid, RENAME_BODY)
    bind(pid, [path_anchor("scripts/p2-old.sh"), path_anchor("deploy/p2/**", "critical", kind="glob")])
    renamed = {"status": "renamed", "path": "scripts/p2-new.sh", "oldPath": "scripts/p2-old.sh", "linesAdded": 0, "linesRemoved": 0}
    ingest(rec([renamed], title="QA P2 rename script"))
    d = drift(pid)
    ev = (d.get("events") or [{}])[0]
    fields = {k: d.get(k) for k in ("stateTitle", "whySentence", "page", "verifiedContext", "verifiedBy")}
    check("P2-DRF-01 getPageDrift: whySentence (page and event), page.status, stateTitle, verifiedContext", bool(d.get("whySentence")) and bool(ev.get("whySentence")) and (d.get("page") or {}).get("status") == "current"
          and d.get("stateTitle") == "Possibly stale · Doc Drift" and isinstance(d.get("verifiedContext"), dict), {**fields, "eventWhy": ev.get("whySentence")})
    rq = d.get("renameQuickFix") or []
    check("P2-DRF-02 (R-4) renameQuickFix proposes the paragraph and the code block", len(rq) == 1 and rq[0].get("eventId") == ev.get("id") and len(rq[0].get("blocks", [])) == 2,
          {"renameQuickFix": rq})
    ap = q.driver("rename-quick-fix", eventId=ev.get("id"))[1] or {}
    storage, _ = q.page_storage(pid)
    snap = inspect(pid)
    patterns = sorted(b.get("pattern") for b in (snap.get("sql") or {}).get("bindings", []))
    check("P2-RQF-01 (R-4) applyRenameQuickFix: one version naming the PR, both mentions replaced, anchor follows, page Verified",
          ap.get("ok") and "PR #" in str(ap.get("versionMessage")) and "p2-old.sh" not in storage and storage.count("scripts/p2-new.sh") == 2 and ap.get("anchorUpdated") and ap.get("state") == "verified" and "scripts/p2-new.sh" in patterns,
          {"result": {k: ap.get(k) for k in ("ok", "version", "versionMessage", "replaced", "anchorUpdated", "state", "message")}, "patterns": patterns})
    # R-7 on the glob: stop watching one file, the rest still flags.
    ingest(rec([{"status": "removed", "path": "deploy/p2/values.yaml", "linesAdded": 0, "linesRemoved": 40}], title="QA P2 remove values"))
    evs, _ = open_events(pid)
    sw = q.driver("stop-watching", eventId=evs[0]["id"] if evs else "")[1] or {}
    snap = inspect(pid)
    glob = next((b for b in (snap.get("sql") or {}).get("bindings", []) if b.get("pattern") == "deploy/p2/**"), {})
    check("P2-STW-01 (R-7) stop watching a file on a glob anchor narrows it and dismisses the event", sw.get("ok") and sw.get("action") == "narrowed" and "deploy/p2/values.yaml" in str(glob.get("exclude_paths")) and sw.get("state") == "verified",
          {"result": {k: sw.get(k) for k in ("ok", "action", "excluded", "state", "message")}, "exclude_paths": glob.get("exclude_paths")})
    again = ingest(rec([{"status": "added", "path": "deploy/p2/values.yaml", "linesAdded": 120, "linesRemoved": 0}], title="QA P2 re-add values"))
    other = ingest(rec([{"status": "added", "path": "deploy/p2/other.yaml", "linesAdded": 120, "linesRemoved": 0}], title="QA P2 add other"))
    check("P2-STW-02 (R-7) the excluded file no longer flags; another file under the glob still does", (again.get("match") or {}).get("events") == 0 and (other.get("match") or {}).get("events") == 1,
          {"excluded": again.get("match"), "other": other.get("match")})
    q.driver("verify", pageId=pid)
    # R-7 on an exact path: the anchor is removed.
    ingest(rec([q.fmod("scripts/p2-new.sh", 50, 50)], title="QA P2 change new script"))
    evs, _ = open_events(pid)
    sw = q.driver("stop-watching", eventId=evs[0]["id"] if evs else "")[1] or {}
    snap = inspect(pid)
    patterns = sorted(b.get("pattern") for b in (snap.get("sql") or {}).get("bindings", []))
    check("P2-STW-03 (R-7) stop watching an exact path removes that anchor", sw.get("action") == "removed" and "scripts/p2-new.sh" not in patterns, {"result": sw.get("message"), "patterns": patterns})
    # R-8: a quiet change to anchored code counts in verifiedContext.
    quiet = ingest(rec([q.fmod("deploy/p2/x.yaml", 1, 1)], title="QA P2 quiet change"))
    d = drift(pid)
    vc = d.get("verifiedContext") or {}
    check("P2-DRF-03 (R-8) verifiedContext counts a quiet change since verification", (quiet.get("match") or {}).get("events") == 0 and vc.get("changesSince", 0) >= 1 and vc.get("relevant") == 0,
          {"verifiedContext": vc, "quiet": quiet.get("match")})
    # Reset for the next run.
    q.put_page(pid, RENAME_BODY)
    bind(pid, [path_anchor("scripts/p2-old.sh"), path_anchor("deploy/p2/**", "critical", kind="glob")])
    # Mark verified on an Unanchored page.
    upid = page("unanchored page", "<p>No anchors here.</p>")
    v = q.driver("verify", pageId=upid)[1] or {}
    check("P2-VER-01 (obs 1) Mark verified on an Unanchored page says there is nothing to verify", v.get("error") == "unanchored", {k: v.get(k) for k in ("ok", "error", "message")})
    return pid


def g_space():
    body = '<p>Runbook for <a href="https://bitbucket.org/nano-soft-dev/qa-sandbox">qa-sandbox</a>: run <code>scripts/p2-bulk.sh</code> then <code>deploy/p2bulk/**</code>.</p>'
    pid = page("bulk page", body)
    bind(pid, [])  # unanchored before the bulk save
    s = q.driver("suggest-space", spaceKey="ddstest", limit=50)[1]
    hit = next((p for p in s if p.get("pageId") == pid), None) if isinstance(s, list) else None
    check("P2-SPC-01 (R-1) suggestSpaceAnchors lists unanchored pages with suggestions (lowercase key)", isinstance(s, list) and len(s) > 0 and all("suggestions" in p for p in s),
          {"pages": len(s) if isinstance(s, list) else s, "bulkPage": hit and [x.get("label") for x in hit["suggestions"]], "first": isinstance(s, list) and s[:2]})
    items = [{"pageId": pid, "anchors": [path_anchor("scripts/p2-bulk.sh")]}, {"pageId": "999999999", "anchors": [path_anchor("a.sh")]}]
    r = q.driver("save-space", items=items, spaceKey="DDSTEST")[1] or {}
    check("P2-SPC-02 (R-1) saveSpaceAnchors saves each page and reports partial results", r.get("ok") and r.get("saved") == 1 and r.get("failed") == 1,
          {k: r.get(k) for k in ("saved", "failed", "message", "results")})
    bind(pid, [])


def g_dashboard():
    a = q.driver("dashboard", spaceKey="PLAT")[1] or {}
    b = q.driver("dashboard", spaceKey="plat")[1] or {}
    pages = a.get("pages", [])
    check("P2-DSH-01 (BUG-10) the dashboard key is case-insensitive", a.get("kpis") == b.get("kpis") and b.get("spaceKey") == "PLAT", {"PLAT": a.get("kpis"), "plat": b.get("kpis")})
    check("P2-DSH-02 dashboard pages carry url and lastChangeAt", bool(pages) and all(p.get("url") and p.get("lastChangeAt") for p in pages), {"first": pages[:1]})


def g_notify():
    pid = page("notify page", "<p>Runs <code>scripts/p2-notify.sh</code>.</p>")
    bind(pid, [path_anchor("scripts/p2-notify.sh", "critical")])
    ingest({**rec([q.fmod("scripts/p2-notify.sh", 10, 10)], title="QA P2 author mention"), "authorAccountId": ME, "author": "Razvan Statescu"})
    n = q.driver("notify", pageId=pid)[1] or {}
    st, d = q.http("GET", f"/wiki/api/v2/pages/{pid}/footer-comments?body-format=storage&limit=5")
    bodies = [c["body"]["storage"]["value"] for c in (d or {}).get("results", [])]
    last = bodies[-1] if bodies else ""
    check("P2-NTF-01 (R-6) the drift comment mentions the PR author when the account resolves", n.get("outcome") in ("created", "appended") and "merged by <ac:link><ri:user" in "".join(bodies),
          {"notify": n, "comment": last[-400:]})
    q.driver("verify", pageId=pid)


def g_lifecycle():
    pid = page("lifecycle page", "<p>Uses <code>scripts/p2-life.sh</code>.</p>")
    bind(pid, [path_anchor("scripts/p2-life.sh", "critical")])
    ingest(rec([q.fmod("scripts/p2-life.sh", 5, 5)]))
    before = byline_title(pid)
    q.trash_page(pid)
    gone, secs = rm.wait_for(lambda: not (inspect(pid).get("sql") or {}).get("bindings"), timeout=120)
    after_trash = byline_title(pid)
    rs = q.restore_page(pid)
    ok, secs2 = rm.wait_for(lambda: (byline_title(pid) or "").startswith("Unanchored"), timeout=120)
    check("P2-LIF-05 (BUG-09) trash then restore: the byline reads Unanchored", ok is not None,
          {"before": before, "after_trash": after_trash, "restore": rs[0], "after_restore": byline_title(pid), "trash_s": secs, "restore_s": secs2})
    mid = page("move page", "<p>Uses <code>scripts/p2-move.sh</code>.</p>")
    bind(mid, [path_anchor("scripts/p2-move.sh", "critical")])
    ingest(rec([q.fmod("scripts/p2-move.sh", 5, 5)]))
    mv = q.http("PUT", f"/wiki/rest/api/content/{mid}/move/append/{rm.engs_home()}")
    moved, secs = rm.wait_for(lambda: all(b.get("space_key") == "ENGS" for b in (inspect(mid).get("sql") or {}).get("bindings", []) or [{}]), timeout=120)
    d_eng = q.driver("dashboard", spaceKey="ENGS")[1] or {}
    check("P2-LIF-02 (BUG-11) a page moved to ENGS: its bindings follow and the ENGS dashboard lists it", moved is not None and mid in [p["pageId"] for p in d_eng.get("pages", [])],
          {"move": mv[0], "seconds": secs, "bindings": [b.get("space_key") for b in (inspect(mid).get("sql") or {}).get("bindings", [])], "engs_pages": [p["pageId"] for p in d_eng.get("pages", [])]})
    q.driver("verify", pageId=mid)
    q.trash_page(mid)


def g_reset():
    """Page 3047452 (apps/core README checks 8 and 9): clear the dampeners left by the UX run and re-flag it."""
    pid = "3047452"
    anchors = [
        {"anchorType": "path", "repo": "payments-api", "pattern": "src/app.ts", "weight": "normal", "resetDismissCount": True},
        {"anchorType": "jira", "jiraKey": "PAY-21", "weight": "normal", "resetDismissCount": True},
        {"anchorType": "path", "repo": "payments-api", "pattern": "scripts/deploy-v2.sh", "weight": "critical", "resetDismissCount": True},
    ]
    bind(pid, anchors)
    counts = [b.get("dismiss_count") for b in (inspect(pid).get("sql") or {}).get("bindings", [])]
    out = rm.ingest(q.bb_record([q.fmod("scripts/deploy-v2.sh", 12, 8)], title="QA P2 re-flag M2 test page"))
    st, _ = state_of(pid)
    check("P2-RST-01 (BUG-15) 3047452: dampeners reset to 0 and the page re-flagged", all(c == 0 for c in counts) and st == "possibly_stale",
          {"dismiss_counts": counts, "state": st, "byline": byline_title(pid), "match": out.get("match")})


def g_plat():
    d = q.driver("dashboard", spaceKey="PLAT")[1] or {}
    k = d.get("kpis") or {}
    check("P2-PLAT PLAT demo state unchanged", all(k.get(x) == v for x, v in PLAT_BASELINE.items()), {"kpis": k})


GROUPS = {
    "bylines": g_bylines, "tools": g_tools, "links": g_links, "settings": g_settings, "reverts": g_reverts,
    "resolvers": g_resolvers, "space": g_space, "dashboard": g_dashboard, "notify": g_notify,
    "lifecycle": g_lifecycle, "reset": g_reset, "plat": g_plat,
}


def main(argv):
    q.RESULT_PAGE = q.ensure_page("QA 2026-11-11: driver results", "<p>Driver result sink for scripts/qa. Not a test subject.</p>")
    names = list(GROUPS) if not argv or argv == ["all"] else argv
    for n in names:
        print(f"\n=== {n} ===", flush=True)
        try:
            GROUPS[n]()
        except Exception as e:  # keep going: a broken group is itself a finding
            record(f"P2-{n.upper()}-CRASH", "FAIL", {"error": repr(e)[:500]})


if __name__ == "__main__":
    main(sys.argv[1:])
