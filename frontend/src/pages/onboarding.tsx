import { useCallback, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { PageHead } from "@/components/page-head";
import { OnboardingProgressBar } from "@/components/onboarding/progress-bar";
import { StepCreateBot } from "@/components/onboarding/step-create-bot";
import { StepPasteToken } from "@/components/onboarding/step-paste-token";
import { StepVerify } from "@/components/onboarding/step-verify";
import { StepPersonalize } from "@/components/onboarding/step-personalize";
import { StepConnectPool } from "@/components/onboarding/step-connect-pool";

interface BotInfo {
  id?: string;
  username?: string;
  display_name?: string;
}

const POOL_LABELS = ["Kết nối", "Cá nhân hoá"];

export default function OnboardingPage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  // Default to the pre-provisioned pool bot. Users who already own a bot, or who
  // opt into the advanced path, use the 4-step self-bot flow.
  const isOwned = user?.botConnection?.kind === "OWNED";
  const [mode, setMode] = useState<"pool" | "self">(isOwned ? "self" : "pool");

  // self-bot flow state
  const [selfStep, setSelfStep] = useState<1 | 2 | 3 | 4>(1);
  const [verifyId, setVerifyId] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [botInfo, setBotInfo] = useState<BotInfo | null>(null);
  // pool flow state
  const [poolDone, setPoolDone] = useState(false);

  const firstName = user?.name?.trim().split(/\s+/).pop() ?? "Bạn";
  const suggestedName = `Bot Penny ${firstName}`;

  const finish = useCallback(async () => {
    await refreshUser();
    navigate("/dashboard");
  }, [refreshUser, navigate]);

  const poolCurrent = (poolDone ? 2 : 1) as 1 | 2 | 3 | 4;

  // No active plan → nothing to set up yet; send them to buy a plan first.
  if (user && user.subscription?.status !== "ACTIVE") {
    return <Navigate to="/pricing" replace />;
  }

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

        {mode === "pool" ? (
          <>
            <OnboardingProgressBar current={poolCurrent} labels={POOL_LABELS} />
            {!poolDone ? (
              <StepConnectPool onLinked={async () => { await refreshUser(); setPoolDone(true); }} />
            ) : (
              <StepPersonalize onFinish={finish} />
            )}
            <div className="text-center">
              <button
                onClick={() => setMode("self")}
                className="text-xs text-muted-foreground hover:text-primary hover:underline"
              >
                Tự kết nối bot riêng (nâng cao)
              </button>
            </div>
          </>
        ) : (
          <>
            <OnboardingProgressBar current={selfStep} />
            {selfStep === 1 && (
              <StepCreateBot suggestedName={suggestedName} onNext={() => setSelfStep(2)} />
            )}
            {selfStep === 2 && (
              <StepPasteToken
                onBack={() => setSelfStep(1)}
                onConnected={({ verifyId: vid, verifyCode: vc, botInfo: bi }) => {
                  setVerifyId(vid);
                  setVerifyCode(vc);
                  setBotInfo(bi);
                  setSelfStep(3);
                }}
              />
            )}
            {selfStep === 3 && (
              <StepVerify
                verifyId={verifyId}
                verifyCode={verifyCode}
                botInfo={botInfo}
                onVerified={async () => {
                  await refreshUser();
                  setSelfStep(4);
                }}
                onReset={() => {
                  setVerifyId("");
                  setVerifyCode("");
                  setBotInfo(null);
                  setSelfStep(2);
                }}
              />
            )}
            {selfStep === 4 && <StepPersonalize onFinish={finish} />}
            {!isOwned && (
              <div className="text-center">
                <button
                  onClick={() => setMode("pool")}
                  className="text-xs text-muted-foreground hover:text-primary hover:underline"
                >
                  Dùng bot được cấp sẵn (khuyên dùng)
                </button>
              </div>
            )}
          </>
        )}

        <div className="text-center">
          <button
            onClick={() => navigate("/dashboard")}
            className="text-xs text-muted-foreground hover:text-primary hover:underline"
          >
            Bỏ qua, làm sau ở Cài đặt
          </button>
        </div>
      </div>
    </div>
  );
}
