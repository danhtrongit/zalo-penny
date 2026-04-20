import prisma from "../config/prisma";
import { ZaloMessage } from "../utils/zalo-api";
import * as zaloApi from "../utils/zalo-api";
import * as aiService from "./ai.service";
import {
  buildConversationContext,
  ConversationIntent,
  ConversationSession,
  hasProcessedMessage,
  isAwaitingFollowUp,
  isLikelyFollowUpReply,
  loadConversationSession,
  normalizeIntent,
  rememberAssistantMessage,
  rememberProcessedMessage,
  rememberUserMessage,
} from "./conversation-state.service";
import { buildSystemPrompt } from "./persona.service";
import { env } from "../config/env";
import {
  abandonMessageProcessing,
  claimMessageProcessing,
  completeMessageProcessing,
} from "./message-dedup.service";
import { pendingVerifications } from "../controllers/bot.controller";

interface ParsedExpense {
  description: string;
  amount: number;
  category: string;
  date: string;
}

export async function handleMessage(
  botToken: string,
  userId: string,
  message: ZaloMessage
) {
  const chatId = message.chat.id;
  const text = (message.text || "").trim();

  if (!text) return;

  // --- Bot ownership verification check ---
  // If someone sends a message that matches a pending verification code, mark it as verified
  for (const [verifyId, verification] of pendingVerifications) {
    if (
      verification.botToken === botToken &&
      verification.code === text &&
      verification.expiresAt > new Date() &&
      !verification.verified
    ) {
      verification.verified = true;
      // Send confirmation message back to the user
      try {
        await zaloApi.sendMessage(botToken, chatId, "Xác minh thành công! ✅ Quay lại trang web để hoàn tất kết nối.");
      } catch (err) {
        console.error("Failed to send verification confirmation:", err);
      }
      return;
    }
  }

  const botConfig = await prisma.botConfig.findFirst({
    where: { botToken, userId },
  });
  if (!botConfig) return;

  const processingKey = `${botConfig.id}:${message.message_id}`;
  if (!claimMessageProcessing(processingKey)) {
    console.log("Duplicate Zalo message ignored:", {
      botConfigId: botConfig.id,
      chatId,
      messageId: message.message_id,
      text,
      reason: "in-memory-dedup",
    });
    return;
  }

  try {
    const zaloUser = await getOrCreateZaloUser(
      message.from.id,
      userId,
      botConfig.id,
      message.from.display_name
    );
    const conversation = await loadConversationSession(
      botConfig.id,
      message.from.id
    );

    if (hasProcessedMessage(conversation, message.message_id)) {
      console.log("Duplicate Zalo message ignored:", {
        botConfigId: botConfig.id,
        chatId,
        messageId: message.message_id,
        text,
        reason: "conversation-state-dedup",
      });
      completeMessageProcessing(processingKey);
      return;
    }

    const historyContext = buildConversationContext(conversation);

    await rememberUserMessage(conversation, text);

    await zaloApi.sendChatAction(botToken, chatId);

    if (text.startsWith("/")) {
      await handleCommand(
        botToken,
        chatId,
        text,
        userId,
        zaloUser,
        conversation
      );
      await rememberProcessedMessage(conversation, message.message_id);
      completeMessageProcessing(processingKey);
      return;
    }

    const persona = await prisma.persona.findUnique({ where: { userId } });
    const systemPrompt = buildSystemPrompt(
      persona || {
        style: "FRIEND",
        tease: 3,
        serious: 3,
        frugal: 3,
        emoji: 3,
        displayName: message.from.display_name,
      }
    );

    if (!zaloUser.isOnboarded) {
      await startOnboarding(
        botToken,
        chatId,
        userId,
        zaloUser.id,
        conversation,
        message.from.display_name
      );
      await rememberProcessedMessage(conversation, message.message_id);
      completeMessageProcessing(processingKey);
      return;
    }

    const result = await aiService.processUserMessage(
      text,
      systemPrompt,
      historyContext || undefined
    );
    let intent = normalizeIntent(result.intent) || "CHAT";

    if (intent !== "EXPENSE" && looksLikeExpense(text)) {
      console.log("processUserMessage override:", {
        aiIntent: result.intent,
        reason: "looksLikeExpense",
      });
      intent = "EXPENSE";
    }

    console.log("Unified intent:", {
      text: text.slice(0, 60),
      aiIntent: result.intent,
      resolved: intent,
      hasExpenses: !!result.expenses?.length,
    });

    switch (intent) {
      case "EXPENSE":
        await handleExpense(
          botToken,
          chatId,
          userId,
          text,
          systemPrompt,
          conversation,
          historyContext,
          result.expenses,
          result.response
        );
        break;
      case "DELETE":
        await handleDelete(
          botToken,
          chatId,
          userId,
          systemPrompt,
          conversation,
          result.deleteTarget,
          result.response
        );
        break;
      case "REPORT":
        await handleReport(
          botToken,
          chatId,
          userId,
          systemPrompt,
          conversation,
          result.dateFilter
        );
        break;
      case "HISTORY":
        await handleHistory(botToken, chatId, userId, systemPrompt, conversation, result.dateFilter);
        break;
      default:
        await handleChat(
          botToken,
          chatId,
          text,
          systemPrompt,
          conversation,
          historyContext,
          result.response
        );
    }

    await rememberProcessedMessage(conversation, message.message_id);
    completeMessageProcessing(processingKey);
  } catch (err) {
    abandonMessageProcessing(processingKey);
    throw err;
  }
}

async function getOrCreateZaloUser(
  zaloUserId: string,
  userId: string,
  botConfigId: string,
  displayName?: string
) {
  let zaloUser = await prisma.zaloUser.findUnique({
    where: {
      zaloUserId_botConfigId: {
        zaloUserId,
        botConfigId,
      },
    },
  });

  if (!zaloUser) {
    zaloUser = await prisma.zaloUser.create({
      data: {
        zaloUserId,
        botConfigId,
        userId,
        displayName,
      },
    });
  }

  return zaloUser;
}

async function handleCommand(
  botToken: string,
  chatId: string,
  text: string,
  userId: string,
  zaloUser: { id: string; isOnboarded: boolean },
  conversation: ConversationSession
) {
  const cmd = text.split(/\s+/)[0].toLowerCase();

  switch (cmd) {
    case "/start":
      await startOnboarding(
        botToken,
        chatId,
        userId,
        zaloUser.id,
        conversation,
        undefined
      );
      break;
    case "/help":
      await sendTrackedMessage(
        botToken,
        chatId,
        conversation,
        "Penny có thể giúp bạn:\n" +
          "- Ghi chi tiêu: nhắn tự nhiên như 'ăn trưa 50k'\n" +
          "- /limit - Đặt ngân sách\n" +
          "- /report - Xem báo cáo\n" +
          "- /recent - Xem giao dịch gần đây\n" +
          "- /tone - Chỉnh phong cách Penny\n" +
          "- /login - Mở Dashboard",
        "CHAT"
      );
      break;
    case "/report":
      await handleReport(botToken, chatId, userId, "", conversation);
      break;
    case "/recent":
      await handleHistory(botToken, chatId, userId, "", conversation);
      break;
    case "/login": {
      const link = `${env.frontendUrl}/dashboard`;
      await sendTrackedMessage(
        botToken,
        chatId,
        conversation,
        `Mở Dashboard tại đây: ${link}`,
        "CHAT"
      );
      break;
    }
    default:
      await sendTrackedMessage(
        botToken,
        chatId,
        conversation,
        'Lệnh không hợp lệ. Gõ /help để xem hướng dẫn.',
        "CHAT"
      );
  }
}

async function startOnboarding(
  botToken: string,
  chatId: string,
  userId: string,
  zaloUserId: string,
  conversation: ConversationSession,
  displayName?: string
) {
  await prisma.persona.upsert({
    where: { userId },
    update: {},
    create: { userId, displayName },
  });

  await prisma.zaloUser.update({
    where: { id: zaloUserId },
    data: { isOnboarded: true },
  });

  const name = displayName || "bạn";
  await sendTrackedMessage(
    botToken,
    chatId,
    conversation,
    `Chào ${name}! Mình là Penny - trợ lý chi tiêu của bạn 💰\n\n` +
      "Bạn chỉ cần nhắn tự nhiên như:\n" +
      '- "ăn trưa 50k"\n' +
      '- "grab 45k"\n' +
      '- "rau 30k, cá 50k"\n\n' +
      "Penny sẽ tự hiểu và lưu lại cho bạn. Bắt đầu thôi!",
    "CHAT"
  );
}

async function handleExpense(
  botToken: string,
  chatId: string,
  userId: string,
  text: string,
  systemPrompt: string,
  conversation: ConversationSession,
  historyContext: string,
  preExtracted?: ParsedExpense[],
  preResponse?: string
) {
  try {
    let expenses = preExtracted?.length ? preExtracted : null;

    if (!expenses) {
      const result = await aiService.parseExpenseFromText(
        text,
        systemPrompt,
        historyContext || undefined
      );
      try {
        const cleaned = result.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed) && parsed.length > 0) {
          expenses = parsed;
        }
      } catch {
        // AI parse failed, will try regex fallback
      }
    }

    if (!expenses || expenses.length === 0) {
      expenses = parseExpenseByRegex(text);
      if (expenses.length > 0) {
        console.log("Regex fallback parsed:", expenses);
      }
    }

    if (!Array.isArray(expenses) || expenses.length === 0) {
      await sendTrackedMessage(
        botToken,
        chatId,
        conversation,
        "Mình chưa nhận ra khoản chi nào. Bạn thử nhắn lại nhé!",
        "EXPENSE",
        true
      );
      return;
    }

    for (const exp of expenses) {
      await prisma.transaction.create({
        data: {
          userId,
          amount: exp.amount,
          description: exp.description,
          category: exp.category,
          date: new Date(exp.date),
          source: "TEXT",
        },
      });
    }

    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    console.log("Expense saved:", { count: expenses.length, total, expenses });

    let response = preExtracted?.length ? preResponse : undefined;
    if (!response) {
      const lines = expenses.map(
        (e) => `  • ${e.description}: ${formatMoney(e.amount)}`
      );
      response = await aiService.generateChatResponse(
        `Đã ghi ${expenses.length} khoản, tổng ${formatMoney(total)}:\n${lines.join("\n")}\n\nHãy xác nhận ngắn gọn theo đúng persona.`,
        systemPrompt
      );
    }

    await sendTrackedMessage(
      botToken,
      chatId,
      conversation,
      response,
      "CHAT",
      shouldAwaitFollowUp(response)
    );
  } catch (err) {
    console.error("Expense handling error:", err);
    await sendTrackedMessage(
      botToken,
      chatId,
      conversation,
      "Có lỗi khi xử lý. Bạn thử lại nhé!",
      "EXPENSE"
    );
  }
}

async function handleDelete(
  botToken: string,
  chatId: string,
  userId: string,
  systemPrompt: string,
  conversation: ConversationSession,
  deleteTarget?: { description?: string; amount?: number },
  preResponse?: string
) {
  try {
    const where: Record<string, unknown> = { userId };
    const conditions: string[] = [];

    if (deleteTarget?.amount) {
      where.amount = deleteTarget.amount;
      conditions.push(`amount=${deleteTarget.amount}`);
    }

    if (deleteTarget?.description) {
      where.description = {
        contains: deleteTarget.description,
        mode: "insensitive",
      };
      conditions.push(`desc~"${deleteTarget.description}"`);
    }

    const candidates = await prisma.transaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    if (candidates.length === 0) {
      const notFoundPrompt = "Người dùng muốn xoá giao dịch nhưng không tìm thấy khoản nào khớp. Trả lời theo persona.";
      const response = await aiService.generateChatResponse(notFoundPrompt, systemPrompt);
      await sendTrackedMessage(botToken, chatId, conversation, response, "DELETE");
      return;
    }

    const toDelete = candidates[0];
    await prisma.transaction.delete({ where: { id: toDelete.id } });

    console.log("Transaction deleted:", {
      id: toDelete.id,
      description: toDelete.description,
      amount: toDelete.amount,
      matchConditions: conditions,
    });

    let response = preResponse;
    if (!response) {
      const deletePrompt = `Đã xoá giao dịch "${toDelete.description}" ${formatMoney(toDelete.amount)}. Xác nhận ngắn gọn theo persona.`;
      response = await aiService.generateChatResponse(deletePrompt, systemPrompt);
    }

    await sendTrackedMessage(botToken, chatId, conversation, response, "CHAT");
  } catch (err) {
    console.error("Delete handling error:", err);
    await sendTrackedMessage(
      botToken,
      chatId,
      conversation,
      "Có lỗi khi xoá. Bạn thử lại nhé!",
      "CHAT"
    );
  }
}

async function handleReport(
  botToken: string,
  chatId: string,
  userId: string,
  systemPrompt: string,
  conversation: ConversationSession,
  dateFilter?: { start: string; end: string }
) {
  const now = new Date();
  let transactions;
  let periodLabel: string;

  if (dateFilter?.start) {
    transactions = await prisma.transaction.findMany({
      where: {
        userId,
        date: {
          gte: new Date(dateFilter.start),
          lte: new Date(dateFilter.end + "T23:59:59.999Z"),
        },
      },
    });
    periodLabel = `từ ${dateFilter.start} đến ${dateFilter.end}`;
  } else {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    transactions = await prisma.transaction.findMany({
      where: { userId, date: { gte: startOfMonth } },
    });
    periodLabel = `tháng ${now.getMonth() + 1}/${now.getFullYear()}`;
  }

  const total = transactions.reduce((s, t) => s + t.amount, 0);
  const categories: Record<string, number> = {};
  for (const t of transactions) {
    categories[t.category] = (categories[t.category] || 0) + t.amount;
  }
  const catLines = Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amt]) => `${cat}: ${formatMoney(amt)}`)
    .join(", ");

  const budget = await prisma.budget.findFirst({
    where: { userId, type: "MONTHLY" },
  });

  const dataPrompt = [
    `Dữ liệu báo cáo chi tiêu ${periodLabel}:`,
    `- Tổng: ${formatMoney(total)} (${transactions.length} giao dịch)`,
    catLines ? `- Theo danh mục: ${catLines}` : "- Không có giao dịch nào",
    budget ? `- Ngân sách tháng: ${formatMoney(budget.amount)}, đã dùng ${Math.round((total / budget.amount) * 100)}%` : "",
    "",
    "Hãy trình bày báo cáo này theo đúng persona, ngắn gọn, dễ đọc.",
  ].filter(Boolean).join("\n");

  const response = await aiService.generateChatResponse(dataPrompt, systemPrompt);
  await sendTrackedMessage(botToken, chatId, conversation, response, "REPORT");
}

async function handleHistory(
  botToken: string,
  chatId: string,
  userId: string,
  systemPrompt: string,
  conversation: ConversationSession,
  dateFilter?: { start: string; end: string }
) {
  const where: { userId: string; date?: { gte: Date; lte: Date } } = { userId };

  if (dateFilter?.start) {
    where.date = {
      gte: new Date(dateFilter.start),
      lte: new Date(dateFilter.end + "T23:59:59.999Z"),
    };
  }

  const recent = await prisma.transaction.findMany({
    where,
    orderBy: { date: "desc" },
    take: dateFilter ? 50 : 10,
  });

  const periodLabel = dateFilter
    ? `từ ${dateFilter.start} đến ${dateFilter.end}`
    : "gần đây";

  if (recent.length === 0) {
    const noDataPrompt = `Người dùng hỏi giao dịch ${periodLabel} nhưng không có giao dịch nào. Trả lời theo persona.`;
    const response = await aiService.generateChatResponse(noDataPrompt, systemPrompt);
    await sendTrackedMessage(botToken, chatId, conversation, response, "HISTORY");
    return;
  }

  const total = recent.reduce((s, t) => s + t.amount, 0);
  const lines = recent.map((t) => {
    const d = t.date.toLocaleDateString("vi-VN");
    return `${d} - ${t.description}: ${formatMoney(t.amount)} [${t.category}]`;
  });

  const dataPrompt = [
    `Danh sách giao dịch ${periodLabel}:`,
    lines.join("\n"),
    `Tổng: ${formatMoney(total)}`,
    "",
    "Hãy trình bày danh sách này theo persona, giữ nguyên dữ liệu số, ngắn gọn dễ đọc.",
  ].join("\n");

  const response = await aiService.generateChatResponse(dataPrompt, systemPrompt);
  await sendTrackedMessage(botToken, chatId, conversation, response, "HISTORY");
}

async function handleChat(
  botToken: string,
  chatId: string,
  text: string,
  systemPrompt: string,
  conversation: ConversationSession,
  historyContext: string,
  preResponse?: string
) {
  const useGoogleSearch = shouldUseGoogleSearch(text, historyContext);

  if (useGoogleSearch) {
    const chatInput = buildChatInput(text, conversation, true);
    const response = await aiService.generateChatResponse(
      chatInput,
      systemPrompt,
      historyContext || undefined,
      { useGoogleSearch }
    );
    await sendTrackedMessage(
      botToken,
      chatId,
      conversation,
      response,
      "CHAT",
      shouldAwaitFollowUp(response)
    );
    return;
  }

  if (preResponse) {
    const cleaned = cleanThinkingArtifacts(preResponse);
    if (cleaned) {
      await sendTrackedMessage(
        botToken,
        chatId,
        conversation,
        cleaned,
        "CHAT",
        shouldAwaitFollowUp(cleaned)
      );
      return;
    }
  }

  const chatInput = buildChatInput(text, conversation, false);
  const fullResponse = await streamAndSendChunks(
    botToken,
    chatId,
    chatInput,
    systemPrompt,
    historyContext || undefined
  );

  await rememberAssistantMessage(
    conversation,
    fullResponse,
    "CHAT",
    shouldAwaitFollowUp(fullResponse)
  );
}

const STREAM_MIN_CHUNK = 80;
const STREAM_MAX_CHUNKS = 3;

function findSentenceBoundary(text: string): number {
  for (let i = STREAM_MIN_CHUNK; i < text.length; i++) {
    const prev = text[i - 1];
    const curr = text[i];
    if (
      (prev === "." || prev === "!" || prev === "?") &&
      (curr === " " || curr === "\n")
    ) {
      return i;
    }
    if (prev === "\n" && curr === "\n") {
      return i;
    }
  }
  return -1;
}

function cleanThinkingArtifacts(text: string): string {
  let cleaned = text.trim();
  const doubleNewline = cleaned.indexOf("\n\n");
  if (doubleNewline > 0 && doubleNewline <= 15) {
    cleaned = cleaned.slice(doubleNewline + 2).trim();
  }
  return cleaned;
}

async function streamAndSendChunks(
  botToken: string,
  chatId: string,
  message: string,
  systemPrompt: string,
  context?: string
): Promise<string> {
  let accumulated = "";

  for await (const token of aiService.streamChatResponse(
    message,
    systemPrompt,
    context
  )) {
    accumulated += token;
  }

  const cleaned = cleanThinkingArtifacts(accumulated);
  if (!cleaned) return "";

  const chunks: string[] = [];
  let remaining = cleaned;

  while (chunks.length < STREAM_MAX_CHUNKS - 1 && remaining.length > STREAM_MIN_CHUNK * 2) {
    const boundary = findSentenceBoundary(remaining);
    if (boundary <= 0) break;

    const chunk = remaining.slice(0, boundary).trim();
    if (chunk) {
      chunks.push(chunk);
    }
    remaining = remaining.slice(boundary).trim();
  }

  if (remaining.trim()) {
    chunks.push(remaining.trim());
  }

  for (const chunk of chunks) {
    await zaloApi.sendMessage(botToken, chatId, chunk);
  }

  return chunks.join("\n");
}

function looksLikeExpense(text: string): boolean {
  const normalized = text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

  const moneyPattern =
    /(?:\d+\s*k\b|\d+\s*(?:cu|trieu|tr|nghin|ngan|dong)\b|\d{5,})/.test(
      normalized
    );

  if (!moneyPattern) return false;

  const wordCount = normalized.split(/\s+/).length;
  if (wordCount <= 10) return true;

  return /(?:het|ton|mat|mua|an|uong|tra|chi|tieu|ghi|di )/.test(normalized);
}

function parseExpenseByRegex(text: string): ParsedExpense[] {
  const normalized = text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

  let amount = 0;
  const patterns: [RegExp, (...args: string[]) => number][] = [
    [/(\d+)\s*(?:trieu|tr)\s+(\d+)/, (_m, a, b) => parseInt(a) * 1_000_000 + parseInt(b) * 100_000],
    [/(\d+)\s*cu\s+(\d+)/, (_m, a, b) => parseInt(a) * 1_000_000 + parseInt(b) * 100_000],
    [/(\d+)\s*k\b/, (_m, a) => parseInt(a) * 1_000],
    [/(\d+)\s*cu\b/, (_m, a) => parseInt(a) * 1_000_000],
    [/(\d+)\s*(?:trieu|tr)\b/, (_m, a) => parseInt(a) * 1_000_000],
    [/(\d+)\s*(?:nghin|ngan)\b/, (_m, a) => parseInt(a) * 1_000],
    [/(\d+)\s*(?:dong|d)\b/, (_m, a) => parseInt(a)],
    [/(\d{5,})/, (_m, a) => parseInt(a)],
  ];

  for (const [regex, calc] of patterns) {
    const match = normalized.match(regex);
    if (match) {
      amount = calc(match[0], match[1], match[2] || "0");
      break;
    }
  }

  if (amount <= 0) return [];

  const description = text
    .replace(/\d+\s*(?:k|củ|triệu|tr|nghìn|ngàn|đồng|đ)\s*\d*/gi, "")
    .replace(/\d{5,}/g, "")
    .trim() || text.trim();

  return [{
    description: description.slice(0, 100),
    amount,
    category: "Khác",
    date: new Date().toISOString().slice(0, 10),
  }];
}

function buildChatInput(
  text: string,
  conversation: ConversationSession,
  useGoogleSearch: boolean
): string {
  if (
    isAwaitingFollowUp(conversation) &&
    isLikelyFollowUpReply(text)
  ) {
    if (isOptionAgnosticReply(text)) {
      if (useGoogleSearch) {
        return [
          `Tin nhắn hiện tại của người dùng: "${text}"`,
          "Người dùng vừa cho phép bạn tự chọn mặc định.",
          "Nhiệm vụ:",
          "- Hãy dùng Google Search để tìm thông tin mới nhất nếu câu hỏi cần dữ liệu hiện tại.",
          "- KHÔNG được hỏi thêm.",
          "- KHÔNG được lặp lại câu hỏi cũ.",
          "- Hãy tự chọn 1 giả định hợp lý và nói rõ giả định đó trước khi trả lời.",
          "- Trả lời ngắn gọn, trực tiếp, bằng tiếng Việt.",
        ].join("\n");
      }

      return [
        `Tin nhắn hiện tại của người dùng: "${text}"`,
        "Người dùng vừa cho phép bạn tự chọn mặc định.",
        "Nhiệm vụ:",
        "- KHÔNG được hỏi thêm.",
        "- KHÔNG được lặp lại câu hỏi cũ.",
        "- Hãy tự chọn 1 giả định hợp lý và trả lời ngay trong một tin nhắn.",
        "- Bạn KHÔNG có dữ liệu thời gian thực trong ngữ cảnh này, nên KHÔNG được tự bịa số liệu live.",
        "- Nếu thiếu dữ liệu live, phải nói rõ giới hạn này và nêu rõ mặc định bạn đang tạm chọn.",
      ].join("\n");
    }

    if (useGoogleSearch) {
      return [
        `Tin nhắn hiện tại của người dùng: "${text}"`,
        "Đây là câu trả lời tiếp theo cho câu hỏi làm rõ ở lượt trước.",
        "Phải tiếp tục từ ngữ cảnh vừa có, không được lặp lại cùng câu hỏi cũ.",
        "Nếu câu hỏi cần dữ liệu mới nhất hoặc giá hiện tại thì hãy dùng Google Search để trả lời.",
      ].join("\n");
    }

    return [
      `Tin nhắn hiện tại của người dùng: "${text}"`,
      "Đây là câu trả lời tiếp theo cho câu hỏi làm rõ ở lượt trước.",
      "Phải tiếp tục từ ngữ cảnh vừa có, không được lặp lại cùng câu hỏi cũ.",
      'Nếu người dùng nói kiểu "đại đi", "nào cũng được", "cứ check đi" thì tự chọn giả định hợp lý và nói rõ giả định đó.',
    ].join("\n");
  }

  if (useGoogleSearch) {
    return [
      `Tin nhắn hiện tại của người dùng: "${text}"`,
      "Câu hỏi này cần thông tin mới nhất hoặc dữ liệu thay đổi theo thời gian.",
      "Hãy dùng Google Search để tìm dữ liệu hiện tại rồi trả lời trực tiếp bằng tiếng Việt.",
      "Không được trả lời kiểu bạn không có dữ liệu real-time nếu công cụ tìm kiếm đang khả dụng.",
    ].join("\n");
  }

  if (conversation.state.history.length > 0) {
    const wordCount = text.trim().split(/\s+/).length;
    const lastBotTurn = [...conversation.state.history]
      .reverse()
      .find((t) => t.role === "assistant");

    if (wordCount <= 4 && lastBotTurn) {
      return [
        `Bot vừa nói: "${lastBotTurn.text}"`,
        `Người dùng trả lời: "${text}"`,
        "Đây là phản hồi TRỰC TIẾP cho tin nhắn bot ở ngay trên. PHẢI hiểu trong ngữ cảnh đó và trả lời tiếp tục mạch hội thoại. KHÔNG được hỏi lại ý người dùng là gì.",
      ].join("\n");
    }

    return [
      `Tin nhắn hiện tại của người dùng: "${text}"`,
      "Hãy trả lời dựa trên ngữ cảnh hội thoại gần đây. Nếu tin nhắn đang phản hồi nội dung ở lượt trước, tiếp tục mạch hội thoại tự nhiên.",
    ].join("\n");
  }

  return text;
}

function shouldUseGoogleSearch(
  text: string,
  historyContext: string
): boolean {
  const combined = normalizeForRealtimeCheck(`${historyContext}\n${text}`);

  const temporalSignals = [
    "hom nay",
    "bay gio",
    "hien tai",
    "moi nhat",
    "latest",
    "today",
    "tin tuc",
    "news",
  ];

  const realtimeTopics = [
    "gia vang",
    "vang sjc",
    "ty gia",
    "usd",
    "btc",
    "bitcoin",
    "crypto",
    "co phieu",
    "chung khoan",
    "thoi tiet",
    "ket qua bong da",
    "ti so",
    "lich thi dau",
    "gia xang",
    "lai suat",
  ];

  return (
    temporalSignals.some((signal) => combined.includes(signal)) ||
    realtimeTopics.some((topic) => combined.includes(topic))
  );
}

function normalizeForRealtimeCheck(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function isOptionAgnosticReply(text: string): boolean {
  const normalized = text.trim().toLowerCase();

  return /(?:dai di|n[aà]o c[uũ]ng d[uư][oợ]c|bat ky|cu check|cu lam|chon dai|sao cung duoc|check thu|check dai)/i.test(
    normalized
  );
}

function shouldAwaitFollowUp(response: string): boolean {
  if (/\?/.test(response)) return true;

  const normalized = response
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

  return /(?:khong nha|nhe|di nha|doi ti|cho ti|cho chut|de .{0,20} xem|cho xin|nghe khong|duoc khong|muon khong|ha\b|hen\b|nha\b)/.test(
    normalized
  );
}

async function sendTrackedMessage(
  botToken: string,
  chatId: string,
  conversation: ConversationSession,
  text: string,
  intent: ConversationIntent | null,
  awaitingUserReply = false
) {
  await zaloApi.sendMessage(botToken, chatId, text);
  console.log("Zalo message sent:", {
    chatId,
    intent,
    awaitingUserReply,
    preview: text.slice(0, 160),
  });
  await rememberAssistantMessage(
    conversation,
    text,
    intent,
    awaitingUserReply
  );
}

function formatMoney(amount: number): string {
  return amount.toLocaleString("vi-VN") + "đ";
}
