import { env } from "../../config/env";
import {
  GeminiContent,
  GeminiResponse,
  GenerateContentOptions,
} from "./types";

const API_URL =
  "https://api.yescale.io/v1beta/models/gemini-2.5-flash-lite:generateContent";
const STREAM_API_URL =
  "https://api.yescale.io/v1beta/models/gemini-2.5-flash-lite:streamGenerateContent?alt=sse";

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
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  if (options.tools?.length) body.tools = options.tools;
  if (options.toolConfig) body.toolConfig = options.toolConfig;

  return body;
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
