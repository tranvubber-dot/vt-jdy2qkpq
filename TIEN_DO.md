# VũTube.cơm – bản chia sẻ: tiến độ

## 27/10/2026 – bản 1.0.2 (sau khi Vũ thử iPhone thật: tua khó + lướt phải bấm ▶)
- 1 trình phát YouTube DÙNG CHUNG (#pl nằm dưới danh sách thẻ, trượt theo thẻ đang phát; đổi bài = loadVideoById), tạo câm (mute:1),
  KHÔNG bao giờ unMute ngoài cú chạm (unMute sau onReady làm iOS dừng video → vòng quay rồi nút ▶). Chạm vào video khi đang câm = bật tiếng; bật 1 lần giữ cho bài sau.
- Kích hoạt thẻ theo vị trí cuộn (đúng chỗ là phát, dự phòng 120 ms), bỏ IntersectionObserver + trễ 180 ms; preconnect youtube/ytimg; nạp API YouTube sớm.
- Thanh tua kéo được: vùng chạm 44 px, touch-action:none, kéo/dừng hiện vạch dày + núm + "1:23 / 10:29", thả tay mới tua.
- Đo WebKit 390 (máy chủ thử local): lướt→phát trung vị 1,37 s → 0,97 s (từ lúc thẻ vào chỗ 0,76 s). iPhone ảo: 3/3 lần lướt tự phát (≤2 s), kéo tua tới 30:50/43:10 đúng.

## 27/10/2026 – bản 1.0.1: CHỈ ĐIỆN THOẠI (Vũ chốt). Bỏ hẳn giao diện máy tính; mở trên máy rộng ≥700px = app trong khung 430px ở giữa (iframe ?in=1) + QR "Mở trên điện thoại để dùng" (qrcode-generator 1.4.4 jsdelivr). Test lại 390 Chromium + WebKit: đạt, 0 lỗi JS.

## 27/10/2026 – bản 1.0.0 chạy thử local XONG (chưa deploy, chờ Vũ duyệt)
Hướng chốt theo lời Vũ: người dùng xem kênh Việt → BỎ dịch/thuyết minh/Gemini/lọc kênh Việt; gợi ý chỉ theo chủ đề, trộn ngẫu nhiên,
không ưu tiên ngôn ngữ/quốc gia. Phụ đề = phụ đề tiếng Việt có sẵn của YouTube (nút bật/tắt).

Đã làm: index.html + app.css + app.js (~1000 dòng) + sw.js + manifest + icon bát cơm ▶ (icons/, tools/make_icons.py)
+ seed.json 240 video mẫu (tools/make_seed.py) + 4 ảnh hướng dẫn (huong-dan/*.jpg, tools/make_guide.py)
+ Worker worker/src/index.js (search/channel/related, innertube trước → Data API dự phòng, Cache API + KV, giới hạn IP, CORS)
+ HUONG_DAN_TRIEN_KHAI.md. Tên kho dự kiến: vt-jdy2qkpq.

Đã test (Playwright, tắt tiếng): Chromium 390×844, WebKit 390×844, Safari iPhone Air ảo (chọn chủ đề, lướt, xem ngang).
Ảnh: _anh_test/ (không đưa lên git).

Còn lại (chờ Vũ): tạo tk Cloudflare + wrangler login → kv create → (tuỳ chọn) YT_API_KEY → wrangler deploy;
rồi dán URL vào config.js, tạo kho vt-jdy2qkpq + Pages, git grep khoá, push. Chưa thử Màn hình chính iOS (cần link https).
