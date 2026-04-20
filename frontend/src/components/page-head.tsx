import { useEffect } from "react";

interface PageHeadProps {
  title?: string;
  description?: string;
}

const DEFAULT_TITLE = "Penny - Trợ lý chi tiêu thông minh trên Zalo";
const DEFAULT_DESCRIPTION =
  "Penny là trợ lý AI trên Zalo giúp bạn ghi chi tiêu bằng tiếng Việt tự nhiên, quét hóa đơn, theo dõi ngân sách.";

/**
 * Updates document title and meta description for the current page.
 * Usage: <PageHead title="Trang Chủ" />
 */
export function PageHead({ title, description }: PageHeadProps) {
  useEffect(() => {
    document.title = title ? `${title} | Penny` : DEFAULT_TITLE;

    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute("content", description || DEFAULT_DESCRIPTION);
    }

    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [title, description]);

  return null;
}
