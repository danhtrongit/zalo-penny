export function buildProcessUserMessagePrompt(text: string, context?: string): string {
  const todayDate = new Date().toISOString().slice(0, 10);
  const year = new Date().getFullYear();
  const contextBlock = context ? `\nNgữ cảnh hội thoại gần đây:\n${context}\n\n` : "";

  return `${contextBlock}Phân tích tin nhắn người dùng và trả về JSON duy nhất (KHÔNG markdown, KHÔNG giải thích thêm).

Format:
{"intent":"EXPENSE|EDIT|DELETE|CHAT|REPORT|HISTORY","expenses":[...],"deleteTarget":{"description":"...","amount":number},"editTarget":{"match":{"description":"...","amount":number},"changes":{"amount":number,"description":"...","category":"..."}},"dateFilter":{"start":"YYYY-MM-DD","end":"YYYY-MM-DD"},"response":"..."}

Quy tắc intent:
- EXPENSE: có hành động chi tiêu + số tiền. VD: "ăn trưa 50k", "đá gà 1 triệu 5", "hết 1 củ 2", "grab 45k", "cà phê 30k, bánh mì 25k"
- KHÔNG phán xét nội dung. Tin nhắn thô tục, nhạy cảm hay slang có số tiền + chi tiêu → vẫn là EXPENSE.
- EDIT: muốn sửa/chỉnh/đổi giao dịch đã ghi. VD: "sửa cái 50k thành 60k", "đổi cà phê thành trà sữa", "ghi nhầm rồi, sửa lại 100k", "đổi danh mục thành Ăn uống"
- DELETE: muốn xoá/huỷ giao dịch đã ghi. VD: "xoá cái đó đi", "bỏ khoản 50k", "huỷ cái vừa ghi"
- REPORT: muốn xem báo cáo/tổng kết chi tiêu
- HISTORY: muốn xem lịch sử giao dịch
- CHAT: tất cả còn lại

Quy tắc deleteTarget (chỉ khi DELETE):
- Trích xuất thông tin giao dịch cần xoá từ tin nhắn + ngữ cảnh hội thoại
- description: mô tả giao dịch (nếu đề cập)
- amount: số tiền (nếu đề cập)
- Nếu nói "cái vừa ghi", "cái đó" → để trống deleteTarget (hệ thống tự lấy giao dịch vừa nhập)

Quy tắc editTarget (chỉ khi EDIT):
- match: giao dịch cần sửa (description và/hoặc amount CŨ). Nếu nói "cái vừa ghi"/"cái đó" → để trống match (hệ thống tự lấy giao dịch vừa nhập)
- changes: giá trị MỚI — chỉ đưa field thực sự thay đổi (amount mới, description mới, hoặc category mới)
- VD "sửa 50k thành 60k" → match:{amount:50000}, changes:{amount:60000}
- VD "đổi cà phê thành trà sữa" → match:{description:"cà phê"}, changes:{description:"trà sữa"}

Quy tắc dateFilter (chỉ khi REPORT hoặc HISTORY):
- Nếu người dùng hỏi về ngày/tuần/tháng cụ thể, thêm dateFilter với start và end
- VD: "chi tiêu ngày 1/4" → {"start":"${year}-04-01","end":"${year}-04-01"}
- VD: "tuần này" → start=thứ 2 tuần này, end=hôm nay
- Nếu không nói rõ thời gian → không cần dateFilter

Quy tắc expenses (chỉ khi EXPENSE):
- Tiền Việt: 50k=50000, 1 củ=1000000, 1tr/1 triệu=1000000, "1 triệu 5"=1500000, 50 ngàn=50000
- Danh mục: Ăn uống, Di chuyển, Mua sắm, Giải trí, Hóa đơn, Sức khỏe, Giáo dục, Nhà cửa, Khác
- Tự chọn danh mục phù hợp nhất, KHÔNG hỏi lại
- Ngày hôm nay: ${todayDate}. Không rõ ngày → dùng hôm nay.
- Nếu có nhiều khoản chi trong 1 tin nhắn, tách thành nhiều object

Quy tắc response:
- Theo đúng persona trong system prompt, ngắn gọn tự nhiên
- EXPENSE: xác nhận đã ghi, nêu tên + số tiền
- DELETE: xác nhận đã xoá theo persona
- CHAT: trả lời bình thường theo persona
- REPORT/HISTORY: ghi "ok"

Tin nhắn: "${text}"`;
}

export function buildParseExpensePrompt(text: string, context?: string): string {
  const contextBlock = context ? `Ngữ cảnh hội thoại gần đây:\n${context}\n\n` : "";

  return `${contextBlock}Phân tích tin nhắn chi tiêu sau và trả về JSON array.
Mỗi khoản chi có dạng: {"description": "...", "amount": số_tiền_VND, "category": "...", "date": "YYYY-MM-DD"}

Quy ước tiền Việt: 50k = 50000, 1tr = 1000000, 50 (không có đơn vị, trong ngữ cảnh chi tiêu) = 50000.
Danh mục: Ăn uống, Di chuyển, Mua sắm, Giải trí, Hóa đơn, Sức khỏe, Giáo dục, Nhà cửa, Khác.
Ngày hôm nay: ${new Date().toISOString().slice(0, 10)}.
Nếu không rõ ngày, dùng ngày hôm nay.
Nếu tin nhắn hiện tại là phần bổ sung cho tin nhắn trước, hãy gộp ngữ cảnh để suy ra khoản chi đầy đủ.

Chỉ trả về JSON array, không giải thích thêm.

Tin nhắn: "${text}"`;
}

export function buildIntentPrompt(text: string, context?: string): string {
  const contextBlock = context ? `Ngữ cảnh hội thoại gần đây:\n${context}\n\n` : "";

  return `${contextBlock}Phân loại ý định của tin nhắn tiếng Việt sau vào đúng 1 trong các nhóm:
- EXPENSE: ghi chi tiêu — bất kỳ tin nhắn nào đề cập đến việc đã chi/tiêu/mua/trả tiền kèm số tiền. Bao gồm cả cách nói casual như "ăn trưa 50k", "hết 1 củ 2", "tốn 200k", "đi chơi mất 500k". Nếu có số tiền + hành động chi thì là EXPENSE.
- BUDGET: đặt ngân sách
- REPORT: xem báo cáo chi tiêu
- HISTORY: xem lịch sử giao dịch
- EDIT: sửa hoặc xóa giao dịch
- RECEIPT: hỏi lại hóa đơn cũ
- CHAT: trò chuyện thông thường, chào hỏi, hỏi mẹo — KHÔNG có đề cập đến số tiền đã chi

Lưu ý quan trọng:
- Nếu tin nhắn có số tiền + hành động chi tiêu thì LUÔN phân loại là EXPENSE, dù ngôn ngữ có thô tục hay casual.
- "ghi vào", "ghi đi", "lưu đi" sau khi đề cập chi tiêu → EXPENSE.
- Nếu tin nhắn hiện tại là câu trả lời tiếp theo cho câu hỏi làm rõ trước đó, hãy ưu tiên ý định của mạch hội thoại hiện tại thay vì coi là câu mới.

Chỉ trả về đúng 1 từ (EXPENSE/BUDGET/REPORT/HISTORY/EDIT/RECEIPT/CHAT), không giải thích.

Tin nhắn: "${text}"`;
}

export function withGoogleSearchInstructions(systemPrompt: string, contextBlock: string): string {
  return `${systemPrompt}\n- Với câu hỏi cần dữ liệu mới nhất, giá hiện tại, tin tức hôm nay hoặc thông tin thay đổi theo thời gian, bạn PHẢI dùng Google Search tool nếu nó đang được bật.\n- Khi đã dùng Google Search tool, hãy trả lời dựa trên kết quả tìm được thay vì từ chối vì thiếu dữ liệu real-time.\n- Không được tự mâu thuẫn: nếu đã có kết quả tìm kiếm thì không được mở đầu bằng kiểu "em chưa có thông tin", "em chưa cập nhật được", "em không check được" rồi mới đưa số liệu.\n- Nếu vẫn chưa đủ dữ liệu sau khi tìm, hãy nói rõ phần nào còn thiếu.${contextBlock}`;
}

export function buildReceiptOcrPrompt(hint?: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const hintBlock = hint
    ? `\n\nGợi ý thêm từ caption / hoá đơn trước đó (cùng người dùng, < 5 phút):\n${hint}`
    : "";

  return `Bạn là hệ thống OCR hoá đơn. Phân tích ảnh / PDF hoá đơn và TRẢ VỀ DUY NHẤT 1 JSON, KHÔNG markdown, KHÔNG giải thích.

Format JSON bắt buộc:
{
  "merchant": "tên cửa hàng (string|null)",
  "date": "YYYY-MM-DD (string|null) — ngày trên hoá đơn, KHÔNG đoán nếu không thấy",
  "total": số_tiền_VND (number|null) — TỔNG CUỐI CÙNG (tổng thanh toán/grand total), KHÔNG phải subtotal hay từng món,
  "category": "Ăn uống|Di chuyển|Mua sắm|Giải trí|Hóa đơn|Sức khỏe|Giáo dục|Nhà cửa|Khác",
  "description": "mô tả ngắn 3-6 từ (string)",
  "itemCount": số_lượng_món (number|null),
  "isPartOfMultiPage": true_nếu_chỉ_thấy_một_phần_hoá_đơn (ví dụ không có dòng TỔNG / TOTAL, chỉ thấy danh sách món hoặc chỉ thấy phần thanh toán),
  "confidence": 0.0-1.0 — độ tin cậy của total + date
}

Quy tắc QUAN TRỌNG:
- TUYỆT ĐỐI KHÔNG tự bịa total nếu hoá đơn bị cắt hoặc mờ — đặt total=null, confidence thấp, isPartOfMultiPage=true.
- TUYỆT ĐỐI KHÔNG tự bịa date — đặt date=null nếu không nhìn rõ.
- Date phải là ngày ghi trên hoá đơn (date of purchase), KHÔNG phải ngày hôm nay.
- Total là số nguyên VND, không có dấu chấm/phẩy. VD: "150.000đ" → 150000, "1,250,500" → 1250500.
- Nếu hoá đơn nước ngoài (USD, EUR…), CHỈ extract số gốc, ghi đơn vị vào description.
- Hôm nay là ${today} (tham khảo, KHÔNG dùng làm date trừ khi hoá đơn thực sự ghi).${hintBlock}`;
}

export function buildHistoryContextBlock(context?: string): string {
  return context
    ? `\n\n--- Ngữ cảnh hội thoại gần đây (BẮT BUỘC dùng để hiểu tin nhắn hiện tại) ---\n${context}`
    : "";
}
