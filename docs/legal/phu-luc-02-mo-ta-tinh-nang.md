# PHỤ LỤC 02
# BẢN MÔ TẢ TÍNH NĂNG SẢN PHẨM PENNY BOT

*Kèm theo Văn bản công bố phát hành sản phẩm Penny Bot số 01/CBPH-PB/2026
ngày 20 tháng 05 năm 2026*

---

## I. TỔNG QUAN SẢN PHẨM

**Penny Bot** (tên thương mại: *Penny – Trợ lý chi tiêu*) là phần mềm trợ lý ảo có khả năng xử lý ngôn ngữ tự nhiên tiếng Việt, hoạt động trên nền tảng **Zalo Bot Platform** (`bot-api.zaloplatforms.com`). Sản phẩm cho phép người dùng ghi chép, theo dõi, tổng hợp và phân tích các khoản thu chi cá nhân hàng ngày thông qua tin nhắn văn bản, hình ảnh hoặc tài liệu PDF.

Bên cạnh giao diện hội thoại trên Zalo, Penny Bot cung cấp **bảng điều khiển web** (Dashboard) tại `https://pennybot.vn` cho phép người dùng quản lý chi tiêu, xem báo cáo, đặt ngân sách và cấu hình bot.

Sản phẩm không phải là tổ chức tín dụng, công ty chứng khoán, đơn vị tư vấn đầu tư hoặc tổ chức cung cấp dịch vụ thanh toán. Tất cả thông tin do người dùng nhập vào hoặc do hệ thống tổng hợp chỉ mang tính chất tham khảo, hỗ trợ người dùng quan sát thói quen tài chính cá nhân.

---

## II. NHÓM CHỨC NĂNG CHÍNH

### A. Ghi chép giao dịch qua tin nhắn văn bản

Người dùng có thể nhắn tin trực tiếp cho Penny Bot trên Zalo bằng ngôn ngữ tự nhiên tiếng Việt. Hệ thống tự động phân tích nội dung tin nhắn, trích xuất thông tin giao dịch và lưu vào cơ sở dữ liệu.

**Khả năng phân tích đơn vị tiền tệ Việt Nam:**

| Cú pháp nhập | Diễn giải | Ví dụ |
|---|---|---|
| `<số>k` | Nghìn đồng | "50k" → 50.000 đ |
| `<số>00` ở cuối | Nghìn đồng | "5000" → 5.000 đ (số có 5+ chữ số coi là đồng) |
| `<số>tr` / `<số> triệu` | Triệu đồng | "2tr" → 2.000.000 đ |
| `<số>cu` / `<số> củ` | Triệu đồng | "1 củ" → 1.000.000 đ |
| `<số> nghìn` / `<số> ngàn` | Nghìn đồng | "200 nghìn" → 200.000 đ |
| `<số>đ` / `<số> đồng` | Đồng | "500đ" → 500 đ |

**Ví dụ tin nhắn được hỗ trợ:**
- "ăn trưa 50k" → giao dịch 50.000 đ, danh mục *Ăn uống*
- "grab về nhà 45k" → giao dịch 45.000 đ, danh mục *Di chuyển*
- "cà phê 30k, bánh mì 25k" → tách thành 2 giao dịch riêng
- "đổ xăng 1tr2" → giao dịch 1.200.000 đ, danh mục *Di chuyển*

**Quy trình xử lý:**

1. Tin nhắn được kiểm tra rate limit (chống lạm dụng) và loại bỏ trùng lặp.
2. Hệ thống ưu tiên nhận diện bằng các quy tắc cục bộ (regex). Nếu không chắc chắn, tin nhắn được gửi tới mô hình trí tuệ nhân tạo (xem Mục III) để phân tích ý định.
3. Mô hình AI trả về dữ liệu có cấu trúc gồm: số tiền, mô tả, danh mục, ngày giao dịch.
4. Bản ghi giao dịch (Transaction) được lưu vào cơ sở dữ liệu với trường `source = TEXT`.
5. Bot phản hồi lại người dùng nội dung xác nhận theo phong cách (Persona) mà người dùng đã chọn.

**Danh mục giao dịch chuẩn:** Ăn uống, Di chuyển, Mua sắm, Giải trí, Hóa đơn, Sức khỏe, Giáo dục, Nhà cửa, Khác.

### B. Quét và ghi giao dịch từ hóa đơn (OCR)

Người dùng có thể gửi cho Penny Bot **ảnh chụp hóa đơn** (JPEG, PNG) hoặc **file PDF hóa đơn**. Hệ thống tự động đọc nội dung hóa đơn và tạo bản ghi giao dịch.

**Định dạng và giới hạn:**
- Định dạng ảnh: JPEG, PNG.
- Định dạng tài liệu: PDF.
- Dung lượng tối đa: 15 MB cho mỗi file.

**Quy trình xử lý:**

1. **Tải xuống và kiểm tra tệp**: Bot tải file từ Zalo CDN, kiểm tra kích thước, định dạng.
2. **Phòng chống trùng lặp**: Hệ thống tính mã băm SHA-256 của tệp. Nếu cùng người dùng đã từng gửi file giống hệt trong quá khứ, bot thông báo "Hoá đơn này đã được ghi" và không tạo giao dịch trùng.
3. **Phát hiện hoá đơn nhiều trang**: Nếu trong vòng 5 phút người dùng gửi nhiều ảnh hoá đơn cùng một cửa hàng, hệ thống gộp các trang lại thành một giao dịch tổng hợp.
4. **Trích xuất nội dung (OCR)**: Tệp được gửi tới mô hình thị giác máy tính Gemini để trích xuất:
   - Tên cửa hàng / nhà cung cấp
   - Ngày giao dịch
   - Tổng tiền
   - Danh mục chi tiêu
   - Số lượng món hàng (ước lượng)
   - Độ tin cậy (confidence score)
5. **Lưu trữ**:
   - Bản ghi `Receipt` lưu URL tệp, loại tệp, mã băm.
   - Bản ghi `Transaction` liên kết với `Receipt`, ghi `source = IMAGE` hoặc `source = PDF`.
6. **Phản hồi**: Bot xác nhận lại nội dung đọc được, mời người dùng kiểm tra và chỉnh sửa nếu cần.

**Trường hợp đặc biệt:**
- Nếu không trích xuất được tổng tiền hoặc ngày, bot yêu cầu người dùng chụp lại hoặc nhập thủ công.
- Nếu hoá đơn quá mờ hoặc không phải hoá đơn hợp lệ, bot báo lỗi.

### C. Truy vấn lịch sử và xóa giao dịch qua chat

Người dùng có thể tương tác với dữ liệu giao dịch của mình hoàn toàn qua hội thoại:

- **Liệt kê giao dịch**: "cho tôi xem chi tiêu hôm nay", "tuần này tôi đã chi gì".
- **Xóa giao dịch**: "xóa cái cà phê 30k vừa nãy", "xóa giao dịch hôm qua".
- **Tìm kiếm**: "tổng chi tiêu cho ăn uống tháng này", "hôm 15/05 tôi tiêu bao nhiêu".

Hệ thống AI phân tích ý định (`intent`) trong tin nhắn rồi thực hiện thao tác phù hợp trên cơ sở dữ liệu. Khi xác định ý định *Xóa* (`DELETE`), bot yêu cầu xác nhận trước khi thực thi.

### D. Báo cáo và phân tích chi tiêu

Người dùng có thể yêu cầu báo cáo qua chat ("cho tôi xem báo cáo tuần này") hoặc xem báo cáo trực quan trên Dashboard.

**Nội dung báo cáo:**
- Tổng chi tiêu theo ngày, tuần, tháng hoặc khoảng thời gian tuỳ chọn.
- Phân tích chi tiêu theo từng danh mục (biểu đồ tròn).
- So sánh với hạn mức ngân sách (nếu đã đặt).
- Liệt kê các giao dịch lớn nhất, danh mục chi nhiều nhất.
- Xu hướng chi tiêu so với kỳ trước.

### E. Quản lý ngân sách

Người dùng có thể thiết lập **hạn mức chi tiêu** theo tuần hoặc theo tháng tại Dashboard.

**Cơ chế hoạt động:**
- Mỗi người dùng có thể đặt một hạn mức ngân sách hàng tháng (đơn vị: VNĐ).
- Hệ thống tự động tính tổng chi tiêu trong kỳ và so sánh với hạn mức.
- Khi mức chi vượt ngưỡng cảnh báo (ví dụ 80%), bot có thể gửi thông báo nhắc nhở qua Zalo.
- Người dùng có thể điều chỉnh hoặc xóa hạn mức bất kỳ lúc nào.

### F. Cá nhân hoá Penny (Persona)

Người dùng có thể tuỳ chỉnh **phong cách giao tiếp** của bot trên Dashboard. Có 5 phong cách (Persona) được định nghĩa sẵn:

| Persona | Mô tả |
|---|---|
| `FRIEND` *(Bạn thân)* | Thoải mái, thân mật, dùng từ ngữ gần gũi |
| `ASSISTANT` *(Trợ lý)* | Chuyên nghiệp, lịch sự, đi thẳng vào vấn đề |
| `HOMEMAKER` *(Nội trợ)* | Tiết kiệm, thực tế, gợi ý về quản lý chi phí gia đình |
| `COACH` *(Huấn luyện viên)* | Kỷ luật, khuyến khích đặt mục tiêu tài chính |
| `COMEDIAN` *(Hài hước)* | Vui nhộn, dí dỏm, dùng emoji nhiều |

Bốn tham số bổ trợ (mỗi tham số có thang điểm 1-5):
- `tease` – mức độ trêu đùa
- `serious` – mức độ nghiêm túc
- `frugal` – mức độ khuyên tiết kiệm
- `emoji` – mật độ sử dụng emoji

Người dùng cũng có thể đặt **tên xưng hô** (displayName) để bot gọi (ví dụ "Anh", "Chị", "Em").

### G. Bảng điều khiển web (Dashboard)

Dashboard tại `https://pennybot.vn/dashboard` cung cấp các trang sau cho người dùng đã đăng ký:

| Trang | Chức năng |
|---|---|
| **Trang chủ** | Tổng quan chi tiêu hôm nay/tuần/tháng, biểu đồ ngân sách, giao dịch gần đây, video giới thiệu |
| **Giao dịch** | Danh sách phân trang toàn bộ giao dịch, lọc theo danh mục/thời gian, chỉnh sửa, xóa |
| **Báo cáo** | Phân tích chi tiết theo thời gian và danh mục, biểu đồ trực quan |
| **Cài đặt** | Kết nối/ngắt kết nối bot Zalo, đặt ngân sách, tuỳ chỉnh Persona, đổi mật khẩu |
| **Liên hệ** | Kênh hỗ trợ khách hàng, thông tin doanh nghiệp |

### H. Khu vực quản trị viên (Admin)

Khu vực `/admin` chỉ truy cập được với tài khoản có quyền **ADMIN**. Quản trị viên có các nhóm chức năng sau:

- **Tổng quan**: thống kê người dùng, số gói đang hoạt động, doanh thu theo tháng.
- **Người dùng**: tìm kiếm, khoá / mở khoá tài khoản, xem chi tiết hoạt động, nâng cấp / hạ cấp gói thủ công.
- **Gói dịch vụ**: tạo, sửa, ngừng kích hoạt các gói trả phí.
- **Thanh toán**: tra cứu lịch sử thanh toán, đối soát với cổng SePay.
- **Thông báo**: soạn và gửi broadcast tới một nhóm người dùng (toàn bộ, đang trả phí, v.v.).
- **Nhật ký kiểm toán (Audit Log)**: ghi lại mọi hành động của quản trị viên (khoá tài khoản, đổi vai trò, sửa gói, v.v.) phục vụ truy vết và tuân thủ.

Mọi hành động ghi/sửa/xóa do quản trị viên thực hiện đều được ghi nhật ký kèm: thời điểm, danh tính quản trị viên, đối tượng tác động, lý do (nếu có).

---

## III. CÔNG NGHỆ TRÍ TUỆ NHÂN TẠO ĐƯỢC SỬ DỤNG

Sản phẩm sử dụng mô hình ngôn ngữ lớn **Google Gemini** (phiên bản `gemini-2.5-flash-lite`) được truy cập thông qua proxy API. Mục đích sử dụng:

1. **Phát hiện ý định người dùng** (`intent detection`): xác định người dùng muốn ghi chi tiêu, xóa, xem báo cáo hay trò chuyện.
2. **Trích xuất giao dịch** từ tin nhắn văn bản tự do thành dữ liệu có cấu trúc (JSON).
3. **Đọc hóa đơn** (OCR): trích xuất nội dung từ ảnh hoặc PDF.
4. **Trả lời hội thoại tự do**: khi người dùng hỏi câu hỏi không liên quan trực tiếp đến chi tiêu, bot trả lời theo phong cách Persona đã chọn.
5. **Tra cứu thông tin cập nhật**: khi câu hỏi yêu cầu dữ liệu thời gian thực (giá vàng, tỷ giá, thời tiết...), bot kích hoạt công cụ tìm kiếm Google tích hợp trong Gemini.

**Dữ liệu được gửi tới Gemini:**
- Nội dung tin nhắn của người dùng.
- Lịch sử hội thoại tối đa 10 tin nhắn gần nhất (để giữ ngữ cảnh).
- Khi có hoá đơn: dữ liệu nhị phân của ảnh / PDF được mã hoá base64.

**Dữ liệu KHÔNG được gửi tới Gemini:**
- Mật khẩu, JWT token, khoá bí mật hệ thống.
- Thông tin thẻ ngân hàng, tài khoản thanh toán.
- Mã định danh nội bộ của hệ thống (cuid, hash).

Do hạ tầng Gemini do Google vận hành (có thể đặt máy chủ ngoài lãnh thổ Việt Nam), việc sử dụng dịch vụ này được khai báo và xử lý theo quy định về **chuyển dữ liệu cá nhân xuyên biên giới** tại Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15 và Nghị định 356/2025/NĐ-CP. Người dùng được thông báo và đồng ý về việc này trong Điều khoản sử dụng (Phụ lục 04).

---

## IV. NGÔN NGỮ VÀ KHU VỰC CUNG CẤP

- **Ngôn ngữ giao diện chính**: Tiếng Việt.
- **Tiền tệ**: Đồng Việt Nam (VNĐ).
- **Múi giờ**: UTC+7 (giờ Việt Nam).
- **Phạm vi cung cấp**: Người dùng tại Việt Nam có tài khoản Zalo hợp lệ.

---

## V. GIỚI HẠN DỊCH VỤ

1. Penny Bot chỉ cung cấp công cụ ghi nhận và tổng hợp thông tin tài chính cá nhân. Các báo cáo, gợi ý hoặc phản hồi chỉ có giá trị **tham khảo**.
2. Penny Bot **không phải** là tổ chức tín dụng, công ty chứng khoán, công ty bảo hiểm, đơn vị tư vấn đầu tư, đơn vị tư vấn tài chính chuyên nghiệp hoặc tổ chức cung cấp dịch vụ thanh toán độc lập.
3. Penny Bot **không cam kết** mức tiết kiệm, mức lợi nhuận, hiệu quả đầu tư hoặc kết quả tài chính cụ thể cho người dùng.
4. Người dùng tự chịu trách nhiệm về tính chính xác của dữ liệu mình nhập vào.
5. Dịch vụ có thể tạm ngừng hoặc chậm trễ do sự cố trên nền tảng Zalo, sự cố trên dịch vụ AI Gemini, hoặc các yếu tố bất khả kháng khác nằm ngoài tầm kiểm soát hợp lý của đơn vị vận hành.
6. Các tính năng có thể được bổ sung, thay đổi hoặc loại bỏ trong các phiên bản tiếp theo. Mỗi thay đổi quan trọng sẽ được thông báo qua Dashboard, qua Zalo OA hoặc qua email người dùng đã đăng ký.

---

## VI. GÓI DỊCH VỤ

Penny Bot cung cấp các gói thuê bao theo thời hạn. Giá và thời hạn cụ thể được niêm yết công khai tại **`https://pennybot.vn/pricing`** và có thể được điều chỉnh trong từng giai đoạn. Mọi thay đổi giá đều được đăng tải công khai và áp dụng cho các giao dịch phát sinh sau thời điểm điều chỉnh.

**Phương thức thanh toán** được tích hợp qua cổng thanh toán **SePay**, hỗ trợ chuyển khoản ngân hàng, ví điện tử và các phương thức thanh toán nội địa khác. Đơn vị vận hành Penny Bot **không lưu** thông tin thẻ tín dụng, thông tin tài khoản ngân hàng hoặc mật khẩu thanh toán của người dùng — các thông tin này do cổng thanh toán SePay xử lý độc lập.

---

ĐẠI DIỆN ĐƠN VỊ XÁC NHẬN

*Giám đốc*




**NGUYỄN HỮU LUÂN**
