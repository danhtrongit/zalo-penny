import { generateContent, generateContentStream } from "./gemini-client";
import {
  buildHistoryContextBlock,
  buildIntentPrompt,
  buildParseExpensePrompt,
  buildProcessUserMessagePrompt,
  withGoogleSearchInstructions,
} from "./prompts";
import { sanitizeSearchBackedResponse } from "./sanitize";
import { ChatResponseOptions, GeminiContent, ProcessedMessage } from "./types";

export type { ProcessedMessage } from "./types";
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
    { thinkingBudget: 2048, maxOutputTokens: 4096 }
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
