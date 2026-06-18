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
  clearPendingDelete,
} from "../conversation-state.service";
import { buildSystemPrompt } from "../persona.service";
import {
  abandonMessageProcessing,
  claimMessageProcessing,
  completeMessageProcessing,
} from "../message-dedup.service";
import { matchAndMarkVerified } from "../bot-verification.service";
import { logger } from "../../utils/logger";
import type { BotConfig } from "../../generated/prisma/client";
import { getOrCreateZaloUser, startOnboarding } from "./onboarding";
import { tryLinkPoolUser } from "./link";
import { handleCommand } from "./command";
import { handleExpense } from "./expense";
import { handleDelete, executePendingDelete, cancelPendingDelete } from "./delete";
import { handleEdit } from "./edit";
import { handleReport } from "./report";
import { handleHistory } from "./history";
import { handleChat } from "./chat";
import { handleReceiptMedia, messageHasMedia } from "./receipt";
import { looksLikeExpense, looksLikeLoginRequest, parseConfirmation } from "./parsers";
import { enforceFreeTier } from "../usage.service";

type BotConfigLite = Pick<
  BotConfig,
  "id" | "userId" | "botToken" | "kind" | "isActive"
>;

export async function handleMessage(
  botConfig: BotConfigLite,
  message: ZaloMessage
) {
  const botToken = botConfig.botToken;
  const chatId = message.chat.id;
  const text = (message.text || message.caption || "").trim();
  const hasMedia = messageHasMedia(message);
  if (!text && !hasMedia) {
    // Sticker / voice / other unsupported types: let the user know instead of
    // staying silent. Dedup so a webhook retry doesn't double-reply.
    const messageType = (message as unknown as { message_type?: string }).message_type;
    const isSticker =
      messageType === "CHAT_STICKER" ||
      typeof (message as unknown as { sticker?: unknown }).sticker !== "undefined";
    const key = `${botConfig.id}:${message.message_id}`;
    if (await claimMessageProcessing(key)) {
      const reply = isSticker
        ? "Mình nhận được sticker của bạn rồi 😄 Bạn nhắn bằng văn bản để mình hỗ trợ nhé!"
        : "Hiện mình chưa xử lý được tin nhắn thoại/âm thanh 😅 Bạn nhắn bằng văn bản giúp mình nhé, ví dụ: \"ăn trưa 50k\".";
      try {
        await zaloApi.sendMessage(botToken, chatId, reply);
      } catch (err) {
        logger.warn({ err, botConfigId: botConfig.id }, "Failed to send unsupported-message reply");
      }
      await completeMessageProcessing(key);
    }
    logger.info(
      { messageId: message.message_id, keys: Object.keys(message), isSticker },
      "Replied to unsupported message (no text/media)"
    );
    return;
  }

  // OWNED (self) bots keep the ownership-verification handshake. Pool bots
  // attribute by Zalo sender instead (handled below) and have no owner code.
  if (botConfig.kind === "OWNED") {
    const matched = matchAndMarkVerified({ botToken, code: text });
    if (matched) {
      logger.info({ verifyId: matched.verifyId }, "Bot verification matched");
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
    if (!botConfig.isActive) {
      logger.debug(
        { text: text.slice(0, 50) },
        "Owned bot not active yet, ignoring non-verification message"
      );
      return;
    }
  }

  // Resolve which app-user this message belongs to, by SENDER (not bot owner).
  let appUserId: string | null;
  if (botConfig.kind === "OWNED") {
    appUserId = botConfig.userId;
  } else {
    const linked = await prisma.zaloUser.findUnique({
      where: {
        zaloUserId_botConfigId: { zaloUserId: message.from.id, botConfigId: botConfig.id },
      },
      select: { userId: true },
    });
    if (linked) {
      appUserId = linked.userId;
    } else {
      // Unlinked sender on a shared bot — only the link code is accepted.
      if (text) {
        await tryLinkPoolUser(
          botConfig.id,
          botToken,
          message.from.id,
          message.from.display_name,
          text,
          chatId
        );
      }
      return;
    }
  }
  if (!appUserId) return;
  const userId = appUserId;

  const processingKey = `${botConfig.id}:${message.message_id}`;
  if (!(await claimMessageProcessing(processingKey))) {
    logger.debug(
      { botConfigId: botConfig.id, chatId, messageId: message.message_id, reason: "dedup" },
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
      await completeMessageProcessing(processingKey);
      return;
    }

    const historyContext = buildConversationContext(conversation);
    await rememberUserMessage(conversation, text);
    await zaloApi.sendChatAction(botToken, chatId);

    // Resolve a pending delete confirmation before any other handling.
    if (conversation.state.pendingDelete) {
      const answer = parseConfirmation(text);
      if (answer === "yes") {
        await executePendingDelete(botToken, chatId, userId, conversation);
        await rememberProcessedMessage(conversation, message.message_id);
        await completeMessageProcessing(processingKey);
        return;
      }
      if (answer === "no") {
        await cancelPendingDelete(botToken, chatId, conversation);
        await rememberProcessedMessage(conversation, message.message_id);
        await completeMessageProcessing(processingKey);
        return;
      }
      // Not a yes/no → abandon the pending delete and handle normally.
      await clearPendingDelete(conversation);
    }

    if (text.startsWith("/")) {
      await handleCommand(botToken, chatId, text, userId, zaloUser, conversation);
      await rememberProcessedMessage(conversation, message.message_id);
      await completeMessageProcessing(processingKey);
      return;
    }

    // Free-text "đăng nhập"/"login" → same as /login (deterministic, no AI cost,
    // exempt from the free-tier gate just like slash commands).
    if (looksLikeLoginRequest(text)) {
      await handleCommand(botToken, chatId, "/login", userId, zaloUser, conversation);
      await rememberProcessedMessage(conversation, message.message_id);
      await completeMessageProcessing(processingKey);
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
      await completeMessageProcessing(processingKey);
      return;
    }

    // Free-tier gate: non-ACTIVE users get FREE_DAILY_MESSAGE_LIMIT msgs/day.
    // Placed after onboarding (so onboarding/commands don't count) and before
    // any AI call (so blocked messages cost nothing).
    if (
      (await enforceFreeTier({ userId, botToken, chatId, systemPrompt })).blocked
    ) {
      await rememberProcessedMessage(conversation, message.message_id);
      await completeMessageProcessing(processingKey);
      return;
    }

    // Photo / PDF receipt — dispatch to OCR pipeline before falling into
    // text-intent classification.
    if (hasMedia) {
      logger.info(
        { userId, chatId, messageId: message.message_id },
        "Dispatching to receipt OCR handler"
      );
      await handleReceiptMedia(botToken, chatId, userId, message, conversation);
      await rememberProcessedMessage(conversation, message.message_id);
      await completeMessageProcessing(processingKey);
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
      case "EDIT":
        await handleEdit(botToken, chatId, userId, conversation, result.editTarget);
        break;
      case "DELETE":
        await handleDelete(botToken, chatId, userId, conversation, result.deleteTarget);
        break;
      case "REPORT":
        await handleReport(
          botToken,
          chatId,
          userId,
          conversation,
          text,
          result.dateFilter
        );
        break;
      case "HISTORY":
        await handleHistory(
          botToken,
          chatId,
          userId,
          conversation,
          text,
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
    await completeMessageProcessing(processingKey);
  } catch (err) {
    await abandonMessageProcessing(processingKey);
    throw err;
  }
}
