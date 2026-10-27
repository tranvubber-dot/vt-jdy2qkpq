# VũTube.cơm (bản chia sẻ): cách đưa lên mạng

Bản chia sẻ gồm 2 phần:
- **Trang app** (thư mục này, trừ `worker/` và `tools/`), đặt trên **GitHub Pages**, miễn phí. Mọi cá nhân hoá lưu trên máy người dùng.
- **Máy chủ trung chuyển nhỏ** (`worker/`), đặt trên **Cloudflare Workers**, miễn phí và không cần thẻ. Trình duyệt không được phép gọi thẳng YouTube để tìm video (luật CORS), nên Worker làm thay việc: tìm video, mở trang kênh, lấy video liên quan, rồi lưu kết quả một thời gian để đỡ gọi lại.

Chưa có Worker thì app vẫn mở được: nó hiện **240 video mẫu** (20 chủ đề) và báo nhẹ "Đang chờ máy chủ". Muốn tìm được mọi video thì cần Worker.

## Vì sao không bỏ hẳn Worker?
Có một cách bỏ được: dùng khoá YouTube Data API gọi thẳng từ trang. Nhưng cách này có 2 nhược điểm:
1. Khoá phải nằm công khai trong trang. Tuy có thể khoá theo tên miền, ai cũng xem được.
2. Hạn mức miễn phí là 10.000 đơn vị mỗi ngày, mà mỗi lượt tìm tốn 100 đơn vị. Tức là **chỉ khoảng 100 lượt tìm/ngày cho TẤT CẢ người dùng**, vài người dùng là hết.

Worker thì tìm không tốn hạn mức, giữ bộ đệm chung cho mọi người, và giấu được khoá. Vì vậy chọn Worker.

---

## Việc anh Vũ cần làm (khoảng 15 phút, 1 lần)

### Bước 1: Tạo tài khoản Cloudflare (miễn phí, không cần thẻ)
1. Vào https://dash.cloudflare.com/sign-up, đăng ký bằng email.
2. Mở email, bấm link xác nhận.
3. Chọn gói **Free**. Không cần thêm tên miền.

### Bước 2: Đăng nhập wrangler trên Mac (anh tự bấm)
Mở Terminal, chạy:
```
cd VUTUBE_CHIA_SE/worker   (thư mục worker của dự án)
npx wrangler login
```
Trình duyệt mở trang Cloudflare, anh bấm **Allow**.

### Bước 3: Tạo bộ đệm KV (nên làm)
```
npx wrangler kv namespace create KV
```
Lệnh in ra một dòng `id = "…"`. Mở `worker/wrangler.toml`, bỏ dấu `#` ở 3 dòng `[[kv_namespaces]]`, rồi dán id đó vào.

### Bước 4 (tuỳ chọn): Khoá YouTube Data API làm dự phòng
Chỉ dùng khi YouTube chặn máy chủ Cloudflare. Không làm bước này thì app vẫn chạy.
1. Vào https://console.cloud.google.com, tạo project mới, đặt tên "VuTube".
2. Vào **APIs & Services → Library**, tìm **YouTube Data API v3**, bấm **Enable**.
3. Vào **APIs & Services → Credentials → Create credentials → API key**, rồi chép khoá.
4. Bấm vào khoá vừa tạo. Ở mục **API restrictions**, chọn *Restrict key* rồi tick *YouTube Data API v3*. Bấm Save.
5. Cất khoá vào Worker (khoá chỉ nằm ở Cloudflare, không nằm trong mã):
   ```
   npx wrangler secret put YT_API_KEY
   ```
   Dán khoá khi được hỏi.

Gói miễn phí của Google không cần thẻ, hạn mức 10.000 đơn vị/ngày.

### Bước 5: Đưa Worker lên
```
npx wrangler deploy
```
Lệnh in ra địa chỉ dạng `https://vutube-com.<tên-anh>.workers.dev`. Gửi địa chỉ này cho Trinh/appcode.

### Bước 6: Trinh/appcode làm nốt (anh không cần làm)
1. Dán địa chỉ Worker vào `config.js`.
2. Tạo kho GitHub công khai **`vt-jdy2qkpq`** (tài khoản tranvubber-dot) và bật Pages. Nếu Claude bị chặn tạo kho công khai, em sẽ đưa anh 2 lệnh để tự chạy.
3. Kiểm tra không lọt khoá/token nào (`git grep`), rồi đẩy lên.
4. Link app sẽ là **https://tranvubber-dot.github.io/vt-jdy2qkpq/**.

---

## Thông số Worker
- Đường: `/health`, `/search?q=&kind=&cont=&topic=&strict=`, `/channel?ref=&tab=&cont=`, `/related?id=&title=&ch=`
- Tìm video qua YouTube nội bộ trước (không tốn hạn mức). Lỗi hoặc bị chặn thì dùng Data API, nếu có khoá.
- Bộ đệm: tìm 6 giờ, kênh 3 giờ, liên quan 12 giờ (Cache API + KV).
- Chỉ trang ở `https://tranvubber-dot.github.io` được gọi (biến `ALLOWED_ORIGINS`).
- Mỗi IP tối đa 120 lượt/phút. Worker không lưu gì của người dùng.
- Gói miễn phí của Cloudflare: 100.000 lượt gọi/ngày; KV 100.000 lượt đọc và 1.000 lượt ghi mỗi ngày. Hết lượt ghi thì chỉ mất bộ đệm, app vẫn chạy.

## Chạy thử trên Mac (không cần tài khoản)
```
cd worker && npx wrangler dev --port 8787 --var ALLOW_LOCALHOST:1
cd .. && python3 -m http.server 8790
```
Mở `http://localhost:8790/?relay=http://localhost:8787`.

## Hạn chế đã biết
- Một số video bị chủ kênh cấm phát ngoài YouTube. App tự bỏ qua và sang video kế.
- Lúc video mới bắt đầu, YouTube có thể hiện nút ⏸ giữa khung chừng 3–4 giây (giao diện của YouTube, không tắt được). Chữ và logo ở mép trên, mép dưới đã được che.
- iPhone: lần đầu phải chạm thì mới có tiếng (luật của Safari). Khoá màn hình thì video dừng.
- Tiến độ lưu riêng theo từng máy và từng trình duyệt. Chuyển máy thì dùng **Cài đặt → Xuất cài đặt / Nhập cài đặt**.
