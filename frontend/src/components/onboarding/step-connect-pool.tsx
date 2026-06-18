import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check, ExternalLink, RefreshCw, LifeBuoy } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

interface PoolInfo {
  status: string;
  linkCode: string;
  id: string;
  label?: string | null;
  qrImageUrl?: string | null;
  botLink?: string | null;
}

interface Props {
  onLinked: () => void;
}

// Show the "still stuck?" help link only after the user has had a real chance to
// complete the hand-off (they leave to Zalo and come back).
const HELP_DELAY_MS = 60_000;
// Give the user a beat to register that the code was copied before whisking them
// to Zalo.
const REDIRECT_SECONDS = 5;

export function StepConnectPool({ onLinked }: Props) {
  const [pool, setPool] = useState<PoolInfo | null>(null);
  const [fetched, setFetched] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const linkedRef = useRef(false);

  // Mobile/touch devices can't scan a QR shown on their own screen, so we hide it
  // there and lead with the one-tap hand-off instead. Pointer type is a more
  // reliable signal than user-agent sniffing.
  const [isTouch] = useState(
    () => typeof window !== "undefined" && !!window.matchMedia?.("(pointer: coarse)")?.matches
  );

  const fetchStatus = useCallback(async () => {
    try {
      const { data } = await api.get("/bot/status");
      setFetched(true);
      setPool(data.pool ?? null);
      if (data.pool?.status === "LINKED" && !linkedRef.current) {
        linkedRef.current = true;
        if (pollingRef.current) clearInterval(pollingRef.current);
        pollingRef.current = null;
        toast.success("Kết nối thành công 🎉");
        onLinked();
      }
    } catch {
      // keep polling
    }
  }, [onLinked]);

  useEffect(() => {
    fetchStatus();
    pollingRef.current = setInterval(fetchStatus, 3000);
    // When the user returns from Zalo, check immediately instead of waiting for
    // the next 3s tick — so the success state appears the moment they're back.
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchStatus();
    };
    document.addEventListener("visibilitychange", onVisible);
    const helpTimer = setTimeout(() => setShowHelp(true), HELP_DELAY_MS);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      document.removeEventListener("visibilitychange", onVisible);
      clearTimeout(helpTimer);
    };
  }, [fetchStatus]);

  // Drive the redirect countdown: tick down once a second, then hand off to Zalo.
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      if (pool?.botLink) window.location.href = pool.botLink;
      return;
    }
    const t = setTimeout(() => setCountdown((n) => (n === null ? null : n - 1)), 1000);
    return () => clearTimeout(t);
  }, [countdown, pool?.botLink]);

  const copyCode = async () => {
    if (!pool) return;
    try {
      await navigator.clipboard.writeText(pool.linkCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Đã chép mã liên kết");
    } catch {
      toast.error("Không sao chép được, hãy chọn mã thủ công");
    }
  };

  // "Truy cập BOT": copy the code inside the click gesture (required by mobile
  // browsers), confirm it, then count down before opening Zalo so the user knows
  // the code is on their clipboard.
  const goToBot = async () => {
    if (!pool?.botLink || countdown !== null) return;
    try {
      await navigator.clipboard.writeText(pool.linkCode);
      toast.success("Đã sao chép mã liên kết");
    } catch {
      // Clipboard blocked in this webview — the visible code + "Chép mã" button
      // remain as the fallback. Still proceed with the redirect.
    }
    setCountdown(REDIRECT_SECONDS);
  };

  const goNow = () => {
    if (pool?.botLink) window.location.href = pool.botLink;
  };

  const renderAccess = (label: string, variant: "default" | "outline" = "default") =>
    countdown === null ? (
      <Button onClick={goToBot} variant={variant} className="w-full" size="lg">
        <ExternalLink className="mr-1.5 size-4" />
        {label}
      </Button>
    ) : (
      <div className="space-y-2">
        <div className="flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-sm font-medium text-emerald-800">
          <RefreshCw className="size-4 animate-spin" />
          Đang chuyển tới Zalo sau {countdown}s…
        </div>
        <Button onClick={goNow} variant="outline" className="w-full" size="sm">
          Chuyển ngay
        </Button>
      </div>
    );

  const supportLink = (
    <Link
      to="/dashboard/contact"
      className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
    >
      <LifeBuoy className="size-3.5" /> Chưa kết nối được? Liên hệ hỗ trợ
    </Link>
  );

  if (!pool) {
    // Still waiting on the first status response → genuine loading.
    if (!fetched) {
      return (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            <RefreshCw className="mx-auto mb-2 size-4 animate-spin" /> Đang chuẩn bị bot cho bạn...
          </CardContent>
        </Card>
      );
    }
    // Fetched, but no bot is available yet (pool empty/full). Explain instead of
    // spinning forever; keep polling so it resolves automatically once ready.
    return (
      <Card>
        <CardContent className="space-y-3 p-6 text-center">
          <RefreshCw className="mx-auto size-5 animate-spin text-amber-500" />
          <p className="text-sm font-medium">Hệ thống đang chuẩn bị bot cho bạn</p>
          <p className="text-xs text-muted-foreground">
            Tất cả bot tạm thời đã đầy. Chúng tôi sẽ tự động cấp bot cho bạn ngay khi có chỗ —
            bạn có thể đợi tại đây hoặc quay lại sau ít phút.
          </p>
          <div className="pt-1">{supportLink}</div>
        </CardContent>
      </Card>
    );
  }

  const codeBox = (
    <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4 text-center">
      <p className="text-xs text-emerald-700">Mã liên kết của bạn</p>
      <p className="font-mono text-2xl font-bold tracking-[0.2em] text-emerald-900">{pool.linkCode}</p>
    </div>
  );

  const copyButton = (
    <Button onClick={copyCode} variant="outline" className="w-full" size="lg">
      {copied ? <Check className="mr-1.5 size-4" /> : <Copy className="mr-1.5 size-4" />}
      {copied ? "Đã chép" : "Chép mã"}
    </Button>
  );

  // Desktop: render the QR straight from the bot link (no admin upload needed).
  // Old pool bots without a link still fall back to the uploaded image.
  const desktopQr = pool.botLink ? (
    <div className="space-y-2 text-center">
      <div className="mx-auto inline-block rounded-xl border bg-white p-3">
        <QRCodeSVG value={pool.botLink} size={176} />
      </div>
      <p className="text-xs text-muted-foreground">Quét bằng Zalo trên điện thoại</p>
    </div>
  ) : pool.qrImageUrl ? (
    <div className="space-y-2 text-center">
      <img
        src={pool.qrImageUrl}
        alt="QR bot"
        className="mx-auto size-44 rounded-xl border object-contain"
      />
      <p className="text-xs text-muted-foreground">Quét bằng Zalo trên điện thoại</p>
    </div>
  ) : null;

  const waiting = (
    <div className="flex items-center justify-center gap-2 rounded-lg bg-muted/30 p-2.5 text-xs text-muted-foreground">
      <RefreshCw className="size-3 animate-spin" />
      <span>Đang chờ bạn gửi mã trong Zalo... màn hình sẽ tự cập nhật.</span>
    </div>
  );

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="space-y-1">
          <h2 className="font-heading text-lg font-bold">Kết nối bot của bạn</h2>
          <p className="text-sm text-muted-foreground">
            {isTouch
              ? "Chỉ 3 bước, mất khoảng 20 giây:"
              : "Quét mã QR bằng Zalo trên điện thoại, mở chat với bot rồi gửi mã liên kết bên dưới."}
          </p>
        </div>

        {isTouch ? (
          <>
            <ol className="space-y-1.5 text-sm">
              <li className="flex gap-2">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">1</span>
                <span>Bấm <b>“Truy cập BOT”</b> — mã tự sao chép &amp; tự mở Zalo.</span>
              </li>
              <li className="flex gap-2">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">2</span>
                <span>Trong Zalo, <b>bấm giữ</b> ô chat rồi chọn <b>Dán</b>.</span>
              </li>
              <li className="flex gap-2">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">3</span>
                <span><b>Gửi</b> tin nhắn. Xong! Quay lại đây, màn hình sẽ tự cập nhật.</span>
              </li>
            </ol>

            {pool.botLink && renderAccess("Truy cập BOT")}

            {codeBox}
            {copyButton}
          </>
        ) : (
          <>
            {desktopQr}
            {codeBox}
            {copyButton}
            {pool.botLink && renderAccess("Truy cập BOT trên máy này", "outline")}
          </>
        )}

        {waiting}

        {showHelp && <div className="text-center">{supportLink}</div>}
      </CardContent>
    </Card>
  );
}
