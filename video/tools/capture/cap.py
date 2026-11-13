#!/usr/bin/env python3
"""REST helpers for the capture agent: Confluence and Jira on the demo site, Bitbucket payments-api.

Credentials come from the environment (load the repo-root .env with `set -a; . ../.env; set +a`
first). Nothing here prints or writes a credential. The demo site is forced, whatever
ATLASSIAN_SITE says. Every write goes through `log()` into LOG.md with a timestamp.
"""
import base64
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
LOG = HERE / "LOG.md"
SITE = "one-atlas-jzzf.atlassian.net"
BASE = f"https://{SITE}"
BB_API = "https://api.bitbucket.org/2.0"
WORKSPACE = "nano-soft-dev"
REPO = "payments-api"
RUNBOOK_ID = "2720100"
BYLINE_KEY = "dds-byline-7f3c2a"


def now_iso():
    return datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")


def log(line):
    """Appends one timestamped line to LOG.md (and echoes it)."""
    text = f"- {now_iso()} {line}"
    with LOG.open("a") as f:
        f.write(text + "\n")
    print(text)


def _basic(user_var, token_var):
    user, token = os.environ.get(user_var), os.environ.get(token_var)
    if not user or not token:
        raise SystemExit(f"{user_var} and {token_var} must be set (load the repo-root .env)")
    return "Basic " + base64.b64encode(f"{user}:{token}".encode()).decode()


def _request(method, url, auth, body=None, content_type="application/json", timeout=60, extra_headers=None):
    data = None
    if body is not None:
        data = body if isinstance(body, (bytes, bytearray)) else json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Authorization", auth)
    req.add_header("Accept", "application/json")
    if data is not None and content_type:
        req.add_header("Content-Type", content_type)
    for k, v in (extra_headers or {}).items():
        req.add_header(k, v)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            raw, status, headers = r.read(), r.status, dict(r.headers)
    except urllib.error.HTTPError as e:
        raw, status, headers = e.read(), e.code, dict(e.headers or {})
    text = raw.decode(errors="replace")
    try:
        parsed = json.loads(text) if text and text[:1] in "{[" else text
    except json.JSONDecodeError:
        parsed = text
    return status, parsed, headers


# ---------------------------------------------------------------- Atlassian (Confluence, Jira)
def atl(method, path, body=None, **kw):
    url = path if path.startswith("http") else BASE + path
    return _request(method, url, _basic("ATLASSIAN_EMAIL", "ATLASSIAN_API_TOKEN"), body, **kw)


def atl_paged(path):
    while path:
        st, d, _ = atl("GET", path)
        if st != 200:
            raise RuntimeError(f"GET {path.split('?')[0]}: {st} {str(d)[:200]}")
        yield from d.get("results", [])
        nxt = (d.get("_links") or {}).get("next")
        path = (nxt if nxt.startswith("/wiki") else "/wiki" + nxt) if nxt else None


def space_id(key="PLAT"):
    st, d, _ = atl("GET", f"/wiki/api/v2/spaces?keys={key}")
    return d["results"][0]["id"], d["results"][0]


def plat_pages():
    sid, space = space_id("PLAT")
    pages = list(atl_paged(f"/wiki/api/v2/spaces/{sid}/pages?limit=250&status=current"))
    return sid, space, pages


def get_property(page_id, key):
    st, d, _ = atl("GET", f"/wiki/api/v2/pages/{page_id}/properties?key={key}")
    if st != 200:
        return None
    res = d.get("results", [])
    return res[0] if res else None


def byline(page_id):
    p = get_property(page_id, BYLINE_KEY)
    return p["value"] if p else None


def state_of_title(title):
    if not title:
        return "unanchored (no property)"
    head = title.split(" · ")[0].strip()
    return {"Verified": "verified", "Possibly stale": "possibly_stale", "Stale": "stale", "Unanchored": "unanchored"}.get(head, head)


def page(page_id, body=True):
    q = "?body-format=storage" if body else ""
    st, d, _ = atl("GET", f"/wiki/api/v2/pages/{page_id}{q}")
    if st != 200:
        raise RuntimeError(f"page {page_id}: {st}")
    return d


def page_version(page_id, number):
    """The page's storage body at an older version (v1 content API)."""
    st, d, _ = atl("GET", f"/wiki/rest/api/content/{page_id}?status=historical&version={number}&expand=body.storage,version")
    if st != 200:
        raise RuntimeError(f"page {page_id} v{number}: {st} {str(d)[:200]}")
    return d


def put_page(page_id, storage, message):
    cur = page(page_id, body=False)
    body = {
        "id": str(page_id),
        "status": "current",
        "title": cur["title"],
        "body": {"representation": "storage", "value": storage},
        "version": {"number": cur["version"]["number"] + 1, "message": message},
    }
    st, d, _ = atl("PUT", f"/wiki/api/v2/pages/{page_id}", body)
    if st >= 300:
        raise RuntimeError(f"PUT page {page_id}: {st} {str(d)[:300]}")
    return d["version"]["number"]


# ---------------------------------------------------------------- Bitbucket
def bb(method, path, body=None, content_type="application/json", **kw):
    url = path if path.startswith("http") else BB_API + path
    return _request(method, url, _basic("BITBUCKET_EMAIL", "BITBUCKET_API_TOKEN"), body, content_type=content_type, **kw)


def bb_repo(path=""):
    return f"/repositories/{WORKSPACE}/{REPO}{path}"


def bb_paged(path):
    while path:
        st, d, _ = bb("GET", path)
        if st != 200:
            raise RuntimeError(f"GET {path.split('?')[0]}: {st} {str(d)[:200]}")
        yield from d.get("values", [])
        path = d.get("next")


def bb_file_exists(rev, path):
    st, _, _ = bb("GET", bb_repo(f"/src/{rev}/{urllib.parse.quote(path)}"))
    return st == 200


def bb_file(rev, path):
    url = BB_API + bb_repo(f"/src/{rev}/{urllib.parse.quote(path)}")
    req = urllib.request.Request(url)
    req.add_header("Authorization", _basic("BITBUCKET_EMAIL", "BITBUCKET_API_TOKEN"))
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        raise


def bb_branch_head(name):
    st, d, _ = bb("GET", bb_repo(f"/refs/branches/{urllib.parse.quote(name, safe='')}"))
    return None if st == 404 else d["target"]["hash"]


def bb_highest_pr():
    st, d, _ = bb("GET", bb_repo("/pullrequests?state=OPEN&state=MERGED&state=DECLINED&state=SUPERSEDED&sort=-id&pagelen=5&fields=values.id,values.state,values.title"))
    if st != 200:
        raise RuntimeError(f"highest PR: {st} {str(d)[:200]}")
    vals = d.get("values", [])
    return (vals[0]["id"] if vals else 0), vals


def write_json(path, data):
    Path(path).write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
