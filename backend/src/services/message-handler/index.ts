import prisma from "../../config/prisma";
import { ZaloMessage } from "../../utils/zalo-api";
import * as zaloApi from "../../utils/zalo-api";
import * as aiService from "../ai";
import {
  buildConversationContext,
  hasProcessedMessage,
  loadConversationSession,
  normalizeIntent,
  rememberProcessedMessage,
  rememberUserMessage,
} from "../conversation-state.service";
import { buildSystemPrompt } from "../persona.service";
import {
  abandonMessageProcessing,
  claimMessageProcessing,
  completeMessageProcessing,
} from "../message-dedup.service";
import { matchAndMarkVerified } from "../bot-verification.service";
import { logger } from "../../utils/logger";
import { getOrCreateZaloUser, startOnboarding } from "./onboarding";
import { handleCommand } from "./command";
import { handleExpense } from "./expense";
import { handleDelete } from "./delete";
import { handleReport } from "./report";
import { handleHistory } from "./history";
import { handleChat } from "./chat";
import { looksLikeExpense } from "./parsers";

export async function handleMessage(
  botToken: string,
  userId: string,
  message: ZaloMessage
) {
  const chatId = message.chat.id;
  const text = (message.text || "").trim();
  if (!text) return;

  // Bot ownership verification: if message text matches a pending verification code, mark it verified
  const matched = matchAndMarkVerified({ botToken, code: text });
  if (matched) {
    logger.info({ verifyId: matched.verifyId, userId }, "Bot verification matched");
    try {
      await zaloApi.sendMessage(
        botToken,
        chatId,
        "Xác minh thành công! ✅ Quay lại trang web để hoàn tất kết nối."
      );
    } catch (err) {
      logger.warn({ err }, "Failed to send verification confirmation");
    }
    return;
  }

  // Bot in verification state: only verification codes are handled (above)
  const botConfigCheck = await prisma.botConfig.findFirst({
    where: { botToken, userId },
    select: { isActive: true },
  });
  if (botConfigCheck && !botConfigCheck.isActive) {
    logger.debug(
      { text: text.slice(0, 50) },
      "Bot not active yet, ignoring non-verification message"
    );
    return;
  }

  const botConfig = await prisma.botConfig.findFirst({ where: { botToken, userId } });
  if (!botConfig) return;

  const processingKey = `${botConfig.id}:${message.message_id}`;
  if (!claimMessageProcessing(processingKey)) {
    logger.debug(
      { botConfigId: botConfig.id, chatId, messageId: message.message_id, reason: "in-memory-dedup" },
      "Duplicate Zalo message ignored"
    );
    return;
  }

  try {
    const zaloUser = await getOrCreateZaloUser(
      message.from.id,
      userId,
      botConfig.id,
      message.from.display_name
    );
    const conversation = await loadConversationSession(botConfig.id, message.from.id);

    if (hasProcessedMessage(conversation, message.message_id)) {
      logger.debug(
        {
          botConfigId: botConfig.id,
          chatId,
          messageId: message.message_id,
          reason: "conversation-state-dedup",
        },
        "Duplicate Zalo message ignored"
      );
      completeMessageProcessing(processingKey);
      return;
    }

    const historyContext = buildConversationContext(conversation);
    await rememberUserMessage(conversation, text);
    await zaloApi.sendChatAction(botToken, chatId);

    if (text.startsWith("/")) {
      await handleCommand(botToken, chatId, text, userId, zaloUser, conversation);
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
      logger.debug(
        { aiIntent: result.intent, reason: "looksLikeExpense" },
        "processUserMessage override"
      );
      intent = "EXPENSE";
    }

    logger.debug(
      {
        text: text.slice(0, 60),
        aiIntent: result.intent,
        resolved: intent,
        hasExpenses: !!result.expenses?.length,
      },
      "Unified intent"
    );

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
        await handleHistory(
          botToken,
          chatId,
          userId,
          systemPrompt,
          conversation,
          result.dateFilter
        );
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
