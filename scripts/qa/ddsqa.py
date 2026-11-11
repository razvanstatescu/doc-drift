#!/usr/bin/env python3
"""Shared helpers for the Doc Drift Sentinel QA scripts (stdlib only, development environment only).

- Confluence REST (basic auth from ATLASSIAN_EMAIL / ATLASSIAN_API_TOKEN): create, read, update,
  trash, restore pages and read content properties.
- The core app's development-only `dds-dev` driver (apps/core/.dev-url / .dev-token): POST an action,
  then read its result from the `dds-dev-result` content property of `resultPageId`.
- The core app's `ingest-change` web trigger: raw POSTs (signed when DDS_RELAY_SECRET is set).
- ChangeRecord builders for crafted test changes.

Never prints a token or secret. Run from the repo root with `python3 -I scripts/qa/<script>.py`.
The demo site is forced (`one-atlas-jzzf.atlassian.net`), whatever ATLASSIAN_SITE says.
"""
import base64
import calendar
import hashlib
import hmac
import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CORE = ROOT / "apps" / "core"
SITE = "one-atlas-jzzf.atlassian.net"
BASE = f"https://{SITE}"
INGEST_URL = "https://27236af5-036e-44ad-bb1d-d3bec72a5122.webtrigger.atlassian.app/public/CQnkCYa_S50FsZrpcq8Y8Sd00gY"
RESULT_PROPERTY = "dds-dev-result"
BYLINE_PROPERTY = "dds-byline-7f3c2a"
TEST_SPACE = "DDSTEST"
WORKSPACE = "nano-soft-dev"
REPO_SLUG = "payments-api"
# The real repo's UUID is irrelevant for crafted records: bindings match on workspace/slug or slug.
REPO_UUID = "{00000000-0000-4000-8000-00000000qa01}".replace("qa01", "0a01")


def load_env():
    """Loads the repo-root .env into os.environ without echoing anything."""
    env = ROOT / ".env"
    if not env.exists():
        return
    for line in env.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


load_env()


def _auth():
    email, token = os.environ.get("ATLASSIAN_EMAIL"), os.environ.get("ATLASSIAN_API_TOKEN")
    if not email or not token:
        raise SystemExit("ATLASSIAN_EMAIL and ATLASSIAN_API_TOKEN must be set (.env)")
    return "Basic " + base64.b64encode(f"{email}:{token}".encode()).decode()


def http(method, url, body=None, headers=None, auth=True, raw=False, timeout=60):
    """Returns (status, parsed JSON or text). Never raises on HTTP errors."""
    data = None
    if body is not None:
        data = body if isinstance(body, (bytes, bytearray)) else (body.encode() if isinstance(body, str) else json.dumps(body).encode())
    req = urllib.request.Request(url if url.startswith("http") else BASE + url, data=data, method=method)
    if auth:
        req.add_header("Authorization", _auth())
    req.add_header("Accept", "application/json")
    if data is not None:
        req.add_header("Content-Type", "application/json")
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            text = r.read().decode(errors="replace")
            status = r.status
    except urllib.error.HTTPError as e:
        text = e.read().decode(errors="replace")
        status = e.code
    if raw:
        return status, text
    try:
        return status, json.loads(text) if text else None
    except json.JSONDecodeError:
        return status, text


# ---------------------------------------------------------------------------
# Confluence
# ---------------------------------------------------------------------------
_space_ids = {}


def space_id(key=TEST_SPACE):
    if key not in _space_ids:
        st, d = http("GET", f"/wiki/api/v2/spaces?keys={key}")
        res = (d or {}).get("results", []) if st == 200 else []
        if not res:
            raise SystemExit(f"space {key} not found ({st})")
        _space_ids[key] = res[0]["id"]
    return _space_ids[key]


def create_page(title, storage, space=TEST_SPACE, parent_id=None):
    body = {"spaceId": space_id(space), "status": "current", "title": title, "body": {"representation": "storage", "value": storage}}
    if parent_id:
        body["parentId"] = parent_id
    st, d = http("POST", "/wiki/api/v2/pages", body)
    if st >= 300:
        raise RuntimeError(f"create_page {title!r}: {st} {str(d)[:300]}")
    return d["id"]


def find_page(title, space=TEST_SPACE):
    from urllib.parse import quote

    st, d = http("GET", f"/wiki/api/v2/spaces/{space_id(space)}/pages?title={quote(title)}&status=current&limit=5")
    res = (d or {}).get("results", []) if st == 200 else []
    return res[0]["id"] if res else None


def ensure_page(title, storage, space=TEST_SPACE):
    """Creates the page, or resets its body when it exists (a new version). Returns the ID."""
    pid = find_page(title, space)
    if pid is None:
        return create_page(title, storage, space)
    put_page(pid, storage)
    return pid


def get_page(page_id, body=True):
    q = "?body-format=storage" if body else ""
    st, d = http("GET", f"/wiki/api/v2/pages/{page_id}{q}")
    return st, d


def page_storage(page_id):
    st, d = get_page(page_id)
    if st != 200:
        return None, None
    return d["body"]["storage"]["value"], d["version"]["number"]


def put_page(page_id, storage, title=None, message="QA reset"):
    st, d = get_page(page_id, body=False)
    if st != 200:
        raise RuntimeError(f"put_page {page_id}: {st}")
    body = {
        "id": str(page_id),
        "status": "current",
        "title": title or d["title"],
        "body": {"representation": "storage", "value": storage},
        "version": {"number": d["version"]["number"] + 1, "message": message},
    }
    st, d2 = http("PUT", f"/wiki/api/v2/pages/{page_id}", body)
    if st >= 300:
        raise RuntimeError(f"put_page {page_id}: {st} {str(d2)[:300]}")
    return d2["version"]["number"]


def rename_page(page_id, new_title):
    storage, _ = page_storage(page_id)
    return put_page(page_id, storage, title=new_title, message="QA rename")


def trash_page(page_id):
    return http("DELETE", f"/wiki/api/v2/pages/{page_id}")[0]


def restore_page(page_id):
    """Restores a trashed page: v1 PUT with status current and the next version (title from the v2 read)."""
    st, d = http("GET", f"/wiki/api/v2/pages/{page_id}?status=trashed")
    if st != 200:
        return st, d
    body = {"id": str(page_id), "type": "page", "status": "current", "title": d["title"], "version": {"number": d["version"]["number"] + 1}}
    return http("PUT", f"/wiki/rest/api/content/{page_id}?status=trashed", body)


def get_property(page_id, key):
    st, d = http("GET", f"/wiki/api/v2/pages/{page_id}/properties?key={key}")
    if st != 200:
        return None
    res = d.get("results", [])
    return res[0]["value"] if res else None


def byline(page_id):
    return get_property(page_id, BYLINE_PROPERTY)


# ---------------------------------------------------------------------------
# dds-dev driver
# ---------------------------------------------------------------------------
def _local(name):
    return (CORE / name).read_text().strip()


DEV_URL = os.environ.get("DDS_DEV_URL") or _local(".dev-url")
DEV_TOKEN = os.environ.get("DDS_DEV_TOKEN") or _local(".dev-token")
RESULT_PAGE = None  # set by the runner to its own DDSTEST page, so parallel testers don't collide


def driver(action, result_page=None, wait=True, **body):
    """POSTs one driver action and returns (http status, result). The result is read from the
    `dds-dev-result` property of the result page, waiting for a write newer than the request."""
    page = result_page or RESULT_PAGE
    payload = {"action": action, **body}
    if page:
        payload["resultPageId"] = page
    before = time.time()
    st, text = http("POST", DEV_URL, payload, headers={"x-dds-dev-token": DEV_TOKEN}, auth=False, raw=True, timeout=120)
    if not wait or st != 202:
        return st, text
    for _ in range(20):
        prop = get_property(page, RESULT_PROPERTY) if page else None
        if prop and prop.get("action") == action:
            at = prop.get("at", "")
            try:
                ts = calendar.timegm(time.strptime(at[:19], "%Y-%m-%dT%H:%M:%S"))
            except ValueError:
                ts = 0
            if ts >= before - 5:
                return st, prop.get("result")
        time.sleep(1.5)
    return st, {"_qa": "result not read in time"}


def driver_raw(payload, token=None):
    """POST without the result read (driver auth tests)."""
    headers = {} if token is None else {"x-dds-dev-token": token}
    return http("POST", DEV_URL, payload, headers=headers, auth=False, raw=True)


# ---------------------------------------------------------------------------
# ingest-change web trigger
# ---------------------------------------------------------------------------
def sign(secret, body, now=None):
    ts = str(int(now if now is not None else time.time()))
    sig = hmac.new(secret.encode(), f"{ts}.{body}".encode(), hashlib.sha256).hexdigest()
    return sig, ts


def ingest_post(body, signature=None, timestamp=None):
    headers = {}
    if signature is not None:
        headers["x-dds-signature"] = signature
    if timestamp is not None:
        headers["x-dds-timestamp"] = timestamp
    return http("POST", INGEST_URL, body, headers=headers, auth=False, raw=True)


# ---------------------------------------------------------------------------
# Records
# ---------------------------------------------------------------------------
_pr_counter = [int(time.time()) % 100000 + 70000]


def next_pr():
    _pr_counter[0] += 1
    return _pr_counter[0]


def fmod(path, added=10, removed=10):
    return {"status": "modified", "path": path, "linesAdded": added, "linesRemoved": removed}


def bb_record(files, title="QA change", pr=None, hunks=None, repo_slug=REPO_SLUG, workspace=WORKSPACE, dest="main", default="main", author="QA Bot", merge=None):
    pr = pr or next_pr()
    rec = {
        "source": "bitbucket",
        "workspace": workspace,
        "repoSlug": repo_slug,
        "repoUuid": REPO_UUID,
        "prId": pr,
        "title": title,
        "author": author,
        "mergeCommit": merge or hashlib.sha1(f"{pr}{title}".encode()).hexdigest()[:12],
        "sourceBranch": f"qa/{pr}",
        "destinationBranch": dest,
        "files": files,
    }
    if default is not None:
        rec["defaultBranch"] = default
    if hunks is not None:
        rec["hunks"] = hunks
    return rec


def unified(path, removed=(), added=(), old_path=None, status="modified"):
    """A minimal git-style diff for one file."""
    a = old_path or path
    lines = [f"diff --git a/{a} b/{path}"]
    if status == "renamed":
        lines += ["similarity index 80%", f"rename from {a}", f"rename to {path}"]
    if status == "removed":
        lines += ["deleted file mode 100644", f"--- a/{a}", "+++ /dev/null"]
    elif status == "added":
        lines += ["new file mode 100644", "--- /dev/null", f"+++ b/{path}"]
    else:
        lines += [f"--- a/{a}", f"+++ b/{path}"]
    lines.append(f"@@ -1,{len(removed)} +1,{len(added)} @@")
    lines += [f"-{r}" for r in removed] + [f"+{x}" for x in added]
    return "\n".join(lines) + "\n"


def jira_record(key, changelog, status_category=None, changelog_id=None, author="QA Bot"):
    rec = {"source": "jira", "issueKey": key, "changelogId": changelog_id or f"qa{time.time_ns()}", "author": author, "changelog": changelog}
    if status_category:
        rec["statusCategory"] = status_category
    return rec
