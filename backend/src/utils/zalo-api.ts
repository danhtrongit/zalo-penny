const API_BASE = "https://bot-api.zaloplatforms.com/bot";

interface ZaloApiResponse<T> {
  ok: boolean;
  result?: T;
  error_code?: number;
  description?: string;
}

interface CallBotApiOptions {
  returnNullOnErrorCodes?: number[];
}

export class ZaloApiError extends Error {
  constructor(
    public readonly method: string,
    public readonly errorCode: number | null,
    public readonly description: string,
    public readonly httpStatus: number
  ) {
    super(
      `Zalo API error (${method}): ${errorCode ?? "unknown"} ${description}`.trim()
    );
    this.name = "ZaloApiError";
  }
}

export interface ZaloAttachment {
  /** Zalo-hosted URL or path. Some payloads return a full https URL; some return
   *  a relative path that must be prefixed with the public CDN. */
  url?: string;
  /** mime type when Zalo provides it (e.g. application/pdf). */
  mime_type?: string;
  /** original file name for documents. */
  file_name?: string;
  /** size in bytes if provided. */
  file_size?: number;
}

export interface ZaloMessage {
  from: { id: string; display_name: string; is_bot: boolean };
  chat: { id: string; chat_type: string };
  text?: string;
  /** discriminator for media messages: CHAT_PHOTO | CHAT_DOCUMENT | CHAT_TEXT | ... */
  message_type?: string;
  /** live Zalo OA payload key for image attachments (direct CDN URL). */
  photo_url?: string;
  /** live Zalo OA payload key for document attachments (PDF etc.). */
  document_url?: string;
  /** legacy doc shape (string URL). */
  photo?: string;
  /** optional caption that came with photo/document. */
  caption?: string;
  /** undocumented but defensively read — some payloads use a doc object. */
  document?: ZaloAttachment;
  message_id: string;
  date: number;
}

export interface ZaloUpdateResult {
  event_name: string;
  message: ZaloMessage;
}

export interface ZaloWebhookInfo {
  url: string;
  updated_at: number;
}

async function callBotApi<T>(
  token: string,
  method: string,
  body?: object,
  callOptions: CallBotApiOptions = {}
) {
  const cleanToken = token.trim();
  const url = `${API_BASE}${cleanToken}/${method}`;

  const requestOptions: RequestInit = {
    method: "POST",
  };
  if (body) {
    requestOptions.headers = { "Content-Type": "application/json; charset=UTF-8" };
    requestOptions.body = JSON.stringify(body);
  }

  const response = await fetch(url, requestOptions);

  const data = (await response.json()) as ZaloApiResponse<T>;
  if (!data.ok) {
    if (
      data.error_code !== undefined &&
      callOptions.returnNullOnErrorCodes?.includes(data.error_code)
    ) {
      return null;
    }

    throw new ZaloApiError(
      method,
      data.error_code ?? null,
      data.description || "",
      response.status
    );
  }

  return (data.result ?? null) as T | null;
}

export async function getMe(token: string) {
  return callBotApi(token, "getMe");
}

export async function setWebhook(
  token: string,
  url: string,
  secretToken: string
) {
  return callBotApi<ZaloWebhookInfo>(token, "setWebhook", {
    url,
    secret_token: secretToken,
  });
}

export async function deleteWebhook(token: string) {
  // Zalo returns 400/404 when no webhook is configured. Polling should still start.
  return callBotApi(token, "deleteWebhook", undefined, {
    returnNullOnErrorCodes: [400, 404],
  });
}

export async function getWebhookInfo(token: string) {
  return callBotApi<ZaloWebhookInfo>(token, "getWebhookInfo");
}

export async function getUpdates(token: string, timeout = "30") {
  // Long polling returns 408 when no new events arrive before the timeout.
  return callBotApi<ZaloUpdateResult>(token, "getUpdates", { timeout }, {
    returnNullOnErrorCodes: [408],
  });
}

export async function sendMessage(token: string, chatId: string, text: string) {
  return callBotApi(token, "sendMessage", { chat_id: chatId, text });
}

export async function sendPhoto(
  token: string,
  chatId: string,
  photo: string,
  caption?: string
) {
  return callBotApi(token, "sendPhoto", {
    chat_id: chatId,
    photo,
    ...(caption ? { caption } : {}),
  });
}

/**
 * Download a media URL coming from a Zalo webhook payload (photo / document).
 * Returns the raw bytes + a best-effort mime type so the caller can hash and
 * OCR the file. Throws on non-2xx.
 */
export async function downloadMedia(
  url: string,
  fallbackMime = "application/octet-stream"
): Promise<{ bytes: Buffer; mimeType: string }> {
  const absoluteUrl = url.startsWith("http") ? url : `https:${url.startsWith("//") ? "" : "//"}${url}`;
  const response = await fetch(absoluteUrl);
  if (!response.ok) {
    throw new Error(`downloadMedia ${response.status} for ${absoluteUrl}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const headerMime = response.headers.get("content-type")?.split(";")[0].trim();
  return {
    bytes: Buffer.from(arrayBuffer),
    mimeType: headerMime || fallbackMime,
  };
}

export async function sendChatAction(
  token: string,
  chatId: string,
  action: string = "typing"
) {
  return callBotApi(token, "sendChatAction", {
    chat_id: chatId,
    action,
  });
}
