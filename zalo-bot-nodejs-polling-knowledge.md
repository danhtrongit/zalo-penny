# Zalo Bot Node.js Polling Knowledge

> Snapshot ngày `2026-04-17`.
> Tài liệu này tổng hợp lại từ docs chính thức của Zalo Bot Platform và package `node-zalo-bot` mà bài hướng dẫn chính thức đang dẫn tới.
> Mục tiêu: triển khai bot Zalo bằng `Node.js` với cơ chế `polling` để chạy local/dev nhanh, không cần mở lại nhiều trang docs.

## 1. Phạm vi nguồn đã quét

Nguồn chính thức đã dùng để tổng hợp:

- `https://bot.zaloplatforms.com/docs/build-your-bot/`
- `https://bot.zaloplatforms.com/docs/apis/getUpdates/`
- `https://bot.zaloplatforms.com/docs/apis/deleteWebhook/`
- `https://bot.zaloplatforms.com/docs/apis/getWebhookInfo/`
- `https://bot.zaloplatforms.com/docs/apis/sendMessage/`
- `https://bot.zaloplatforms.com/docs/apis/sendPhoto/`
- `https://bot.zaloplatforms.com/docs/apis/sendSticker/`
- `https://bot.zaloplatforms.com/docs/apis/sendChatAction/`
- `https://bot.zaloplatforms.com/docs/apis/getMe/`
- `https://bot.zaloplatforms.com/docs/apis/setWebhook/`
- `https://bot.zaloplatforms.com/docs/call-api/`
- `https://bot.zaloplatforms.com/docs/webhook/`
- `https://bot.zaloplatforms.com/docs/error-code/`
- `https://bot.zaloplatforms.com/docs/build-bot-interaction-with-group/`
- `https://www.npmjs.com/package/node-zalo-bot`

Nếu cần tra cứu toàn bộ docs Zalo Bot ở mức rộng hơn, xem thêm [docs/zalo-bot-platform-reference.md](/Users/danhtrong.it/Documents/projects/Penny-Zalo/docs/zalo-bot-platform-reference.md:1).

## 2. Điều cần nhớ trước khi code

- `Polling` dùng `getUpdates`, phù hợp `local`, `development`, `test`.
- `Polling` và `Webhook` loại trừ lẫn nhau. Nếu bot từng bật webhook, phải gọi `deleteWebhook` trước khi polling hoạt động lại.
- Docs khuyến nghị dùng `Webhook` cho `production` để giảm rủi ro bỏ lỡ event.
- Docs nhóm chat ngày `17/12/2025` ghi tính năng group đang ở giai đoạn thử nghiệm nội bộ; đừng mặc định luồng group đã ổn định cho production.
- URL API có dạng:

```text
https://bot-api.zaloplatforms.com/bot<BOT_TOKEN>/<functionName>
```

- Docs “Sử dụng API” nói mọi API hỗ trợ cả `GET` và `POST`, nhưng từng trang API cụ thể đều minh họa bằng `POST`. Khi tích hợp bot, nên ưu tiên `POST`.
- Response luôn có khung chung:

```json
{
  "ok": true,
  "result": {},
  "description": "",
  "error_code": 0
}
```

## 3. Flow polling tối thiểu

1. Tạo bot và lấy `BOT_TOKEN`.
2. Gọi `getMe` để kiểm tra token có hợp lệ.
3. Gọi `deleteWebhook` một lần khi bootstrap để đảm bảo bot đang ở chế độ polling.
4. Lặp `getUpdates` với `timeout`.
5. Đọc `result.event_name` và `result.message`.
6. Dùng `message.chat.id` để trả lời lại qua `sendMessage`.

## 4. Event shape hữu ích khi xử lý tin nhắn

Docs `getUpdates` nói payload có cấu trúc tương tự webhook. Mẫu hữu ích nhất để xử lý text message là:

```json
{
  "ok": true,
  "result": {
    "event_name": "message.text.received",
    "message": {
      "from": {
        "id": "6ede9afa66b88fe6d6a9",
        "display_name": "Ted",
        "is_bot": false
      },
      "chat": {
        "id": "6ede9afa66b88fe6d6a9",
        "chat_type": "PRIVATE"
      },
      "text": "Xin chào",
      "message_id": "2d758cb5e222177a4e35",
      "date": 1750316131602
    }
  }
}
```

Các `event_name` đáng chú ý từ docs webhook:

- `message.text.received`
- `message.image.received`
- `message.sticker.received`
- `message.unsupported.received`

## 5. Cách 1: Dùng `node-zalo-bot` cho local/dev nhanh

Cách này gần với bài `build-your-bot` chính thức nhất vì trang docs đang dẫn thẳng sang package `node-zalo-bot` cho Node.js.

### 5.1. Cài đặt

```bash
npm install node-zalo-bot dotenv
```

`.env`

```env
BOT_TOKEN=your-bot-token
```

### 5.2. Ví dụ tối thiểu

```js
require("dotenv").config();

const ZaloBot = require("node-zalo-bot");

const bot = new ZaloBot(process.env.BOT_TOKEN, {
  polling: true,
});

bot.onText(/^\/start$/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    `Chào ${msg.from.display_name || "bạn"}! Tôi là bot đang chạy bằng polling.`
  );
});

bot.onText(/^\/echo\s+(.+)$/, (msg, match) => {
  bot.sendMessage(msg.chat.id, `Bạn vừa nói: ${match[1]}`);
});

bot.on("message", (msg) => {
  console.log("Incoming message:", msg);
});
```

### 5.3. Khi nào nên dùng SDK này

- Cần proof-of-concept nhanh.
- Muốn bám sát hướng dẫn `build-your-bot`.
- Chưa muốn tự viết lớp gọi `getUpdates` và `sendMessage`.

### 5.4. Các method SDK đáng chú ý từ `node-zalo-bot`

Theo package docs hiện tại, các method/hook đáng chú ý gồm:

- `bot.on("message", handler)` để bắt message event chung.
- `bot.onText(regex, handler)` để match tin nhắn text theo regex.
- `bot.sendMessage(chatId, text)` để gửi text nhanh.
- `bot.getUpdates([options])` nếu muốn chủ động gọi lấy update.
- `bot.startPolling([options])` nếu muốn tự khởi động polling thay vì chỉ dựa vào config.
- `bot.processUpdate(update)` dùng cho luồng webhook, không cần cho polling nhưng hữu ích khi chuyển môi trường.

Package docs cũng có ví dụ `setWebHook(...)` cho luồng webhook. Tên method được giữ nguyên theo package docs, không phải tên tôi tự đặt.

## 6. Cách 2: Dùng raw HTTP để chủ động luồng polling

Cách này phù hợp khi bạn muốn kiểm soát logging, retry, dedupe, metrics và tích hợp sâu với app backend hiện có.

### 6.1. Ví dụ polling tối thiểu với Node.js 18+

```js
const BOT_TOKEN = process.env.BOT_TOKEN;
const API_BASE = `https://bot-api.zaloplatforms.com/bot${BOT_TOKEN}`;

async function callBotApi(method, body) {
  const response = await fetch(`${API_BASE}/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();

  if (!data.ok) {
    throw new Error(
      `Zalo API error: ${data.error_code || "unknown"} ${data.description || ""}`.trim()
    );
  }

  return data.result;
}

async function sendText(chatId, text) {
  return callBotApi("sendMessage", {
    chat_id: chatId,
    text,
  });
}

const seenMessageIds = new Set();

async function handleUpdate(result) {
  if (!result || result.event_name !== "message.text.received") return;

  const message = result.message;
  if (!message?.chat?.id || !message.message_id) return;

  if (seenMessageIds.has(message.message_id)) return;
  seenMessageIds.add(message.message_id);

  const input = (message.text || "").trim();

  if (input === "/start") {
    await sendText(
      message.chat.id,
      `Chào ${message.from?.display_name || "bạn"}! Tôi là bot polling bằng raw HTTP.`
    );
    return;
  }

  if (input.startsWith("/echo ")) {
    await sendText(message.chat.id, `Bạn vừa nói: ${input.slice(6)}`);
    return;
  }

  await sendText(message.chat.id, `Tôi đã nhận: ${input || "(rỗng)"}`);
}

async function main() {
  const me = await callBotApi("getMe");
  console.log("Bot info:", me);

  await callBotApi("deleteWebhook");
  console.log("Webhook disabled. Start polling...");

  while (true) {
    try {
      const result = await callBotApi("getUpdates", { timeout: "30" });
      await handleUpdate(result);
    } catch (error) {
      console.error("Polling error:", error);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

### 6.2. Vì sao ví dụ trên có `seenMessageIds`

Docs `getUpdates` hiện chỉ mô tả tham số `timeout` và nói response có cấu trúc tương tự webhook; docs không mô tả `offset`, `cursor` hay cơ chế xác nhận event.

Suy ra cho triển khai thực tế:

- Nên tự chống xử lý lặp bằng `message_id` nếu logic của bạn không idempotent.
- Nếu bot có side effect quan trọng, nên lưu khóa dedupe vào DB hoặc cache có TTL thay vì chỉ dùng `Set` trong memory.

Phần này là suy luận triển khai dựa trên nội dung docs hiện tại, không phải thông số được Zalo mô tả tường minh.

## 7. Các API cần biết khi build bot polling

### 7.1. `getMe`

- Dùng để kiểm tra token.
- Không có tham số.
- Hữu ích cho bootstrap và health check.

### 7.2. `getUpdates`

- API long polling để lấy event mới.
- `Method: POST`
- Tham số docs hiện nêu: `timeout` kiểu `String`, mặc định `30` giây.
- Không hoạt động nếu webhook đang được thiết lập.

### 7.3. `getWebhookInfo`

- Lấy trạng thái webhook hiện tại.
- Không có tham số.
- Hữu ích khi bạn muốn debug vì sao polling không nhận được event.

### 7.4. `deleteWebhook`

- Gỡ webhook hiện tại để chuyển bot về polling.
- Không có tham số.
- Nên gọi lúc app khởi động ở môi trường local/dev.

### 7.5. `sendMessage`

- Dùng để trả lời text message.
- Tham số bắt buộc:
  - `chat_id`
  - `text`
- `text` theo docs có độ dài từ `1` đến `2000` ký tự.

### 7.6. `sendPhoto`

- Gửi ảnh tới `chat_id`.
- Tham số bắt buộc:
  - `chat_id`
  - `photo`
- Có thể gửi thêm `caption`, độ dài theo docs từ `1` đến `2000` ký tự.

### 7.7. `sendSticker`

- Gửi sticker tới `chat_id`.
- Tham số bắt buộc:
  - `chat_id`
  - `sticker`
- Docs dẫn nguồn sticker tại `https://stickers.zaloapp.com/`.

### 7.8. `sendChatAction`

- Hiển thị trạng thái tạm thời trong chat.
- Tham số bắt buộc:
  - `chat_id`
  - `action`
- Action docs nêu rõ:
  - `typing`
  - `upload_photo` với ghi chú “Sắp ra mắt”

### 7.9. `setWebhook`

- Không dùng trong polling, nhưng cần biết khi chuyển sang production.
- Bắt buộc có:
  - `url` dùng `HTTPS`
  - `secret_token` dài từ `8` đến `256` ký tự
- Khi Zalo gọi webhook, secret này được gửi qua header `X-Bot-Api-Secret-Token`.

## 8. Bảng lỗi tối thiểu nên xử lý

Docs error code hiện công bố các mã sau:

- `400`: bad request, sai đường dẫn hoặc API name không hợp lệ.
- `401`: unauthorized, token hết hạn hoặc không hợp lệ.
- `403`: internal server error.
- `404`: not found, yêu cầu truy cập không hợp lệ.
- `408`: request timeout.
- `429`: quota exceeded.

Với triển khai thực tế, nên log cả `error_code` lẫn `description` vì docs cũng yêu cầu đọc thêm `description` để biết chi tiết lỗi.

## 9. Những chỗ docs hiện chưa nói rõ

- `getUpdates` hiện chưa mô tả `offset`, `cursor` hay cơ chế ack event.
- Docs chưa công bố rate limit chi tiết ngoài lỗi `429`.
- Docs chưa mô tả rõ retry semantics của polling hay webhook delivery.
- Group chat đã có tài liệu hướng dẫn, nhưng trang group ngày `17/12/2025` vẫn ghi đang thử nghiệm nội bộ.

Vì vậy, cho app thật:

- Cần tự dedupe bằng `message_id` hoặc khóa tương đương.
- Nên thiết kế handler idempotent.
- Không nên giả định event delivery exactly-once.

## 10. Checklist debug nhanh

- `getMe` lỗi: kiểm tra lại `BOT_TOKEN`.
- `getUpdates` không có dữ liệu: xác minh bot đã nhận tin nhắn thật, webhook đã bị xóa, hoặc gọi thêm `getWebhookInfo` để kiểm tra trạng thái.
- Polling chạy nhưng không trả lời: log toàn bộ `result.event_name` và `result.message`.
- `sendMessage` lỗi: in cả `description` và `error_code`.
- Cần phản hồi giàu trải nghiệm hơn: dùng thêm `sendChatAction`, `sendPhoto`, `sendSticker` thay vì chỉ text.
- Chạy ổn định trên local rồi thì chuyển sang webhook cho production.

## 11. Khuyến nghị áp dụng trong repo này

- Nếu cần demo nhanh: dùng `node-zalo-bot`.
- Nếu cần gắn vào luồng AI, queue, usage log và dedupe của Penny: ưu tiên raw HTTP hoặc viết wrapper riêng quanh API Zalo Bot.
- Khi lên production: chuyển sang webhook, giữ polling cho local/dev.
