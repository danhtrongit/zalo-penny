import { useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, Copy, Check, Globe, MoreVertical } from "lucide-react";
import { isZaloWebview } from "@/lib/is-mobile";

interface InAppBrowserGuardProps {
  children: ReactNode;
}

export function InAppBrowserGuard({ children }: InAppBrowserGuardProps) {
  const [blocked, setBlocked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("");

  useEffect(() => {
    setBlocked(isZaloWebview());
    setCurrentUrl(window.location.href);
  }, []);

  if (!blocked) return <>{children}</>;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = currentUrl;
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        /* clipboard not available */
      }
      document.body.removeChild(textarea);
    }
  };

  return (
    <div className="flex min-h-svh items-center justify-center bg-gradient-to-b from-amber-50 to-background px-5 py-10">
      <div className="w-full max-w-md space-y-5">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-amber-100">
            <AlertTriangle className="size-8 text-amber-600" />
          </div>
          <h1 className="font-heading text-xl font-bold">
            Vui lòng mở bằng trình duyệt
          </h1>
          <p className="text-sm text-muted-foreground">
            Pennybot không hoạt động đầy đủ trong Zalo. Hãy mở liên kết bằng
            Chrome hoặc Safari để tiếp tục.
          </p>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Liên kết Pennybot:
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-muted px-2.5 py-2 font-mono text-xs">
              {currentUrl}
            </code>
            <button
              onClick={handleCopy}
              className="flex shrink-0 items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? "Đã chép" : "Chép"}
            </button>
          </div>
        </div>

        <div className="space-y-3 rounded-xl border bg-white p-4 text-sm shadow-sm">
          <p className="font-medium">Cách mở trong trình duyệt:</p>
          <ol className="space-y-2.5 text-muted-foreground">
            <li className="flex gap-2">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                1
              </span>
              <span>
                Bấm biểu tượng{" "}
                <span className="inline-flex items-center rounded border bg-muted px-1.5 py-0.5 align-middle">
                  <MoreVertical className="size-3" />
                </span>{" "}
                ở góc trên bên phải
              </span>
            </li>
            <li className="flex gap-2">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                2
              </span>
              <span>
                Chọn <strong className="text-foreground">"Mở bằng trình duyệt"</strong>{" "}
                hoặc <strong className="text-foreground">"Open in Browser"</strong>
              </span>
            </li>
            <li className="flex gap-2">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                3
              </span>
              <span>
                Tiếp tục thao tác trong{" "}
                <span className="inline-flex items-center gap-1 rounded border bg-muted px-1.5 py-0.5 align-middle">
                  <Globe className="size-3" /> Chrome
                </span>{" "}
                hoặc Safari
              </span>
            </li>
          </ol>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Một số tính năng (dán token, mở Zalo Bot Manager, popup thanh toán)
          không hoạt động trong trình duyệt của Zalo.
        </p>
      </div>
    </div>
  );
}
