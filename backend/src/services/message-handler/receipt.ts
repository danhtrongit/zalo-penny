import crypto from "node:crypto";
import prisma from "../../config/prisma";
import * as aiService from "../ai";
import * as zaloApi from "../../utils/zalo-api";
import { logger } from "../../utils/logger";
import { ConversationSession, rememberTransactions } from "../conversation-state.service";
import { sendTrackedMessage } from "./send";
import { formatMoney } from "./helpers";
import { ZaloMessage } from "../../utils/zalo-api";
import { ReceiptExtraction } from "../ai";

// Time window for grouping multiple images that belong to the same physical
// receipt (e.g. a 2-page bill sent as 2 photos).
const MULTIPAGE_WINDOW_MS = 5 * 60 * 1000;

// VND tolerance when comparing totals between two recently-uploaded images:
// if both show the same total within ~100đ, treat as duplicate pages.
const DUP_TOTAL_TOLERANCE = 100;

// Hard cap on file size we accept for OCR (Gemini inlineData is base64 + JSON
// overhead, so keep the original under ~15MB to stay comfortably within limits).
const MAX_MEDIA_BYTES = 15 * 1024 * 1024;

interface MediaSource {
  url: string;
  fallbackMime: string;
}

export function messageHasMedia(message: ZaloMessage): boolean {
  return pickMedia(message) !== null;
}

function pickMedia(message: ZaloMessage): MediaSource | null {
  // Live Zalo OA webhook payload uses `message_type: "CHAT_PHOTO"` + `photo_url`
  // (and `CHAT_DOCUMENT` + `document_url`). Docs originally listed `photo` as a
  // string URL — keep both, and a few other defensive keys.
  const m = message as unknown as Record<string, unknown>;

  // Stickers carry a `url` (oasticker CDN) but are NOT receipts — never OCR them,
  // otherwise the bot replies "can't read the total/date on this receipt".
  if (m.message_type === "CHAT_STICKER" || typeof m.sticker !== "undefined") {
    return null;
  }

  const imageStringCandidates = [
    "photo_url", // ← live Zalo OA webhook
    "photo",
    "image",
    "image_url",
    "url",
    "file_url",
  ];
  for (const key of imageStringCandidates) {
    const v = m[key];
    if (typeof v === "string" && v.trim()) {
      return { url: v.trim(), fallbackMime: "image/jpeg" };
    }
  }

  const documentStringCandidates = ["document_url", "doc_url"];
  for (const key of documentStringCandidates) {
    const v = m[key];
    if (typeof v === "string" && v.trim()) {
      return { url: v.trim(), fallbackMime: "application/pdf" };
    }
  }

  // Some bot platforms expose photo as an array of size variants.
  if (Array.isArray(m.photo) && m.photo.length > 0) {
    const last = m.photo[m.photo.length - 1] as Record<string, unknown>;
    const url = last?.url ?? last?.file_url ?? last?.image_url;
    if (typeof url === "string") return { url, fallbackMime: "image/jpeg" };
  }

  // Document / attachment object.
  const docCandidates = ["document", "attachment", "file"];
  for (const key of docCandidates) {
    const v = m[key] as Record<string, unknown> | undefined;
    if (v && typeof v === "object") {
      const url = v.url ?? v.file_url;
      if (typeof url === "string" && url.trim()) {
        return {
          url: url.trim(),
          fallbackMime:
            (typeof v.mime_type === "string" && v.mime_type) ||
            (typeof v.mimeType === "string" && (v.mimeType as string)) ||
            "application/pdf",
        };
      }
    }
  }

  return null;
}

function sha256Hex(bytes: Buffer): string {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function sameDate(prior: Date, extractedIso: string | null): boolean {
  if (!extractedIso) return false;
  return prior.toISOString().slice(0, 10) === extractedIso.slice(0, 10);
}

function merchantMatches(priorDescription: string, extraction: ReceiptExtraction): boolean {
  if (!extraction.merchant) return false;
  const a = priorDescription.toLowerCase();
  const b = extraction.merchant.toLowerCase();
  return a.includes(b) || b.includes(a);
}

interface RecentReceiptWithTx {
  createdAt: Date;
  transactions: Array<{
    id: string;
    description: string;
    category: string;
    amount: number;
    date: Date;
  }>;
}

function buildOcrHint(receipts: RecentReceiptWithTx[]): string | undefined {
  const lines = receipts
    .flatMap((r) =>
      r.transactions.map((t) => {
        const minsAgo = Math.max(1, Math.round((Date.now() - r.createdAt.getTime()) / 60000));
        return `- ~${minsAgo} phút trước: "${t.description}" (${t.category}), ngày ${t.date
          .toISOString()
          .slice(0, 10)}, tổng ${t.amount} VND`;
      })
    )
    .slice(0, 3);
  return lines.length ? lines.join("\n") : undefined;
}

export async function handleReceiptMedia(
  botToken: string,
  chatId: string,
  userId: string,
  message: ZaloMessage,
  conversation: ConversationSession
) {
  const media = pickMedia(message);
  logger.info(
    { userId, hasMedia: !!media, mediaUrl: media?.url, messageKeys: Object.keys(message) },
    "handleReceiptMedia start"
  );
  if (!media) {
    await sendTrackedMessage(
      botToken,
      chatId,
      conversation,
      "Mình chỉ đọc được ảnh hoặc PDF hoá đơn thôi nha!",
      "RECEIPT"
    );
    return;
  }

  await zaloApi.sendChatAction(botToken, chatId);

  let bytes: Buffer;
  let mimeType: string;
  try {
    const downloaded = await zaloApi.downloadMedia(media.url, media.fallbackMime);
    bytes = downloaded.bytes;
    mimeType = downloaded.mimeType;
  } catch (err) {
    logger.error({ err, url: media.url }, "Receipt download failed");
    await sendTrackedMessage(
      botToken,
      chatId,
      conversation,
      "Mình tải hoá đơn không được, bạn gửi lại nhé!",
      "RECEIPT"
    );
    return;
  }

  if (bytes.length > MAX_MEDIA_BYTES) {
    await sendTrackedMessage(
      botToken,
      chatId,
      conversation,
      "File hơi to nha (giới hạn 15MB). Bạn nén nhỏ lại rồi gửi giúp mình nhé!",
      "RECEIPT"
    );
    return;
  }

  const hash = sha256Hex(bytes);

  // (1) Exact-bytes dedup — same file uploaded twice.
  const exact = await prisma.receipt.findFirst({
    where: { userId, hash },
    include: { transactions: true },
    orderBy: { createdAt: "desc" },
  });
  if (exact) {
    const tx = exact.transactions[0];
    const reply = tx
      ? `Hoá đơn này mình ghi rồi nè: ${tx.description} - ${formatMoney(tx.amount)} (${tx.date.toLocaleDateString(
          "vi-VN"
        )}). Không ghi trùng đâu nhé! 😉`
      : "Hoá đơn này mình đã nhận trước đó rồi, không ghi trùng đâu nha!";
    await sendTrackedMessage(botToken, chatId, conversation, reply, "RECEIPT");
    return;
  }

  // (2) Pull recent receipts (same user, last 5 min) for multi-page context.
  const recent = await prisma.receipt.findMany({
    where: {
      userId,
      createdAt: { gte: new Date(Date.now() - MULTIPAGE_WINDOW_MS) },
    },
    include: { transactions: true },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  const hint = buildOcrHint(recent);

  // (3) Vision OCR — strict JSON, low temperature for accuracy.
  let extraction: ReceiptExtraction | null = null;
  try {
    extraction = await aiService.parseReceiptFromMedia(bytes, mimeType, hint);
  } catch (err) {
    logger.error({ err }, "Receipt OCR failed");
  }

  // Always persist the Receipt row so future identical uploads dedup correctly.
  const fileType = mimeType.startsWith("image/")
    ? "IMAGE"
    : mimeType.includes("pdf")
      ? "PDF"
      : "OTHER";

  const receipt = await prisma.receipt.create({
    data: { userId, fileUrl: media.url, fileType, hash },
  });

  if (!extraction || (extraction.total === null && extraction.date === null)) {
    await sendTrackedMessage(
      botToken,
      chatId,
      conversation,
      "Mình chưa đọc rõ tổng tiền hay ngày trên hoá đơn này. Bạn chụp lại sáng/rõ nét hơn giúp mình nhé!",
      "RECEIPT"
    );
    return;
  }

  // (4) Multi-page merge logic — does this image belong to a receipt we
  //     already extracted within the window?
  const recentTransactions = recent.flatMap((r) =>
    r.transactions.map((t) => ({ tx: t, receiptId: r.id }))
  );

  const matchingPrior = recentTransactions.find(({ tx }) =>
    sameDate(tx.date, extraction.date) && merchantMatches(tx.description, extraction)
  );

  if (matchingPrior && extraction.total !== null) {
    const diff = Math.abs(matchingPrior.tx.amount - extraction.total);

    // (4a) Same merchant + date + total ≈ duplicate page (e.g. second photo of
    //      the same TOTAL/PAYMENT page). Do NOT double-count.
    if (diff <= DUP_TOTAL_TOLERANCE) {
      await sendTrackedMessage(
        botToken,
        chatId,
        conversation,
        `Trang này thuộc hoá đơn "${matchingPrior.tx.description}" (${formatMoney(matchingPrior.tx.amount)}) mình vừa ghi rồi, không cộng thêm đâu nhé! 👌`,
        "RECEIPT"
      );
      return;
    }

    // (4b) Multi-page receipt with partial totals on each page → sum them.
    if (extraction.isPartOfMultiPage) {
      const merged = matchingPrior.tx.amount + extraction.total;
      const updated = await prisma.transaction.update({
        where: { id: matchingPrior.tx.id },
        data: { amount: merged },
      });
      await sendTrackedMessage(
        botToken,
        chatId,
        conversation,
        `Đã gộp với hoá đơn trước: ${updated.description} → ${formatMoney(merged)} ✅`,
        "RECEIPT"
      );
      return;
    }

    // (4c) Same merchant+date but very different total and OCR says it's a
    //      standalone receipt → treat as a separate transaction (fall through).
  }

  // (5) No multi-page context — create a fresh transaction.
  if (extraction.total === null) {
    await sendTrackedMessage(
      botToken,
      chatId,
      conversation,
      "Hoá đơn này mình chưa thấy dòng TỔNG cuối. Nếu là trang 1, bạn gửi tiếp trang có TỔNG/TOTAL trong vòng 5 phút để mình gộp giúp nhé!",
      "RECEIPT"
    );
    return;
  }

  const parsedDate = extraction.date ? new Date(extraction.date) : new Date();
  const txDate = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
  const description = extraction.merchant
    ? `${extraction.description} (${extraction.merchant})`
    : extraction.description;

  const tx = await prisma.transaction.create({
    data: {
      userId,
      amount: extraction.total,
      description,
      category: extraction.category,
      date: txDate,
      source: fileType === "PDF" ? "PDF" : "IMAGE",
      receiptId: receipt.id,
    },
  });
  await rememberTransactions(conversation, [
    { id: tx.id, description: tx.description, amount: tx.amount, category: tx.category },
  ]);

  logger.info(
    {
      userId,
      txId: tx.id,
      amount: extraction.total,
      date: extraction.date,
      confidence: extraction.confidence,
    },
    "Receipt parsed and stored"
  );

  await sendTrackedMessage(
    botToken,
    chatId,
    conversation,
    `Đã ghi từ hoá đơn: ${description} - ${formatMoney(tx.amount)} (${txDate.toLocaleDateString("vi-VN")}) ✅`,
    "RECEIPT"
  );
}
