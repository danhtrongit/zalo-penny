# BUILD PROMPT — Penny Zalo

> Tài liệu này chỉ mô tả flow sản phẩm và cách Penny hoạt động từ góc nhìn người dùng.
> Không mô tả công nghệ, kiến trúc hay chi tiết triển khai.

---

## 1. Penny là gì

**Penny** là trợ lý quản lý chi tiêu cá nhân hoạt động trên **Zalo**.

Người dùng có thể:

- ghi chi tiêu bằng tiếng Việt tự nhiên
- gửi ảnh hóa đơn để Penny tự đọc và lưu lại
- nhập PDF hóa đơn/sao kê để Penny đọc và tách khoản chi
- đặt ngân sách tuần hoặc tháng
- xem báo cáo, lịch sử giao dịch, hỏi lại hóa đơn cũ
- chỉnh phong cách nói chuyện của Penny
- mở Dashboard để xem dữ liệu chi tiết và chỉnh sửa giao dịch

Penny có 2 điểm chạm chính:

1. **Zalo Bot**: nơi người dùng trò chuyện hằng ngày
2. **Dashboard**: nơi xem dữ liệu, chỉnh cài đặt và nhập PDF khi cần

---

## 2. Flow tổng thể của sản phẩm

### 2.1. Người dùng mới bắt đầu trên Zalo

1. Người dùng nhắn `/start` hoặc bắt đầu trò chuyện với Penny trên Zalo.
2. Penny chào người dùng và mời chọn phong cách nói chuyện.
3. Penny hỏi muốn xưng hô người dùng bằng tên gì.
4. Penny hỏi thêm giới tính nếu người dùng muốn thiết lập.
5. Sau khi xong, Penny báo đã sẵn sàng và gợi ý cách ghi chi tiêu đầu tiên.

Sau bước này, người dùng có thể dùng Penny ngay bằng cách nhắn tự nhiên như:

- `ăn trưa 50k`
- `grab 45k`
- `rau 30k, cá 50k`

### 2.2. Mở Dashboard

Người dùng không tự đăng ký tài khoản trực tiếp trên web.

Flow đúng là:

1. Người dùng nhắn `/login` trong bot.
2. Penny gửi lại một link Dashboard riêng cho người đó.
3. Người dùng mở link để xem dữ liệu cá nhân.

Dashboard là phần mở rộng của bot, không phải một sản phẩm tách rời.

---

## 3. Cách Penny hiểu tin nhắn

Penny phải hiểu tiếng Việt tự nhiên, không bắt người dùng phải dùng cú pháp cứng.

Penny cần nhận ra các nhóm nhu cầu chính:

- ghi chi tiêu
- đặt ngân sách
- xem báo cáo
- xem lịch sử
- sửa hoặc xóa giao dịch
- hỏi lại hóa đơn cũ
- chào hỏi hoặc trò chuyện tự do

Penny cũng cần hiểu:

- cách nói tiền kiểu Việt Nam
- ngày tương đối như `hôm nay`, `hôm qua`, `tuần này`, `tháng trước`
- nhiều khoản chi trong cùng một tin nhắn
- ngữ cảnh ngắn của cuộc trò chuyện gần nhất

### 3.1. Quy ước tiền Việt Nam

Penny phải hiểu theo thói quen nhắn tin phổ biến:

| Cách ghi | Hiểu thành |
|----------|------------|
| `50k` | 50,000đ |
| `50` | 50,000đ nếu ngữ cảnh là ghi chi tiêu ngắn |
| `1tr` hoặc `1 triệu` | 1,000,000đ |
| `1500` | 1,500đ |

### 3.2. Khi Penny chưa hiểu rõ

Nếu tin nhắn chưa đủ rõ, Penny phải hỏi lại ngắn gọn, đúng giọng persona hiện tại.

Ví dụ:

- chưa rõ khoản nào cần sửa
- chưa rõ người dùng muốn đặt ngân sách tuần hay tháng
- chưa rõ file gửi lên có phải hóa đơn hợp lệ hay không

---

## 4. Flow ghi chi tiêu

### 4.1. Ghi chi tiêu bằng text

Đây là flow quan trọng nhất.

Người dùng chỉ cần nhắn tự nhiên, ví dụ:

- `ăn trưa 50k`
- `grab 45k`
- `18/3: bánh 64k, bé tư 17k`

Penny phải:

- hiểu đây là hành động ghi chi tiêu
- nhận ra số tiền, mô tả, ngày, danh mục
- hỗ trợ một hoặc nhiều khoản trong cùng một tin nhắn
- tự phân loại vào danh mục phù hợp

Sau khi ghi xong:

- Penny xác nhận lại khoản vừa lưu
- giọng điệu phải theo persona người dùng đã chọn
- nếu có ngân sách, Penny có thể nhắc thêm tình trạng ngân sách hiện tại

### 4.2. Chống ghi trùng

Nếu người dùng vừa ghi một khoản rất giống khoản mới trong thời gian gần, Penny không nên tự lưu ngay.

Flow đúng:

1. Penny cảnh báo có vẻ trùng.
2. Penny hỏi người dùng có muốn lưu thêm không.
3. Nếu người dùng trả lời `có`, Penny mới lưu.
4. Nếu người dùng trả lời `không`, Penny bỏ qua.

### 4.3. Ghi chi tiêu bằng ảnh hóa đơn

Người dùng có thể gửi ảnh hóa đơn, bill hoặc ảnh chụp món hàng.

Penny phải:

- đọc nội dung trong ảnh
- nhận ra nơi mua, ngày, món, giá, tổng tiền nếu có
- hỗ trợ trường hợp một ảnh có nhiều hóa đơn
- lưu lại các khoản chi phù hợp
- phản hồi lại bằng một câu xác nhận dễ hiểu

Nếu ảnh đã từng được nhập trước đó, Penny nên báo là hóa đơn có vẻ đã được lưu rồi.

### 4.4. Ghi chi tiêu bằng PDF

Vì trải nghiệm PDF trên Zalo không phải lúc nào cũng ổn định, Penny cần có 2 đường đi:

**Cách ưu tiên:**

1. Người dùng mở Dashboard từ `/login`
2. Vào phần cài đặt
3. Tải PDF lên
4. Penny đọc file và lưu lại các khoản chi
5. Dashboard báo kết quả nhập thành công hay thất bại

**Cách bổ sung:**

- Nếu người dùng gửi được file PDF hoặc link PDF mà Penny đọc được ngay trong Zalo, Penny vẫn nên xử lý trực tiếp.
- Nếu Penny không lấy được file, Penny phải hướng người dùng sang Dashboard thay vì trả lời mơ hồ.

Sau khi nhập PDF:

- các khoản chi phải được thêm vào lịch sử
- file gốc cần có thể xem lại về sau trong Dashboard

---

## 5. Ngân sách

### 5.1. Đặt ngân sách

Người dùng có thể đặt ngân sách bằng 2 cách:

- nhắn tự nhiên như `đặt ngân sách tháng 5 triệu`
- dùng lệnh `/limit`

Penny hỗ trợ 2 loại ngân sách:

- ngân sách tuần
- ngân sách tháng

Nếu người dùng dùng `/limit` mà chưa nói rõ, Penny cần hỏi tiếp:

1. muốn đặt cho `tuần` hay `tháng`
2. số tiền là bao nhiêu

### 5.2. Cách Penny nhắc ngân sách

Khi người dùng ghi chi tiêu hoặc xem báo cáo, Penny nên biết họ đang chi ở mức nào so với ngân sách.

Phong cách nhắc phải thay đổi theo persona:

- nhẹ nhàng nếu còn an toàn
- rõ ràng hơn nếu đã chi nhiều
- cảnh báo mạnh hơn nếu đã vượt mức

---

## 6. Báo cáo và lịch sử

### 6.1. Báo cáo chi tiêu

Người dùng có thể xem báo cáo bằng:

- `/report`
- hoặc nhắn kiểu `báo cáo tháng này`, `xem chi tiêu tuần này`

Báo cáo nên cho người dùng thấy:

- tổng chi tuần này
- tổng chi tháng này
- so sánh với ngân sách nếu đã đặt
- nhóm chi tiêu theo danh mục
- một đoạn nhận xét ngắn theo đúng persona hiện tại

### 6.2. Lịch sử giao dịch

Người dùng có thể hỏi:

- `xem chi tiêu hôm qua`
- `lịch sử tuần này`
- `/recent`

Penny cần trả về:

- danh sách giao dịch gần đây hoặc trong khoảng người dùng hỏi
- mô tả ngắn gọn, dễ đọc
- số tiền và danh mục

### 6.3. Hỏi lại hóa đơn cũ

Nếu người dùng hỏi lại hóa đơn, bill hoặc ảnh chụp trước đó, Penny cần cố gắng gửi lại các hóa đơn gần đây nhất.

Flow mong muốn:

1. Penny tìm các giao dịch gần đây có file gốc.
2. Nếu là ảnh, Penny gửi lại ảnh hoặc đường xem ảnh.
3. Nếu là PDF, Penny gửi lại link xem PDF.
4. Sau đó Penny xác nhận ngắn gọn rằng đã gửi lại hóa đơn gần đây.

Nếu không gửi lại trực tiếp được, Penny phải hướng người dùng sang Dashboard để xem file gốc.

---

## 7. Chỉnh phong cách nói chuyện của Penny

Penny có 5 persona chính:

1. **Bạn thân**
2. **Trợ lý**
3. **Nội trợ**
4. **Huấn luyện viên**
5. **Hề**

Người dùng có thể đổi persona:

- ngay lúc onboarding
- hoặc về sau bằng lệnh `/tone`
- hoặc chỉnh chi tiết trong Dashboard

Ngoài persona chính, người dùng còn có thể chỉnh mức:

- cà khịa
- nghiêm túc
- tiết kiệm
- emoji

Persona phải ảnh hưởng đến:

- câu xác nhận sau khi ghi chi tiêu
- lời nhắc ngân sách
- nhận xét trong báo cáo
- các đoạn chat tự do

Penny phải giữ đúng vai nhưng vẫn dễ chịu, không làm người dùng khó chịu quá mức.

---

## 8. Chat tự do

Khi người dùng không phải đang ghi chi tiêu hay gọi lệnh cụ thể, Penny vẫn có thể trò chuyện tự nhiên.

Ví dụ:

- hỏi mẹo tiết kiệm
- hỏi nên chi tiêu sao hợp lý
- tâm sự nhẹ nhàng về tiền bạc
- nói chuyện vu vơ với đúng persona đã chọn

Trong các đoạn chat này:

- Penny vẫn phải giữ đúng vai
- trả lời ngắn gọn, giống một cuộc trò chuyện thật
- không cố ép mọi câu về ghi chi tiêu nếu người dùng chỉ muốn nói chuyện

---

## 9. Dashboard phải làm được gì

Dashboard là nơi người dùng xem dữ liệu đầy đủ hơn bot.

### 9.1. Trang chủ

Người dùng mở Dashboard sẽ thấy:

- tổng chi hôm nay, tuần này, tháng này
- thẻ ngân sách tháng
- mức đã chi so với hạn mức
- danh sách giao dịch gần đây
- dấu hiệu để mở lại hóa đơn gốc nếu giao dịch có file đính kèm

### 9.2. Trang báo cáo

Người dùng có thể:

- lọc theo hôm nay, tuần, tháng, tất cả hoặc khoảng ngày tùy chọn
- lọc theo danh mục
- xem tổng chi
- xem phân rã danh mục
- mở danh sách giao dịch
- bấm vào từng giao dịch để sửa hoặc xóa
- xem lại hóa đơn ảnh hoặc PDF gốc

### 9.3. Trang cài đặt

Người dùng có thể:

- chỉnh các thanh tone của Penny
- tải PDF lên để Penny đọc và nhập chi tiêu

### 9.4. Trang liên hệ và chính sách

Dashboard cần có các trang thông tin cơ bản:

- liên hệ
- quyền riêng tư
- điều khoản
- thanh toán
- khiếu nại

### 9.5. Khu vực admin

Nếu là admin, Dashboard có thêm khu vực riêng để:

- xem danh sách người dùng
- gửi thông báo hàng loạt
- gửi ảnh hàng loạt
- gửi nội dung đã cá nhân hóa theo giọng Penny của từng người

---

## 10. Các lệnh người dùng cần có

Penny cần hỗ trợ ít nhất các lệnh sau:

- `/start` — bắt đầu cài đặt ban đầu
- `/help` — xem hướng dẫn ngắn
- `/limit` — đặt ngân sách
- `/report` — xem báo cáo
- `/recent` — xem các khoản gần nhất
- `/tone` — xem hoặc chỉnh tone của Penny
- `/login` — lấy link Dashboard
- `/cancel` — hủy thao tác đang chờ

Các lệnh này chỉ là lối tắt. Ngoài ra, người dùng vẫn phải có thể nhắn tự nhiên để Penny tự hiểu.

---

## 11. Quy tắc phản hồi của Penny

Penny phải phản hồi theo các nguyên tắc sau:

- luôn dùng tiếng Việt
- ngắn gọn, rõ ý, giống đang chat thật
- giữ đúng persona đã chọn
- khi chưa chắc thì hỏi lại thay vì tự đoán bừa
- khi gặp file khó xử lý thì hướng người dùng sang cách làm khác rõ ràng hơn
- khi người dùng đang làm một bước nhiều giai đoạn, Penny phải nhớ đang chờ câu trả lời nào
- khi người dùng hỏi lại giao dịch hoặc hóa đơn đã lưu, Penny nên ưu tiên giúp họ xem lại nhanh thay vì bắt nhập lại từ đầu

---

## 12. Ví dụ hành vi mong muốn

### Ví dụ 1: Ghi chi tiêu nhanh

Người dùng: `ăn trưa 50k`

Penny:

- hiểu đây là ghi chi tiêu
- lưu khoản ăn trưa 50,000đ
- phản hồi xác nhận theo persona

### Ví dụ 2: Nhiều khoản trong một tin nhắn

Người dùng: `rau 30k, cá 50k`

Penny:

- tách thành 2 khoản riêng
- lưu cả 2
- trả lời rằng đã ghi 2 khoản

### Ví dụ 3: Đặt ngân sách bằng lệnh

Người dùng: `/limit`

Penny:

1. hỏi muốn đặt cho tuần hay tháng
2. hỏi số tiền
3. xác nhận đã đặt xong

### Ví dụ 4: Hỏi lại hóa đơn

Người dùng: `gửi lại bill gần đây cho mình`

Penny:

1. tìm hóa đơn gần đây
2. gửi lại ảnh hoặc link PDF nếu có
3. xác nhận ngắn gọn là đã gửi

### Ví dụ 5: PDF không đọc được ngay trong chat

Người dùng gửi file nhưng Penny không lấy được nội dung.

Penny không nên trả lời chung chung.
Penny phải nói rõ:

- hiện chưa lấy được file từ tin nhắn này
- mời người dùng dùng `/login`
- vào Dashboard để tải PDF lên

---

## 13. Kết quả mong muốn của sản phẩm

Sau khi hoàn thiện, Penny phải cho cảm giác là:

- một trợ lý chi tiêu thật sự dễ dùng trên Zalo
- hiểu tiếng Việt tự nhiên tốt
- ghi chi tiêu nhanh hơn việc tự mở app tài chính truyền thống
- đủ gần gũi để người dùng muốn trò chuyện mỗi ngày
- có Dashboard để xem dữ liệu sâu hơn nhưng không làm bot trở nên phức tạp
