import * as zaloApi from "../../utils/zalo-api";
import * as aiService from "../ai.service";
import { logger } from "../../utils/logger";
import {
  ConversationIntent,
  ConversationSession,
  rememberAssistantMessage,
} from "../conversation-state.service";
import { cleanThinkingArtifacts } from "./helpers";

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

export async function sendTrackedMessage(
  botToken: string,
  chatId: string,
  conversation: ConversationSession,
  text: string,
  intent: ConversationIntent | null,
  awaitingUserReply = false
) {
  await zaloApi.sendMessage(botToken, chatId, text);
  logger.debug(
    { chatId, intent, awaitingUserReply, preview: text.slice(0, 160) },
    "Zalo message sent"
  );
  await rememberAssistantMessage(conversation, text, intent, awaitingUserReply);
}

export async function streamAndSendChunks(
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
    if (chunk) chunks.push(chunk);
    remaining = remaining.slice(boundary).trim();
  }

  if (remaining.trim()) chunks.push(remaining.trim());

  for (const chunk of chunks) {
    await zaloApi.sendMessage(botToken, chatId, chunk);
  }

  return chunks.join("\n");
}
