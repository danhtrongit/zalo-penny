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
import type { BotConfig } from "../../generated/prisma/client";
import { getOrCreateZaloUser, startOnboarding } from "./onboarding";
import { tryLinkPoolUser } from "./link";
import { handleCommand } from "./command";
import { handleExpense } from "./expense";
import { handleDelete } from "./delete";
import { handleReport } from "./report";
import { handleHistory } from "./history";
import { handleChat } from "./chat";
import { handleReceiptMedia, messageHasMedia } from "./receipt";
import { looksLikeExpense } from "./parsers";

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
    logger.info(
      {
        messageId: message.message_id,
        keys: Object.keys(message),
      },
      "Ignored message with no text and no recognizable media"
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

    if (text.startsWith("/")) {
      await handleCommand(botToken, chatId, text, userId, zaloUser, conversation);
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
    await completeMessageProcessing(processingKey);
  } catch (err) {
    await abandonMessageProcessing(processingKey);
    throw err;
  }
}
