# VũTube.cơm – bản chia sẻ: tiến độ

## 27/10/2026 – bản 1.0.0 chạy thử local XONG (chưa deploy, chờ Vũ duyệt)
Hướng chốt theo lời Vũ: người dùng xem kênh Việt → BỎ dịch/thuyết minh/Gemini/lọc kênh Việt; gợi ý chỉ theo chủ đề, trộn ngẫu nhiên,
không ưu tiên ngôn ngữ/quốc gia. Phụ đề = phụ đề tiếng Việt có sẵn của YouTube (nút bật/tắt).

Đã làm: index.html + app.css + app.js (~1000 dòng) + sw.js + manifest + icon bát cơm ▶ (icons/, tools/make_icons.py)
+ seed.json 240 video mẫu (tools/make_seed.py) + 4 ảnh hướng dẫn (huong-dan/*.jpg, tools/make_guide.py)
+ Worker worker/src/index.js (search/channel/related, innertube trước → Data API dự phòng, Cache API + KV, giới hạn IP, CORS)
+ HUONG_DAN_TRIEN_KHAI.md. Tên kho dự kiến: vt-jdy2qkpq.

Đã test (Playwright, tắt tiếng): Chromium 390×844, WebKit 390×844, Chromium 1440×900, Safari iPhone Air ảo (chọn chủ đề, lướt, xem ngang).
Ảnh: _anh_test/ (không đưa lên git).

Còn lại (chờ Vũ): tạo tk Cloudflare + wrangler login → kv create → (tuỳ chọn) YT_API_KEY → wrangler deploy;
rồi dán URL vào config.js, tạo kho vt-jdy2qkpq + Pages, git grep khoá, push. Chưa thử Màn hình chính iOS (cần link https).
