import { useCallback, useEffect, useMemo, useState } from "react";
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

  const handleVerified = useCallback(async () => {
    await refreshUser();
    setStep(4);
  }, [refreshUser]);

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
            onVerified={handleVerified}
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
