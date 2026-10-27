"""Vẽ icon PNG từ icons/logo.svg bằng Chromium (Playwright). Chạy: python3 tools/make_icons.py"""
import pathlib
from playwright.sync_api import sync_playwright
root = pathlib.Path(__file__).resolve().parent.parent
svg = (root / "icons/logo.svg").read_text()
with sync_playwright() as p:
    b = p.chromium.launch()
    for name, size, pad, rad in [("icon-512", 512, 0, 112), ("icon-192", 192, 0, 42), ("icon-180", 180, 0, 0), ("icon-maskable-512", 512, 60, 0)]:
        pg = b.new_page(viewport={"width": size, "height": size})
        inner = size - 2 * pad
        pg.set_content(f"""<html><body style="margin:0;background:linear-gradient(135deg,#7b4dff,#ff4fa3)"><div style="width:{size}px;height:{size}px;display:grid;place-items:center">
          <div style="width:{inner}px;height:{inner}px;border-radius:{rad*size/512 if not pad else 0}px;overflow:hidden">{svg.replace('<svg ', f'<svg width="{inner}" height="{inner}" ')}</div></div></body></html>""")
        pg.screenshot(path=str(root / f"icons/{name}.png"))
        pg.close()
    b.close()
print("ok")
