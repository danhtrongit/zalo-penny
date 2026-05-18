/**
 * Format an axios error from this app's backend into a single
 * Vietnamese human-readable string for a toast.
 *
 * Backend error shapes we handle:
 *   { error: string }                        — plain HttpError
 *   { error: "Dữ liệu không hợp lệ",         — zod ValidationError
 *     issues: [{ path, message }, ...] }
 *
 * For ValidationError we emit "Tên hiển thị: không được để trống" using
 * the FIELD_LABELS dictionary below, falling back to the raw `path` when
 * we don't have a mapping yet.
 */

type ApiIssue = { path?: string; message?: string };

interface AxiosLike {
  response?: { data?: { error?: string; issues?: ApiIssue[]; message?: string } };
  message?: string;
}

// Map zod schema paths → Vietnamese labels. Add more as fields appear.
const FIELD_LABELS: Record<string, string> = {
  phone: "Số điện thoại",
  password: "Mật khẩu",
  name: "Tên",
  email: "Email",
  displayName: "Tên hiển thị",
  gender: "Giới tính",
  style: "Phong cách",
  tease: "Độ cà khịa",
  serious: "Độ nghiêm túc",
  frugal: "Độ tiết kiệm",
  emoji: "Mức dùng emoji",
  amount: "Số tiền",
  description: "Mô tả",
  category: "Danh mục",
  date: "Ngày",
  type: "Loại",
  planSlug: "Gói",
  durationDays: "Số ngày",
  price: "Giá",
  slug: "Slug",
  botToken: "Bot token",
  verifyId: "Mã xác minh",
  startDate: "Từ ngày",
  endDate: "Đến ngày",
  period: "Khoảng thời gian",
  message: "Nội dung tin nhắn",
  reason: "Lý do",
  role: "Vai trò",
  status: "Trạng thái",
};

function labelFor(path: string | undefined): string {
  if (!path) return "Trường";
  // Strip array indexes: "items.0.amount" → "amount"
  const leaf = path.split(".").pop() ?? path;
  return FIELD_LABELS[leaf] ?? leaf;
}

export function parseApiError(err: unknown, fallback = "Đã xảy ra lỗi"): string {
  const e = err as AxiosLike;
  const data = e?.response?.data;

  if (data?.issues?.length) {
    const lines = data.issues.map(
      (issue) => `${labelFor(issue.path)}: ${issue.message ?? "không hợp lệ"}`
    );
    // For 1 issue → single sentence. For >1 → bullet list.
    return lines.length === 1 ? lines[0] : lines.map((l) => `• ${l}`).join("\n");
  }

  if (data?.error) return data.error;
  if (data?.message) return data.message;
  if (e?.message) return e.message;
  return fallback;
}
