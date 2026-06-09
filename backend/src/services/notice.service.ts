import * as aiService from "./ai";
import { logger } from "../utils/logger";
import { appendUpgradeLink } from "../utils/upgrade-link";

/**
 * Build a persona-styled notice: ask the AI for a short body in the user's
 * persona voice, fall back to static text on any failure, then deterministically
 * append the upgrade link so it can never be dropped by the model.
 */
export async function buildPersonaNotice(
  prompt: string,
  fallback: string,
  systemPrompt: string
): Promise<string> {
  let body = fallback;
  try {
    const text = await aiService.generateChatResponse(prompt, systemPrompt);
    if (text && text.trim()) body = text.trim();
  } catch (err) {
    logger.warn({ err }, "Persona notice AI generation failed, using fallback");
  }
  return appendUpgradeLink(body);
}
