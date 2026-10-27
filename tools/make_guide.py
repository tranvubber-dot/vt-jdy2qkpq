"""Vẽ 4 ảnh hướng dẫn (huong-dan/*.png): chụp app thật bằng Chromium rồi ghép khung điện thoại + chú thích.
Cần: trang chạy ở http://localhost:8790 (python3 -m http.server 8790) — dùng video mẫu (không cần máy chủ).
Chạy: python3 tools/make_guide.py"""
import base64, pathlib
from playwright.sync_api import sync_playwright

root = pathlib.Path(__file__).resolve().parent.parent
out = root / "huong-dan"; out.mkdir(exist_ok=True)
tmp = root / "tools" / "_tmp"; tmp.mkdir(exist_ok=True)
URL = "http://localhost:8790/?thu=1&relay="
TOP = '[{"e":"🌿","n":"Thiên nhiên","q":["thiên nhiên đẹp"],"near":[]},{"e":"🍳","n":"Nấu ăn","q":["nấu ăn"],"near":[]},{"e":"✈️","n":"Du lịch","q":["du lịch"],"near":[]}]'

def b64(p): return "data:image/png;base64," + base64.b64encode(p.read_bytes()).decode()

CSS = """
*{box-sizing:border-box}body{margin:0;width:800px;height:1200px;font-family:-apple-system,"SF Pro Display","Segoe UI",Roboto,sans-serif;color:#fff;
background:radial-gradient(90% 60% at 0% 0%,rgba(123,77,255,.55),transparent 60%),radial-gradient(80% 60% at 100% 100%,rgba(255,79,163,.45),transparent 60%),#140f1f;overflow:hidden;position:relative}
.n{position:absolute;left:44px;top:40px;width:64px;height:64px;border-radius:20px;background:linear-gradient(135deg,#7b4dff,#ff4fa3);display:grid;place-items:center;font-size:34px;font-weight:900;box-shadow:0 12px 30px -10px #ff4fa3}
h1{position:absolute;left:128px;top:36px;right:40px;margin:0;font-size:40px;line-height:1.12;font-weight:850;letter-spacing:-.8px}
.sub{position:absolute;left:128px;top:128px;right:40px;font-size:22px;color:#d9cdee;font-weight:600}
.ph{position:absolute;left:50%;top:200px;width:430px;height:931px;margin-left:-215px;border-radius:56px;background:#000;padding:12px;box-shadow:0 30px 80px -20px rgba(0,0,0,.8),0 0 0 3px #3a3050}
.ph .sc{width:100%;height:100%;border-radius:45px;overflow:hidden;position:relative;background:#0d0a14 center/cover}
.ph .sc img{width:100%;display:block}
.isl{position:absolute;left:50%;top:22px;width:120px;height:34px;margin-left:-60px;border-radius:20px;background:#000;z-index:5}
.call{position:absolute;z-index:9;background:#fff;color:#1a1424;border-radius:20px;padding:12px 16px;font-size:21px;font-weight:800;line-height:1.2;box-shadow:0 14px 30px -10px rgba(0,0,0,.7);max-width:250px}
.call small{display:block;font-size:16px;font-weight:600;color:#5d5270;margin-top:3px}
.call i{font-style:normal;display:inline-grid;place-items:center;width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#7b4dff,#ff4fa3);color:#fff;font-size:17px;margin-right:8px;vertical-align:-5px}
.ring{position:absolute;z-index:8;border:5px solid #ffd66b;border-radius:50%;box-shadow:0 0 0 6px rgba(255,214,107,.25),0 0 30px #ffd66b}
.line{position:absolute;z-index:8;height:5px;background:#ffd66b;border-radius:3px;transform-origin:0 50%}
"""

def page(title, sub, num, inner):
    return f"<html><head><meta charset=utf-8><style>{CSS}</style></head><body><div class=n>{num}</div><h1>{title}</h1><div class=sub>{sub}</div>{inner}</body></html>"

with sync_playwright() as p:
    br = p.chromium.launch(args=["--mute-audio"])
    ctx = br.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    pg = ctx.new_page()
    # ảnh 2: màn chọn chủ đề
    pg.goto(URL); pg.wait_for_timeout(1200)
    for n in ["Nấu ăn", "Du lịch", "Thiên nhiên", "Khoa học"]:
        pg.locator(".tile", has_text=n).click()
    pg.wait_for_timeout(500); pg.screenshot(path=str(tmp / "chon.png"))
    # ảnh 3, 4: lướt (video mẫu chủ đề Thiên nhiên)
    pg.evaluate(f"() => {{ localStorage.clear(); localStorage.setItem('vtc.topics', JSON.stringify({TOP})); localStorage.setItem('vtc.cfg', JSON.stringify({{topic:1,cc:true}})); }}")
    pg.goto(URL); pg.wait_for_selector("#vHome .card", timeout=20000); pg.wait_for_timeout(1500)
    pg.screenshot(path=str(tmp / "home.png"))
    # chọn 1 video ngang
    idx = pg.evaluate("() => [...document.querySelectorAll('#vHome .card')].findIndex(c => !c.querySelector('.dur.sh'))")
    pg.locator("#vHome .card").nth(max(0, idx)).click()
    pg.wait_for_selector("#lfeed .slide.playing", timeout=30000); pg.wait_for_timeout(5500)
    pg.evaluate("() => document.querySelectorAll('.unmute').forEach(x => x.style.display='none')")
    pg.screenshot(path=str(tmp / "luot.png"))
    pg.locator("#lfeed .slide.act .rtog").click(); pg.wait_for_timeout(700)
    rail = pg.evaluate("() => [...document.querySelectorAll('#lfeed .slide.act .rgrp > *, #lfeed .slide.act .rtog')].map(e => { const r = e.getBoundingClientRect(); return [r.x + r.width/2, r.y + r.height/2] })")
    land = pg.evaluate("() => { const r = document.querySelector('#lfeed .slide.act .landbtn').getBoundingClientRect(); return [r.x + r.width/2, r.y + r.height/2] }")
    pg.screenshot(path=str(tmp / "rail.png"))
    br.close()

    # ---- ghép ảnh hướng dẫn ----
    br = p.chromium.launch()
    g = br.new_page(viewport={"width": 800, "height": 1200}, device_scale_factor=1)
    S = 406 / 390  # tỉ lệ ảnh chụp trong khung điện thoại
    X0, Y0 = 400 - 215 + 12, 200 + 12
    def at(x, y): return X0 + x * S, Y0 + y * S

    # 1. thêm vào màn hình chính
    inner = f"""<div class=ph><div class=isl></div><div class=sc style="background-image:url('{b64(tmp / 'home.png')}');filter:brightness(.45)"></div></div>
    <div style="position:absolute;left:197px;top:822px;width:406px;height:297px;border-radius:0 0 45px 45px;background:#f4f2f7;z-index:6;padding:16px 16px 0">
      <div style="height:6px;width:46px;border-radius:3px;background:#c9c3d4;margin:0 auto 14px"></div>
      <div style="display:flex;gap:12px;align-items:center;color:#222;font-size:20px;font-weight:700;background:#fff;border-radius:16px;padding:14px 16px;margin-bottom:10px">
        <span style="width:34px;height:34px;border-radius:9px;border:2.5px solid #222;display:grid;place-items:center;font-size:24px;line-height:0">+</span>Thêm vào MH chính</div>
      <div style="display:flex;gap:12px;align-items:center;color:#777;font-size:19px;font-weight:600;background:#fff;border-radius:16px;padding:14px 16px">Sao chép · Đánh dấu…</div>
      <div style="position:absolute;left:0;right:0;bottom:0;height:86px;background:#e9e6ef;border-radius:0 0 45px 45px;display:flex;justify-content:space-around;align-items:center;color:#333;font-size:30px">
        <span>‹</span><span>›</span><span style="width:52px;height:52px;border-radius:50%;background:#fff;display:grid;place-items:center;box-shadow:0 0 0 5px #ffd66b">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2a6cff" stroke-width="2.2" stroke-linecap="round"><path d="M12 15V3.5M7.5 8L12 3.5 16.5 8"/><path d="M5 12v6.5A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V12"/></svg></span><span>▢</span><span>⋯</span></div></div>
    <div class=call style="left:30px;top:1010px"><i>1</i>Bấm nút Chia sẻ<small>ở thanh dưới của Safari</small></div>
    <div class=call style="right:24px;top:760px"><i>2</i>Thêm vào MH chính<small>rồi bấm Thêm</small></div>
    <div class=call style="left:24px;top:300px;max-width:300px">Android (Chrome)<small>Bấm ⋮ → “Thêm vào màn hình chính” hoặc “Cài đặt ứng dụng”</small></div>"""
    g.set_content(page("Thêm vào Màn hình chính", "Mở như một ứng dụng, không cần tải từ App Store", "1", inner)); g.screenshot(path=str(out / "1-man-hinh-chinh.png"))

    # 2. chọn chủ đề
    inner = f"""<div class=ph><div class=isl></div><div class=sc><img src="{b64(tmp / 'chon.png')}"></div></div>
    <div class=call style="left:20px;top:520px"><i>1</i>Chạm chủ đề bạn thích<small>chọn bao nhiêu cũng được</small></div>
    <div class=call style="right:18px;top:860px"><i>2</i>Tự gõ thêm<small>vd. cắm trại, cờ vua…</small></div>
    <div class=call style="left:20px;top:1100px"><i>3</i>Bắt đầu lướt</div>
    <div class=call style="right:18px;top:300px;max-width:230px">Sửa lại lúc nào cũng được<small>Cài đặt → Chủ đề của bạn</small></div>"""
    g.set_content(page("Chọn chủ đề", "Lần đầu mở app — mọi thứ chỉ lưu trên máy bạn", "2", inner)); g.screenshot(path=str(out / "2-chon-chu-de.png"))

    # 3. lướt
    ax, ay = at(*rail[0]) if rail else (0, 0)
    hx, hy = at(*rail[-1]) if rail else (0, 0)
    inner = f"""<div class=ph><div class=isl></div><div class=sc><img src="{b64(tmp / 'rail.png')}"></div></div>
    <div class=ring style="left:{ax-34}px;top:{ay-34}px;width:68px;height:68px"></div>
    <div class=ring style="left:{hx-30}px;top:{hy-30}px;width:60px;height:60px"></div>
    <div class=call style="left:20px;top:300px"><i>↕</i>Vuốt lên / xuống<small>sang video kế / trước</small></div>
    <div class=call style="left:20px;top:470px"><i>♥</i>Chạm 2 lần vào video<small>để thả tim</small></div>
    <div class=call style="right:12px;top:{int(ay)-190}px;max-width:220px"><i>＋</i>Theo dõi kênh<small>chạm ảnh kênh để mở kênh</small></div>
    <div class=call style="left:20px;top:{int(hy)-10}px;max-width:250px">Nút ˄ góc phải<small>mở thêm: tim, xem sau, phụ đề, ⋯</small></div>"""
    g.set_content(page("Lướt như mạng xã hội", "Chạm 1 lần để dừng / phát", "3", inner)); g.screenshot(path=str(out / "3-luot.png"))

    # 4. phụ đề, xem ngang, chặn kênh
    cx, cy = at(*rail[3]) if len(rail) > 3 else (0, 0)
    mx, my = at(*rail[4]) if len(rail) > 4 else (0, 0)
    lx, ly = at(*land)
    inner = f"""<div class=ph><div class=isl></div><div class=sc><img src="{b64(tmp / 'rail.png')}"></div></div>
    <div class=ring style="left:{cx-30}px;top:{cy-30}px;width:60px;height:60px"></div>
    <div class=ring style="left:{mx-30}px;top:{my-30}px;width:60px;height:60px"></div>
    <div class=ring style="left:{lx-80}px;top:{ly-30}px;width:160px;height:60px;border-radius:30px"></div>
    <div class=call style="left:20px;top:{int(ly)+50}px;max-width:280px"><i>⟲</i>Xem ngang<small>xem toàn màn hình kể cả khi khoá xoay</small></div>
    <div class=call style="left:20px;top:{int(cy)-120}px;max-width:300px"><i>CC</i>Phụ đề tiếng Việt<small>bật / tắt — khi video có sẵn phụ đề Việt</small></div>
    <div class=call style="left:20px;top:{int(my)+10}px;max-width:300px"><i>⋯</i>Chặn kênh, chia sẻ<small>kênh đã chặn sẽ không hiện nữa</small></div>"""
    g.set_content(page("Phụ đề, xem ngang, chặn kênh", "Các nút nằm gọn ở góc phải video", "4", inner)); g.screenshot(path=str(out / "4-phu-de.png"))
    br.close()

from PIL import Image
for f in sorted(out.glob("*.png")):
    Image.open(f).convert("RGB").save(f.with_suffix(".jpg"), quality=86, optimize=True, progressive=True); f.unlink()
for f in sorted(out.glob("*.jpg")): print(f.name, f.stat().st_size // 1024, "KB")
