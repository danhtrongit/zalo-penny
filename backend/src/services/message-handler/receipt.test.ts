import { describe, it, expect } from "vitest";
import { messageHasMedia } from "./receipt";
import type { ZaloMessage } from "../../utils/zalo-api";

const base: ZaloMessage = {
  from: { id: "f", display_name: "U", is_bot: false },
  chat: { id: "c", chat_type: "PRIVATE" },
  message_id: "m",
  date: 0,
};

describe("messageHasMedia", () => {
  it("nhận diện ảnh hoá đơn (photo_url)", () => {
    expect(messageHasMedia({ ...base, message_type: "CHAT_PHOTO", photo_url: "https://cdn/x.jpg" })).toBe(true);
  });

  it("nhận diện document (document_url)", () => {
    expect(messageHasMedia({ ...base, message_type: "CHAT_DOCUMENT", document_url: "https://cdn/x.pdf" })).toBe(true);
  });

  it("KHÔNG coi sticker là media (dù có field url)", () => {
    const sticker = {
      ...base,
      message_type: "CHAT_STICKER",
      url: "https://zalo-api.zadn.vn/api/emoticon/oasticker?eid=1",
      sticker: "abc",
    } as unknown as ZaloMessage;
    expect(messageHasMedia(sticker)).toBe(false);
  });

  it("tin nhắn văn bản không có media", () => {
    expect(messageHasMedia({ ...base, message_type: "CHAT_TEXT", text: "ăn trưa 50k" })).toBe(false);
  });
});
