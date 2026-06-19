export interface GeminiInlineData {
  mimeType: string;
  data: string;
}

export interface GeminiPartInput {
  text?: string;
  inlineData?: GeminiInlineData;
}

export interface GeminiContent {
  role: string;
  parts: GeminiPartInput[];
}

export interface ReceiptExtraction {
  merchant: string | null;
  date: string | null;
  total: number | null;
  category: string;
  description: string;
  itemCount: number | null;
  isPartOfMultiPage: boolean;
  confidence: number;
  rawText?: string;
}

export interface GeminiPart {
  text?: string;
  thought?: boolean;
}

export interface GeminiCandidate {
  content?: {
    parts?: GeminiPart[];
  };
  finishReason?: string;
  groundingMetadata?: unknown;
  avgLogprobs?: number;
}

export interface GeminiResponse {
  candidates?: GeminiCandidate[];
  usageMetadata?: unknown;
  modelVersion?: string;
  createTime?: string;
  responseId?: string;
}

export interface GenerateContentOptions {
  temperature?: number;
  maxOutputTokens?: number;
  thinkingBudget?: number;
  tools?: unknown[];
  toolConfig?: Record<string, unknown>;
}

export interface ChatResponseOptions {
  useGoogleSearch?: boolean;
}

export interface ProcessedMessage {
  intent: string;
  expenses?: {
    description: string;
    amount: number;
    category: string;
    date: string;
  }[];
  deleteTarget?: {
    description?: string;
    amount?: number;
    date?: string;
  };
  editTarget?: {
    match?: { description?: string; amount?: number; date?: string };
    changes?: { amount?: number; description?: string; category?: string };
  };
  dateFilter?: {
    start: string;
    end: string;
  };
  response: string;
}
