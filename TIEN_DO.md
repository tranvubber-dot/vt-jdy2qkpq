# VũTube.cơm – bản chia sẻ: tiến độ (TẠM DỪNG 27/10/2026 theo lời Vũ)

## Đã làm
- Đọc tham khảo (không sửa): RTSUBS_MAC/server/rtsubs/xem_web/xem.html (khung Lướt: luotSlide/luotAct/luotActivate,
  CSS .slide/.srail2/.pcov/.dubbtn/.landbtn, xem ngang giả body.full.rot, playerVars ở begin()), xem_yt.py
  (search/channel/related qua yt-dlp flat, is_vi/keep ẩn video tiếng Việt, topic_scores/rank_by_topic lọc chặt bằng Gemini).
- Chưa viết code nào. Thử cài wrangler vào scratchpad: lỗi npm (file trùng) – chưa xử lý.

## Thiết kế đã chốt (làm tiếp theo đúng thế này)
- Trang tĩnh: index.html + app.css + app.js + sw.js + manifest + icon + config.js (RELAY=""), khoá localStorage tiền tố `vtc.`
  (trùng origin tranvubber-dot.github.io với Gia phả/Hành Trình). Có seed.json video mẫu để dùng được khi chưa có relay.
- Worker: /search (Data API v3 → dự phòng innertube), /channel, /related, /captions (innertube player nhiều client → json3;
  dự phòng get_transcript), /translate (Gemini, mode cues|titles|query|score), cache KV + Cache API, giới hạn IP
  (binding ratelimits hoặc bộ nhớ), CORS ALLOWED_ORIGINS. Khoá ở secret.
- Thuyết minh: speechSynthesis vi-VN, đọc theo mốc, rate tới 1.4, câu kế đến thì cancel câu cũ, hạ tiếng gốc, phụ đề Việt.
  Test: giả lập speechSynthesis trong ?thu=1 (không phát loa).
- Relay giả Python (yt-dlp + Gemini từ RTSUBS_MAC/.env, không chép khoá) để test; wrangler dev nếu cài được.

## Còn lại
Toàn bộ mục 1–8 của brief: code PWA, Worker + wrangler.toml, HUONG_DAN_TRIEN_KHAI.md, relay giả, test Chromium 390×844 + WebKit,
4 ảnh hướng dẫn, tạo repo vt-xxxxxxxx + Pages (CHƯA tạo repo GitHub).
