"""Tạo seed.json (video mẫu khi chưa có máy chủ) từ máy chủ chạy thử: wrangler dev ở cổng 8787.
Chạy: python3 tools/make_seed.py  — chỉ lấy id/tiêu đề/kênh công khai của YouTube."""
import json, pathlib, re, urllib.parse, urllib.request
root = pathlib.Path(__file__).resolve().parent.parent
js = (root / "app.js").read_text("utf-8")
presets = re.findall(r'\{ e: "[^"]+", n: "([^"]+)", q: \[([^\]]+)\]', js)
out = {}
for name, qs in presets:
    qs = re.findall(r'"([^"]+)"', qs)[:2]
    items, seen = [], set()
    for q in qs:
        r = urllib.request.Request("http://localhost:8787/search?" + urllib.parse.urlencode({"q": q, "kind": "video"}), headers={"Origin": "http://localhost:8790"})
        try:
            d = json.load(urllib.request.urlopen(r, timeout=60))
        except Exception as e:
            print("lỗi", q, e); continue
        for x in d["items"]:
            if x["id"] in seen or x["short"] or not (120 < x["dur"] < 3 * 3600):
                continue
            seen.add(x["id"]); items.append({k: x[k] for k in ("id", "title", "ch", "chId", "chUrl", "dur", "views", "ago", "av", "short")})
            if len([i for i in items]) >= 6 * (qs.index(q) + 1):
                break
    out[name] = items
    print(name, len(items))
(root / "seed.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), "utf-8")
print("đã ghi", (root / "seed.json").stat().st_size, "byte")
