import { generateContent, generateContentStream } from "./gemini-client";
import {
  buildHistoryContextBlock,
  buildIntentPrompt,
  buildParseExpensePrompt,
  buildProcessUserMessagePrompt,
  buildReceiptOcrPrompt,
  withGoogleSearchInstructions,
} from "./prompts";
import { sanitizeSearchBackedResponse } from "./sanitize";
import {
  ChatResponseOptions,
  GeminiContent,
  ProcessedMessage,
  ReceiptExtraction,
} from "./types";

export type { ProcessedMessage, ReceiptExtraction } from "./types";
export { generateContent, generateContentStream };

export async function* streamChatResponse(
  message: string,
  systemPrompt: string,
  context?: string
): AsyncGenerator<string> {
  const contextBlock = buildHistoryContextBlock(context);
  const contents: GeminiContent[] = [{ role: "user", parts: [{ text: message }] }];

  yield* generateContentStream(contents, `${systemPrompt}${contextBlock}`, 512, {
    maxOutputTokens: 4096,
  });
}

export async function processUserMessage(
  text: string,
  systemPrompt: string,
  context?: string
): Promise<ProcessedMessage> {
  const prompt = buildProcessUserMessagePrompt(text, context);
  const result = await generateContent(
    [{ role: "user", parts: [{ text: prompt }] }],
    systemPrompt,
    1024,
    { thinkingBudget: 0, maxOutputTokens: 1024 }
  );

  const cleaned = result.replace(/```json?\n?/g, "").replace(/```/g, "").trim();

  try {
    return JSON.parse(cleaned) as ProcessedMessage;
  } catch {
    try {
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]) as ProcessedMessage;
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
  const prompt = buildParseExpensePrompt(text, context);
  return generateContent([{ role: "user", parts: [{ text: prompt }] }], systemPrompt, 512);
}

export async function detectIntent(
  text: string,
  systemPrompt: string,
  context?: string
): Promise<string> {
  const prompt = buildIntentPrompt(text, context);
  const result = await generateContent(
    [{ role: "user", parts: [{ text: prompt }] }],
    systemPrompt,
    10,
    { thinkingBudget: 0 }
  );
  return result.trim().toUpperCase();
}

export async function generateChatResponse(
  message: string,
  systemPrompt: string,
  context?: string,
  options: ChatResponseOptions = {}
): Promise<string> {
  const contextBlock = buildHistoryContextBlock(context);
  const effectiveSystemPrompt = options.useGoogleSearch
    ? withGoogleSearchInstructions(systemPrompt, contextBlock)
    : `${systemPrompt}${contextBlock}`;

  const contents: GeminiContent[] = [{ role: "user", parts: [{ text: message }] }];

  const response = await generateContent(contents, effectiveSystemPrompt, 512, {
    maxOutputTokens: 4096,
    tools: options.useGoogleSearch ? [{ googleSearch: {} }] : undefined,
  });

  return options.useGoogleSearch ? sanitizeSearchBackedResponse(response) : response;
}

export async function parseReceiptFromMedia(
  bytes: Buffer,
  mimeType: string,
  hint?: string
): Promise<ReceiptExtraction | null> {
  const prompt = buildReceiptOcrPrompt(hint);
  const contents: GeminiContent[] = [
    {
      role: "user",
      parts: [
        { inlineData: { mimeType, data: bytes.toString("base64") } },
        { text: prompt },
      ],
    },
  ];

  const raw = await generateContent(contents, undefined, 1024, {
    temperature: 0.1,
    maxOutputTokens: 1024,
    thinkingBudget: 0,
  });

  const cleaned = raw.replace(/```json?\n?/gi, "").replace(/```/g, "").trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]) as Partial<ReceiptExtraction>;
    return {
      merchant: typeof parsed.merchant === "string" ? parsed.merchant : null,
      date: typeof parsed.date === "string" ? parsed.date : null,
      total:
        typeof parsed.total === "number" && Number.isFinite(parsed.total) && parsed.total > 0
          ? Math.round(parsed.total)
          : null,
      category: typeof parsed.category === "string" ? parsed.category : "Khác",
      description:
        typeof parsed.description === "string" && parsed.description.trim()
          ? parsed.description.trim()
          : "Hoá đơn",
      itemCount:
        typeof parsed.itemCount === "number" && Number.isFinite(parsed.itemCount)
          ? parsed.itemCount
          : null,
      isPartOfMultiPage: parsed.isPartOfMultiPage === true,
      confidence:
        typeof parsed.confidence === "number" && Number.isFinite(parsed.confidence)
          ? Math.max(0, Math.min(1, parsed.confidence))
          : 0.5,
    };
  } catch {
    return null;
  }
}
