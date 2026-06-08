# Vue3 + Naive UI Admin Portal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline) to implement this plan phase-by-phase. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Standalone Vue3 + Naive UI admin SPA at `admin.pennybot.vn` with parity to the React admin plus charts, advanced tables/export, Reminders page, send-to-selected-users, dark mode; remove React admin; deploy.

**Architecture:** New `admin/` Vite SPA in the monorepo consuming the existing `/api/admin/*` backend (Bearer JWT + ADMIN role) same-origin via nginx/Vite `/api` proxy. Backend gains 3 additive endpoints (stats timeseries, notifications send-to-list, reminders read). React admin removed; nginx redirects `/admin`→subdomain.

**Tech Stack:** Vue 3, Vite, TypeScript, Naive UI, Pinia, Vue Router, axios, echarts + vue-echarts, @vueuse/core, Vitest + @vue/test-utils. Backend: Express + Prisma + Zod + vitest.

**Spec:** `docs/superpowers/specs/2026-06-08-vue-admin-portal-design.md`

---

## Phase A — Scaffold, theme, api, auth foundation

### Task A1: Scaffold `admin/` Vite project
**Files:** Create `admin/package.json`, `admin/vite.config.ts`, `admin/tsconfig*.json`, `admin/index.html`, `admin/.gitignore`, `admin/.env`, `admin/.env.production`, `admin/src/main.ts`, `admin/src/App.vue`, `admin/vitest.config.ts`.

- [ ] Create project with deps: `vue`, `naive-ui`, `pinia`, `vue-router`, `axios`, `echarts`, `vue-echarts`, `@vueuse/core`, `@fontsource-variable/manrope`, `@fontsource-variable/montserrat`; dev: `vite`, `@vitejs/plugin-vue`, `vue-tsc`, `typescript`, `vitest`, `@vue/test-utils`, `jsdom`.
- [ ] `vite.config.ts`: `plugins:[vue()]`, alias `@`→`src`, `server.proxy['/api'] → http://localhost:3000`, `server.port: 5174`.
- [ ] `.env` → `VITE_API_BASE=/api`; `.gitignore` → `node_modules`, `dist`.
- [ ] `npm install` in `admin/`.
- [ ] Verify: `cd admin && npx vue-tsc --noEmit` (empty app passes), `npm run build` succeeds.
- [ ] Commit: `feat(admin): scaffold Vue3+Vite+NaiveUI project`.

### Task A2: Theme tokens (brand green → hex for Naive UI)
**Files:** Create `admin/src/theme/tokens.ts`, `admin/src/theme/naive.ts`, `admin/src/theme/tokens.test.ts`.
- [ ] Compute hex equivalents of the oklch palette once (culori or equivalent): `PRIMARY` ← `oklch(0.403 0.106 152.2)`, `PRIMARY_HOVER` ← `oklch(0.462 0.123 151.6)`, `PRIMARY_PRESSED` ← `oklch(0.316 0.081 153.4)`, `PRIMARY_SUPPL` ← `oklch(0.525 0.138 152.2)`. Store as hex constants.
- [ ] `buildThemeOverrides(isDark: boolean)` → `{ common: { primaryColor, primaryColorHover, primaryColorPressed, primaryColorSuppl, borderRadius: '10px', fontFamily, fontFamilyMono } }`.
- [ ] Test: `tokens.test.ts` asserts PRIMARY is a valid 7-char hex and `buildThemeOverrides(false).common.primaryColor === PRIMARY`.
- [ ] Run `npx vitest run`; Commit: `feat(admin): brand theme tokens + Naive UI overrides`.

### Task A3: API client + formatters + CSV util
**Files:** Create `admin/src/lib/api.ts`, `admin/src/lib/format.ts`, `admin/src/lib/csv.ts`, `admin/src/lib/format.test.ts`, `admin/src/lib/csv.test.ts`.
- [ ] `api.ts`: axios `create({ baseURL: import.meta.env.VITE_API_BASE })`; request interceptor adds `Authorization: Bearer <localStorage penny_admin_token>`; response interceptor: on 401 clear token + `location.assign('/login')`.
- [ ] `format.ts`: `formatVnd(n)`, `formatDate(d)`, `formatDateTime(d)` using `Intl`/`toLocaleString('vi-VN')`.
- [ ] `csv.ts`: `toCsv(rows, columns: {key,label}[])` (escape quotes/commas/newlines) + `downloadCsv(filename, csv)` (Blob + anchor).
- [ ] Tests: `format.test.ts` (VND + date formatting), `csv.test.ts` (escaping, header row).
- [ ] Run `npx vitest run`; Commit: `feat(admin): api client, formatters, csv export util`.

### Task A4: Types mirroring admin API
**Files:** Create `admin/src/types/api.ts`.
- [ ] Interfaces: `AuthUser`(id,phone,email,name,role,createdAt), `Paginated<T>`({data,total,page,totalPages}), `AdminUserRow`, `AdminUserDetail`, `Plan`, `BotPoolItem`+`BotsResponse`({bots,awaiting}), `PaymentRow`, `StatsOverview`, `TimeseriesPoint`, `AuditRow`, `ReminderRow`, `ReminderStatPoint`. Mirror field names from spec §6/API inventory.
- [ ] Commit: `feat(admin): API TypeScript types`.

### Task A5: Auth store + UI store + router guard
**Files:** Create `admin/src/stores/auth.ts`, `admin/src/stores/ui.ts`, `admin/src/router/index.ts`, `admin/src/stores/auth.test.ts`.
- [ ] `auth.ts` (Pinia): state `token,user`; `login(phone,password)` → POST `/auth/login`; if `user.role!=='ADMIN'` throw Error('Tài khoản không có quyền admin') without persisting; else persist token (`penny_admin_token`) + user; `fetchMe()` GET `/auth/me`; `logout()`; getter `isAdmin`.
- [ ] `ui.ts`: `dark` via `useStorage('penny_admin_dark', false)`.
- [ ] `router/index.ts`: routes (login + all pages under AdminLayout), `beforeEach` guard requiring `isAdmin` for `meta.requiresAdmin`.
- [ ] Test `auth.test.ts` (mock api): admin login persists token; non-admin login throws and does NOT persist; logout clears.
- [ ] Run `npx vitest run`; Commit: `feat(admin): auth+ui stores and router guard`.

### Task A6: App shell (layout, providers, login)
**Files:** Create `admin/src/App.vue`, `admin/src/layouts/AdminLayout.vue`, `admin/src/pages/LoginView.vue`, `admin/src/components/PageHeader.vue`, `admin/src/components/DataToolbar.vue`, `admin/src/components/ConfirmButton.vue`. Modify `admin/src/main.ts`.
- [ ] `App.vue`: `n-config-provider` (theme=dark?darkTheme:undefined, theme-overrides=buildThemeOverrides(dark)) wrapping `n-loading-bar-provider`,`n-message-provider`,`n-dialog-provider`,`n-notification-provider`,`router-view`.
- [ ] `AdminLayout.vue`: `n-layout` sider (`n-menu` 9 items) + header (title, dark toggle, user dropdown→logout) + content `router-view`.
- [ ] `LoginView.vue`: `n-form` (phone,password) → `auth.login` → push `/`; show error via message.
- [ ] Shared: `PageHeader`, `DataToolbar` (search + refresh + export slot), `ConfirmButton` (n-popconfirm).
- [ ] Verify `vue-tsc --noEmit` + `npm run build`; Commit: `feat(admin): app shell, layout, login`.

## Phase B — Parity pages

### Task B1: Dashboard (KPIs)
**Files:** Create `admin/src/pages/DashboardView.vue`. GET `/admin/stats/overview` → 8 `n-statistic` tiles in `n-grid` + recent signups `n-list`. (Charts added in Phase D.) Commit.

### Task B2: Users list + detail
**Files:** Create `admin/src/pages/UsersView.vue`, `admin/src/pages/UserDetailView.vue`. `n-data-table` remote (page,limit,search); row actions view/lock/unlock (ConfirmButton). Detail: 3 cards + lock/unlock/role(PATCH)/upgrade(modal). Commit.

### Task B3: Plans
**Files:** Create `admin/src/pages/PlansView.vue`. Table + modal `n-form` create/edit/delete with rules (slug `^[a-z0-9-]+$`). Commit.

### Task B4: Bots
**Files:** Create `admin/src/pages/BotsView.vue`. `awaiting` alert; table (load ratio, users, status); modal form (label,token,capacity,botLink,QR upload→dataURL ≤300KB); create/edit/delete. Commit.

### Task B5: Payments
**Files:** Create `admin/src/pages/PaymentsView.vue`. Table remote + status `n-select` filter + search + export. Commit.

### Task B6: Notifications (broadcast) + Audit
**Files:** Create `admin/src/pages/NotificationsView.vue`, `admin/src/pages/AuditView.vue`. Broadcast: message + plan checkboxes + personalized + result. Audit: table + action filter + payload modal + export. Commit.

## Phase C — Backend endpoints (TDD)

### Task C1: `GET /api/admin/stats/timeseries`
**Files:** Modify `backend/src/controllers/admin/stats.controller.ts`, `backend/src/routes/admin/stats.route.ts`, `backend/src/validators/admin.schema.ts`. Create `backend/src/controllers/admin/stats.controller.test.ts`.
- [ ] Test first (mock prisma): metric=signups buckets users by VN day; metric=revenue sums PAID payments by day; returns `{points:[{date,value}]}` zero-filled across range.
- [ ] Implement with prisma groupBy/raw + VN-day bucketing (reuse `startOfVnDay` pattern); validator `timeseriesQuery`.
- [ ] `npx vitest run`; Commit.

### Task C2: `POST /api/admin/notifications/send`
**Files:** Modify `backend/src/controllers/admin/notifications.controller.ts`, `backend/src/routes/admin/notifications.route.ts`, `backend/src/validators/admin.schema.ts`. Create `notifications.controller.test.ts` (or extend).
- [ ] Test: given userIds, sends per user (botConfig→zaloUsers), counts sent/failed, personalized rewrites via persona; user w/o bot → failed++.
- [ ] Implement `sendToUsers` reusing existing per-user logic; validator `sendToUsersBody` (userIds 1..500, message 1..2000, personalized?). Audit NOTIFICATION_BROADCAST.
- [ ] `npx vitest run`; Commit.

### Task C3: `GET /api/admin/reminders` + `/reminders/stats`
**Files:** Create `backend/src/controllers/admin/reminders.controller.ts`, `backend/src/routes/admin/reminders.route.ts`, `backend/src/controllers/admin/reminders.controller.test.ts`. Modify `backend/src/routes/admin/index.ts`, `backend/src/validators/admin.schema.ts`.
- [ ] Test: list filters by date(sentOn day)+kind, paginates, includes user name/phone; stats groups by sentOn+kind counts over N days.
- [ ] Implement; mount `/reminders`.
- [ ] `npx vitest run`; full `npx tsc --noEmit`; Commit.

## Phase D — Enhancements

### Task D1: Dashboard charts
**Files:** Modify `admin/src/pages/DashboardView.vue`; create `admin/src/components/LineChart.vue` (vue-echarts wrapper, registers LineChart/Grid/Tooltip). Add revenue + signups charts from `/admin/stats/timeseries`. Commit.

### Task D2: Table sort + CSV export wired
**Files:** Modify `UsersView.vue`, `PaymentsView.vue`, `AuditView.vue`. Enable column sorters (remote where supported, client otherwise) + export button (fetch high limit → `toCsv` → `downloadCsv`). Commit.

### Task D3: SendToUsers page
**Files:** Create `admin/src/pages/SendToUsersView.vue`; add route+nav. Filterable `n-select` multiple (remote search `/admin/users?search=`), message, personalized → POST `/admin/notifications/send`; show result. Commit.

### Task D4: Reminders page
**Files:** Create `admin/src/pages/RemindersView.vue`; add route+nav. Table from `/admin/reminders` (date+kind filters, pagination) + summary line chart from `/admin/reminders/stats`. Commit.

### Task D5: Dark mode + UX polish
**Files:** Modify `AdminLayout.vue` (dark toggle wired to ui store), confirm route loading bar hooks in `router/index.ts`. Verify dialogs/toasts consistent. Commit.

## Phase E — Remove React admin + redirect

### Task E1: Delete React admin code
**Files:** Delete `frontend/src/pages/admin/*`, `frontend/src/components/admin/*`, `frontend/src/components/auth/admin-route.tsx`. Modify `frontend/src/App.tsx` (remove `/admin/*` routes + imports) and any admin nav link in the dashboard.
- [ ] Verify `cd frontend && npx tsc -b` passes and `npm run build` succeeds (no dangling imports).
- [ ] Commit: `refactor(frontend): remove admin (moved to admin.pennybot.vn)`.

## Phase F — Deploy

### Task F1: Push + server build
- [ ] Merge `feat/vue-admin`→`main`, push.
- [ ] Server: `git pull`; `cd admin && npm ci && npm run build`; rebuild `frontend` (`npm ci && npm run build`).

### Task F2: nginx vhost + SSL for admin.pennybot.vn
- [ ] Write `/www/server/panel/vhost/nginx/admin.pennybot.vn.conf` (root admin/dist, SPA fallback, `/api/`→127.0.0.1:3020, assets cache, HSTS, acme webroot).
- [ ] `certbot certonly --webroot -w /www/wwwroot/pennybot.vn/app/admin/dist -d admin.pennybot.vn`; reference cert; `nginx -t && nginx -s reload`.
- [ ] Add `location /admin` 301 redirect to `pennybot.vn.conf`; reload.

### Task F3: Verify
- [ ] `curl -I https://admin.pennybot.vn` → 200; login as admin works; one API call returns data; `https://pennybot.vn/admin` → 301.

---

## Self-Review

**Spec coverage:** stack/layout→A1; theme→A2; api/auth/shell→A3–A6; parity pages→B1–B6; backend endpoints→C1–C3; charts/export/sendto/reminders/dark→D1–D5; remove React admin+redirect→E1+F2; deploy→F1–F3. ✓
**Placeholders:** none — each task names exact files + concrete actions; contract-defining code (api/auth/theme/types/endpoints) specified; page tasks follow one consistent Naive UI pattern (table+modal+toolbar) described in A6/B-tasks. ✓
**Type consistency:** `buildThemeOverrides`, `toCsv/downloadCsv`, `auth.login/isAdmin`, `Paginated<T>`, endpoint paths `/admin/stats/timeseries|/admin/notifications/send|/admin/reminders` consistent across A/C/D. ✓
