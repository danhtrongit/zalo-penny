# Vue3 + Naive UI Admin Portal (admin.pennybot.vn) - Design Spec

**Date:** 2026-06-08
**Status:** Approved (brainstorm)
**Owner:** Penny team

## Problem

Admin hiện nằm chung trong web React tại `pennybot.vn/admin` (shadcn/ui). Cần **tách riêng** admin thành một SPA độc lập tại **`admin.pennybot.vn`** dùng **Vue 3 + Naive UI**, giữ **màu chính `oklch(40.3% .106 152.2)`** (xanh rừng), đạt **chất lượng production** (charts, bảng nâng cao + export, UX hoàn thiện, trang Reminders, gửi tin cho user được chọn), gỡ admin khỏi web chính, và deploy hoàn chỉnh.

Backend Express + Prisma **giữ nguyên** và dùng chung; admin API đã có sẵn tại `/api/admin/*` (Bearer JWT + role `ADMIN`).

## Goals

1. SPA admin độc lập `admin/` (Vue3+Vite+TS+Naive UI+Pinia) tại `admin.pennybot.vn`, **parity** với 9 trang admin React hiện tại.
2. Giữ brand xanh + dark mode; fonts Manrope/Montserrat; radius 10px.
3. Bổ sung production features: **dashboard charts**, **bảng nâng cao + CSV export**, **UX polish**, **trang Reminders**, **gửi tin cho user được chọn**.
4. Backend chỉ thêm endpoint mới (additive), không phá vỡ gì hiện có.
5. Gỡ admin React khỏi `frontend/` + redirect `pennybot.vn/admin → admin.pennybot.vn`.
6. Deploy: vhost nginx + SSL Let's Encrypt + same-origin `/api` proxy.

## Non-goals

- Không đổi cơ chế auth backend (vẫn JWT Bearer trong localStorage + header `Authorization`).
- Không thêm refresh token, MFA, hay phân quyền nhiều cấp (chỉ 1 role `ADMIN`).
- Không SSR/Nuxt (SPA tĩnh là đủ cho admin nội bộ).
- Không đổi DB schema ngoài việc **đọc** `ReminderLog` đã có.
- Không refactor backend hiện có; chỉ thêm 3 endpoint mới.

## Quyết định đã chốt (brainstorm)

| Vấn đề | Quyết định |
|---|---|
| Vị trí & dạng | **Thư mục `admin/` trong repo**, Vite SPA (Vue3+TS+Naive UI+Pinia) |
| Production features | **Tất cả**: charts, bảng+export, UX polish, Reminders, gửi-cho-user-chọn |
| Admin React cũ | **Gỡ khỏi web chính + redirect** sang admin.pennybot.vn |
| Triển khai | **Deploy luôn** (vhost + SSL + build) |
| CORS | **Phải thêm** `https://admin.pennybot.vn` (và `localhost:5174` cho dev) vào `CORS_ORIGINS`. _Lưu ý:_ dù gọi same-origin qua proxy `/api`, browser vẫn gắn header `Origin` cho request non-GET (POST/PATCH/DELETE) → backend từ chối nếu origin không có trong allowlist (500). |
| Màu Naive UI | Token Naive UI dùng **hex tương đương** của oklch primary (≈ `#00582A`) + hover/pressed/suppl từ palette chart; CSS thường vẫn dùng oklch |

## Architecture

### 1. Stack & cấu trúc thư mục `admin/`

```
admin/
  index.html
  package.json            # vue, naive-ui, pinia, vue-router, axios, echarts, vue-echarts, @vueuse/core, @fontsource-variable/*
  vite.config.ts          # @vitejs/plugin-vue, alias @/→src, dev server proxy /api → http://localhost:3000
  tsconfig*.json
  .env / .env.production  # VITE_API_BASE=/api
  .gitignore              # dist, node_modules
  vitest.config.ts
  src/
    main.ts               # createApp + Pinia + Router + (naive providers in App.vue)
    App.vue               # n-config-provider(theme,themeOverrides) + n-loading-bar/message/dialog/notification providers + router-view
    theme/
      tokens.ts           # primary hex + hover/pressed/suppl, radius, font; light+dark themeOverrides
      naive.ts            # buildThemeOverrides(isDark)
    lib/
      api.ts              # axios instance (baseURL=import.meta.env.VITE_API_BASE), Bearer interceptor, 401 handler
      format.ts           # formatVnd, formatDate, formatDateTime (vi-VN)
      csv.ts              # toCsv(rows, columns) + downloadCsv(filename, csv)
    stores/
      auth.ts             # Pinia: token, user, login(), logout(), fetchMe(), isAdmin
      ui.ts               # Pinia: dark mode (persisted via @vueuse useStorage)
    router/
      index.ts            # routes + beforeEach guard (requires admin) + loading bar hooks
    layouts/
      AdminLayout.vue     # n-layout sider+header+content; nav; dark toggle; user menu/logout
    components/
      DataToolbar.vue     # search input + refresh + export button (slot for filters)
      ConfirmButton.vue   # wraps n-popconfirm/dialog for destructive actions
      PageHeader.vue      # title + actions slot
    pages/
      LoginView.vue
      DashboardView.vue   # KPIs (n-statistic) + 2 ECharts (revenue, signups)
      UsersView.vue       # n-data-table server pagination+sort+search+export
      UserDetailView.vue  # subscription/activity/permission cards; lock/unlock/role/upgrade
      PlansView.vue       # table + create/edit/delete (modal n-form)
      BotsView.vue        # awaiting alert + table + create/edit/delete + QR upload
      PaymentsView.vue    # table + status filter + search + export
      NotificationsView.vue  # broadcast: message + plan filter + personalized + result
      SendToUsersView.vue # NEW: searchable user multi-select + message + personalized + send
      RemindersView.vue   # NEW: ReminderLog table + filters (date/kind) + daily summary
      AuditView.vue       # table + action filter + pagination + export
    types/
      api.ts              # TS interfaces mirroring admin API responses
```

### 2. Theme (giữ brand xanh)

- `theme/tokens.ts`:
  - `PRIMARY = "#00582A"` (= hex của `oklch(0.403 0.106 152.2)`; tính chính xác lúc implement bằng culori one-off).
  - `PRIMARY_HOVER`, `PRIMARY_PRESSED`, `PRIMARY_SUPPL` = hex của `oklch(0.462 0.123 151.6)`, `oklch(0.316 0.081 153.4)`, `oklch(0.525 0.138 152.2)` (từ palette chart đã có).
  - `RADIUS = "10px"`, `FONT = "'Manrope Variable', system-ui, sans-serif"`.
- `theme/naive.ts`: `buildThemeOverrides(isDark)` → `{ common: { primaryColor, primaryColorHover, primaryColorPressed, primaryColorSuppl, borderRadius, fontFamily } , ... }`. Light dùng `null` theme + overrides; dark dùng `darkTheme` + overrides.
- `App.vue`: `<n-config-provider :theme="dark ? darkTheme : null" :theme-overrides="overrides">`.
- **Lý do dùng hex**: Naive UI (seemly) tính toán biến thể màu (opacity/composite) không parse được `oklch()`; hex giữ màu y hệt mà không vỡ theme.

### 3. App shell & routing

- `AdminLayout.vue`: `n-layout` có `n-layout-sider` (collapsible, `n-menu` dọc, brand ở đầu) + `n-layout-header` (tiêu đề trang, nút dark toggle, dropdown user → đăng xuất) + `n-layout-content` chứa `<router-view>`.
- Providers ở `App.vue`: `n-loading-bar-provider`, `n-message-provider`, `n-dialog-provider`, `n-notification-provider`.
- Router: tất cả route (trừ `/login`) có `meta.requiresAdmin`. `beforeEach`: nếu `requiresAdmin` mà `!auth.isAdmin` → `/login`. Loading bar start/finish theo navigation.
- Nav (9 mục): Tổng quan, Người dùng, Gói cước, Bot Pool, Thanh toán, Gửi thông báo, Gửi cho user, Nhắc nhở, Lịch sử admin. (UserDetail là trang con của Người dùng, không nằm trên nav.)

### 4. Auth

- `stores/auth.ts`:
  - `login(phone, password)`: `POST /api/auth/login` → nếu `user.role !== 'ADMIN'` → throw "Tài khoản không có quyền admin" (không lưu token). Ngược lại lưu `token` (localStorage `penny_admin_token`) + `user`.
  - `fetchMe()`: `GET /api/auth/me` để rehydrate khi load app (nếu có token).
  - `logout()`: xoá token+user, về `/login`.
  - getter `isAdmin = !!user && user.role === 'ADMIN'`.
- `lib/api.ts`: axios `baseURL = VITE_API_BASE` (`/api`). Request interceptor gắn `Authorization: Bearer <token>`. Response interceptor: 401 → `auth.logout()`.

### 5. Pages — chi tiết

Mọi list page dùng `n-data-table` (remote pagination), `DataToolbar` (search + refresh + export CSV), trạng thái loading/empty.

1. **Dashboard** — KPI tiles (`n-statistic` + `n-grid`) từ `GET /api/admin/stats/overview`; 2 biểu đồ (vue-echarts): doanh thu theo ngày + đăng ký theo ngày từ `GET /api/admin/stats/timeseries`.
2. **Users** — `GET /api/admin/users?page&limit&search`, cột name/phone, sub status, bot, role, locked; row actions: xem, lock/unlock (confirm). Export CSV (fetch limit cao). Link → UserDetail.
3. **UserDetail** — `GET /api/admin/users/:id`; 3 card (subscription/activity/permissions); actions: lock/unlock (`POST .../lock|/unlock`), đổi role (`PATCH .../role`, chặn tự hạ cấp), upgrade (`POST /api/admin/subscriptions/users/:id/upgrade`).
4. **Plans** — `GET /api/admin/plans`; modal `n-form` create (`POST`)/edit (`PATCH`)/delete (`DELETE`, confirm). Validate: name, slug (lowercase-dash), durationDays>0, price>=0.
5. **Bots** — `GET /api/admin/bots` (kèm `awaiting`); alert nếu `awaiting>0`; modal form (label, token, capacity, botLink, QR upload→dataURL); create/edit/delete (delete confirm, 409 nếu còn assignment).
6. **Payments** — `GET /api/admin/payments?page&limit&status&search`; filter status (ALL/PAID/PENDING/FAILED); export CSV.
7. **Notifications (Broadcast)** — `POST /api/admin/notifications/broadcast` `{message, personalized, planSlugs}`; plan filter (checkbox từ `GET /api/admin/plans`); hiển thị `{sent, failed}`.
8. **SendToUsers (mới)** — `n-select` filterable multi (load users qua `GET /api/admin/users?search=`), compose message, personalized toggle → `POST /api/admin/notifications/send` `{userIds[], message, personalized}`; kết quả `{sent, failed}`.
9. **Reminders (mới)** — `GET /api/admin/reminders?date&kind&page&limit` (đọc `ReminderLog`); filter ngày + kind (MORNING/EVENING); `GET /api/admin/reminders/stats?days=14` cho bảng/biểu đồ tổng hợp số đã gửi/ngày.
10. **Audit** — `GET /api/admin/subscriptions/audit?page&limit&action`; filter action; xem payload (modal/expand); export CSV.

### 6. Backend additions (additive)

Thêm vào router admin hiện có, kèm Zod validator + audit log + vitest:

- `GET /api/admin/stats/timeseries` — query `metric` (`revenue|signups`), `range` (`7d|30d|90d`, default 30d). Trả `{ points: [{ date: "YYYY-MM-DD", value: number }] }`. Revenue = sum `Payment.amount` (status PAID) group theo ngày `paidAt` (giờ VN); signups = count `User.createdAt` theo ngày. Controller: `stats.controller.ts`.
- `POST /api/admin/notifications/send` — body `{ userIds: string[] (1..500), message (1..2000), personalized?: boolean }`. Lặp logic giống `sendToUser`: với mỗi user → botConfig → zaloUsers → (persona rewrite nếu personalized) → `zaloApi.sendMessage`. Trả `{ sent, failed }`. Audit `NOTIFICATION_BROADCAST`. Controller: `notifications.controller.ts`.
- `GET /api/admin/reminders` — query `page,limit(max100),date?(YYYY-MM-DD),kind?(MORNING|EVENING)`. Join `ReminderLog` → user (name/phone). Trả `{ data:[{id,userId,kind,sentOn,createdAt,user:{name,phone}}], total,page,totalPages }`.
- `GET /api/admin/reminders/stats?days=14` — group `ReminderLog` theo `sentOn`+`kind` đếm số. Trả `{ points:[{date,kind,count}] }`.
- File mới: `controllers/admin/reminders.controller.ts`, `routes/admin/reminders.route.ts`; mount `/reminders` trong `routes/admin/index.ts`. Validators trong `validators/admin.schema.ts`.

CORS: **bắt buộc** thêm `https://admin.pennybot.vn` vào `CORS_ORIGINS` của backend `.env` rồi restart `penny-backend`. Browser gắn `Origin` cho request POST/PATCH/DELETE kể cả khi same-origin qua proxy `/api`; nếu origin không nằm trong allowlist (`app.ts` cors), middleware ném lỗi → **500** (vd đăng nhập POST `/api/auth/login`).

### 7. Gỡ admin React + redirect

- Xoá: `frontend/src/pages/admin/*`, `frontend/src/components/admin/*`, `frontend/src/components/auth/admin-route.tsx`, và các route `/admin/*` + import liên quan trong `frontend/src/App.tsx` và `admin-sidebar` references. Gỡ icon/nav admin nếu có trong dashboard chính.
- Redirect ở nginx `pennybot.vn`: `location = /admin { return 301 https://admin.pennybot.vn; }` và `location /admin/ { return 301 https://admin.pennybot.vn; }`.
- `frontend` vẫn build & chạy bình thường sau khi gỡ.

### 8. Deployment

- Code theo repo → `git pull` về `/www/wwwroot/pennybot.vn/app` (đã có sẵn `admin/`).
- Build: `cd /www/wwwroot/pennybot.vn/app/admin && npm ci && npm run build` → `admin/dist`.
- Vhost mới `/www/server/panel/vhost/nginx/admin.pennybot.vn.conf`:
  - `server_name admin.pennybot.vn`; `root .../app/admin/dist`; SPA fallback `try_files $uri /index.html`.
  - `location /api/ { proxy_pass http://127.0.0.1:3020; ... }` (same-origin).
  - assets cache 365d; `client_max_body_size 15M`; HSTS header.
  - acme webroot cho `.well-known/acme-challenge`.
- SSL: `certbot certonly --webroot -w .../app/admin/dist -d admin.pennybot.vn` → tham chiếu cert trong vhost; `nginx -t && nginx -s reload`.
- Cập nhật vhost `pennybot.vn` thêm redirect `/admin`.
- Rebuild `frontend` (đã gỡ admin) và publish lại `frontend/dist`.

### 9. Testing

- **Admin (Vitest + @vue/test-utils):** `stores/auth` (login lưu token, chặn non-admin, logout xoá), `lib/api` (gắn Bearer, 401→logout), `lib/format`/`lib/csv`, router guard, smoke render `LoginView`.
- **Backend (vitest):** 3 endpoint mới — timeseries (bucket đúng theo ngày VN), send (lặp userIds, đếm sent/failed, bỏ qua user không bot), reminders list/stats (filter + phân trang).
- **Typecheck:** `admin: vue-tsc --noEmit`; `backend: tsc --noEmit`; `frontend: tsc -b` sau khi gỡ admin.

## Data flow (auth + một list page)

```
LoginView → auth.login(phone,pwd) → POST /api/auth/login
   → role check ADMIN → lưu token → router push /
UsersView mount → api.get(/admin/users?page&search)  [Bearer auto]
   → n-data-table render; export → fetch limit cao → toCsv → download
401 bất kỳ → interceptor → auth.logout() → /login
```

## Edge cases

- Non-admin đăng nhập admin portal → báo lỗi, không lưu token.
- Token hết hạn (7 ngày) → 401 → tự logout về /login.
- QR upload > giới hạn → validate client (≤300KB như cũ) trước khi gửi dataURL.
- `send` tới user không có bot active → đếm vào `failed`, không làm hỏng cả batch.
- Dark mode lưu `@vueuse useStorage` → giữ lựa chọn.
- oklch không parse được trong Naive UI → đã chuyển hex cho token Naive UI.
- Delete plan còn subscription → backend soft-delete (giữ nguyên hành vi); UI hiển thị thông báo phù hợp.

## Phasing (cho implementation plan)

A) Scaffold + theme + shell + auth + api/types →
B) Parity pages (Dashboard KPIs, Users+Detail, Plans, Bots, Payments, Notifications, Audit) →
C) Backend endpoints (timeseries, send, reminders) + tests →
D) Enhancements (charts, export, Reminders page, SendToUsers page, dark mode/UX) →
E) Gỡ admin React + redirect →
F) Deploy (vhost + SSL + build + publish).
