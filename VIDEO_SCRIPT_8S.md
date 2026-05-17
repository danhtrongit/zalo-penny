# Penny — Kịch bản video giới thiệu 8 giây

> **Mục tiêu**: 8s teaser cho social (TikTok / Reels / Zalo Story) — giới thiệu Penny là trợ lý chi tiêu thông minh trên Zalo, ghi chi tiêu bằng tiếng Việt tự nhiên.
>
> **Dạng**: Vertical 9:16, 1080×1920, 30 fps, MP4 H.264, audio 48 kHz stereo.
> **Mood**: Hiện đại, ấm áp, tin cậy. Pace nhanh nhưng không gấp. Có nhịp "ồ-aha" ở giây thứ 4.
> **Đối tượng**: Người Việt 22-40 tuổi, đang dùng Zalo, có nhu cầu quản lý chi tiêu cá nhân.

---

## 1. Tóm tắt thông điệp (one-liner)

> "Nhắn tin với Penny, để Penny lo phần ghi chi tiêu."

---

## 2. Bảng tổng quan timeline

| # | Timecode | Cảnh | Thời lượng | Mục đích |
|---|---|---|---|---|
| 1 | `0.0–1.5s` | Hook — nỗi đau ghi sổ | 1.5s | Tạo sự đồng cảm |
| 2 | `1.5–3.3s` | Penny xuất hiện trên Zalo | 1.8s | Giới thiệu nhân vật |
| 3 | `3.3–5.3s` | Demo: gõ "ăn trưa 50k" → Penny xác nhận | 2.0s | Khoảnh khắc "aha" |
| 4 | `5.3–6.8s` | Dashboard báo cáo glimpse | 1.5s | Giá trị thực |
| 5 | `6.8–8.0s` | Logo + CTA + nhạc kết | 1.2s | Branding + lời gọi |

Tổng: **8.0 giây** chẵn.

---

## 3. Storyboard chi tiết theo từng scene

### 🎬 Scene 1 — `0.0 → 1.5s` · "Nỗi đau quen thuộc"

| Yếu tố | Chi tiết |
|---|---|
| **Khung hình** | Vertical close-up, framing 9:16 trung tâm |
| **Góc quay** | **Over-the-shoulder POV**, ống kính 35mm, depth-of-field nông (f/2.0) — tay nhân vật cầm tờ hóa đơn nhăn nhúm trên bàn cà phê |
| **Camera move** | **Slow handheld drift** sang phải, có rung tinh tế (~2px sway) để cảm giác chân thực |
| **Lighting** | Ánh sáng cửa sổ side-light ấm (3200K), một chút haze; mood gần như sepia ở 0.3s rồi chuyển nhẹ sang trung tính |
| **Vật thể chính** | 3-4 tờ hóa đơn giấy, một cây bút bi, một sổ tay mở trang trắng |
| **Motion graphic overlay** | Lúc 0.6s: text-block tiếng Việt mờ-dần-vào ở góc trên trái — `font: Manrope Bold, 56pt, #1A1A1A, letter-spacing -1%` |
| **Text overlay** | "Ghi chi tiêu mỗi ngày…" — fade in 200ms, exit lúc 1.4s với motion blur 8px |
| **Voiceover (VO)** | Im lặng — chỉ ambient |
| **SFX** | `paper_rustle_soft.wav` (0.0–0.4s) + `clock_tick_distant.wav` loop nhẹ -18 dB |
| **Music** | Pad strings F minor mềm, fade-in từ -∞ đến -14 dB, chưa có nhịp |
| **Asset tham chiếu** | Không dùng asset trong repo — quay live action hoặc dùng stock B-roll: keyword `"vietnamese receipt paper desk handheld"` |
| **Transition out** | Match cut sang Scene 2 qua chuyển động tay nhân vật cầm điện thoại lên |

---

### 🎬 Scene 2 — `1.5 → 3.3s` · "Penny xuất hiện trên Zalo"

| Yếu tố | Chi tiết |
|---|---|
| **Khung hình** | Điện thoại trên tay, screen recording overlay hoặc clean phone mockup (iPhone 15 frame) |
| **Góc quay** | **Top-down 15° tilt**, ống kính macro 50mm — màn hình chiếm ~70% khung |
| **Camera move** | **Dolly-in chậm** từ z-50 về z-0 (push-in tinh tế) trong suốt scene |
| **Lighting** | Studio key light 5500K, fill nhẹ, không phản chiếu mạnh trên màn hình. Có rim light xanh emerald `#00582A` từ phía sau gợi ý thương hiệu |
| **UI trên màn hình** | Mở app Zalo, nhảy vào chat với "Penny". Avatar Penny dùng [`logo.png`](frontend/src/assets/logo.png). Header xanh `#00582A`. |
| **Animation UI** | <ul><li>1.7s: Bong bóng chat **Penny** trượt từ trái vào với spring easing (`cubic-bezier(.34,1.56,.64,1)`)</li><li>1.9s: Text trong bong bóng typewriter-effect: "Chào bạn 👋 Mình là Penny"</li><li>2.4s: Bong bóng thứ 2 xuất hiện: "Nhắn cho mình chi tiêu nha"</li></ul> |
| **Text overlay** | Không có — text nằm trong UI chat |
| **VO** | "Penny… trợ lý chi tiêu của bạn, ngay trong Zalo." — bắt đầu lúc 1.6s, kết thúc 3.0s |
| **SFX** | <ul><li>1.55s: `zalo_notification_chime.wav` (mimic, ~440Hz đôi)</li><li>1.9s + 2.4s: `keyboard_tap_soft.wav` mỗi ký tự, layer -22 dB</li><li>Continuous: nhạc nền bắt đầu có hi-hat 8ths</li></ul> |
| **Asset tham chiếu** | <ul><li>Avatar Penny: [`frontend/src/assets/logo.png`](frontend/src/assets/logo.png)</li><li>Penny vẫy tay (chèn nhỏ ở góc dưới phải bong bóng): [`frontend/src/assets/penny-waving.png`](frontend/src/assets/penny-waving.png) — scale 25%, fade in 200ms</li></ul> |
| **Color palette** | Background `#FAFAF8`, Penny bubble `#00582A` với text trắng, user bubble `#E8F3EC` text `#1A1A1A` |
| **Transition out** | Cross-cut nhanh (1 frame J-cut) sang Scene 3 — giữ liên tục bong bóng chat |

---

### 🎬 Scene 3 — `3.3 → 5.3s` · "Khoảnh khắc Aha — ăn trưa 50k"

| Yếu tố | Chi tiết |
|---|---|
| **Khung hình** | Tiếp tục phone mockup, nhưng zoom thêm 10% vào input box phía dưới |
| **Góc quay** | Vẫn top-down 15° tilt, nhưng **slight crash zoom** lúc 4.6s (zoom-in 1.05× trong 8 frame) để nhấn vào reaction |
| **Camera move** | Static, để UI dẫn dắt chuyển động |
| **UI animation chi tiết** | <ul><li>3.4s: Ngón tay (cursor giả lập hoặc finger overlay 60% opacity) chạm vào input</li><li>3.5–4.2s: Typewriter effect gõ tin nhắn `"ăn trưa 50k"` — mỗi ký tự ~50ms, có cursor blink</li><li>4.25s: Bong bóng người dùng `"ăn trưa 50k"` bay lên với physics bounce</li><li>4.4s: Penny đang typing… (3 chấm chạy 200ms loop)</li><li>4.6s: Bong bóng Penny xuất hiện kèm card xác nhận: <br/>`✅ Đã ghi`<br/>`Ăn trưa: 50.000đ`<br/>`Danh mục: Ăn uống`</li><li>4.9s: Penny avatar (dùng [`penny-happy.png`](frontend/src/assets/penny-happy.png)) wiggle/bounce 1 lần (rotation -8°→+8°→0° trong 300ms)</li></ul> |
| **Text overlay** | Không có — vẫn để UI thoại |
| **VO** | "Chỉ cần nhắn tự nhiên." (3.6–4.4s) "Penny tự hiểu và ghi lại." (4.5–5.2s) |
| **SFX** | <ul><li>3.5–4.2s: 11 lần `keyboard_tap_iphone.wav` layered, mỗi cái -18 dB, randomized pitch ±50 cents</li><li>4.25s: `whoosh_short.wav` (bubble bay lên)</li><li>4.6s: `cash_register_subtle.wav` (như tiếng "ka-ching" nhẹ, không cliché)</li><li>4.6s: `chime_success_2note.wav` — 2 notes lên (G4→C5)</li></ul> |
| **Music** | Beat hoàn chỉnh hiện ra với kick + clap nhẹ ở 4.6s — tạo cảm giác "đã" |
| **Asset tham chiếu** | <ul><li>Penny happy face: [`frontend/src/assets/penny-happy.png`](frontend/src/assets/penny-happy.png)</li><li>Có thể dùng [`frontend/src/assets/happy.png`](frontend/src/assets/happy.png) (version cao hơn) nếu cần chất lượng in</li></ul> |
| **Color palette** | Card xác nhận viền `#00582A`, background `#F0F9F2`, success check icon `#10B981` |
| **Transition out** | Whip pan **sang phải** (140°/0.15s) kèm motion blur — vào Scene 4 |

---

### 🎬 Scene 4 — `5.3 → 6.8s` · "Báo cáo thông minh"

| Yếu tố | Chi tiết |
|---|---|
| **Khung hình** | Phone mockup full màn hình, hiển thị Dashboard của Penny |
| **Góc quay** | **Top-down 0° (true overhead)**, không tilt — composition phẳng, hiện đại |
| **Camera move** | **Subtle parallax**: phone tịnh tiến lên 8px khi các elements animate vào |
| **UI animation** | <ul><li>5.35s: Card "Tháng này" trượt lên từ dưới (`y: 100 → 0`, spring)</li><li>5.5s: Số tiền `2.450.000đ` đếm tăng từ 0 lên (CountUp animation, ease-out)</li><li>5.7s: 3 thanh bar chart phân loại slide-in stagger 80ms: Ăn uống, Di chuyển, Mua sắm — màu sắc emerald gradient</li><li>6.1s: Donut chart fill-in 360° trong 400ms</li><li>6.4s: Mascot Penny góc dưới phải vẫy tay ([`penny-waving.png`](frontend/src/assets/penny-waving.png))</li></ul> |
| **Text overlay** | Lúc 5.4s, label nhỏ `"Báo cáo tháng này"` slide-in từ trái — Manrope SemiBold 32pt |
| **VO** | "Báo cáo trực quan, kiểm soát ngân sách dễ dàng." (5.4–6.7s) |
| **SFX** | <ul><li>5.35s: `card_pop_up.wav` (gentle whoosh)</li><li>5.5–5.9s: `digit_tick.wav` mỗi 60ms khi số đếm</li><li>5.7s, 5.78s, 5.86s: 3 lần `bar_chart_blip.wav` (pitched: C5, E5, G5)</li><li>6.1s: `donut_fill.wav` (rotational sweep)</li></ul> |
| **Asset tham chiếu** | <ul><li>Penny vẫy tay: [`frontend/src/assets/penny-waving.png`](frontend/src/assets/penny-waving.png)</li><li>Có thể inspire UI từ trang Dashboard thực: [`frontend/src/pages/dashboard/index.tsx`](frontend/src/pages/dashboard/index.tsx) và [`spending-card.tsx`](frontend/src/components/dashboard/spending-card.tsx)</li></ul> |
| **Color palette** | <ul><li>Background card: white</li><li>Primary bar: `#00582A`</li><li>Secondary bar: `#3B8B5C`</li><li>Tertiary bar: `#A7D5B9`</li><li>Number text: `#1A1A1A`, Manrope Bold</li></ul> |
| **Transition out** | Logo mark từ trung tâm card "lớn dần" và lan ra full màn hình, blur background |

---

### 🎬 Scene 5 — `6.8 → 8.0s` · "Logo & CTA"

| Yếu tố | Chi tiết |
|---|---|
| **Khung hình** | Centered, brand-mark dominant |
| **Góc quay** | Flat composition, không depth — pure 2D brand frame |
| **Camera move** | Logo có **subtle breath pulse** (scale 1.0 ↔ 1.02, 800ms loop) |
| **Background** | Gradient radial từ `#00582A` (center) → `#003D1B` (edges); có 12 hạt particle nhỏ trắng floating slow |
| **Logo animation** | <ul><li>6.85s: [`logo.png`](frontend/src/assets/logo.png) scale-in từ 0 → 1.0 với spring (`bounce: .3`)</li><li>7.05s: Wordmark "Penny" type-out bên dưới logo — Manrope ExtraBold 72pt, màu trắng</li><li>7.3s: Tagline "Trợ lý chi tiêu trên Zalo" fade in dưới wordmark — Manrope Medium 28pt, opacity 80%</li><li>7.6s: CTA pill "Mở Zalo → tìm Penny" slide-up từ dưới, background trắng text `#00582A`, có shadow nhẹ</li><li>7.8–8.0s: Hold frame</li></ul> |
| **Text overlay** | <ul><li>"Penny" (wordmark)</li><li>"Trợ lý chi tiêu trên Zalo" (tagline)</li><li>"Mở Zalo → tìm Penny" (CTA)</li></ul> |
| **VO** | "Penny — Trợ lý chi tiêu trên Zalo." (6.9–8.0s) — giọng nữ Hà Nội, ấm, smile-in-voice |
| **SFX** | <ul><li>6.85s: `logo_whoosh_in.wav` (1.2s tail)</li><li>7.05s: `brand_sting_3note.wav` (G-B-D, 600ms) — kết bài</li><li>7.6s: `pill_pop.wav` (CTA appear)</li><li>8.0s: nhạc kết bằng note pad tail F major, fade 200ms</li></ul> |
| **Asset tham chiếu** | [`frontend/src/assets/logo.png`](frontend/src/assets/logo.png) — chính. |
| **Color palette** | <ul><li>BG: `#00582A` → `#003D1B` gradient</li><li>Logo: nguyên bản (giả định có alpha)</li><li>Wordmark: `#FFFFFF`</li><li>CTA pill: bg `#FFFFFF`, text `#00582A`</li></ul> |
| **Transition out** | Cut to black 1 frame, hết video |

---

## 4. Voiceover script đầy đủ (giọng nữ, Hà Nội, ấm, trẻ trung)

| Timecode | Câu thoại | Ghi chú diễn xuất |
|---|---|---|
| `1.6 – 3.0s` | "Penny — trợ lý chi tiêu của bạn, ngay trong Zalo." | Nhấn nhẹ ở "ngay trong Zalo" |
| `3.6 – 4.4s` | "Chỉ cần nhắn tự nhiên…" | Để treo, hơi mời gọi |
| `4.5 – 5.2s` | "…Penny tự hiểu và ghi lại." | Smile-in-voice rõ ở "ghi lại" |
| `5.4 – 6.7s` | "Báo cáo trực quan, kiểm soát ngân sách dễ dàng." | Phát âm tròn vành, đầm |
| `6.9 – 8.0s` | "Penny — trợ lý chi tiêu trên Zalo." | Kết câu rõ ràng, hơi chậm lại |

**Tổng**: ~28 từ, ~6.4 giây active speech, vừa với 8s khung hình.

**Tham khảo casting**: Giọng "VAYA Female VN — neutral warm", hoặc actor diễn xuất tự nhiên. **Tránh**: giọng AI text-to-speech robot-tinted.

**Mixing VO**: bus VO ở -12 dB LUFS, ducking music -6 dB khi VO active.

---

## 5. Music — composition guide

| Thuộc tính | Giá trị |
|---|---|
| **Style** | Vietnamese fintech-friendly, ấm, không sến |
| **Tempo** | 124 BPM |
| **Key** | F major (tươi sáng, lạc quan) |
| **Instrument stack** | <ul><li>Pad strings (intro, scene 1)</li><li>Plucked synth + soft kick (từ scene 2)</li><li>Hi-hat 8ths (scene 2 trở đi)</li><li>Clap có tail short (scene 3-4)</li><li>Marimba accent (scene 3 lúc xác nhận expense)</li><li>String swell + cymbal soft (scene 5 outro)</li></ul> |
| **Dynamics** | <ul><li>0.0–1.5s: -14 dB pad only</li><li>1.5–3.3s: build với hi-hat, -10 dB</li><li>3.3–5.3s: full mix, -8 dB</li><li>5.3–6.8s: hold full</li><li>6.8–8.0s: outro swell với pad tail</li></ul> |
| **Reference track** | Tham khảo cảm giác: *Notion app intro*, *Cash App Vietnamese ad 2023*, *Momo "Tết 2024"* (ấm, dễ tin) |
| **Stems cần xuất** | Music FULL · VO FULL · SFX FULL · 3 stems riêng để có thể remix cho variant 15s / 30s sau |

---

## 6. SFX library shopping list (hoặc record thủ công)

| File logic | Mô tả | Nguồn gợi ý |
|---|---|---|
| `paper_rustle_soft.wav` | Tiếng giấy nhăn nhẹ | Freesound, keyword "paper crumple soft" |
| `clock_tick_distant.wav` | Tiếng đồng hồ tick xa, loop 1s | Freesound, "wall clock tick" |
| `zalo_notification_chime.wav` | **Tự tạo**: 2 note A5–E6 sine, attack 5ms, release 80ms, light reverb |
| `keyboard_tap_iphone.wav` | iOS soft keyboard click | Stock iOS sample pack |
| `whoosh_short.wav` | Whoosh 150ms cho bong bóng | Sound Ideas, Boom Library |
| `cash_register_subtle.wav` | "Ka-ching" nhưng pitched-up + filtered (không cliché) | Filtered từ register sample |
| `chime_success_2note.wav` | 2 notes G4→C5 marimba | Compose 5s trong Logic Pro |
| `card_pop_up.wav` | UI pop, attack 10ms | Premium Beat UI pack |
| `digit_tick.wav` | Tick nhỏ cho số đếm | Pluck synth single note muted |
| `bar_chart_blip.wav` | Blip ngắn, pitched | Compose: triangle wave, 50ms |
| `donut_fill.wav` | Sweep rotational 400ms | Filter sweep noise + reverb |
| `logo_whoosh_in.wav` | Whoosh lớn 1.2s tail | Boom Library "Cinematic Whooshes" |
| `brand_sting_3note.wav` | 3 notes G-B-D piano + strings, 600ms | Compose, mastered -1 dB |
| `pill_pop.wav` | UI pop nhẹ | Reuse `card_pop_up.wav` pitched-up |

**Tổng cộng**: 13 SFX. Bus SFX ở -16 dB LUFS, không vượt -4 dB peak.

---

## 7. Asset references — bảng tổng

| Asset | Path | Dùng cho |
|---|---|---|
| Logo chính | [`frontend/src/assets/logo.png`](frontend/src/assets/logo.png) | Scene 2 (avatar), Scene 5 (brand mark) |
| Penny vẫy tay | [`frontend/src/assets/penny-waving.png`](frontend/src/assets/penny-waving.png) | Scene 2 corner, Scene 4 mascot |
| Penny vui | [`frontend/src/assets/penny-happy.png`](frontend/src/assets/penny-happy.png) | Scene 3 (sau xác nhận expense) |
| Penny vui (HD) | [`frontend/src/assets/happy.png`](frontend/src/assets/happy.png) | Print/billboard variant |
| Penny lo lắng | [`frontend/src/assets/penny-worried.png`](frontend/src/assets/penny-worried.png) | Dự phòng — variant "vượt ngân sách" |
| Penny robot | [`frontend/src/assets/penny-robot.png`](frontend/src/assets/penny-robot.png) | Dự phòng — variant tech feel |
| Favicon (đã đồng bộ logo) | [`frontend/public/favicon.png`](frontend/public/favicon.png) | Hiển thị nhỏ ở thanh chrome trong screenshot |

---

## 8. Typography

| Vai trò | Font | Weight | Size | Letter-spacing |
|---|---|---|---|---|
| Headlines (Scene 1, 5) | Manrope Variable | ExtraBold (800) | 56–72pt | -1% |
| Body / wordmark | Manrope Variable | Bold (700) | 28–32pt | 0 |
| UI chat bubble | Manrope Variable | Medium (500) | 18pt | 0 |
| Tagline | Manrope Variable | Medium (500) + italic | 22pt | +1% |
| Numbers (báo cáo) | Manrope Variable | Bold (700) tabular-nums | 36pt | 0 |

Font đã có trong dự án ([`@fontsource-variable/manrope`](frontend/package.json) và Montserrat). Dùng Manrope cho video để khớp app.

---

## 9. Color palette

| Vai trò | HEX | Ghi chú |
|---|---|---|
| Brand primary (deep) | `#00582A` | Đồng bộ với `theme-color` ở [`index.html`](frontend/index.html#L40) |
| Brand primary (light) | `#3B8B5C` | Accent, chart secondary |
| Brand wash | `#E8F3EC` | User chat bubble, soft backgrounds |
| Success | `#10B981` | Check icon |
| Background app | `#FAFAF8` | Off-white ấm |
| Text primary | `#1A1A1A` | High contrast nhưng không pure-black |
| Background outro | gradient `#00582A → #003D1B` | Scene 5 |

---

## 10. Technical specs export

| Trường | Giá trị |
|---|---|
| Resolution | 1080 × 1920 (vertical 9:16) |
| Frame rate | 30 fps (cố định) |
| Codec | H.264 High profile, CRF 18 |
| Bitrate | ~12 Mbps target |
| Audio | AAC 320 kbps, 48 kHz, stereo |
| Color space | Rec. 709, sRGB output |
| LUFS | -14 LUFS integrated (chuẩn social) |
| True peak | ≤ -1 dBTP |
| Duration | 8.000 giây ± 1 frame |
| Container | MP4 |
| File name | `penny-teaser-8s-v1.mp4` |

**Variants xuất kèm**:
- `penny-teaser-8s-square-1080x1080.mp4` — feed cropping
- `penny-teaser-8s-landscape-1920x1080.mp4` — YouTube short ngang
- `penny-teaser-8s-no-vo.mp4` — bản không voiceover để add caption sau
- `penny-teaser-8s-subtitled.srt` — sub tiếng Việt khớp timecode VO

---

## 11. Caption / subtitle text (SRT)

```
1
00:00:01,600 --> 00:00:03,000
Penny — trợ lý chi tiêu của bạn, ngay trong Zalo.

2
00:00:03,600 --> 00:00:04,400
Chỉ cần nhắn tự nhiên…

3
00:00:04,500 --> 00:00:05,200
…Penny tự hiểu và ghi lại.

4
00:00:05,400 --> 00:00:06,700
Báo cáo trực quan, kiểm soát ngân sách dễ dàng.

5
00:00:06,900 --> 00:00:08,000
Penny — trợ lý chi tiêu trên Zalo.
```

---

## 12. Production checklist

- [ ] Quay live action Scene 1 — 30 phút studio, 1 actor tay, hóa đơn props
- [ ] Dựng UI mockup (Figma → After Effects) cho Scene 2–4 dựa trên screenshots thực của [`frontend/src/pages/dashboard/index.tsx`](frontend/src/pages/dashboard/index.tsx)
- [ ] Compose music 8s (Logic Pro hoặc thuê composer freelance ~2-3 triệu)
- [ ] Record VO (1 talent nữ, 1 giờ studio ~1 triệu, bao gồm 2 lần re-take)
- [ ] Sound design: gom 13 SFX, mix bus
- [ ] Color grade pass: Rec 709, warm shadows shade theo brand
- [ ] Master audio: -14 LUFS, true peak -1 dBTP
- [ ] Export 4 variants
- [ ] QA: xem trên iPhone, Android, Web — kiểm tra caption hiển thị

---

## 13. Variants tương lai (out of scope cho phiên bản 8s này)

| Variant | Thời lượng | Mục đích |
|---|---|---|
| 15s | mở rộng scene 3 với quét hóa đơn | TikTok ad |
| 30s | thêm scene "kết nối bot lần đầu" | YouTube pre-roll |
| 6s bumper | chỉ Scene 5 (logo) | YouTube bumper ad |
| Stories vertical 15s | tách 3 frame × 5s | Zalo Story |

---

**Tác giả kịch bản**: Tài liệu này lưu tại [`VIDEO_SCRIPT_8S.md`](VIDEO_SCRIPT_8S.md). Khi sản xuất, mở file kèm Figma / AE để tham chiếu timecode.

**Phiên bản**: v1.0 · `2026-05-17`
