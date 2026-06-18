import { env } from "../../config/env";
import { ConversationSession } from "../conversation-state.service";
import { sendTrackedMessage } from "./send";
import { startOnboarding } from "./onboarding";
import { handleReport } from "./report";
import { handleHistory } from "./history";
import { signMagicToken } from "../auth.service";

export async function handleCommand(
  botToken: string,
  chatId: string,
  text: string,
  userId: string,
  zaloUser: { id: string; isOnboarded: boolean },
  conversation: ConversationSession
) {
  const cmd = text.split(/\s+/)[0].toLowerCase();

  switch (cmd) {
    case "/start":
      await startOnboarding(botToken, chatId, userId, zaloUser.id, conversation);
      break;
    case "/help":
      await sendTrackedMessage(
        botToken,
        chatId,
        conversation,
        "Penny có thể giúp bạn:\n" +
          "- Ghi chi tiêu: nhắn tự nhiên như 'ăn trưa 50k'\n" +
          "- /limit - Đặt ngân sách\n" +
          "- /report - Xem báo cáo\n" +
          "- /recent - Xem giao dịch gần đây\n" +
          "- /tone - Chỉnh phong cách Penny\n" +
          "- /login - Mở Dashboard",
        "CHAT"
      );
      break;
    case "/report":
      await handleReport(botToken, chatId, userId, conversation, "");
      break;
    case "/recent":
      await handleHistory(botToken, chatId, userId, conversation, "");
      break;
    case "/login":
    case "/dangnhap":
      await sendLoginLink(botToken, chatId, conversation, userId);
      break;
    default:
      await sendTrackedMessage(
        botToken,
        chatId,
        conversation,
        "Lệnh không hợp lệ. Gõ /help để xem hướng dẫn.",
        "CHAT"
      );
  }
}

/** Send a one-tap magic-login link to the web dashboard (valid ~10 minutes). */
async function sendLoginLink(
  botToken: string,
  chatId: string,
  conversation: ConversationSession,
  userId: string
) {
  const token = signMagicToken(userId);
  const link = `${env.frontendUrl}/login?token=${token}`;
  await sendTrackedMessage(
    botToken,
    chatId,
    conversation,
    `🔐 Mở Dashboard (tự động đăng nhập, liên kết có hiệu lực 10 phút):\n${link}`,
    "CHAT"
  );
}
