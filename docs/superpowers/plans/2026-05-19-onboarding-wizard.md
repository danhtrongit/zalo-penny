# Onboarding Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace static `/payment/success` instruction page with a 4-step interactive onboarding wizard at `/onboarding` that auto-detects clipboard tokens, provides deep links to Zalo, and inline-collects persona + budget — reducing first-time setup friction.

**Architecture:** Pure frontend change (backend already returns `botInfo` from `/bot/connect`). Wizard state held in component + localStorage for resume-on-refresh. Route guard in `ProtectedRoute` auto-redirects users with active subscription but inactive bot to `/onboarding`. Deep links use `https://zalo.me/<slug>` URI (no scheme detection needed; Zalo intercepts http URLs on mobile).

**Tech Stack:** React 19 + Vite + TypeScript + shadcn/ui + Tailwind + sonner toasts + react-router-dom v6.

**Spec:** [docs/superpowers/specs/2026-05-19-onboarding-wizard-design.md](../specs/2026-05-19-onboarding-wizard-design.md)

---

## File Structure

**New files:**
- `frontend/src/lib/is-mobile.ts` — UA-based mobile detection helper
- `frontend/src/hooks/use-clipboard-detect.ts` — read clipboard on focus, validate token shape
- `frontend/src/components/onboarding/progress-bar.tsx` — 4-dot progress indicator
- `frontend/src/components/onboarding/step-create-bot.tsx` — Step 1
- `frontend/src/components/onboarding/step-paste-token.tsx` — Step 2
- `frontend/src/components/onboarding/step-verify.tsx` — Step 3
- `frontend/src/components/onboarding/step-personalize.tsx` — Step 4
- `frontend/src/pages/onboarding.tsx` — wizard host

**Modified files:**
- `frontend/src/App.tsx` — register `/onboarding` route, point `/payment/success` to it, add route guard logic in `ProtectedRoute`

**Deleted files:**
- `frontend/src/pages/payment-success.tsx`

---

## Task 1: Mobile detection helper

**Files:**
- Create: `frontend/src/lib/is-mobile.ts`

- [ ] **Step 1: Create helper**

```ts
export function isMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}
```

---

## Task 2: Clipboard detect hook

**Files:**
- Create: `frontend/src/hooks/use-clipboard-detect.ts`

- [ ] **Step 1: Implement hook**

```ts
import { useEffect, useRef } from "react";

const TOKEN_PATTERN = /^[A-Za-z0-9_:\-]{20,}$/;

export function useClipboardDetect(onDetect: (text: string) => void, enabled: boolean) {
  const lastSeen = useRef<string>("");

  useEffect(() => {
    if (!enabled) return;

    const tryRead = async () => {
      if (!navigator.clipboard?.readText) return;
      try {
        const text = (await navigator.clipboard.readText()).trim();
        if (!text || text === lastSeen.current) return;
        if (!TOKEN_PATTERN.test(text)) return;
        lastSeen.current = text;
        onDetect(text);
      } catch {
        // permission denied — silent fallback
      }
    };

    tryRead();
    window.addEventListener("focus", tryRead);
    return () => window.removeEventListener("focus", tryRead);
  }, [onDetect, enabled]);
}
```

**Why this pattern:** Clipboard API requires user-gesture or document focus. We attempt read on mount + every window focus event. Permission denials are silent — UI must still show a manual paste fallback.

---

## Task 3: Progress bar component

**Files:**
- Create: `frontend/src/components/onboarding/progress-bar.tsx`

- [ ] **Step 1: Implement**

```tsx
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  current: 1 | 2 | 3 | 4;
  labels?: string[];
}

const DEFAULT_LABELS = ["Tạo bot", "Dán token", "Xác minh", "Cá nhân hoá"];

export function OnboardingProgressBar({ current, labels = DEFAULT_LABELS }: ProgressBarProps) {
  return (
    <div className="flex w-full items-center gap-1.5">
      {labels.map((label, idx) => {
        const step = (idx + 1) as 1 | 2 | 3 | 4;
        const done = step < current;
        const active = step === current;
        return (
          <div key={label} className="flex flex-1 flex-col items-center gap-1">
            <div
              className={cn(
                "flex size-7 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                done && "bg-emerald-500 text-white",
                active && "bg-primary text-primary-foreground ring-4 ring-primary/15",
                !done && !active && "bg-muted text-muted-foreground"
              )}
            >
              {done ? <Check className="size-3.5" /> : step}
            </div>
            <span className={cn(
              "text-[10px] text-center leading-tight",
              active ? "font-medium text-foreground" : "text-muted-foreground"
            )}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
```

---

## Task 4: Step 1 — Create bot

**Files:**
- Create: `frontend/src/components/onboarding/step-create-bot.tsx`

- [ ] **Step 1: Implement**

```tsx
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, Copy, Check, ExternalLink, ArrowRight } from "lucide-react";
import { isMobile } from "@/lib/is-mobile";
import { toast } from "sonner";

interface StepCreateBotProps {
  suggestedName: string;
  onNext: () => void;
}

const ZALO_BOT_MANAGER_URL = "https://zalo.me/zbot-creator";
const ZALO_BOT_MANAGER_QR = "https://bot.zapps.me/images/zbot-creator_qrcode.jpg";

export function StepCreateBot({ suggestedName, onNext }: StepCreateBotProps) {
  const [copied, setCopied] = useState(false);
  const mobile = isMobile();

  const handleCopyName = async () => {
    try {
      await navigator.clipboard.writeText(suggestedName);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Đã sao chép tên bot");
    } catch {
      toast.error("Trình duyệt không cho phép sao chép. Hãy chọn và copy thủ công.");
    }
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="space-y-1">
          <h2 className="font-heading text-lg font-bold">Tạo bot trên Zalo</h2>
          <p className="text-sm text-muted-foreground">
            Mở Zalo Bot Manager để tạo bot mới. Tên bot phải bắt đầu bằng "Bot".
          </p>
        </div>

        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
          <p className="text-xs font-medium text-muted-foreground">Tên gợi ý:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-background px-2.5 py-1.5 font-mono text-sm">
              {suggestedName}
            </code>
            <Button size="sm" variant="outline" onClick={handleCopyName}>
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              <span className="ml-1.5 text-xs">{copied ? "Đã chép" : "Chép"}</span>
            </Button>
          </div>
        </div>

        {mobile ? (
          <div className="space-y-3">
            <Button asChild className="w-full" size="lg">
              <a href={ZALO_BOT_MANAGER_URL} target="_blank" rel="noopener noreferrer">
                <Bot className="mr-1.5 size-4" />
                Mở Zalo Bot Manager
                <ExternalLink className="ml-1.5 size-3.5" />
              </a>
            </Button>
            <details className="rounded-lg border bg-muted/20 p-3 text-xs">
              <summary className="cursor-pointer text-muted-foreground">
                Không mở được? Xem QR
              </summary>
              <div className="mt-2 flex justify-center">
                <img src={ZALO_BOT_MANAGER_QR} alt="QR Zalo Bot Manager" className="size-40 rounded-lg border bg-white p-2" />
              </div>
            </details>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-lg border bg-white p-3">
            <img src={ZALO_BOT_MANAGER_QR} alt="QR Zalo Bot Manager" className="size-44 rounded" />
            <p className="text-center text-xs text-muted-foreground">
              Quét QR bằng điện thoại để mở Zalo Bot Manager
            </p>
          </div>
        )}

        <ol className="space-y-1.5 text-sm text-muted-foreground">
          <li>1. Mở Zalo Bot Manager (link/QR ở trên)</li>
          <li>2. Chọn "Tạo bot" → nhập tên (dán tên gợi ý)</li>
          <li>3. Nhận Bot Token qua tin nhắn Zalo → copy</li>
        </ol>

        <Button onClick={onNext} className="w-full" variant="default">
          Tôi đã có Bot Token
          <ArrowRight className="ml-1.5 size-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
```

---

## Task 5: Step 2 — Paste token

**Files:**
- Create: `frontend/src/components/onboarding/step-paste-token.tsx`

- [ ] **Step 1: Implement**

```tsx
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClipboardPaste, ArrowLeft, Sparkles } from "lucide-react";
import { useClipboardDetect } from "@/hooks/use-clipboard-detect";
import { toast } from "sonner";
import api from "@/lib/api";
import { parseApiError } from "@/lib/api-error";

interface StepPasteTokenProps {
  onConnected: (data: { verifyId: string; verifyCode: string; botInfo: any }) => void;
  onBack: () => void;
}

export function StepPasteToken({ onConnected, onBack }: StepPasteTokenProps) {
  const [token, setToken] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);

  useClipboardDetect((text) => {
    if (token) return;
    setToken(text);
    setAutoFilled(true);
  }, !token && !connecting);

  const handlePasteClick = async () => {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (text) {
        setToken(text);
        setAutoFilled(true);
      }
    } catch {
      toast.info("Trình duyệt không cho phép dán tự động. Hãy dán thủ công vào ô bên dưới.");
    }
  };

  const handleConnect = async () => {
    if (!token.trim()) {
      toast.error("Vui lòng dán Bot Token");
      return;
    }
    setConnecting(true);
    try {
      const { data } = await api.post("/bot/connect", { botToken: token.trim() });
      if (data.pendingVerification) {
        onConnected({
          verifyId: data.verifyId,
          verifyCode: data.verifyCode,
          botInfo: data.botInfo,
        });
      } else {
        toast.success("Kết nối bot thành công!");
        onConnected({
          verifyId: "",
          verifyCode: "",
          botInfo: data.botInfo,
        });
      }
    } catch (err) {
      toast.error(parseApiError(err, "Token không hợp lệ. Kiểm tra lại và thử lại."));
    } finally {
      setConnecting(false);
    }
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="space-y-1">
          <h2 className="font-heading text-lg font-bold">Dán Bot Token</h2>
          <p className="text-sm text-muted-foreground">
            Dán token bạn nhận được từ Zalo Bot Manager.
          </p>
        </div>

        {autoFilled && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-800">
            <Sparkles className="size-3.5 shrink-0" />
            <span>Phát hiện token trong clipboard, đã tự điền</span>
          </div>
        )}

        <Button onClick={handlePasteClick} variant="outline" size="lg" className="w-full">
          <ClipboardPaste className="mr-1.5 size-4" />
          Dán từ clipboard
        </Button>

        <div className="relative">
          <Input
            placeholder="Hoặc dán thủ công vào đây..."
            value={token}
            onChange={(e) => {
              setToken(e.target.value);
              setAutoFilled(false);
            }}
            className="font-mono text-xs"
            disabled={connecting}
          />
        </div>

        <div className="flex gap-2">
          <Button variant="ghost" onClick={onBack} disabled={connecting}>
            <ArrowLeft className="mr-1 size-3.5" />
            Quay lại
          </Button>
          <Button onClick={handleConnect} disabled={connecting || !token.trim()} className="flex-1">
            {connecting ? "Đang kết nối..." : "Kết nối bot"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## Task 6: Step 3 — Verify

**Files:**
- Create: `frontend/src/components/onboarding/step-verify.tsx`

- [ ] **Step 1: Implement**

```tsx
import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check, ExternalLink, RefreshCw } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { isMobile } from "@/lib/is-mobile";

interface StepVerifyProps {
  verifyId: string;
  verifyCode: string;
  botInfo: { id?: string; username?: string; display_name?: string } | null;
  onVerified: () => void;
  onReset: () => void;
}

export function StepVerify({ verifyId, verifyCode, botInfo, onVerified, onReset }: StepVerifyProps) {
  const [copied, setCopied] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const formatted = `Xác minh: ${verifyCode}`;
  const botChatLink = botInfo?.username
    ? `https://zalo.me/${botInfo.username}`
    : null;

  useEffect(() => {
    if (!verifyId) {
      onVerified();
      return;
    }
    pollingRef.current = setInterval(async () => {
      try {
        const { data } = await api.post("/bot/verify", { verifyId });
        if (data.verified) {
          if (pollingRef.current) clearInterval(pollingRef.current);
          pollingRef.current = null;
          onVerified();
        }
      } catch {
        // ignore — keep polling
      }
    }, 3000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [verifyId, onVerified]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formatted);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Đã chép mã xác minh");
    } catch {
      toast.error("Không sao chép được, hãy chọn mã thủ công");
    }
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="space-y-1">
          <h2 className="font-heading text-lg font-bold">Xác minh sở hữu bot</h2>
          <p className="text-sm text-muted-foreground">
            Gửi mã sau vào chat với bot trên Zalo để xác minh bạn sở hữu bot này.
          </p>
        </div>

        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-5 text-center">
          <p className="text-xs text-amber-700">Mã xác minh</p>
          <p className="font-mono text-3xl font-bold tracking-[0.4em] text-amber-900">
            {verifyCode}
          </p>
        </div>

        <Button onClick={handleCopy} variant="outline" className="w-full" size="lg">
          {copied ? <Check className="mr-1.5 size-4" /> : <Copy className="mr-1.5 size-4" />}
          {copied ? "Đã chép" : `Chép "${formatted}"`}
        </Button>

        {botChatLink && isMobile() && (
          <Button asChild className="w-full" size="lg">
            <a href={botChatLink} target="_blank" rel="noopener noreferrer">
              Mở chat với bot trên Zalo
              <ExternalLink className="ml-1.5 size-3.5" />
            </a>
          </Button>
        )}

        <div className="flex items-center justify-center gap-2 rounded-lg bg-muted/30 p-2.5 text-xs text-muted-foreground">
          <RefreshCw className="size-3 animate-spin" />
          <span>Đang chờ bạn gửi mã trên Zalo...</span>
        </div>

        <Button variant="ghost" onClick={onReset} className="w-full text-xs text-muted-foreground">
          Có vấn đề? Bắt đầu lại
        </Button>
      </CardContent>
    </Card>
  );
}
```

---

## Task 7: Step 4 — Personalize

**Files:**
- Create: `frontend/src/components/onboarding/step-personalize.tsx`

- [ ] **Step 1: Implement**

```tsx
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Handshake, Briefcase, Home, Dumbbell, Laugh, PiggyBank, Check, type LucideIcon } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

interface StepPersonalizeProps {
  defaultName?: string;
  onFinish: () => void;
}

const PERSONAS: { value: string; label: string; desc: string; icon: LucideIcon }[] = [
  { value: "FRIEND", label: "Bạn thân", desc: "Thoải mái", icon: Handshake },
  { value: "ASSISTANT", label: "Trợ lý", desc: "Chuyên nghiệp", icon: Briefcase },
  { value: "HOMEMAKER", label: "Nội trợ", desc: "Tiết kiệm", icon: Home },
  { value: "COACH", label: "Coach", desc: "Kỷ luật", icon: Dumbbell },
  { value: "COMEDIAN", label: "Hề", desc: "Vui nhộn", icon: Laugh },
];

const BUDGET_PRESETS = [3_000_000, 5_000_000, 10_000_000];

export function StepPersonalize({ defaultName, onFinish }: StepPersonalizeProps) {
  const [style, setStyle] = useState("FRIEND");
  const [displayName, setDisplayName] = useState(defaultName ?? "");
  const [budget, setBudget] = useState<number>(5_000_000);
  const [saving, setSaving] = useState(false);

  const save = async (skip: boolean) => {
    setSaving(true);
    try {
      await Promise.all([
        api.put("/persona", {
          style,
          tease: 3,
          serious: 3,
          frugal: 3,
          emoji: 3,
          displayName: displayName || undefined,
        }),
        api.post("/budgets", { type: "MONTHLY", amount: budget }),
      ]);
      if (!skip) toast.success("Hoàn tất! Chào mừng bạn đến với Penny 🎉");
      onFinish();
    } catch (err) {
      toast.error("Không thể lưu, thử lại sau");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent className="space-y-5 p-5">
        <div className="space-y-1">
          <h2 className="font-heading text-lg font-bold">Cá nhân hoá Penny</h2>
          <p className="text-sm text-muted-foreground">
            Tuỳ chọn phong cách + ngân sách. Có thể đổi sau ở Cài đặt.
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Penny gọi bạn là gì?</Label>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Ví dụ: Anh, Chị, Em..."
            className="text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Phong cách Penny</Label>
          <RadioGroup value={style} onValueChange={setStyle} className="grid grid-cols-3 gap-2">
            {PERSONAS.map((p) => (
              <div key={p.value} className="relative">
                <RadioGroupItem value={p.value} id={`persona-${p.value}`} className="peer sr-only" />
                <Label
                  htmlFor={`persona-${p.value}`}
                  className="flex cursor-pointer flex-col items-center gap-0.5 rounded-lg border-2 p-3 text-center transition-colors peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                >
                  <p.icon className="size-5 text-primary" />
                  <span className="text-xs font-medium">{p.label}</span>
                  <span className="text-[10px] text-muted-foreground">{p.desc}</span>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-1.5 text-xs">
            <PiggyBank className="size-3.5 text-primary" /> Ngân sách tháng
          </Label>
          <div className="grid grid-cols-3 gap-2">
            {BUDGET_PRESETS.map((amount) => (
              <Button
                key={amount}
                type="button"
                variant={budget === amount ? "default" : "outline"}
                size="sm"
                onClick={() => setBudget(amount)}
                className="text-xs"
              >
                {(amount / 1_000_000).toFixed(0)}tr
              </Button>
            ))}
          </div>
          <Input
            type="number"
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value) || 0)}
            placeholder="Tuỳ chỉnh (VND)"
            className="text-sm"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="ghost" onClick={() => save(true)} disabled={saving} className="flex-1">
            Bỏ qua, để sau
          </Button>
          <Button onClick={() => save(false)} disabled={saving} className="flex-1">
            <Check className="mr-1.5 size-4" />
            {saving ? "Đang lưu..." : "Hoàn tất"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## Task 8: Onboarding wizard host page

**Files:**
- Create: `frontend/src/pages/onboarding.tsx`

- [ ] **Step 1: Implement**

```tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { PageHead } from "@/components/page-head";
import { OnboardingProgressBar } from "@/components/onboarding/progress-bar";
import { StepCreateBot } from "@/components/onboarding/step-create-bot";
import { StepPasteToken } from "@/components/onboarding/step-paste-token";
import { StepVerify } from "@/components/onboarding/step-verify";
import { StepPersonalize } from "@/components/onboarding/step-personalize";

type Step = 1 | 2 | 3 | 4;

interface BotInfo {
  id?: string;
  username?: string;
  display_name?: string;
}

interface PersistedState {
  step: Step;
  verifyId?: string;
  verifyCode?: string;
  botInfo?: BotInfo;
}

const STORAGE_KEY = "penny_onboarding_state";

function loadState(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveState(state: PersistedState | null) {
  if (state) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  else localStorage.removeItem(STORAGE_KEY);
}

export default function OnboardingPage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const initial = useMemo(() => loadState() ?? { step: 1 as Step }, []);
  const [step, setStep] = useState<Step>(initial.step);
  const [verifyId, setVerifyId] = useState(initial.verifyId ?? "");
  const [verifyCode, setVerifyCode] = useState(initial.verifyCode ?? "");
  const [botInfo, setBotInfo] = useState<BotInfo | null>(initial.botInfo ?? null);

  useEffect(() => {
    saveState({ step, verifyId, verifyCode, botInfo: botInfo ?? undefined });
  }, [step, verifyId, verifyCode, botInfo]);

  const firstName = user?.name?.trim().split(/\s+/).pop() ?? "Bạn";
  const suggestedName = `Bot Penny ${firstName}`;

  return (
    <div className="min-h-svh bg-gradient-to-b from-emerald-50/50 to-background px-4 py-6 sm:py-10">
      <PageHead title="Thiết lập Penny" description="Kết nối Zalo Bot trong vài bước" />
      <div className="mx-auto max-w-md space-y-5">
        <div className="space-y-2 text-center">
          <h1 className="font-heading text-2xl font-bold">Thiết lập Penny</h1>
          <p className="text-sm text-muted-foreground">
            Chỉ vài bước để bot bắt đầu giúp bạn ghi chi tiêu
          </p>
        </div>

        <OnboardingProgressBar current={step} />

        {step === 1 && (
          <StepCreateBot suggestedName={suggestedName} onNext={() => setStep(2)} />
        )}
        {step === 2 && (
          <StepPasteToken
            onBack={() => setStep(1)}
            onConnected={({ verifyId: vid, verifyCode: vc, botInfo: bi }) => {
              setVerifyId(vid);
              setVerifyCode(vc);
              setBotInfo(bi);
              setStep(3);
            }}
          />
        )}
        {step === 3 && (
          <StepVerify
            verifyId={verifyId}
            verifyCode={verifyCode}
            botInfo={botInfo}
            onVerified={async () => {
              await refreshUser();
              setStep(4);
            }}
            onReset={() => {
              setVerifyId("");
              setVerifyCode("");
              setBotInfo(null);
              setStep(2);
            }}
          />
        )}
        {step === 4 && (
          <StepPersonalize
            defaultName=""
            onFinish={async () => {
              saveState(null);
              await refreshUser();
              navigate("/dashboard");
            }}
          />
        )}

        <div className="text-center">
          <button
            onClick={() => {
              saveState(null);
              navigate("/dashboard");
            }}
            className="text-xs text-muted-foreground hover:text-primary hover:underline"
          >
            Bỏ qua, làm sau ở Cài đặt
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## Task 9: Wire routes + route guard + remove payment-success

**Files:**
- Modify: `frontend/src/App.tsx`
- Delete: `frontend/src/pages/payment-success.tsx`

- [ ] **Step 1: Edit App.tsx — replace payment-success import + route + ProtectedRoute logic**

Replace `import PaymentSuccessPage from "@/pages/payment-success";` with `import OnboardingPage from "@/pages/onboarding";`.

Add `import { useLocation } from "react-router-dom";` at top of file.

Rewrite `ProtectedRoute`:

```tsx
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="flex h-svh items-center justify-center text-sm text-muted-foreground">Loading...</div>;
  if (!user) return <Navigate to="/login" />;

  const needsOnboarding =
    user.subscription?.status === "ACTIVE" && !user.botConfig?.isActive;
  const onboardingSafe =
    location.pathname === "/onboarding" || location.pathname === "/dashboard/contact";
  if (needsOnboarding && !onboardingSafe) {
    return <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
}
```

Replace the `<Route path="/payment/success" ... />` line with two routes:

```tsx
<Route path="/payment/success" element={<Navigate to="/onboarding" replace />} />
<Route
  path="/onboarding"
  element={
    <ProtectedRoute>
      <OnboardingPage />
    </ProtectedRoute>
  }
/>
```

- [ ] **Step 2: Delete unused payment-success page**

```bash
rm frontend/src/pages/payment-success.tsx
```

---

## Task 10: Local build + smoke check

- [ ] **Step 1: Backend typecheck**

```bash
cd backend && npm run typecheck
```

Expected: clean.

- [ ] **Step 2: Frontend typecheck + build**

```bash
cd frontend && npm run build
```

Expected: clean. Reports bundle sizes.

- [ ] **Step 3: Spot-check by reading the produced bundle index.html for hashed assets (optional)**

```bash
ls frontend/dist/assets/ | head -5
```

---

## Task 11: Commit + push

- [ ] **Step 1: Stage + commit**

```bash
git add docs/superpowers/specs/2026-05-19-onboarding-wizard-design.md \
        docs/superpowers/plans/2026-05-19-onboarding-wizard.md \
        frontend/src/lib/is-mobile.ts \
        frontend/src/hooks/use-clipboard-detect.ts \
        frontend/src/components/onboarding/ \
        frontend/src/pages/onboarding.tsx \
        frontend/src/App.tsx
git rm frontend/src/pages/payment-success.tsx
git commit -m "feat(frontend): onboarding wizard for first-time bot setup

Replaces static /payment/success instruction page with an interactive
4-step wizard at /onboarding:
  1. Create bot on Zalo (deep link/QR + copy suggested name)
  2. Paste token (clipboard auto-detect)
  3. Verify ownership (formatted code + deep link to bot chat)
  4. Personalize (persona + budget inline)

ProtectedRoute redirects users with active subscription but inactive
bot to /onboarding so they cannot get lost in the dashboard.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 2: Push**

```bash
git push origin main
```

---

## Task 12: Deploy to VPS

- [ ] **Step 1: Pull on VPS + frontend build**

```bash
ssh root@160.22.123.174 'set -e; cd /www/wwwroot/pennybot.vn/app && git pull && cd frontend && npm ci && npm run build && echo "BUILD_OK"'
```

Expected: ends with `BUILD_OK`.

- [ ] **Step 2: Verify nginx sees the new bundle**

```bash
ssh root@160.22.123.174 'ls -la /www/wwwroot/pennybot.vn/app/frontend/dist/index.html /www/wwwroot/pennybot.vn/app/frontend/dist/assets/ | head -10'
```

(No pm2 restart needed: backend unchanged.)

- [ ] **Step 3: HTTPS smoke**

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://pennybot.vn/
curl -s -o /dev/null -w "%{http_code}\n" https://pennybot.vn/onboarding
```

Expected: `200` both (SPA fallback serves index.html for /onboarding).

---

## Self-Review

**1. Spec coverage:**
- Wizard 1-trang, 4 step → Tasks 4-8 ✓
- Clipboard auto-detect → Task 2 + 5 ✓
- Deep link mobile + QR desktop → Task 4 + 6 (isMobile in Task 1) ✓
- Suggested bot name → Task 8 (`Bot Penny ${firstName}`) ✓
- Formatted verify message → Task 6 (`Xác minh: ${verifyCode}`) ✓
- Persona + budget inline → Task 7 ✓
- Route guard → Task 9 ✓
- Resume on refresh (localStorage) → Task 8 ✓
- Delete payment-success → Task 9 step 2 ✓
- Build + deploy → Task 10-12 ✓

**2. Placeholder scan:** No TBDs. Every step has concrete code or commands.

**3. Type consistency:** `BotInfo` shape `{ id?, username?, display_name? }` consistent across Tasks 5/6/8. Step props use matching field names (`verifyId`, `verifyCode`, `botInfo`).
