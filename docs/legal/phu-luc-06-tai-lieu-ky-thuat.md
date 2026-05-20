# PHỤ LỤC 06
# TÀI LIỆU KỸ THUẬT VÀ SƠ ĐỒ VẬN HÀNH HỆ THỐNG

*Kèm theo Văn bản công bố phát hành sản phẩm Penny Bot số 01/CBPH-PB/2026
ngày 20 tháng 05 năm 2026*

---

## I. MỤC ĐÍCH TÀI LIỆU

Tài liệu này mô tả kiến trúc kỹ thuật, sơ đồ vận hành và biện pháp bảo mật áp dụng cho sản phẩm phần mềm **Penny Bot** do **Công ty Cổ phần Giải Trí và Truyền Thông Việt Nam – NewZealand** sở hữu và vận hành. Tài liệu được sử dụng cho mục đích:

- Lưu trữ hồ sơ kỹ thuật nội bộ phục vụ công tác vận hành, bảo trì và kiểm toán an toàn thông tin.
- Cung cấp cho cơ quan quản lý nhà nước có thẩm quyền khi được yêu cầu.
- Đính kèm hồ sơ đăng ký xác thực Zalo Official Account và các đối tác nền tảng khác.

---

## II. TỔNG QUAN KIẾN TRÚC

Penny Bot được xây dựng theo kiến trúc **dịch vụ web nhiều tầng (multi-tier web application)** gồm 5 thành phần chính:

1. **Tầng giao diện người dùng** – Ứng dụng web Single Page Application (SPA).
2. **Tầng giao tiếp qua nhắn tin** – Bot kết nối với nền tảng Zalo Bot Platform.
3. **Tầng dịch vụ phía máy chủ** – API HTTP và bộ xử lý tin nhắn.
4. **Tầng dữ liệu** – Cơ sở dữ liệu quan hệ kèm bộ nhớ tạm.
5. **Tầng tích hợp bên thứ ba** – Cổng thanh toán, dịch vụ trí tuệ nhân tạo, dịch vụ giám sát lỗi.

### Sơ đồ tổng quan

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        NGƯỜI DÙNG CUỐI                                  │
│  ┌───────────────────────┐         ┌───────────────────────────────┐    │
│  │  Trình duyệt web      │         │  Ứng dụng Zalo                │    │
│  │  (Chrome / Safari /   │         │  (chat 1-1 với Penny Bot)     │    │
│  │   Firefox)            │         │                               │    │
│  └──────────┬────────────┘         └──────────────┬────────────────┘    │
└─────────────┼─────────────────────────────────────┼─────────────────────┘
              │ HTTPS                               │ Zalo Bot API
              │                                     │
┌─────────────▼─────────────────────────────────────▼─────────────────────┐
│                       NGINX (TLS termination)                           │
│              pennybot.vn :443  →  /  (frontend)                         │
│                              →  /api/  (backend, port 3020)             │
│                              →  /api/webhooks/zalo/*  (bot webhook)     │
│                              →  /api/payments/ipn      (SePay webhook)  │
└─────────────┬─────────────────────────────────────┬─────────────────────┘
              │                                     │
   ┌──────────▼──────────┐                ┌─────────▼──────────┐
   │  Frontend (SPA)     │                │  Backend (Node.js) │
   │  Vite build tĩnh    │   ◀── REST ─── │  Express + Prisma  │
   │  React + TS         │      JSON      │  PM2 supervised    │
   └─────────────────────┘                └─────────┬──────────┘
                                                     │
                          ┌──────────────────────────┼──────────────────────────┐
                          │                          │                          │
                ┌─────────▼────────┐      ┌──────────▼────────┐      ┌──────────▼─────────┐
                │  PostgreSQL      │      │  Redis (tuỳ chọn) │      │  Tích hợp bên 3    │
                │  Lưu toàn bộ     │      │  Cache hội thoại, │      │  - Zalo Bot API    │
                │  dữ liệu nghiệp  │      │  rate limiter,    │      │  - Google Gemini   │
                │  vụ              │      │  message dedup    │      │  - SePay           │
                └──────────────────┘      └───────────────────┘      │  - Sentry          │
                                                                     └────────────────────┘
```

---

## III. CHI TIẾT CÁC TẦNG HỆ THỐNG

### 3.1 Tầng giao diện người dùng (Frontend)

| Thuộc tính | Giá trị |
|---|---|
| Ngôn ngữ lập trình | TypeScript |
| Khung công tác (framework) | React 19 |
| Công cụ đóng gói (bundler) | Vite |
| Giao diện | TailwindCSS + shadcn/ui |
| Định tuyến | React Router DOM v6 |
| Quản lý trạng thái | React Context + TanStack Query |
| Đầu ra | Tệp tĩnh HTML/CSS/JS được phục vụ qua Nginx |
| Tên miền | `https://pennybot.vn` |

**Đặc điểm bảo mật:**
- Tải qua HTTPS với chứng chỉ Let's Encrypt.
- Tự động chặn (block) khi phát hiện chạy bên trong trình duyệt nhúng Zalo (`InAppBrowserGuard`) để tránh lỗi tương thích và bảo mật.
- Mã thông báo (JWT) lưu trong `localStorage`, gửi qua header `Authorization` cho mỗi yêu cầu API.

### 3.2 Tầng dịch vụ phía máy chủ (Backend)

| Thuộc tính | Giá trị |
|---|---|
| Ngôn ngữ lập trình | TypeScript (Node.js) |
| Khung công tác | Express 5 |
| ORM | Prisma 7 |
| Trình giám sát tiến trình | PM2 |
| Cổng nội bộ | 3020 |
| Quản lý biến môi trường | dotenv |

**Các module chính:**

- `controllers/` – xử lý logic của từng route API.
- `services/` – tách biệt logic nghiệp vụ (xác thực, thanh toán, persona, ngân sách, audit, v.v.).
- `services/message-handler/` – bộ xử lý tin nhắn từ Zalo.
- `services/ai/` – tích hợp mô hình ngôn ngữ Gemini.
- `services/bot-manager.service.ts` – quản lý vòng đời bot từng người dùng (polling / webhook).
- `middlewares/` – kiểm tra xác thực, phân quyền, rate limit, xử lý lỗi tập trung.
- `validators/` – định nghĩa schema kiểm tra dữ liệu đầu vào bằng Zod.
- `observability/` – tích hợp logger Pino và dịch vụ giám sát Sentry.

**Cơ chế xử lý lỗi:**
- Middleware `error.middleware.ts` bắt mọi lỗi và trả về JSON chuẩn `{ error, details }`.
- Tất cả lỗi không xác định được ghi nhật ký và gửi tới Sentry (nếu đã kích hoạt).

### 3.3 Tầng dữ liệu

#### Cơ sở dữ liệu chính

| Thuộc tính | Giá trị |
|---|---|
| Hệ quản trị | PostgreSQL |
| Driver | `@prisma/adapter-pg` + `pg` |
| Kết nối | Qua biến môi trường `DATABASE_URL` |
| Vị trí | Đặt cùng máy chủ ứng dụng tại Việt Nam |

**Các bảng (model) chính:**

| Bảng | Mô tả |
|---|---|
| `User` | Tài khoản người dùng (số điện thoại, mật khẩu đã băm, email, tên, vai trò) |
| `Plan` | Định nghĩa các gói trả phí |
| `Subscription` | Gói đang sử dụng của từng người dùng |
| `Payment` | Lịch sử giao dịch thanh toán |
| `SubscriptionAudit` | Bản lưu trữ subscription đã chấm dứt |
| `BotConfig` | Cấu hình bot Zalo của từng người dùng (token, trạng thái) |
| `Transaction` | Bản ghi từng khoản chi tiêu của người dùng |
| `Receipt` | Tệp hoá đơn (ảnh / PDF) kèm mã băm chống trùng |
| `Budget` | Hạn mức chi tiêu của người dùng |
| `Persona` | Cấu hình phong cách hội thoại của bot |
| `ZaloUser` | Thông tin định danh người dùng trên Zalo |
| `ZaloConversationState` | Trạng thái hội thoại hiện tại |
| `AdminAuditLog` | Nhật ký mọi hành động của quản trị viên |

#### Bộ nhớ tạm (Redis – tuỳ chọn)

Khi triển khai có Redis, hệ thống sử dụng cho:
- **Loại bỏ tin nhắn trùng** giữa các tiến trình.
- **Bộ đếm rate limit** chia sẻ.
- **Cache ngữ cảnh hội thoại** ngắn hạn (tối đa 10 tin nhắn gần nhất).

Khi không có Redis, hệ thống tự động chuyển sang lưu trong bộ nhớ tiến trình (in-memory). Trạng thái này phù hợp cho triển khai một tiến trình duy nhất.

### 3.4 Tầng nền tảng Zalo

**Chế độ hoạt động:** Hệ thống hỗ trợ hai chế độ nhận tin nhắn từ Zalo:

1. **Polling** *(mặc định khi không cấu hình webhook)*: Backend gọi `getUpdates` định kỳ tới `bot-api.zaloplatforms.com` để lấy tin nhắn mới.
2. **Webhook**: Zalo chủ động gửi `POST` tới `https://pennybot.vn/api/webhooks/zalo/<botConfigId>` mỗi khi có tin nhắn. Yêu cầu xác thực bằng header `X-Bot-Api-Secret-Token` khớp với `ZALO_WEBHOOK_SECRET`.

**API Zalo Bot được sử dụng:**
- `getMe` – kiểm tra token bot hợp lệ.
- `getUpdates` – lấy tin nhắn (chế độ polling).
- `setWebhook` / `deleteWebhook` – cấu hình webhook.
- `sendMessage` – gửi phản hồi văn bản.
- `sendChatAction` – hiển thị trạng thái "đang gõ".

### 3.5 Tầng tích hợp bên thứ ba

| Dịch vụ | Mục đích | Vị trí hạ tầng | Dữ liệu trao đổi |
|---|---|---|---|
| **Zalo Bot Platform** | Gửi / nhận tin nhắn cho bot | Việt Nam | Tin nhắn, ảnh, PDF, ID người dùng Zalo |
| **Google Gemini** *(qua proxy YeScale)* | Phân tích ngôn ngữ, OCR hoá đơn, hội thoại | Hoa Kỳ / khu vực quốc tế | Tin nhắn người dùng, ảnh hoá đơn |
| **SePay** | Cổng thanh toán | Việt Nam | Mã đơn hàng, số tiền, kết quả giao dịch |
| **Sentry** *(tuỳ chọn)* | Giám sát lỗi và hiệu năng | Đa khu vực | Stack trace, breadcrumbs, thông tin yêu cầu (đã loại bỏ thông tin nhạy cảm) |

---

## IV. LUỒNG DỮ LIỆU CHÍNH

### 4.1 Luồng đăng ký và đăng nhập

```
[Trình duyệt]                  [Backend]                  [PostgreSQL]
     │                            │                              │
     │── POST /auth/register ────▶│                              │
     │   {phone, name, password}  │── bcrypt.hash() ─────────┐   │
     │                            │                          │   │
     │                            │── INSERT User ───────────┼──▶│
     │                            │                          │   │
     │                            │── sign JWT (7 ngày) ─────┘   │
     │◀── {token, user}            │                              │
     │                            │                              │
     │── lưu token vào             │                              │
     │   localStorage              │                              │
     │                            │                              │
     │── GET /auth/me ────────────▶│                              │
     │   Authorization: Bearer X  │── verify JWT                 │
     │                            │── SELECT User ──────────────▶│
     │◀── user data                │◀──                            │
```

### 4.2 Luồng xử lý tin nhắn từ Zalo

```
[Zalo App]    [Zalo Bot API]    [Backend Penny]    [Gemini]    [PostgreSQL]
    │              │                  │                │             │
    │ "ăn phở 50k" │                  │                │             │
    │─────────────▶│                  │                │             │
    │              │── POST webhook ─▶│                │             │
    │              │                  │── verify       │             │
    │              │                  │   secret token │             │
    │              │                  │── dedup check  │             │
    │              │                  │── load history │             │
    │              │                  │── parse local  │             │
    │              │                  │   (regex)      │             │
    │              │                  │                │             │
    │              │                  │── nếu không    │             │
    │              │                  │   chắc chắn ──▶│             │
    │              │                  │   gửi tới AI   │             │
    │              │                  │◀── intent +    │             │
    │              │                  │   structured   │             │
    │              │                  │   data         │             │
    │              │                  │                │             │
    │              │                  │── INSERT      ──────────────▶│
    │              │                  │   Transaction  │             │
    │              │                  │                │             │
    │              │                  │── tạo response │             │
    │              │                  │   theo Persona │             │
    │              │   ◀── sendMessage│                │             │
    │              │                  │                │             │
    │ phản hồi từ  │                  │                │             │
    │  bot         │                  │                │             │
    │◀─────────────│                  │                │             │
```

### 4.3 Luồng quét hoá đơn (OCR)

```
[Zalo]   [Backend]                       [Gemini Vision]   [DB]
  │ ảnh    │                                 │                │
  │───────▶│                                 │                │
  │        │── tải file từ Zalo CDN          │                │
  │        │── kiểm tra dung lượng (<15MB)   │                │
  │        │── tính SHA-256 hash             │                │
  │        │── kiểm tra duplicate ──────────────────────────▶│
  │        │◀── trùng?                                        │
  │        │                                                  │
  │        │── nếu chưa có:                  │                │
  │        │── encode base64 ────────────────▶│                │
  │        │                                 │── trích xuất:  │
  │        │                                 │   merchant,    │
  │        │                                 │   date, total, │
  │        │                                 │   category     │
  │        │◀── JSON structured ─────────────│                │
  │        │                                                  │
  │        │── INSERT Receipt ─────────────────────────────▶│
  │        │── INSERT Transaction (source=IMAGE)            ▶│
  │        │                                                  │
  │ phản    │                                                  │
  │ hồi xác │                                                  │
  │ nhận    │                                                  │
  │◀────────│                                                  │
```

### 4.4 Luồng thanh toán qua SePay

```
[Trình duyệt]   [Backend]                 [SePay]        [DB]
     │              │                       │             │
     │ POST /pay    │                       │             │
     │─────────────▶│                       │             │
     │              │── INSERT Subscription │             │
     │              │   status=PENDING ────────────────────▶│
     │              │── INSERT Payment      │             │
     │              │   status=PENDING ────────────────────▶│
     │              │── sign checkout       │             │
     │              │   với HMAC-SHA256     │             │
     │              │── trả URL redirect    │             │
     │◀── redirect──│                       │             │
     │              │                       │             │
     │── mở SePay──────────────────────────▶│             │
     │   trang thanh toán                   │             │
     │              │                       │             │
     │ thực hiện thanh toán                  │             │
     │              │                       │             │
     │              │                       │── xác minh   │
     │              │                       │   ngân hàng  │
     │              │                       │             │
     │              │                       │── POST IPN ──┐
     │              │◀── /api/payments/ipn ─│              │
     │              │── kiểm tra IP nguồn  │              │
     │              │   ∈ SEPAY_AUTHORIZED  │              │
     │              │── kiểm tra signature  │              │
     │              │── UPDATE Subscription │              │
     │              │   status=ACTIVE,     ───────────────▶│
     │              │   endDate=now+plan    │              │
     │              │── UPDATE Payment      │              │
     │              │   status=PAID ───────────────────────▶│
     │              │── 200 OK ─────────────▶               │
     │              │                       │              │
     │◀── redirect to /onboarding ──────────│              │
```

---

## V. HẠ TẦNG VẬN HÀNH

### 5.1 Môi trường máy chủ

| Thành phần | Cấu hình |
|---|---|
| Hệ điều hành | Linux (Ubuntu / CentOS) |
| Vị trí địa lý của máy chủ | Việt Nam |
| Tên miền chính | `pennybot.vn` |
| Chứng chỉ SSL | Let's Encrypt, tự động gia hạn |
| Máy chủ web phía trước | Nginx (đảm nhiệm TLS, định tuyến, nén gzip) |
| Trình giám sát tiến trình | PM2 |
| Phiên bản Node.js | LTS hiện hành |

### 5.2 Cấu hình Nginx tóm tắt

- Lắng nghe cổng `443` với HTTPS bắt buộc; cổng `80` chuyển hướng vĩnh viễn (`301`) sang HTTPS.
- Định tuyến `/api/*` chuyển tiếp tới `127.0.0.1:3020` (backend Node.js).
- Phục vụ tệp tĩnh frontend từ `/www/wwwroot/pennybot.vn/app/frontend/dist`.
- Bật bộ đệm cache 365 ngày cho tệp tĩnh có hash trong tên (CSS, JS, ảnh).
- Giới hạn dung lượng tải lên: 15 MB (cho hoá đơn).
- Tắt buffering với webhook và phản hồi streaming.
- Đặt header `Strict-Transport-Security: max-age=31536000`.

### 5.3 Triển khai liên tục

- Mã nguồn được quản lý qua Git tại kho riêng (private repository).
- Quy trình triển khai thủ công: kéo mã mới về máy chủ → build frontend → khởi động lại tiến trình backend qua PM2.
- Hệ thống có khả năng phục vụ liên tục: backend chạy dưới PM2 với chính sách tự khởi động lại khi gặp sự cố.

---

## VI. BIỆN PHÁP BẢO MẬT KỸ THUẬT

### 6.1 Bảo vệ kênh truyền

- **HTTPS/TLS 1.2 và TLS 1.3** cho tất cả lưu lượng giữa người dùng và máy chủ.
- Tiêu đề HTTP an toàn được thiết lập qua **Helmet.js**: `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, v.v.
- **CORS** chỉ cho phép các origin được liệt kê trong biến môi trường `CORS_ORIGINS`.

### 6.2 Xác thực và phân quyền

- Mật khẩu được băm bằng **bcryptjs** với 10 vòng salt; cơ sở dữ liệu chỉ lưu giá trị băm.
- Phiên đăng nhập sử dụng **JSON Web Token (JWT)** ký bằng `JWT_SECRET` (tối thiểu 16 ký tự), thời hạn 7 ngày.
- **Vai trò người dùng** được kiểm soát bằng trường `Role` (`USER` / `ADMIN`); các route quản trị được bảo vệ bằng middleware `adminMiddleware`.
- **Khoá tài khoản**: trường `User.isLocked` cho phép quản trị viên đình chỉ tài khoản, kèm thời điểm và lý do.

### 6.3 Bảo vệ webhook và tích hợp bên ngoài

- **Zalo webhook**: kiểm tra header `X-Bot-Api-Secret-Token` khớp với `ZALO_WEBHOOK_SECRET`.
- **SePay IPN**: kiểm tra địa chỉ IP nguồn nằm trong danh sách `SEPAY_AUTHORIZED_IPS`, và kiểm tra chữ ký HMAC-SHA256 của payload với `SEPAY_SECRET_KEY` bằng phép so sánh chống tấn công thời gian (timing-safe comparison).
- **Bot ownership**: trước khi bot được kích hoạt, người dùng phải gửi mã 6 chữ số do hệ thống cấp tới chính bot của họ trên Zalo, để chứng minh quyền sở hữu token.

### 6.4 Chống lạm dụng

- **Rate limit**: 120 yêu cầu / 60 giây cho mỗi địa chỉ IP (có thể tinh chỉnh qua biến môi trường), thực thi bằng thư viện `express-rate-limit`. Khi có Redis, bộ đếm được chia sẻ giữa các tiến trình.
- **Loại bỏ tin nhắn trùng**: lưu mã định danh tin nhắn Zalo (`message_id`) trong 5 phút để chống xử lý lặp lại do retry.
- **Validate đầu vào**: mọi payload đi vào API đều được kiểm tra bằng schema **Zod**; trả về `400 Bad Request` nếu không hợp lệ.

### 6.5 Bảo vệ dữ liệu nhật ký

Trình ghi log **Pino** được cấu hình **redact (che giấu)** tự động các trường nhạy cảm:

```
req.headers.authorization      → [REDACTED]
req.headers.cookie             → [REDACTED]
req.headers['x-bot-api-...']   → [REDACTED]
*.password, *.passwordHash     → [REDACTED]
*.botToken, *.jwtSecret        → [REDACTED]
*.secretKey                    → [REDACTED]
```

Sentry được cấu hình với `sendDefaultPii: false` – không tự động thu thập thông tin nhận dạng cá nhân.

### 6.6 Nhật ký kiểm toán (Audit Log)

Mọi hành động nhạy cảm của quản trị viên được lưu vào bảng `AdminAuditLog`:

- Khoá / mở khoá tài khoản người dùng.
- Đổi vai trò (`USER ↔ ADMIN`).
- Tạo / sửa / xoá gói dịch vụ.
- Nâng cấp / huỷ subscription thủ công.
- Gửi thông báo broadcast.

Mỗi bản ghi gồm: thời điểm, quản trị viên thực hiện, hành động, đối tượng tác động, lý do, dữ liệu trước và sau (nếu áp dụng).

---

## VII. SAO LƯU, KHÔI PHỤC VÀ TÍNH SẴN SÀNG

### 7.1 Sao lưu dữ liệu

- Cơ sở dữ liệu PostgreSQL được sao lưu định kỳ (`pg_dump`) ít nhất **một lần mỗi 24 giờ**.
- Bản sao lưu được lưu giữ tối thiểu **30 ngày** và được mã hoá khi lưu trữ.
- Tệp hoá đơn (`Receipt.fileUrl`) được lưu trữ trên hạ tầng lưu trữ ổn định, có sao chép dự phòng.

### 7.2 Khôi phục sự cố

- **Mục tiêu thời gian khôi phục (RTO)**: dưới 4 giờ.
- **Mục tiêu điểm khôi phục (RPO)**: dưới 24 giờ.
- Quy trình khôi phục: phục hồi PostgreSQL từ bản sao lưu gần nhất → khởi động lại backend qua PM2 → kiểm tra liên lạc với Zalo Bot API → kiểm tra cổng SePay.

### 7.3 Giám sát hoạt động

- **Sentry** ghi nhận và cảnh báo lỗi ứng dụng theo thời gian thực.
- **Pino logger** ghi nhật ký có cấu trúc (JSON) cho mọi yêu cầu, kèm `requestId` để truy vết.
- **PM2** giám sát tiến trình backend, tự khởi động lại khi tiến trình thoát ngoài ý muốn.

---

## VIII. CHUYỂN DỮ LIỆU CÁ NHÂN XUYÊN BIÊN GIỚI

Hệ thống có sử dụng dịch vụ trí tuệ nhân tạo **Google Gemini** (do Google LLC vận hành, máy chủ đặt tại nước ngoài) để xử lý ngôn ngữ tự nhiên và đọc hóa đơn. Việc chuyển dữ liệu cá nhân (gồm tin nhắn người dùng và ảnh hoá đơn) sang nhà cung cấp này được xử lý theo:

- **Luật Bảo vệ dữ liệu cá nhân** số 91/2025/QH15.
- **Nghị định** số 356/2025/NĐ-CP quy định chi tiết và biện pháp thi hành Luật Bảo vệ dữ liệu cá nhân.

Đơn vị vận hành đã lập **Hồ sơ đánh giá tác động chuyển dữ liệu cá nhân xuyên biên giới** (Transfer Impact Assessment) và lưu trữ tại trụ sở chính. Người dùng được thông báo và đồng ý về việc chuyển dữ liệu này thông qua Điều khoản sử dụng và Chính sách bảo vệ dữ liệu cá nhân (Phụ lục 03 và Phụ lục 04).

---

## IX. DANH SÁCH CÁC BIẾN MÔI TRƯỜNG NHẠY CẢM

Các thông tin sau được lưu trữ dưới dạng biến môi trường, **không** đưa vào mã nguồn và không công khai:

| Tên biến | Mục đích |
|---|---|
| `DATABASE_URL` | Chuỗi kết nối tới PostgreSQL |
| `REDIS_URL` | Chuỗi kết nối tới Redis (tuỳ chọn) |
| `JWT_SECRET` | Khoá ký JWT |
| `ZALO_WEBHOOK_SECRET` | Khoá xác minh webhook Zalo |
| `ZALO_WEBHOOK_BASE_URL` | URL công khai để Zalo gọi webhook |
| `YESCALE_API_KEY` | Khoá API truy cập dịch vụ Gemini |
| `SEPAY_MERCHANT_ID` | Định danh đơn vị bán hàng tại SePay |
| `SEPAY_SECRET_KEY` | Khoá ký giao dịch SePay |
| `SEPAY_AUTHORIZED_IPS` | Danh sách IP hợp lệ của SePay |
| `SENTRY_DSN` | Khoá kết nối Sentry (tuỳ chọn) |
| `CORS_ORIGINS` | Danh sách origin được phép gọi API |

Quy trình quản lý khoá:
- Mỗi khi thay đổi nhân sự được phép tiếp cận hạ tầng, các khoá tương ứng phải được luân phiên (rotate) trong vòng 24 giờ.
- Khoá không được gửi qua kênh không mã hoá (email không mã hoá, tin nhắn không bảo mật).

---

## X. PHIÊN BẢN TÀI LIỆU

| Phiên bản | Ngày | Nội dung |
|---|---|---|
| 1.0 | 20/05/2026 | Phát hành lần đầu cùng văn bản công bố sản phẩm |

Tài liệu này sẽ được cập nhật khi có thay đổi quan trọng về kiến trúc, hạ tầng hoặc biện pháp bảo mật.

---

ĐẠI DIỆN ĐƠN VỊ XÁC NHẬN

*Giám đốc*




**NGUYỄN HỮU LUÂN**
