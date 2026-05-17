import * as aiService from "../ai";
import {
  ConversationSession,
  isAwaitingFollowUp,
  isLikelyFollowUpReply,
  rememberAssistantMessage,
} from "../conversation-state.service";
import { sendTrackedMessage, streamAndSendChunks } from "./send";
import {
  cleanThinkingArtifacts,
  isOptionAgnosticReply,
  shouldAwaitFollowUp,
  shouldUseGoogleSearch,
} from "./helpers";

function buildChatInput(
  text: string,
  conversation: ConversationSession,
  useGoogleSearch: boolean
): string {
  if (isAwaitingFollowUp(conversation) && isLikelyFollowUpReply(text)) {
    if (isOptionAgnosticReply(text)) {
      if (useGoogleSearch) {
        return [
          `Tin nhắn hiện tại của người dùng: "${text}"`,
          "Người dùng vừa cho phép bạn tự chọn mặc định.",
          "Nhiệm vụ:",
          "- Hãy dùng Google Search để tìm thông tin mới nhất nếu câu hỏi cần dữ liệu hiện tại.",
          "- KHÔNG được hỏi thêm.",
          "- KHÔNG được lặp lại câu hỏi cũ.",
          "- Hãy tự chọn 1 giả định hợp lý và nói rõ giả định đó trước khi trả lời.",
          "- Trả lời ngắn gọn, trực tiếp, bằng tiếng Việt.",
        ].join("\n");
      }

      return [
        `Tin nhắn hiện tại của người dùng: "${text}"`,
        "Người dùng vừa cho phép bạn tự chọn mặc định.",
        "Nhiệm vụ:",
        "- KHÔNG được hỏi thêm.",
        "- KHÔNG được lặp lại câu hỏi cũ.",
        "- Hãy tự chọn 1 giả định hợp lý và trả lời ngay trong một tin nhắn.",
        "- Bạn KHÔNG có dữ liệu thời gian thực trong ngữ cảnh này, nên KHÔNG được tự bịa số liệu live.",
        "- Nếu thiếu dữ liệu live, phải nói rõ giới hạn này và nêu rõ mặc định bạn đang tạm chọn.",
      ].join("\n");
    }

    if (useGoogleSearch) {
      return [
        `Tin nhắn hiện tại của người dùng: "${text}"`,
        "Đây là câu trả lời tiếp theo cho câu hỏi làm rõ ở lượt trước.",
        "Phải tiếp tục từ ngữ cảnh vừa có, không được lặp lại cùng câu hỏi cũ.",
        "Nếu câu hỏi cần dữ liệu mới nhất hoặc giá hiện tại thì hãy dùng Google Search để trả lời.",
      ].join("\n");
    }

    return [
      `Tin nhắn hiện tại của người dùng: "${text}"`,
      "Đây là câu trả lời tiếp theo cho câu hỏi làm rõ ở lượt trước.",
      "Phải tiếp tục từ ngữ cảnh vừa có, không được lặp lại cùng câu hỏi cũ.",
      'Nếu người dùng nói kiểu "đại đi", "nào cũng được", "cứ check đi" thì tự chọn giả định hợp lý và nói rõ giả định đó.',
    ].join("\n");
  }

  if (useGoogleSearch) {
    return [
      `Tin nhắn hiện tại của người dùng: "${text}"`,
      "Câu hỏi này cần thông tin mới nhất hoặc dữ liệu thay đổi theo thời gian.",
      "Hãy dùng Google Search để tìm dữ liệu hiện tại rồi trả lời trực tiếp bằng tiếng Việt.",
      "Không được trả lời kiểu bạn không có dữ liệu real-time nếu công cụ tìm kiếm đang khả dụng.",
    ].join("\n");
  }

  if (conversation.state.history.length > 0) {
    const wordCount = text.trim().split(/\s+/).length;
    const lastBotTurn = [...conversation.state.history]
      .reverse()
      .find((t) => t.role === "assistant");

    if (wordCount <= 4 && lastBotTurn) {
      return [
        `Bot vừa nói: "${lastBotTurn.text}"`,
        `Người dùng trả lời: "${text}"`,
        "Đây là phản hồi TRỰC TIẾP cho tin nhắn bot ở ngay trên. PHẢI hiểu trong ngữ cảnh đó và trả lời tiếp tục mạch hội thoại. KHÔNG được hỏi lại ý người dùng là gì.",
      ].join("\n");
    }

    return [
      `Tin nhắn hiện tại của người dùng: "${text}"`,
      "Hãy trả lời dựa trên ngữ cảnh hội thoại gần đây. Nếu tin nhắn đang phản hồi nội dung ở lượt trước, tiếp tục mạch hội thoại tự nhiên.",
    ].join("\n");
  }

  return text;
}

export async function handleChat(
  botToken: string,
  chatId: string,
  text: string,
  systemPrompt: string,
  conversation: ConversationSession,
  historyContext: string,
  preResponse?: string
) {
  const useGoogleSearch = shouldUseGoogleSearch(text, historyContext);

  if (useGoogleSearch) {
    const chatInput = buildChatInput(text, conversation, true);
    const response = await aiService.generateChatResponse(
      chatInput,
      systemPrompt,
      historyContext || undefined,
      { useGoogleSearch }
    );
    await sendTrackedMessage(
      botToken,
      chatId,
      conversation,
      response,
      "CHAT",
      shouldAwaitFollowUp(response)
    );
    return;
  }

  if (preResponse) {
    const cleaned = cleanThinkingArtifacts(preResponse);
    if (cleaned) {
      await sendTrackedMessage(
        botToken,
        chatId,
        conversation,
        cleaned,
        "CHAT",
        shouldAwaitFollowUp(cleaned)
      );
      return;
    }
  }

  const chatInput = buildChatInput(text, conversation, false);
  const fullResponse = await streamAndSendChunks(
    botToken,
    chatId,
    chatInput,
    systemPrompt,
    historyContext || undefined
  );

  await rememberAssistantMessage(
    conversation,
    fullResponse,
    "CHAT",
    shouldAwaitFollowUp(fullResponse)
  );
}
