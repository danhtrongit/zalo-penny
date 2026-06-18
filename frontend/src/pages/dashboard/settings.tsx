import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHead } from "@/components/page-head";
import api from "@/lib/api";
import { parseApiError } from "@/lib/api-error";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Bot, Check, Wifi, WifiOff, PiggyBank, Handshake, Briefcase, Home, Dumbbell, Laugh, LogOut, type LucideIcon } from "lucide-react";
import { StepConnectPool } from "@/components/onboarding/step-connect-pool";

const personas: { value: string; label: string; desc: string; icon: LucideIcon }[] = [
  { value: "FRIEND", label: "Bạn thân", desc: "Thoải mái", icon: Handshake },
  { value: "ASSISTANT", label: "Trợ lý", desc: "Chuyên nghiệp", icon: Briefcase },
  { value: "HOMEMAKER", label: "Nội trợ", desc: "Tiết kiệm", icon: Home },
  { value: "COACH", label: "Coach", desc: "Kỷ luật", icon: Dumbbell },
  { value: "COMEDIAN", label: "Hề", desc: "Vui nhộn", icon: Laugh },
];

const sliderConfig = [
  { key: "tease" as const, label: "Cà khịa", low: "Nhẹ", high: "Mạnh" },
  { key: "serious" as const, label: "Nghiêm túc", low: "Vui", high: "Nghiêm" },
  { key: "frugal" as const, label: "Tiết kiệm", low: "Thoải", high: "Khắt" },
  { key: "emoji" as const, label: "Emoji", low: "Ít", high: "Nhiều" },
];

interface VerifyState {
  verifyId: string;
  code: string;
  polling: boolean;
}

type PoolStatus = {
  status: string;
  linkCode: string;
  id: string;
  label?: string | null;
  qrImageUrl?: string | null;
  botLink?: string | null;
} | null;

export default function SettingsPage() {
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const [botToken, setBotToken] = useState("");
  const [botStatus, setBotStatus] = useState<{
    config: any;
    running: boolean;
    polling: boolean;
    mode: string;
    ownedBotHealthy?: boolean;
    migratedFromOwned?: boolean;
    pool?: PoolStatus;
  } | null>(null);
  const [migrating, setMigrating] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [verifyState, setVerifyState] = useState<VerifyState | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [persona, setPersona] = useState({
    style: "FRIEND", tease: 3, serious: 3, frugal: 3, emoji: 3, displayName: "",
  });
  const [savingPersona, setSavingPersona] = useState(false);
  const [budgetAmount, setBudgetAmount] = useState("");
  const [savingBudget, setSavingBudget] = useState(false);

  useEffect(() => {
    api.get("/bot/status").then(({ data }) => setBotStatus(data));
    api.get("/persona").then(({ data }) => {
      setPersona({
        style: data.style || "FRIEND", tease: data.tease ?? 3,
        serious: data.serious ?? 3, frugal: data.frugal ?? 3,
        emoji: data.emoji ?? 3, displayName: data.displayName || "",
      });
    });
    api.get("/budgets").then(({ data }) => {
      const m = data.find((b: any) => b.type === "MONTHLY");
      if (m) setBudgetAmount(String(m.amount));
    });
  }, []);

  // Cleanup polling on unmount or when verifyState is cleared
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, []);

  const startPolling = (verifyId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      try {
        const { data } = await api.post("/bot/verify", { verifyId });
        if (data.verified) {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          setVerifyState(null);
          setBotToken("");
          toast.success("Kết nối bot thành công!");
          setBotStatus((await api.get("/bot/status")).data);
          await refreshUser();
        }
      } catch {
        // Ignore polling errors, will retry
      }
    }, 3000);
  };

  const handleConnectBot = async () => {
    if (!botToken.trim()) return;
    setConnecting(true);
    try {
      const { data } = await api.post("/bot/connect", { botToken });

      if (data.pendingVerification) {
        // Verification flow
        const newVerifyState: VerifyState = {
          verifyId: data.verifyId,
          code: data.verifyCode,
          polling: true,
        };
        setVerifyState(newVerifyState);
        startPolling(data.verifyId);
      } else {
        // Direct connect (legacy / dev mode)
        toast.success("Kết nối bot thành công!");
        setBotStatus((await api.get("/bot/status")).data);
        setBotToken("");
        await refreshUser();
      }
    } catch (err) {
      toast.error(parseApiError(err, "Không thể kết nối bot"));
    } finally { setConnecting(false); }
  };

  const handleCancelVerify = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setVerifyState(null);
  };

  const refetchStatus = async () => setBotStatus((await api.get("/bot/status")).data);

  const handleMigrate = async () => {
    setMigrating(true);
    try {
      await api.post("/bot/migrate-to-pool");
      toast.success("Đã tạo kết nối bot mới. Hãy gửi mã liên kết trên Zalo để hoàn tất.");
      await refetchStatus();
    } catch (err) {
      toast.error(parseApiError(err, "Không thể chuyển bot"));
      setMigrating(false);
    }
  };

  const handleDisconnectBot = async () => {
    try {
      await api.post("/bot/disconnect");
      toast.success("Đã ngắt kết nối bot");
      setBotStatus((await api.get("/bot/status")).data);
      await refreshUser();
    } catch (err) { toast.error(parseApiError(err, "Không thể ngắt kết nối")); }
  };

  const handleSavePersona = async () => {
    setSavingPersona(true);
    try {
      await api.put("/persona", persona);
      toast.success("Đã lưu cài đặt persona");
    } catch (err) {
      toast.error(parseApiError(err, "Không thể lưu"));
    } finally {
      setSavingPersona(false);
    }
  };

  const handleSaveBudget = async () => {
    if (!budgetAmount) return;
    setSavingBudget(true);
    try {
      await api.post("/budgets", { type: "MONTHLY", amount: parseInt(budgetAmount) });
      toast.success("Đã đặt ngân sách tháng");
    } catch (err) {
      toast.error(parseApiError(err, "Không thể đặt ngân sách"));
    } finally {
      setSavingBudget(false);
    }
  };

  const hasActiveSub = user?.subscription?.status === "ACTIVE";

  return (
    <div className="space-y-4 pt-4">
      <PageHead title="Cài Đặt" description="Cấu hình Zalo Bot, phong cách Penny và ngân sách" />
      <h1 className="font-heading text-xl font-bold sm:text-2xl">Cài đặt</h1>

      {/* Bot Connection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="size-4 text-primary" /> Kết nối Zalo Bot
          </CardTitle>
          <CardDescription className="text-xs">Nhập Bot Token từ Zalo Bot Platform</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!hasActiveSub && (
            <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
              Cần gói subscription để kết nối bot.
            </div>
          )}
          {botStatus?.config && botStatus.ownedBotHealthy === false && !botStatus.pool && !migrating && (
            <div className="space-y-2 rounded-xl border-2 border-red-300 bg-red-50 p-4">
              <div className="flex items-center gap-2 text-red-700">
                <WifiOff className="size-4" />
                <p className="text-sm font-semibold">Bot cá nhân của bạn đang lỗi (token hết hạn)</p>
              </div>
              <p className="text-xs text-red-700/80">
                Chuyển sang bot dùng chung ổn định — toàn bộ dữ liệu chi tiêu của bạn được giữ nguyên.
              </p>
              <Button size="sm" onClick={handleMigrate}>Chuyển sang bot mới</Button>
            </div>
          )}
          {botStatus?.pool ? (
            botStatus.pool.status === "LINKED" ? (
              <div className="flex items-center gap-2.5 rounded-lg border p-3">
                <Wifi className="size-4 shrink-0 text-emerald-500" />
                <div>
                  <p className="text-sm font-medium">Bot được cấp đang hoạt động</p>
                  <p className="text-xs text-muted-foreground">
                    Bạn đang dùng bot dùng chung{botStatus.pool.label ? ` · ${botStatus.pool.label}` : ""}
                  </p>
                </div>
              </div>
            ) : (
              <StepConnectPool onLinked={refetchStatus} />
            )
          ) : (botStatus?.running || botStatus?.polling) ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div className="flex items-center gap-2.5">
                <Wifi className="size-4 shrink-0 text-emerald-500" />
                <div>
                  <p className="text-sm font-medium">Bot đang hoạt động</p>
                  <p className="text-xs text-muted-foreground">
                    {botStatus.mode === "webhook" ? "Webhook" : "Polling"}
                    {botStatus.config?.connectedAt ? ` · ${new Date(botStatus.config.connectedAt).toLocaleString("vi-VN")}` : ""}
                  </p>
                </div>
              </div>
              <Button variant="destructive" size="sm" onClick={handleDisconnectBot}>
                <WifiOff className="mr-1 size-3" /> Ngắt
              </Button>
            </div>
          ) : verifyState ? (
            <div className="space-y-3 rounded-lg border-2 border-amber-300 bg-amber-50 p-4">
              <p className="text-sm font-medium">Xác minh quyền sở hữu bot</p>
              <p className="text-xs text-muted-foreground">
                Mở Zalo và gửi tin nhắn sau tới bot của bạn:
              </p>
              <div className="flex items-center justify-center gap-2 rounded-lg bg-white p-3 font-mono text-2xl font-bold tracking-widest">
                {verifyState.code}
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Đang chờ bạn gửi mã...
              </p>
              <Button variant="outline" size="sm" className="w-full" onClick={handleCancelVerify}>
                Hủy
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input placeholder="Bot Token..." value={botToken} onChange={(e) => setBotToken(e.target.value)} disabled={!hasActiveSub} />
              <Button onClick={handleConnectBot} disabled={connecting || !hasActiveSub}>
                {connecting ? "..." : "Kết nối"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Persona */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Phong cách Penny</CardTitle>
          <CardDescription className="text-xs">Chọn cách Penny nói chuyện</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Tên xưng hô</Label>
            <Input value={persona.displayName} onChange={(e) => setPersona({ ...persona, displayName: e.target.value })} placeholder="Penny gọi bạn là..." />
          </div>

          <RadioGroup value={persona.style} onValueChange={(v) => setPersona({ ...persona, style: v })} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {personas.map((p) => (
              <div key={p.value} className="relative">
                <RadioGroupItem value={p.value} id={p.value} className="peer sr-only" />
                <Label htmlFor={p.value} className="flex cursor-pointer flex-col items-center gap-0.5 rounded-lg border-2 p-3 text-center transition-colors peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5">
                  <p.icon className="size-6 text-primary" />
                  <span className="text-xs font-medium">{p.label}</span>
                  <span className="text-[10px] text-muted-foreground">{p.desc}</span>
                </Label>
              </div>
            ))}
          </RadioGroup>

          <Separator />

          <div className="space-y-4">
            {sliderConfig.map((s) => (
              <div key={s.key} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{s.label}</span>
                  <Badge variant="outline" className="px-1.5 py-0 text-[10px]">{persona[s.key]}/5</Badge>
                </div>
                <Slider value={[persona[s.key]]} onValueChange={([v]) => setPersona({ ...persona, [s.key]: v })} min={1} max={5} step={1} />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>{s.low}</span><span>{s.high}</span>
                </div>
              </div>
            ))}
          </div>

          <Button onClick={handleSavePersona} disabled={savingPersona} className="w-full">
            <Check className="mr-1.5 size-3.5" />
            {savingPersona ? "Đang lưu..." : "Lưu persona"}
          </Button>
        </CardContent>
      </Card>

      {/* Budget */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <PiggyBank className="size-4 text-primary" /> Ngân sách tháng
          </CardTitle>
          <CardDescription className="text-xs">Đặt hạn mức chi tiêu hàng tháng</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input type="number" placeholder="Ví dụ: 5000000" value={budgetAmount} onChange={(e) => setBudgetAmount(e.target.value)} />
            <Button onClick={handleSaveBudget} disabled={savingBudget}>
              {savingBudget ? "..." : "Lưu"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Account */}
      <Button
        variant="destructive"
        className="w-full"
        onClick={() => {
          logout();
          navigate("/login", { replace: true });
        }}
      >
        <LogOut className="mr-1.5 size-4" /> Đăng xuất
      </Button>
    </div>
  );
}
