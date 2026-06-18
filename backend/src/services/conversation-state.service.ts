import prisma from "../config/prisma";
import { Prisma } from "../generated/prisma/client";

export type ConversationIntent =
  | "EXPENSE"
  | "BUDGET"
  | "REPORT"
  | "HISTORY"
  | "EDIT"
  | "DELETE"
  | "RECEIPT"
  | "CHAT";

type ConversationRole = "user" | "assistant";

interface ConversationTurn {
  role: ConversationRole;
  text: string;
  at: string;
}

interface ConversationMemory {
  history: ConversationTurn[];
  pendingIntent: ConversationIntent | null;
  awaitingUserReply: boolean;
  recentMessageIds: string[];
}

export interface ConversationSession {
  botConfigId: string;
  zaloUserId: string;
  state: ConversationMemory;
}

const MAX_HISTORY_TURNS = 12;
const MAX_RECENT_MESSAGE_IDS = 30;
// 30 min idle expires only the volatile follow-up flags (a stale clarifying
// loop shouldn't resurrect); the transcript itself is kept until
// HISTORY_STALE_AFTER_MS so the bot still remembers earlier messages.
const STALE_AFTER_MS = 30 * 60 * 1000;
const HISTORY_STALE_AFTER_MS = 24 * 60 * 60 * 1000;

function createEmptyState(): ConversationMemory {
  return {
    history: [],
    pendingIntent: null,
    awaitingUserReply: false,
    recentMessageIds: [],
  };
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, 500);
}

function normalizeMessageId(messageId: string): string {
  return messageId.trim().slice(0, 120);
}

function isConversationTurn(value: unknown): value is ConversationTurn {
  if (!value || typeof value !== "object") return false;
  const turn = value as Record<string, unknown>;
  return (
    (turn.role === "user" || turn.role === "assistant") &&
    typeof turn.text === "string" &&
    typeof turn.at === "string"
  );
}

function normalizeState(rawState: unknown): ConversationMemory {
  if (!rawState || typeof rawState !== "object") {
    return createEmptyState();
  }

  const state = rawState as Record<string, unknown>;
  const history = Array.isArray(state.history)
    ? state.history
        .filter(isConversationTurn)
        .map((turn) => ({
          role: turn.role,
          text: normalizeText(turn.text),
          at: turn.at,
        }))
        .filter((turn) => turn.text.length > 0)
        .slice(-MAX_HISTORY_TURNS)
    : [];

  const pendingIntent =
    typeof state.pendingIntent === "string"
      ? normalizeIntent(state.pendingIntent)
      : null;

  const recentMessageIds = Array.isArray(state.recentMessageIds)
    ? state.recentMessageIds
        .filter((value): value is string => typeof value === "string")
        .map(normalizeMessageId)
        .filter(Boolean)
        .slice(-MAX_RECENT_MESSAGE_IDS)
    : [];

  return {
    history,
    pendingIntent,
    awaitingUserReply:
      state.awaitingUserReply === true && pendingIntent !== null,
    recentMessageIds,
  };
}

function appendTurn(
  session: ConversationSession,
  role: ConversationRole,
  text: string
) {
  const normalized = normalizeText(text);
  if (!normalized) return;

  session.state.history.push({
    role,
    text: normalized,
    at: new Date().toISOString(),
  });

  if (session.state.history.length > MAX_HISTORY_TURNS) {
    session.state.history = session.state.history.slice(-MAX_HISTORY_TURNS);
  }
}

/**
 * Decide what state to load given the persisted record and the current time.
 * Pure (now injected) so the staleness rules are unit-testable.
 *  - no record / >24h idle → fresh empty state (drop transcript)
 *  - >30min idle           → keep transcript, clear volatile follow-up flags
 *  - otherwise             → full state
 */
export function resolveLoadedState(
  record: { state: unknown; lastMessageAt?: Date | null } | null,
  now: number
): ConversationMemory {
  const idleMs = record?.lastMessageAt ? now - record.lastMessageAt.getTime() : Infinity;
  if (!record || idleMs > HISTORY_STALE_AFTER_MS) {
    return createEmptyState();
  }
  const state = normalizeState(record.state);
  if (idleMs > STALE_AFTER_MS) {
    state.pendingIntent = null;
    state.awaitingUserReply = false;
  }
  return state;
}

async function persistSession(session: ConversationSession) {
  const serializedState = session.state as unknown as Prisma.InputJsonValue;

  await prisma.conversationState.upsert({
    where: {
      zaloUserId_botConfigId: {
        zaloUserId: session.zaloUserId,
        botConfigId: session.botConfigId,
      },
    },
    create: {
      zaloUserId: session.zaloUserId,
      botConfigId: session.botConfigId,
      state: serializedState,
      lastMessageAt: new Date(),
    },
    update: {
      state: serializedState,
      lastMessageAt: new Date(),
    },
  });
}

export function normalizeIntent(value: string): ConversationIntent | null {
  switch (value.trim().toUpperCase()) {
    case "EXPENSE":
    case "BUDGET":
    case "REPORT":
    case "HISTORY":
    case "EDIT":
    case "DELETE":
    case "RECEIPT":
    case "CHAT":
      return value.trim().toUpperCase() as ConversationIntent;
    default:
      return null;
  }
}

export async function loadConversationSession(
  botConfigId: string,
  zaloUserId: string
): Promise<ConversationSession> {
  const record = await prisma.conversationState.findUnique({
    where: {
      zaloUserId_botConfigId: {
        zaloUserId,
        botConfigId,
      },
    },
    select: {
      state: true,
      lastMessageAt: true,
    },
  });

  return {
    botConfigId,
    zaloUserId,
    state: resolveLoadedState(record, Date.now()),
  };
}

export async function rememberUserMessage(
  session: ConversationSession,
  text: string
) {
  appendTurn(session, "user", text);
  await persistSession(session);
}

export async function rememberAssistantMessage(
  session: ConversationSession,
  text: string,
  intent: ConversationIntent | null,
  awaitingUserReply = false
) {
  appendTurn(session, "assistant", text);
  session.state.pendingIntent =
    awaitingUserReply && intent ? intent : null;
  session.state.awaitingUserReply =
    awaitingUserReply && intent !== null;
  await persistSession(session);
}

export function hasProcessedMessage(
  session: ConversationSession,
  messageId: string
): boolean {
  const normalized = normalizeMessageId(messageId);
  if (!normalized) {
    return false;
  }

  return session.state.recentMessageIds.includes(normalized);
}

export async function rememberProcessedMessage(
  session: ConversationSession,
  messageId: string
) {
  const normalized = normalizeMessageId(messageId);
  if (!normalized || session.state.recentMessageIds.includes(normalized)) {
    return;
  }

  session.state.recentMessageIds.push(normalized);

  if (session.state.recentMessageIds.length > MAX_RECENT_MESSAGE_IDS) {
    session.state.recentMessageIds = session.state.recentMessageIds.slice(
      -MAX_RECENT_MESSAGE_IDS
    );
  }

  await persistSession(session);
}

export function buildConversationContext(
  session: ConversationSession,
  maxTurns = MAX_HISTORY_TURNS
): string {
  const recentTurns = session.state.history.slice(-maxTurns);
  if (recentTurns.length === 0) return "";

  const transcript = recentTurns
    .map((turn) =>
      `${turn.role === "user" ? "Người dùng" : "Bot"}: ${turn.text}`
    )
    .join("\n");

  const pendingNote =
    session.state.awaitingUserReply && session.state.pendingIntent
      ? `\nBot đang chờ người dùng trả lời tiếp cho chủ đề ${session.state.pendingIntent}. Nếu tin nhắn mới là phần bổ sung cho câu hỏi trước, hãy tiếp tục từ ngữ cảnh này và không hỏi lại cùng một thông tin.`
      : "";

  return `Hội thoại gần đây (mới nhất ở cuối):\n${transcript}${pendingNote}`;
}

export function isLikelyFollowUpReply(text: string): boolean {
  const normalized = normalizeText(text).toLowerCase();
  if (!normalized || normalized.startsWith("/")) return false;

  const wordCount = normalized.split(/\s+/).length;
  if (wordCount <= 6) return true;

  return /(?:nao cung duoc|bat ky|check dai|cu check|cu lam|ok|oke|uh|u|um|roi|mua|ban|sjc|24k|18k|vang)/i.test(
    normalized
  );
}

export function isAwaitingFollowUp(session: ConversationSession): boolean {
  return session.state.awaitingUserReply && session.state.pendingIntent !== null;
}
