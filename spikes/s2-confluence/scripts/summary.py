import sys, json
NAMES = {"2752521": "S2-1 resource:", "2719757": "S2-2 bare path", "2752545": "S2-3 data URI",
         "2883607": "S2-4 absolute URL", "2883627": "S2-5 no property", "2752565": "S2-6 restricted",
         "2883647": "S2-7 live refresh"}
rows = {}
for line in sys.stdin:
    for tag in ("S2_DYNPROPS_CALLED", "S2_BG_SEEN", "S2_MODAL_CONTEXT", "S2_OPERATIONS", "S2_PREFIXED", "S2_SETSTATE", "S2_SETSTATE_DENIED"):
        if f" {tag} " in line:
            try:
                j = json.loads(line[line.index(tag) + len(tag):].strip())
            except Exception:
                continue
            pid = str(j.get("pageId"))
            r = rows.setdefault(pid, {})
            r.setdefault(tag, []).append(j)
for pid, r in sorted(rows.items()):
    print(f"== page {pid} {NAMES.get(pid, '')}")
    print(f"   page views (bg script): {len(r.get('S2_BG_SEEN', []))}   dynamicProperties calls: {len(r.get('S2_DYNPROPS_CALLED', []))}")
    for j in r.get("S2_BG_SEEN", [])[:3]:
        print("   user-side read:", json.dumps(j.get("userView"))[:300])
    for j in r.get("S2_DYNPROPS_CALLED", [])[:1]:
        print("   probe localId:", j.get("localId"))
    for j in r.get("S2_MODAL_CONTEXT", [])[:1]:
        print("   byline localId:", j.get("localId"))
    for j in r.get("S2_OPERATIONS", [])[:1]:
        ops = j["asUser"]["body"].get("operations", []) if isinstance(j["asUser"]["body"], dict) else j["asUser"]
        print("   asUser /operations:", j["asUser"]["status"], sorted({o["operation"] for o in ops if isinstance(o, dict) and o.get("targetType") == "page"}))
    for t in ("S2_PREFIXED", "S2_SETSTATE", "S2_SETSTATE_DENIED"):
        for j in r.get(t, [])[:2]:
            print(f"   {t}:", json.dumps(j)[:300])
