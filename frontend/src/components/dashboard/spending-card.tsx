import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import happyBot from "@/assets/happy.png";
import angryBot from "@/assets/angry.png";

interface SpendingCardProps {
  title: string;
  subtitle: string;
  amount: number;
  budgetTotal?: number;
  budgetUsed?: number;
  message?: string;
  stacked?: boolean;
}

function formatMoney(n: number) {
  return n.toLocaleString("vi-VN");
}

function getBudgetMessage(percentage: number) {
  if (percentage < 30) return "Chi tiêu hợp lý lắm!";
  if (percentage < 50) return "Đang ổn nè!";
  if (percentage < 70) return "Cẩn thận chút nha!";
  if (percentage < 90) return "Sắp cháy ví rồi!";
  return "Vượt ngân sách rồi!";
}

export function SpendingCard({
  title,
  subtitle,
  amount,
  budgetTotal,
  budgetUsed,
  message,
  stacked = true,
}: SpendingCardProps) {
  const [showAmount, setShowAmount] = useState(true);

  const rawPct = budgetTotal && budgetUsed
    ? Math.round((budgetUsed / budgetTotal) * 100)
    : 0;
  const budgetPct = Math.min(100, rawPct);
  const overBudget = rawPct > 100;

  const displayMessage = message || (budgetTotal ? getBudgetMessage(rawPct) : "Bắt đầu ghi chi tiêu nào!");
  const tooltipOnLeft = budgetPct < 70;

  return (
    <div className="relative">
      {/* Stacked flap hints — each layer is narrower and peeks higher
          above the main card, signaling there are more cards in the stack */}
      {stacked && (
        <>
          <div className="absolute inset-x-16 top-0 h-9 rounded-t-3xl bg-[#0f583e]" />
          <div className="absolute inset-x-10 top-5 h-9 rounded-t-3xl bg-[#249974]" />
          <div className="absolute inset-x-4 top-10 h-9 rounded-t-3xl bg-[#3aab7e]" />
        </>
      )}

      {/* Main card */}
      <div
        className={`relative overflow-visible rounded-3xl px-6 pt-6 pb-5 text-white ${
          stacked ? "mt-16" : ""
        }`}
        style={{
          background: "linear-gradient(135deg, #0e8c7c 0%, #6ec046 100%)",
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider opacity-95">
              {title}
            </p>
            <p className="mt-1 text-sm font-bold text-[#ffeb3b]">
              {subtitle}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <span className="font-heading text-2xl font-extrabold sm:text-3xl">
                {showAmount ? `${formatMoney(amount)} VND` : "••••••• VND"}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-white/70 hover:bg-white/10 hover:text-white"
                onClick={() => setShowAmount(!showAmount)}
              >
                {showAmount ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
              </Button>
            </div>
          </div>

          {/* Gold P token */}
          <div
            className="flex size-12 shrink-0 items-center justify-center rounded-full text-2xl font-black text-white"
            style={{
              background: "#f1b721",
              border: "3px solid #ffde6b",
              boxShadow:
                "inset 0 2px 5px rgba(255,255,255,0.5), 0 2px 4px rgba(0,0,0,0.2)",
              textShadow: "1px 1px 2px rgba(0,0,0,0.2)",
            }}
          >
            P
          </div>
        </div>

        {/* Progress bar with mascot standing on the line */}
        <div className="relative mt-16">
          {/* Tooltip — positioned above the mascot */}
          {tooltipOnLeft ? (
            <div
              className="absolute -top-16 z-10 whitespace-nowrap rounded-lg bg-white px-2 py-1 text-[10px] font-bold text-[#11684c] shadow-md after:absolute after:bottom-[-3px] after:left-3 after:size-1.5 after:rotate-45 after:bg-white"
              style={{ left: `max(0%, calc(${budgetPct}% - 40px))` }}
            >
              {displayMessage}
            </div>
          ) : (
            <div className="absolute -top-16 right-0 z-10 whitespace-nowrap rounded-lg bg-white px-2 py-1 text-[10px] font-bold text-[#11684c] shadow-md after:absolute after:bottom-[-3px] after:right-3 after:size-1.5 after:rotate-45 after:bg-white">
              {displayMessage}
            </div>
          )}

          {/* Track */}
          <div className="relative h-1 w-full rounded-full bg-white/40">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: budgetTotal ? `${budgetPct}%` : "0%",
                background: "linear-gradient(90deg, #d4ed31 0%, #ff4b4b 100%)",
              }}
            />

            {/* Mascot standing on top of the line at current spend % */}
            <img
              src={overBudget ? angryBot : happyBot}
              alt="Penny"
              className="pointer-events-none absolute bottom-full size-12 -translate-x-1/2"
              style={{ left: `${budgetTotal ? budgetPct : 0}%` }}
            />
          </div>
        </div>

        {/* Tagline */}
        <div className="mt-6 text-center text-[9px] font-bold uppercase tracking-[2px] text-white/80">
          Penny - Giữ ví khoẻ, chi tiền vui
        </div>
      </div>
    </div>
  );
}
