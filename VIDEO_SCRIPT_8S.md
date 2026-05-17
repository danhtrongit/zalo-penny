# Penny — Kịch bản video giới thiệu 8 giây

> **Mục tiêu**: 8s teaser giới thiệu Penny là trợ lý chi tiêu thông minh trên Zalo, dẫn dắt bởi **mascot Penny** xuyên suốt — không có cảnh người thật.
>
> **Dạng**: 16:9 landscape, 1920×1080, 30 fps, MP4 H.264, audio 48 kHz stereo.
> **Mood**: Vui tươi, dễ thương, tin cậy. Nhịp tempo upbeat nhưng vẫn ấm áp.
> **Đối tượng**: Người Việt 22-40 tuổi đang dùng Zalo, có nhu cầu quản lý chi tiêu cá nhân.
> **Style hình ảnh**: 3D cartoon kiểu Pixar / Duolingo / League of Legends mascot trailer — soft shading, rim light, polished motion graphic.

---

## 0. Nhân vật chính — Mascot Penny

| Thuộc tính | Mô tả |
|---|---|
| **Reference** | [`frontend/src/assets/happy.png`](frontend/src/assets/happy.png) (full body) · [`logo.png`](frontend/src/assets/logo.png) (head) |
| **Tỉ lệ** | Chibi, đầu lớn ~1/2 toàn thân, dễ thương |
| **Mũ phi hành gia** | Vòm helmet xanh lá chuối nhạt + đậm, 2 ăng-ten trên đỉnh có quả tròn vàng |
| **Tai nghe** | 2 cup tai nghe xanh emerald lấp lánh |
| **Khuôn mặt** | Tròn cream-trắng, mắt to xanh lá long lanh, má hồng phấn, miệng cười mở thấy lưỡi hồng |
| **Thân** | Bộ giáp xanh emerald + trắng, tay áo phối 2 màu, găng tay xanh đậm |
| **Huy hiệu ngực** | Đồng xu vàng tròn có chữ "P" — coin badge — biểu tượng thương hiệu |
| **Chân** | Boots xanh đậm chunky, đứng vững |
| **Render style** | 3D soft shading + cel outline mảnh, glossy highlight nhẹ, drop shadow mềm |

**Personality**: Vui vẻ, năng động, sẵn sàng giúp đỡ — như người bạn nhỏ thông thái. Không bao giờ phán xét.

---

## 1. Tóm tắt thông điệp

> "Nhắn cho Penny — Penny lo phần ghi chi tiêu."

---

## 2. Bảng tổng quan timeline

| # | Timecode | Cảnh | Thời lượng | Trạng thái Penny |
|---|---|---|---|---|
| 1 | `0.0–1.5s` | Penny bounce-in vẫy chào | 1.5s | Hớn hở, năng lượng cao |
| 2 | `1.5–3.3s` | Tin nhắn "ăn trưa 50k" bay tới | 1.8s | Tò mò, mắt sáng |
| 3 | `3.3–5.3s` | Penny xử lý → "Đã ghi" | 2.0s | Tự tin, badge P phát sáng |
| 4 | `5.3–6.8s` | Báo cáo + biểu đồ quanh Penny | 1.5s | Hài lòng, thumbs up |
| 5 | `6.8–8.0s` | Logo + tagline + CTA | 1.2s | Wave + wink cuối |

Tổng: **8.0 giây** chẵn.

---

## 3. Storyboard chi tiết theo từng scene

### 🎬 Scene 1 — `0.0 → 1.5s` · "Penny bounce-in"

| Yếu tố | Chi tiết |
|---|---|
| **Khung hình** | 16:9 trống, Penny vào chính giữa |
| **Background** | Gradient radial từ trắng trung tâm `#FAFAF8` ra emerald `#E8F3EC` ở mép, có 12 hạt particle vàng/xanh nhỏ floating chậm |
| **Góc quay** | **Medium full shot**, ống kính ảo 50mm, Penny chiếm ~45% chiều cao khung |
| **Camera move** | Static khung, nhưng Penny làm anchor di chuyển. Cuối scene **subtle push-in 5%** |
| **Penny animation** | <ul><li>0.0–0.15s: Khung trống</li><li>0.15s: Một vệt sáng vàng từ trên rơi xuống chính giữa</li><li>0.35s: Penny rơi xuống với squash khi chạm "mặt đất ảo", anti-grav landing — biến dạng 1.3x ngang × 0.7x dọc trong 4 frames, rồi snap back với spring overshoot</li><li>0.7s: Penny đứng thẳng, ngước lên</li><li>0.9s: Mở miệng cười, mắt long lanh sparkle 2 frame</li><li>1.0–1.4s: Vẫy tay phải qua-lại 2 lần (góc -25° → +25°), tay trái chống hông</li></ul> |
| **Particle effect** | <ul><li>0.35s: Dust ring nổ ra ở chân khi landing (12 puff trắng-vàng, 600ms tail)</li><li>0.9s: 4 sparkle ⭐ vàng pop quanh mặt Penny</li></ul> |
| **Text overlay** | Lúc 1.0s, ở 1/3 phải khung hình: text "Xin chào, mình là Penny!" — Manrope Bold 64pt, màu `#1A1A1A`, slide-in từ phải với fade |
| **VO** | "Mình là Penny!" (0.9–1.4s) — giọng nữ trẻ vui tươi, hơi cao, smile-in-voice |
| **SFX** | <ul><li>0.15s: `whoosh_drop.wav` (Penny rơi từ trên)</li><li>0.35s: `cartoon_landing_thump.wav` (tiếng pof dễ thương, không nặng)</li><li>0.9s: `sparkle_shimmer.wav` (3 nốt cao)</li><li>1.0s: `wave_swoosh.wav` mỗi lần vẫy</li></ul> |
| **Music** | Bắt đầu với chord stab F major kèm pluck synth — upbeat từ frame đầu |
| **Transition out** | Penny chỉ tay sang trái khung hình → motion lead vào Scene 2 |

---

### 🎬 Scene 2 — `1.5 → 3.3s` · "Tin nhắn bay tới"

| Yếu tố | Chi tiết |
|---|---|
| **Khung hình** | Penny lùi về 1/3 trái khung, chừa 2/3 phải cho action |
| **Background** | Giữ gradient từ Scene 1, thêm 1 đường motion line nhẹ chạy ngang |
| **Góc quay** | Slight wide hơn, kéo back camera 10% |
| **Camera move** | Camera **pan trái nhẹ** 30 frames theo hướng nhìn của Penny |
| **Penny animation** | <ul><li>1.5–1.7s: Quay đầu sang phải (head turn anim)</li><li>1.7s: Mắt to lên 110%, miệng há nhỏ "ohh"</li><li>2.4s: Khi tin nhắn tới, Penny mở 2 tay đón, hơi nhún xuống</li><li>2.6–3.3s: Penny giữ tin nhắn ở trước ngực, mắt nhìn xuống tò mò, đầu nghiêng 15° trái</li></ul> |
| **UI element bay vào** | <ul><li>1.7s: Bong bóng chat Zalo style — bo góc 16px, viền `#00582A` 2px, background `#FFFFFF`, drop shadow nhẹ — bay từ ngoài mép phải vào</li><li>1.9–2.4s: Bong bóng có trail particle xanh nhỏ + slight bobbing motion (sin wave 8px)</li><li>2.0s: Text trong bong bóng typewriter "ăn trưa 50k" với cursor blink — Manrope Medium 38pt</li><li>2.4s: Bong bóng đáp vào tay Penny, scale 1.1 → 1.0 spring</li></ul> |
| **Text overlay phụ** | Lúc 1.6s ở góc dưới trái: `"Bạn nhắn..."` italic Manrope 24pt, fade in/out 1s |
| **VO** | "Bạn cứ nhắn tự nhiên..." (1.6–3.0s) |
| **SFX** | <ul><li>1.7s: `zalo_chime_2note.wav` (2 nốt sine A5-E6, mimic Zalo, không copyright)</li><li>1.7–2.4s: `whoosh_bubble.wav` trail bay</li><li>2.0–2.4s: 11 lần `keyboard_tap_soft.wav` mỗi ký tự</li><li>2.4s: `bubble_catch.wav` (pop nhẹ khi đáp vào tay)</li></ul> |
| **Music** | Hi-hat 8ths bắt đầu, kick vào downbeat 1.5s |
| **Transition out** | Penny quay đầu nhìn vào camera, hơi nháy mắt → cue Scene 3 |

---

### 🎬 Scene 3 — `3.3 → 5.3s` · "Penny xử lý — Đã ghi"

| Yếu tố | Chi tiết |
|---|---|
| **Khung hình** | Penny lùi về trung tâm, full body, action chính ở giữa khung |
| **Background** | Background subtly chuyển sang vibrant hơn — emerald tint mạnh hơn 10%, có aurora wave nhẹ phía sau |
| **Góc quay** | Medium close-up, chops slightly above Penny's boots — focus vào upper body |
| **Camera move** | Static, chỉ có 1 **micro crash-zoom 1.05x** ở 4.6s khi card xác nhận pop ra |
| **Penny animation** | <ul><li>3.4s: Penny chạm tay vào bong bóng — tia sáng xanh phát ra từ điểm chạm</li><li>3.6–4.4s: Bong bóng từ từ tan thành 5-6 particle xanh xoáy quanh Penny rồi tụ về huy hiệu "P" trên ngực</li><li>4.4s: Huy hiệu "P" phát sáng pulse 3 lần (scale 1.0 → 1.2 → 1.0)</li><li>4.6s: Card xác nhận pop ra từ ngực Penny — green check icon to + text</li><li>4.7–5.0s: Penny cười tươi hơn, đầu lắc nhẹ qua-lại sung sướng (head nod 2 lần)</li><li>5.0–5.3s: Penny giơ ngón cái lên 👍</li></ul> |
| **Card xác nhận** | <ul><li>Hình chữ nhật bo góc 20px, white background, viền `#00582A` 2px, drop shadow lớn</li><li>Layout: ✅ icon trái (kích thước 64px, color `#10B981`)</li><li>Trên: "Đã ghi" — Manrope Bold 32pt, `#1A1A1A`</li><li>Giữa: "Ăn trưa · 50.000đ" — Manrope SemiBold 38pt, `#00582A`</li><li>Dưới: "Danh mục: Ăn uống" — Manrope Medium 22pt, `#666666`</li></ul> |
| **Particle effect** | Confetti pop tại 4.6s: 20 mảnh confetti vàng-xanh-trắng nổ ra hình tròn 360°, gravity nhẹ |
| **VO** | "Penny tự hiểu và ghi lại ngay." (3.7–5.0s) |
| **SFX** | <ul><li>3.4s: `magic_touch_sparkle.wav` (chạm tay)</li><li>3.6–4.4s: `data_swirl.wav` (particle xoáy)</li><li>4.4s: `coin_glow_pulse.wav` × 3 (badge sáng)</li><li>4.6s: `success_chime_2note.wav` (G4→C5 marimba)</li><li>4.6s: `confetti_pop.wav` (subtle pop)</li><li>5.0s: `thumbs_up_blip.wav` (UI blip ngắn)</li></ul> |
| **Music** | Full mix với clap nhẹ at 4.6s — climax đầu tiên |
| **Transition out** | Whip pan từ Penny → quay 180° camera → vào Scene 4 (motion blur 6 frames) |

---

### 🎬 Scene 4 — `5.3 → 6.8s` · "Báo cáo bao quanh Penny"

| Yếu tố | Chi tiết |
|---|---|
| **Khung hình** | Penny giữa khung, các UI element nổi orbital xung quanh |
| **Background** | Chuyển sang darker emerald `#003D1B` với grid lines nhạt + radial light từ Penny |
| **Góc quay** | **Wide medium**, hơi low angle 10° nhìn lên Penny — tạo cảm giác heroic |
| **Camera move** | **Slow orbit** 8° sang phải trong 1.5s (mascot xoay vũ trụ riêng) |
| **Penny animation** | <ul><li>5.3s: Penny appear ở center, hai tay dang rộng nhẹ palm-up</li><li>5.4–6.0s: Penny nhìn quanh các UI element xuất hiện, head turn chậm</li><li>6.0–6.5s: Penny nhìn vào số tổng tiền lớn nhất, hơi mở miệng "ố"</li><li>6.5–6.8s: Penny gật đầu hài lòng + đưa 2 ngón cái 👍👍</li></ul> |
| **UI element orbital** | <ul><li>5.4s: Số tổng "2.450.000đ" — số lớn vàng đậm Manrope Bold 84pt — xuất hiện phía trên đầu Penny, đếm tăng từ 0 với ease-out</li><li>5.6s: 3 bar chart 3D mọc lên từ phía sau Penny — gradient emerald `#00582A → #A7D5B9`, stagger 80ms giữa 3 cột, label nhỏ "Ăn uống · Di chuyển · Mua sắm"</li><li>6.0s: Donut chart vành đai bay vòng quanh Penny ở mặt phẳng ngang — fill 360° trong 600ms</li><li>6.2s: 4 icon nhỏ pop tại 4 góc Penny: 🍜 🛒 🚗 🎬 — bouncing in stagger</li></ul> |
| **Text overlay** | Label "Báo cáo tháng này" ở góc trên trái — Manrope SemiBold 28pt, `#FFFFFF`, slide-in từ trái |
| **VO** | "Báo cáo trực quan, kiểm soát ngân sách dễ dàng." (5.4–6.7s) |
| **SFX** | <ul><li>5.4s: `card_pop.wav` (số xuất hiện)</li><li>5.4–5.9s: `digit_tick.wav` mỗi 60ms khi số đếm — pitched marimba</li><li>5.6s, 5.68s, 5.76s: `bar_blip.wav` × 3 (C5-E5-G5 ascending)</li><li>6.0s: `donut_sweep.wav` (filter sweep 600ms)</li><li>6.2s, 6.25s, 6.3s, 6.35s: 4 lần `icon_pop.wav` micro-pop</li><li>6.5s: `thumbs_double_blip.wav`</li></ul> |
| **Music** | Marimba accent + string swell bắt đầu — đẩy energy lên |
| **Transition out** | Tất cả UI element fly outward về camera, motion blur, **iris-out** xuống tâm Penny → cue Scene 5 |

---

### 🎬 Scene 5 — `6.8 → 8.0s` · "Logo + CTA + Penny vẫy chào tạm biệt"

| Yếu tố | Chi tiết |
|---|---|
| **Khung hình** | Layout chia 2: trái = brand mark, phải = Penny |
| **Background** | Deep emerald gradient radial `#00582A → #003D1B`, có 16 hạt particle vàng-trắng floating chậm tạo galaxy feel |
| **Góc quay** | Flat 2D composition, không depth, brand frame chuẩn |
| **Camera move** | Camera static. Penny + logo có **subtle breath pulse** (scale 1.0 ↔ 1.015, 800ms loop) |
| **Penny animation** | <ul><li>6.8s: Penny slide-in từ giữa sang vị trí 2/3 phải khung hình, scale 0.8 lúc đầu → 1.0</li><li>7.0–7.4s: Đứng yên, breath pulse</li><li>7.4–7.7s: Vẫy tay phải qua-lại 2 lần — wave goodbye</li><li>7.7s: Wink mắt phải (nháy 1 frame nhanh)</li><li>7.8–8.0s: Hold smile pose, breath pulse continue</li></ul> |
| **Logo/brand stack (1/3 trái)** | <ul><li>6.85s: [`logo.png`](frontend/src/assets/logo.png) (head-only mark) scale-in từ 0 → 1.0 spring bounce, kích thước 240px</li><li>7.05s: Wordmark "Penny" type-out chữ-by-chữ bên dưới logo — Manrope ExtraBold 96pt, color `#FFFFFF`</li><li>7.3s: Tagline "Trợ lý chi tiêu trên Zalo" fade in dưới wordmark — Manrope Medium 32pt, opacity 85%</li><li>7.6s: CTA pill "Mở Zalo → tìm Penny" slide-up từ dưới, bg `#FFFFFF`, text `#00582A`, shadow nhẹ, 60px height bo góc đầy đủ</li></ul> |
| **Text overlay** | Đã liệt kê ở khối brand stack bên trên |
| **VO** | "Penny — trợ lý chi tiêu, ngay trên Zalo." (6.9–8.0s) — giọng đầm, hơi smile |
| **SFX** | <ul><li>6.85s: `logo_whoosh_in.wav` (1.2s tail)</li><li>7.05s: `brand_sting_3note.wav` (G-B-D piano + strings, 600ms) — kết bài chính</li><li>7.4–7.6s: 2 lần `wave_swoosh.wav` (Penny vẫy)</li><li>7.6s: `pill_pop.wav` (CTA)</li><li>7.7s: `wink_tink.wav` (tiếng "tink" cute khi nháy)</li><li>8.0s: Music tail pad F major fade 200ms</li></ul> |
| **Transition out** | Cut to black 1 frame, hết video |

---

## 4. Voiceover script đầy đủ

Giọng **nữ trẻ Hà Nội, ấm-vui, smile-in-voice**, không robotic.

| Timecode | Câu thoại | Diễn xuất |
|---|---|---|
| `0.9 – 1.4s` | "Mình là Penny!" | Phấn khích, hơi cao giọng, kéo dài chữ "Penny" 200ms |
| `1.6 – 3.0s` | "Bạn cứ nhắn tự nhiên..." | Mời gọi, treo nhịp |
| `3.7 – 5.0s` | "Penny tự hiểu và ghi lại ngay." | Tự tin, nhấn ở "ngay" |
| `5.4 – 6.7s` | "Báo cáo trực quan, kiểm soát ngân sách dễ dàng." | Đầm, tròn vành |
| `6.9 – 8.0s` | "Penny — trợ lý chi tiêu, ngay trên Zalo." | Kết bài chậm, ấm |

**Tổng**: ~32 từ, ~6.7s active speech.

**Ducking**: music -6 dB khi VO active, SFX không bị duck.

---

## 5. Music composition guide

| Thuộc tính | Giá trị |
|---|---|
| **Style** | Vietnamese fintech-friendly + mascot trailer playful (gợi nhớ Duolingo / Among Us trailer / Vietnamese fintech ad 2024) |
| **Tempo** | 128 BPM (hơi nhanh hơn v1 vì mascot-driven cần energy cao hơn) |
| **Key** | F major (vui tươi) |
| **Instrument stack** | <ul><li>Pluck synth (lead motif, scene 1-3)</li><li>Soft kick + clap (từ scene 2)</li><li>Hi-hat 8ths</li><li>Marimba accent (scene 3-4)</li><li>Brass stab (scene 4 reveal big number)</li><li>String swell + cymbal soft (scene 5 outro)</li><li>Glockenspiel sparkles ngẫu nhiên ở scene 1, 5</li></ul> |
| **Dynamic curve** | <ul><li>0.0–1.5s: Chord stab + pluck, -10 dB</li><li>1.5–3.3s: Beat hoàn chỉnh, -8 dB</li><li>3.3–5.3s: Full mix với marimba, -6 dB peak</li><li>5.3–6.8s: Brass stab + string swell</li><li>6.8–8.0s: Outro pad tail</li></ul> |
| **Reference tracks** | Duolingo "Stay Curious" trailer · Momo "Tết 2024" · Among Us official trailer (energy reference) |

---

## 6. SFX shopping list

| File logic | Mô tả | Nguồn / Cách tạo |
|---|---|---|
| `whoosh_drop.wav` | Whoosh xuống nhanh 400ms | Boom Library hoặc compose |
| `cartoon_landing_thump.wav` | Pof dễ thương khi mascot landing | Sound Ideas cartoon pack |
| `sparkle_shimmer.wav` | 3 nốt cao thuỷ tinh | Glockenspiel + chime layered |
| `wave_swoosh.wav` | Swoosh ngắn cho vẫy tay | Compose: filtered noise burst |
| `zalo_chime_2note.wav` | 2 nốt notification | **Tự tạo**: A5+E6 sine, attack 5ms, reverb light |
| `whoosh_bubble.wav` | Bubble trail bay 700ms | Compose từ filtered air |
| `keyboard_tap_soft.wav` | iOS soft tap | Stock iOS pack |
| `bubble_catch.wav` | Pop khi bubble đáp tay | Compose: muted snare + EQ |
| `magic_touch_sparkle.wav` | Tia magic 300ms | Boom Library magic FX |
| `data_swirl.wav` | Particle xoáy 800ms | Filtered noise sweep + phaser |
| `coin_glow_pulse.wav` | Pulse vàng tròn (×3) | Compose: bell + reverb |
| `success_chime_2note.wav` | G4→C5 marimba | Logic Pro marimba VST |
| `confetti_pop.wav` | Pop nhẹ tổng + paper rustle | Layer 2 samples |
| `card_pop.wav` | UI card pop | UI Pack Premium Beat |
| `digit_tick.wav` | Tick mỗi số đếm | Marimba single muted note |
| `bar_blip.wav` | 3 blip ascending C-E-G | Triangle wave compose |
| `donut_sweep.wav` | Sweep filter rotational | Noise + LFO filter |
| `icon_pop.wav` | Micro pop UI ×4 | Reuse `card_pop.wav` pitched |
| `thumbs_up_blip.wav` | UI blip ngắn 100ms | Pluck synth |
| `thumbs_double_blip.wav` | 2 blip nhanh | Same pitched up |
| `logo_whoosh_in.wav` | Whoosh lớn 1.2s | Boom Library cinematic |
| `brand_sting_3note.wav` | G-B-D piano + strings 600ms | Compose, master -1 dB |
| `pill_pop.wav` | UI pop CTA | Reuse `card_pop.wav` |
| `wink_tink.wav` | "Tink" cute 80ms | Triangle single high note |

Tổng: **24 SFX**. Bus SFX -16 LUFS, true peak ≤ -4 dB.

---

## 7. Asset references

| Asset | Path | Vai trò |
|---|---|---|
| **Mascot Penny full body** | [`frontend/src/assets/happy.png`](frontend/src/assets/happy.png) | Reference chính cho 3D model. Tất cả 5 cảnh. |
| **Logo head only** | [`frontend/src/assets/logo.png`](frontend/src/assets/logo.png) | Scene 5 brand mark |
| **Penny variants có sẵn** | [`penny-happy.png`](frontend/src/assets/penny-happy.png), [`penny-waving.png`](frontend/src/assets/penny-waving.png), [`penny-worried.png`](frontend/src/assets/penny-worried.png), [`penny-robot.png`](frontend/src/assets/penny-robot.png) | Reference expression khi rig animation |
| **Favicon** | [`frontend/public/favicon.png`](frontend/public/favicon.png) | Đồng bộ với logo |

**Quan trọng**: Penny phải giữ **consistency tuyệt đối** xuyên suốt 5 cảnh — cùng kích thước head/body, cùng màu xanh `#5BBA47` của giáp, cùng badge "P" vàng `#FFD700`. Không được biến thể quá nhiều.

---

## 8. Typography

| Vai trò | Font | Weight | Size | Letter-spacing |
|---|---|---|---|---|
| Greeting text (Scene 1) | Manrope Variable | Bold (700) | 64pt | 0 |
| Chat bubble text | Manrope Variable | Medium (500) | 38pt | 0 |
| Card confirm "Đã ghi" | Manrope Variable | Bold (700) | 32pt | 0 |
| Card amount | Manrope Variable | SemiBold (600) | 38pt | 0 |
| Big number (báo cáo) | Manrope Variable | ExtraBold (800) | 84pt tabular-nums | -2% |
| Wordmark "Penny" | Manrope Variable | ExtraBold (800) | 96pt | -1% |
| Tagline | Manrope Variable | Medium (500) | 32pt | +1% |
| CTA pill | Manrope Variable | Bold (700) | 28pt | 0 |

---

## 9. Color palette

| Vai trò | HEX | Sử dụng |
|---|---|---|
| Brand primary | `#00582A` | Theme color (đồng bộ index.html) |
| Penny armor green | `#5BBA47` | Body suit chính của mascot |
| Penny accent dark green | `#2E7D32` | Outline, shadow của giáp |
| Penny helmet light | `#C5E8B7` | Mũ phi hành gia phần sáng |
| Coin gold "P" | `#FFD700` | Badge ngực |
| Brand wash | `#E8F3EC` | Background scene 1-3 |
| Success green | `#10B981` | Check icon scene 3 |
| Background scene 4 | `#003D1B` | Dark emerald sau khi orbit |
| Background scene 5 | gradient `#00582A → #003D1B` | Outro |
| Text primary | `#1A1A1A` | Mọi text trên light bg |
| Text on dark | `#FFFFFF` | Scene 4-5 |
| Soft shadow | `rgba(0,0,0,0.15)` | Drop shadow toàn bộ UI |

---

## 10. Technical export specs

| Trường | Giá trị |
|---|---|
| Resolution | 1920 × 1080 (16:9 landscape) |
| Frame rate | 30 fps |
| Codec | H.264 High profile, CRF 18 |
| Bitrate | ~12 Mbps target |
| Audio | AAC 320 kbps, 48 kHz stereo |
| Color space | Rec. 709, sRGB output |
| Loudness | -14 LUFS integrated |
| True peak | ≤ -1 dBTP |
| Duration | 8.000 giây ± 1 frame |
| Container | MP4 |
| File name | `penny-teaser-mascot-8s-v2.mp4` |

**Variants xuất kèm**:
- `penny-teaser-mascot-8s-square-1080x1080.mp4` — feed cropping
- `penny-teaser-mascot-8s-vertical-1080x1920.mp4` — TikTok/Reels (re-frame mascot center)
- `penny-teaser-mascot-8s-no-vo.mp4` — bản không VO để add caption ngôn ngữ khác

---

## 11. SRT subtitle

```
1
00:00:00,900 --> 00:00:01,400
Mình là Penny!

2
00:00:01,600 --> 00:00:03,000
Bạn cứ nhắn tự nhiên...

3
00:00:03,700 --> 00:00:05,000
Penny tự hiểu và ghi lại ngay.

4
00:00:05,400 --> 00:00:06,700
Báo cáo trực quan, kiểm soát ngân sách dễ dàng.

5
00:00:06,900 --> 00:00:08,000
Penny — trợ lý chi tiêu, ngay trên Zalo.
```

---

## 12. Production checklist

- [ ] Build 3D mascot rig từ reference [`happy.png`](frontend/src/assets/happy.png) — recommend **Blender + Grease Pencil** hoặc **Cinema 4D + Octane**
- [ ] Pose library: idle, wave, point, surprise, thumbs-up, wink, jump, catch
- [ ] Render mascot ở 30fps với alpha channel
- [ ] Mockup UI elements (chat bubble, card xác nhận, bar chart, donut) bằng After Effects
- [ ] Compose music 8s — thuê freelancer hoặc dùng AIVA / Soundraw / Suno (license commercial)
- [ ] Record VO talent nữ Hà Nội ấm — 1 giờ studio ~1 triệu, 3-5 takes
- [ ] Sound design: gom 24 SFX, mix bus, layering
- [ ] Composite final trong AE: mascot + UI + text + bg
- [ ] Color grade pass — Rec 709
- [ ] Master audio -14 LUFS, true peak -1 dBTP
- [ ] Export 4 variants
- [ ] QA: xem trên 4K display, mobile, có/không speaker

---

## 13. AI generation prompts — Production-ready (16:9)

### 13.1 Prompt tạo ảnh frame mở đầu — Mascot hero pose

**Cho Scene 1 hero still hoặc poster key visual.**

#### 🇬🇧 English prompt (Midjourney V7 / Flux Pro / DALL·E 3 / Ideogram 3)

```
A cheerful chibi-style 3D mascot character named Penny, standing
centered in a 16:9 landscape composition with negative space on both
sides. The mascot has a big rounded head (about half the body size),
wearing a light-green astronaut-style dome helmet with two thin
antennae topped with small yellow ball tips, large dark-emerald
headphones on the sides, a cream-white round face with huge glossy
green eyes with bright highlights, small pink blush cheeks, and an
open happy smile showing a pink tongue. The body wears emerald-green
and white armor — green chest plate with a glowing gold round coin
badge featuring the letter "P" in the center, white belly section,
green articulated arms with darker green gloves, white thighs, and
chunky dark-green boots. Pose: standing confidently, slight side
weight, right arm raised in a friendly wave. Style: polished Pixar/
Riot Games mascot trailer, 3D soft cel-shading with thin clean
outline, glossy highlights, soft rim light. Background: soft off-
white #FAFAF8 fading to emerald wash #E8F3EC at edges with floating
yellow and green sparkle particles. Mood: friendly, optimistic,
trustworthy fintech mascot. Photorealistic CGI render quality,
4K detail, sharp focus on the mascot. No text, no UI, no extra
characters.

--ar 16:9 --style raw --v 7 --quality 2 --stylize 300
```

**Negative**: `human, person, hands, realistic skin, dark, scary, lowres, watermark, text, multiple characters, anime style 2D flat, harsh shadows, photographic real-world setting`

#### 🇻🇳 Vietnamese prompt (cho Veo / Flux finetune VN)

```
Nhân vật mascot 3D chibi tên Penny đứng giữa khung 16:9, đầu lớn
~1/2 chiều cao thân, đội mũ phi hành gia xanh lá nhạt vòm cong với
2 ăng-ten đầu vàng tròn, đeo tai nghe xanh emerald đậm 2 bên, khuôn
mặt tròn cream-trắng với đôi mắt to xanh lá long lanh có highlight
sáng, má hồng phấn nhỏ, miệng cười mở thấy lưỡi hồng. Thân mặc giáp
xanh emerald + trắng — ngực có huy hiệu đồng xu vàng tròn phát sáng
chữ "P" giữa, bụng trắng, tay xanh khớp với găng tay xanh đậm, đùi
trắng, boots xanh đậm chunky. Tư thế: đứng tự tin, hơi nghiêng một
bên, tay phải giơ vẫy chào thân thiện. Phong cách: trailer mascot
kiểu Pixar / Riot Games, 3D cel-shading mềm với outline mỏng sạch,
highlight bóng, rim light mềm. Hậu cảnh: off-white #FAFAF8 fade ra
emerald #E8F3EC ở rìa kèm particle sparkle vàng-xanh floating. Cảm
xúc: thân thiện, lạc quan, đáng tin (mascot fintech). Render CGI
chất lượng cao 4K, focus rõ. Không chữ, không UI, không nhân vật phụ.

Tỉ lệ 16:9 · Style raw cinematic mascot
```

#### Tham số theo tool

| Tool | Tham số |
|---|---|
| **Midjourney V7** | `--ar 16:9 --style raw --v 7 --quality 2 --stylize 300` |
| **Flux Pro 1.1** | `aspect_ratio: 16:9`, `output_quality: 95`, `prompt_strength: 0.9` |
| **DALL·E 3** | size `1792x1024`, style `vivid`, quality `hd` |
| **Ideogram 3** | aspect `16:9`, magic prompt `off`, style `3d` |
| **SDXL + Pixar LoRA** | `1920x1080`, sampler `dpmpp_2m_sde`, steps `35`, CFG `6` |

**Tip**: nếu output sai design → upload [`happy.png`](frontend/src/assets/happy.png) làm image reference (MJ `--cref`, Flux ref-image, Ideogram remix). Đảm bảo style consistency.

---

### 13.2 Prompt tạo video 8 giây — Mascot-driven

**Cho Sora 2 / Veo 3 / Kling 2.5 / Runway Gen-4 / Luma Ray 2.**

#### 🇬🇧 English prompt — bản đầy đủ

```
An 8-second 16:9 1920x1080 30fps cinematic ad featuring "Penny" — a
chibi 3D mascot. Penny has a light-green astronaut dome helmet with
two antennae topped with yellow balls, emerald headphones, big glossy
green eyes, pink blushed cheeks, an open happy smile, emerald-green
and white armor body with a glowing gold "P" coin badge on the chest,
and chunky green boots. Style: Pixar / Riot Games mascot trailer,
3D soft cel-shading with thin clean outlines, glossy highlights,
warm rim light. Audio: on.

[0.0–1.5s] Centered 16:9 frame, background gradient off-white center
to soft emerald wash at edges with floating sparkle particles. A
bright streak drops from above, Penny lands with a squash-and-
stretch bounce, dust puff at feet, looks up with sparkling eyes,
then waves right hand twice with a big smile. Text appears on the
right third: "Xin chào, mình là Penny!" in bold sans-serif.

[1.5–3.3s] Penny shifts to left third of frame. A Zalo-style green
chat bubble flies in from off-screen right with a particle trail,
typewriter-effect text reads "ăn trưa 50k". Penny tilts head
curiously, eyes track the bubble, then catches it in both palms.

[3.3–5.3s] Penny taps the bubble — it dissolves into emerald
particles that swirl around Penny and absorb into the glowing gold
"P" coin badge on the chest. The badge pulses three times. A clean
white confirmation card pops from the chest: a green check icon,
"Đã ghi" headline, "Ăn trưa · 50.000đ" amount, "Danh mục: Ăn uống"
subtitle. Confetti pops around. Penny grins, nods, and gives a
thumbs up.

[5.3–6.8s] Whip-pan into a darker emerald scene. Slight low-angle
hero shot of Penny center frame with arms slightly spread. A huge
yellow number "2.450.000đ" counts up from zero above Penny's head.
Three 3D bar chart bars rise from the floor behind Penny in an
emerald gradient, labeled "Ăn uống · Di chuyển · Mua sắm". A donut
chart ring fills 360° orbiting around Penny at waist height. Four
small icons pop at the corners around Penny: 🍜 🛒 🚗 🎬. Penny
looks around amazed, then gives a double thumbs up.

[6.8–8.0s] Iris-out to a deep emerald gradient background
(#00582A → #003D1B) with floating gold-white particles. Penny
slides to the right third of the frame. On the left third: the
circular Penny logo head scales in with spring bounce, then the
wordmark "Penny" types out below in bold white, then the tagline
"Trợ lý chi tiêu trên Zalo" fades in, then a white pill CTA
button slides up reading "Mở Zalo → tìm Penny". Penny waves
goodbye twice and winks.

Color palette: emerald #00582A, mascot green #5BBA47, gold #FFD700,
off-white #FAFAF8, deep emerald #003D1B. Typography: Manrope-like
geometric bold sans-serif.

Audio: warm playful music at 128 BPM in F major with plucked synth,
soft kick, hi-hat, marimba accents, brass stab on the big number,
brand sting on the logo reveal. SFX: cartoon landing thump, sparkle
shimmer, whoosh, soft typing taps, two-note success chime, confetti
pop, data swirl, counting tick, donut sweep, logo whoosh, three-note
brand sting. Vietnamese female voiceover, warm young Hanoi accent
with smile-in-voice:
"Mình là Penny! Bạn cứ nhắn tự nhiên... Penny tự hiểu và ghi lại
ngay. Báo cáo trực quan, kiểm soát ngân sách dễ dàng. Penny — trợ
lý chi tiêu, ngay trên Zalo."

No humans visible, no human hands. Only the mascot. No watermark,
no copyrighted logos beyond Penny's own. 16:9 aspect ratio.
```

#### 🇻🇳 Vietnamese prompt — bản đầy đủ

```
Quảng cáo 8 giây 16:9 1920x1080 30fps với nhân vật mascot "Penny"
— chibi 3D. Penny đội mũ phi hành gia xanh lá nhạt vòm cong, 2 ăng-
ten đầu vàng tròn, tai nghe emerald đậm, mắt to xanh lá long lanh,
má hồng, miệng cười mở, thân mặc giáp xanh emerald + trắng với huy
hiệu đồng xu vàng "P" phát sáng trên ngực, boots xanh đậm chunky.
Phong cách: trailer mascot kiểu Pixar / Riot Games, 3D cel-shading
mềm với outline mỏng, highlight bóng, rim light ấm. Âm thanh: bật.

[0.0–1.5s] Khung 16:9 giữa, background gradient off-white tâm fade
ra emerald nhẹ ở rìa với hạt sparkle bay. Tia sáng vàng rơi từ trên
xuống, Penny đáp đất với squash-stretch bounce, bụi puff dưới chân,
ngước lên mắt long lanh, vẫy tay phải 2 lần kèm cười tươi. Text bên
phải khung: "Xin chào, mình là Penny!" sans-serif bold.

[1.5–3.3s] Penny lùi về 1/3 trái khung. Một bong bóng chat Zalo xanh
bay từ ngoài phải vào kèm trail particle, typewriter text "ăn trưa
50k". Penny nghiêng đầu tò mò, mắt theo dõi, rồi đón bong bóng bằng
2 lòng bàn tay.

[3.3–5.3s] Penny chạm vào bong bóng — bong bóng tan thành particle
emerald xoáy quanh Penny rồi hút vào huy hiệu "P" vàng trên ngực.
Huy hiệu pulse 3 lần. Card xác nhận trắng pop ra từ ngực: icon check
xanh, "Đã ghi" headline, "Ăn trưa · 50.000đ" amount, "Danh mục: Ăn
uống" subtitle. Confetti pop xung quanh. Penny cười tươi, gật đầu,
giơ ngón cái 👍.

[5.3–6.8s] Whip-pan sang cảnh emerald đậm hơn. Low-angle hơi heroic,
Penny giữa khung tay hơi dang rộng. Số vàng lớn "2.450.000đ" đếm từ
0 lên phía trên đầu Penny. 3 bar chart 3D mọc lên từ sàn sau Penny
với gradient emerald, label "Ăn uống · Di chuyển · Mua sắm". Donut
chart ring fill 360° bay vòng quanh Penny ở thắt lưng. 4 icon nhỏ
pop ở 4 góc: 🍜 🛒 🚗 🎬. Penny nhìn quanh, sau đó giơ 2 ngón cái 👍👍.

[6.8–8.0s] Iris-out vào nền gradient emerald đậm (#00582A → #003D1B)
với particle vàng-trắng floating. Penny slide sang 1/3 phải khung.
Bên trái: logo head Penny scale-in spring bounce, wordmark "Penny"
type-out bold trắng phía dưới, tagline "Trợ lý chi tiêu trên Zalo"
fade in, CTA pill trắng "Mở Zalo → tìm Penny" slide-up. Penny vẫy
tay tạm biệt 2 lần và wink mắt.

Bảng màu: emerald #00582A, mascot green #5BBA47, gold #FFD700,
off-white #FAFAF8, deep emerald #003D1B. Typography: Manrope bold
sans-serif hình học.

Âm thanh: nhạc vui ấm 128 BPM F major với pluck synth, kick mềm,
hi-hat, marimba accent, brass stab khi số lớn xuất hiện, brand sting
khi logo. SFX: cartoon landing thump, sparkle shimmer, whoosh,
typing taps, 2 nốt chime success, confetti pop, data swirl, counting
tick, donut sweep, logo whoosh, 3 nốt brand sting. Voiceover nữ Hà
Nội ấm trẻ, smile-in-voice:
"Mình là Penny! Bạn cứ nhắn tự nhiên... Penny tự hiểu và ghi lại
ngay. Báo cáo trực quan, kiểm soát ngân sách dễ dàng. Penny — trợ
lý chi tiêu, ngay trên Zalo."

KHÔNG có người, KHÔNG có tay người. Chỉ có mascot. Không watermark,
không logo bản quyền khác. Tỉ lệ 16:9.
```

#### Tham số theo tool

| Tool | Tham số gợi ý |
|---|---|
| **Sora 2** | `duration: 8s`, `aspect_ratio: 16:9`, `resolution: 1080p`, `quality: high`, audio `on`, motion `medium-high` |
| **Veo 3** | `duration: 8`, `aspectRatio: "16:9"`, `personGeneration: "dont_allow"` (rất quan trọng — chặn người xuất hiện), `enableAudio: true`. Veo 3 hỗ trợ VO tiếng Việt. |
| **Kling 2.5** | `mode: pro`, `duration: 10s` (trim về 8s), `aspect: 16:9`, motion `high`, prompt enhancer `on`, **image reference**: upload [`happy.png`](frontend/src/assets/happy.png) để khóa design mascot |
| **Runway Gen-4** | `seconds: 8`, `ratio: 1920:1080`, motion `7`. Strongly recommend **image-to-video** mode: gen ảnh hero trước (prompt 13.1), rồi feed vào Runway với prompt motion |
| **Luma Ray 2** | `aspect_ratio: 16:9`, `duration: 9s`, `keyframe`: upload [`happy.png`](frontend/src/assets/happy.png) làm starting frame |
| **Pika 2.2** | `aspect_ratio: 16:9`, motion `2`, fps `30` |

---

### 13.3 Workflow đề xuất

```
   ┌──────────────────────────────────────────────────────────────┐
   │ Step 1: Generate hero still với prompt 13.1                  │
   │   → Midjourney V7 với --cref = happy.png (lock design)      │
   │   → 5-10 retry, pick frame ưng ý, upscale 4K                │
   │   → Lưu thành penny-hero-frame.png                          │
   └──────────────────────────────────────────────────────────────┘
                              ↓
   ┌──────────────────────────────────────────────────────────────┐
   │ Step 2: Generate Scene 1 motion từ hero still (image-to-video)│
   │   → Runway Gen-4 hoặc Kling 2.5 image-to-video, 2s          │
   │   → Prompt: "mascot Penny bounces in with squash and stretch"│
   └──────────────────────────────────────────────────────────────┘
                              ↓
   ┌──────────────────────────────────────────────────────────────┐
   │ Step 3: Render Scene 2-4 trong After Effects                 │
   │   → Import mascot PNG sequence (đã gen từ tool 3D hoặc AI)  │
   │   → Mockup UI bằng tay → chữ tiếng Việt chắc chắn nét       │
   │   → Layer mascot + chat bubble + card + bar chart           │
   └──────────────────────────────────────────────────────────────┘
                              ↓
   ┌──────────────────────────────────────────────────────────────┐
   │ Step 4: Generate Scene 5 với prompt riêng                    │
   │   → AE manual composition + logo motion                      │
   │   → Hoặc Runway gen-4 với prompt logo + mascot wave         │
   └──────────────────────────────────────────────────────────────┘
                              ↓
   ┌──────────────────────────────────────────────────────────────┐
   │ Step 5: Edit + audio mix trong Premiere/Resolve              │
   │   → Ghép 4 segments theo timecode Section 3                  │
   │   → Layer VO + 24 SFX + music theo Section 5-6              │
   │   → Master -14 LUFS, export H.264 16:9 1920x1080 30fps      │
   └──────────────────────────────────────────────────────────────┘
```

**Ngân sách dự kiến**: ~$10-20 AI compute + 6-8 giờ dựng + $80-150 VO talent.

> **Lưu ý quan trọng**: text-to-video model hiện chưa render chữ tiếng Việt
> có dấu đẹp trong UI bong bóng/card. **Đừng tin** vào VO/text từ AI gen
> — thay vào đó render UI text trong AE và VO record riêng.

---

### 13.4 Prompt rút gọn (khi tool giới hạn ký tự)

#### Ảnh mascot hero — short

```
Chibi 3D mascot Penny: light-green astronaut helmet with 2 antennae
yellow balls, emerald headphones, big glossy green eyes, pink cheeks,
happy open smile, emerald+white armor body, gold "P" coin badge on
chest, green chunky boots. Standing centered, waving right hand,
friendly pose. Pixar/Riot Games mascot style, 3D cel-shading,
glossy highlights, soft rim light. Background: off-white #FAFAF8 to
emerald #E8F3EC gradient with sparkles. No humans, no text. 16:9,
4K, sharp focus. --ar 16:9 --v 7 --style raw
```

#### Video 8s mascot — short

```
8-second 16:9 mascot trailer for "Penny" Vietnamese spending assistant.
Chibi 3D mascot with green astronaut helmet, emerald armor, gold "P"
badge. (0-1.5s) bounces in, waves. (1.5-3.3s) green Zalo chat bubble
flies in saying "ăn trưa 50k", Penny catches it. (3.3-5.3s) Penny
absorbs message into chest badge, confirmation card pops with green
check "Đã ghi · Ăn trưa: 50.000đ", confetti, thumbs up. (5.3-6.8s)
big number 2.450.000đ counts up, bar chart and donut chart orbit
Penny, double thumbs up. (6.8-8.0s) emerald gradient bg, Penny waves
goodbye next to "Penny — Trợ lý chi tiêu trên Zalo" wordmark and
white CTA pill. Pixar/Riot Games style, playful music 128 BPM F major,
Vietnamese female warm VO. No humans visible. 16:9, 30fps, audio on.
```

---

## 14. Variants tương lai

| Variant | Thời lượng | Idea |
|---|---|---|
| 15s | + scene quét hóa đơn | TikTok ad |
| 30s | + scene set ngân sách + persona switch | YouTube pre-roll |
| 6s bumper | chỉ Scene 5 | YouTube bumper |
| Sticker Zalo | tách pose Penny | Mascot Zalo sticker pack 6 emote |
| 9:16 cho social | re-frame mascot center | Reels/TikTok/Zalo Story |

---

**Phiên bản**: v2.0 · `2026-05-17` (mascot-only, no humans, 16:9)
**Path**: [`VIDEO_SCRIPT_8S.md`](VIDEO_SCRIPT_8S.md)
