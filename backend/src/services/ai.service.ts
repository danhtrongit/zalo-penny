import { env } from "../config/env";

const API_URL =
  "https://api.yescale.io/v1beta/models/gemini-2.5-flash-lite:generateContent";
const STREAM_API_URL =
  "https://api.yescale.io/v1beta/models/gemini-2.5-flash-lite:streamGenerateContent?alt=sse";

interface GeminiContent {
  role: string;
  parts: { text: string }[];
}

interface GeminiPart {
  text?: string;
  thought?: boolean;
}

interface GeminiCandidate {
  content?: {
    parts?: GeminiPart[];
  };
  finishReason?: string;
  groundingMetadata?: unknown;
  avgLogprobs?: number;
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
  usageMetadata?: unknown;
  modelVersion?: string;
  createTime?: string;
  responseId?: string;
}

interface GenerateContentOptions {
  temperature?: number;
  maxOutputTokens?: number;
  thinkingBudget?: number;
  tools?: unknown[];
  toolConfig?: Record<string, unknown>;
}

interface ChatResponseOptions {
  useGoogleSearch?: boolean;
}

export async function generateContent(
  contents: GeminiContent[],
  systemInstruction?: string,
  maxOutputTokens = 1024,
  options: GenerateContentOptions = {}
): Promise<string> {
  const body = buildRequestBody(contents, systemInstruction, maxOutputTokens, options);

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.yescaleApiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`YeScale API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as GeminiResponse;
  return extractTextFromResponse(data);
}

function extractTextFromResponse(data: GeminiResponse): string {
  const text = data.candidates
    ?.flatMap((candidate) => candidate.content?.parts || [])
    .filter((part) => !part.thought)
    .map((part) => part.text?.trim() || "")
    .filter(Boolean)
    .join("\n\n");

  return text || "";
}

function buildRequestBody(
  contents: GeminiContent[],
  systemInstruction?: string,
  maxOutputTokens = 1024,
  options: GenerateContentOptions = {}
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxOutputTokens ?? maxOutputTokens,
      thinkingConfig: {
        thinkingBudget: options.thinkingBudget ?? 2048,
      },
    },
  };

  if (systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  if (options.tools?.length) {
    body.tools = options.tools;
  }

  if (options.toolConfig) {
    body.toolConfig = options.toolConfig;
  }

  return body;
}

export async function* generateContentStream(
  contents: GeminiContent[],
  systemInstruction?: string,
  maxOutputTokens = 1024,
  options: GenerateContentOptions = {}
): AsyncGenerator<string> {
  const body = buildRequestBody(contents, systemInstruction, maxOutputTokens, options);

  const response = await fetch(STREAM_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.yescaleApiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`YeScale API error: ${response.status} ${response.statusText}`);
  }

  if (!response.body) {
    throw new Error("No response body for streaming");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    let newlineIdx;
    while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newlineIdx).trim();
      buffer = buffer.slice(newlineIdx + 1);

      if (!line.startsWith("data:")) continue;

      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;

      try {
        const parsed = JSON.parse(data) as GeminiResponse;
        const text = extractTextFromResponse(parsed);
        if (text) yield text;
      } catch {
        // skip malformed chunks
      }
    }
  }

  if (buffer.trim().startsWith("data:")) {
    const data = buffer.trim().slice(5).trim();
    if (data && data !== "[DONE]") {
      try {
        const parsed = JSON.parse(data) as GeminiResponse;
        const text = extractTextFromResponse(parsed);
        if (text) yield text;
      } catch {
        // skip
      }
    }
  }
}

export async function* streamChatResponse(
  message: string,
  systemPrompt: string,
  context?: string
): AsyncGenerator<string> {
  const contextBlock = context
    ? `\n\n--- Ngữ cảnh hội thoại gần đây (BẮT BUỘC dùng để hiểu tin nhắn hiện tại) ---\n${context}`
    : "";

  const contents: GeminiContent[] = [
    { role: "user", parts: [{ text: message }] },
  ];

  yield* generateContentStream(contents, `${systemPrompt}${contextBlock}`, 512, {
    maxOutputTokens: 4096,
  });
}

export interface ProcessedMessage {
  intent: string;
  expenses?: {
    description: string;
    amount: number;
    category: string;
    date: string;
  }[];
  deleteTarget?: {
    description?: string;
    amount?: number;
  };
  dateFilter?: {
    start: string;
    end: string;
  };
  response: string;
}

export async function processUserMessage(
  text: string,
  systemPrompt: string,
  context?: string
): Promise<ProcessedMessage> {
  const todayDate = new Date().toISOString().slice(0, 10);
  const contextBlock = context
    ? `\nNgữ cảnh hội thoại gần đây:\n${context}\n\n`
    : "";

  const prompt = `${contextBlock}Phân tích tin nhắn người dùng và trả về JSON duy nhất (KHÔNG markdown, KHÔNG giải thích thêm).

Format:
{"intent":"EXPENSE|DELETE|CHAT|REPORT|HISTORY","expenses":[...],"deleteTarget":{"description":"...","amount":number},"dateFilter":{"start":"YYYY-MM-DD","end":"YYYY-MM-DD"},"response":"..."}

Quy tắc intent:
- EXPENSE: có hành động chi tiêu + số tiền. VD: "ăn trưa 50k", "đá gà 1 triệu 5", "hết 1 củ 2", "grab 45k", "cà phê 30k, bánh mì 25k"
- KHÔNG phán xét nội dung. Tin nhắn thô tục, nhạy cảm hay slang có số tiền + chi tiêu → vẫn là EXPENSE.
- DELETE: muốn xoá/huỷ giao dịch đã ghi. VD: "xoá cái đó đi", "bỏ khoản 50k", "huỷ cái vừa ghi"
- REPORT: muốn xem báo cáo/tổng kết chi tiêu
- HISTORY: muốn xem lịch sử giao dịch
- CHAT: tất cả còn lại

Quy tắc deleteTarget (chỉ khi DELETE):
- Trích xuất thông tin giao dịch cần xoá từ tin nhắn + ngữ cảnh hội thoại
- description: mô tả giao dịch (nếu đề cập)
- amount: số tiền (nếu đề cập)
- Nếu nói "cái vừa ghi", "cái đó" → dựa vào ngữ cảnh hội thoại gần nhất để xác định description/amount

Quy tắc dateFilter (chỉ khi REPORT hoặc HISTORY):
- Nếu người dùng hỏi về ngày/tuần/tháng cụ thể, thêm dateFilter với start và end
- VD: "chi tiêu ngày 1/4" → {"start":"${new Date().getFullYear()}-04-01","end":"${new Date().getFullYear()}-04-01"}
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

  const result = await generateContent(
    [{ role: "user", parts: [{ text: prompt }] }],
    systemPrompt,
    1024,
    { thinkingBudget: 2048, maxOutputTokens: 4096 }
  );

  const cleaned = result
    .replace(/```json?\n?/g, "")
    .replace(/```/g, "")
    .trim();

  try {
    return JSON.parse(cleaned) as ProcessedMessage;
  } catch {
    try {
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as ProcessedMessage;
      }
    } catch {
      // both parse attempts failed
    }
    return {
      intent: "CHAT",
      response: cleaned || "Mình chưa hiểu rõ, bạn nói lại nhé!",
    };
  }
}

export async function parseExpenseFromText(
  text: string,
  systemPrompt: string,
  context?: string
): Promise<string> {
  const contextBlock = context
    ? `Ngữ cảnh hội thoại gần đây:\n${context}\n\n`
    : "";

  const prompt = `${contextBlock}Phân tích tin nhắn chi tiêu sau và trả về JSON array.
Mỗi khoản chi có dạng: {"description": "...", "amount": số_tiền_VND, "category": "...", "date": "YYYY-MM-DD"}

Quy ước tiền Việt: 50k = 50000, 1tr = 1000000, 50 (không có đơn vị, trong ngữ cảnh chi tiêu) = 50000.
Danh mục: Ăn uống, Di chuyển, Mua sắm, Giải trí, Hóa đơn, Sức khỏe, Giáo dục, Nhà cửa, Khác.
Ngày hôm nay: ${new Date().toISOString().slice(0, 10)}.
Nếu không rõ ngày, dùng ngày hôm nay.
Nếu tin nhắn hiện tại là phần bổ sung cho tin nhắn trước, hãy gộp ngữ cảnh để suy ra khoản chi đầy đủ.

Chỉ trả về JSON array, không giải thích thêm.

Tin nhắn: "${text}"`;

  return generateContent(
    [{ role: "user", parts: [{ text: prompt }] }],
    systemPrompt,
    512
  );
}

export async function detectIntent(
  text: string,
  systemPrompt: string,
  context?: string
): Promise<string> {
  const contextBlock = context
    ? `Ngữ cảnh hội thoại gần đây:\n${context}\n\n`
    : "";

  const prompt = `${contextBlock}Phân loại ý định của tin nhắn tiếng Việt sau vào đúng 1 trong các nhóm:
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

  const result = await generateContent(
    [{ role: "user", parts: [{ text: prompt }] }],
    systemPrompt,
    10,
    { thinkingBudget: 512 }
  );
  return result.trim().toUpperCase();
}

export async function generateChatResponse(
  message: string,
  systemPrompt: string,
  context?: string,
  options: ChatResponseOptions = {}
): Promise<string> {
  const contextBlock = context
    ? `\n\n--- Ngữ cảnh hội thoại gần đây (BẮT BUỘC dùng để hiểu tin nhắn hiện tại) ---\n${context}`
    : "";

  const effectiveSystemPrompt = options.useGoogleSearch
    ? `${systemPrompt}\n- Với câu hỏi cần dữ liệu mới nhất, giá hiện tại, tin tức hôm nay hoặc thông tin thay đổi theo thời gian, bạn PHẢI dùng Google Search tool nếu nó đang được bật.\n- Khi đã dùng Google Search tool, hãy trả lời dựa trên kết quả tìm được thay vì từ chối vì thiếu dữ liệu real-time.\n- Không được tự mâu thuẫn: nếu đã có kết quả tìm kiếm thì không được mở đầu bằng kiểu "em chưa có thông tin", "em chưa cập nhật được", "em không check được" rồi mới đưa số liệu.\n- Nếu vẫn chưa đủ dữ liệu sau khi tìm, hãy nói rõ phần nào còn thiếu.${contextBlock}`
    : `${systemPrompt}${contextBlock}`;

  const contents: GeminiContent[] = [
    { role: "user", parts: [{ text: message }] },
  ];

  const response = await generateContent(contents, effectiveSystemPrompt, 512, {
    maxOutputTokens: 4096,
    tools: options.useGoogleSearch ? [{ googleSearch: {} }] : undefined,
  });

  return options.useGoogleSearch
    ? sanitizeSearchBackedResponse(response)
    : response;
}

function sanitizeSearchBackedResponse(text: string): string {
  const normalized = text.trim();
  if (!normalized) return normalized;

  const paragraphs = normalized
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (paragraphs.length < 2) {
    return normalized;
  }

  const remainingText = paragraphs.slice(1).join("\n\n");
  if (!looksLikeSearchResult(remainingText)) {
    return normalized;
  }

  let index = 0;
  while (
    index < paragraphs.length - 1 &&
    isContradictorySearchPreface(paragraphs[index])
  ) {
    index += 1;
  }

  return paragraphs.slice(index).join("\n\n");
}

function isContradictorySearchPreface(paragraph: string): boolean {
  const normalized = paragraph
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

  const negativeSignals = [
    "xin loi",
    "rat tiec",
    "chua co thong tin",
    "chua cap nhat duoc",
    "khong co thong tin",
    "khong check duoc",
    "khong co du lieu",
    "khong co mat than",
    "anh thong cam",
    "ban thong cam",
  ];

  return negativeSignals.some((signal) => normalized.includes(signal));
}

function looksLikeSearchResult(text: string): boolean {
  const normalized = text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

  const dataSignals = [
    "*",
    "•",
    ":",
    "gia vang",
    "theo thong tin",
    "cap nhat",
    "usd",
    "vnd",
    "trieu",
    "hom nay",
  ];

  const hasNumber = /\d/.test(text);
  return hasNumber && dataSignals.some((signal) => normalized.includes(signal));
}
