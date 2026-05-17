import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import pennyLogo from "@/assets/logo.png";
import pennyWaving from "@/assets/penny-waving.png";
import pennyHappy from "@/assets/penny-happy.png";
import pennyWorried from "@/assets/penny-worried.png";

interface SpendingCardProps {
  title: string;
  subtitle: string;
  amount: number;
  budgetTotal?: number;
  budgetUsed?: number;
  message?: string;

}

function formatMoney(n: number) {
  return n.toLocaleString("vi-VN");
}

function getBudgetMessage(percentage: number) {
  if (percentage < 30) return "Chi tiêu hợp lý đấy! 👍";
  if (percentage < 50) return "Đang ổn nè! 💚";
  if (percentage < 70) return "Cẩn thận chút nha! ⚠️";
  if (percentage < 90) return "Sắp cháy ví rồi! 🔥";
  return "Vượt ngân sách rồi! 💸";
}

export function SpendingCard({
  title,
  subtitle,
  amount,
  budgetTotal,
  budgetUsed,
  message,
}: SpendingCardProps) {
  const [showAmount, setShowAmount] = useState(true);

  const budgetPct = budgetTotal && budgetUsed
    ? Math.min(100, Math.round((budgetUsed / budgetTotal) * 100))
    : 0;

  const displayMessage = message || (budgetTotal ? getBudgetMessage(budgetPct) : "Bắt đầu ghi chi tiêu nào!");

  // Choose Penny image based on budget status
  const pennyImage = budgetTotal
    ? budgetPct < 50 ? pennyHappy : budgetPct < 80 ? pennyWaving : pennyWorried
    : pennyWaving;

  return (
    <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-primary via-primary/90 to-emerald-700 text-primary-foreground shadow-lg">
      <CardContent className="p-5 pb-4 sm:p-6 sm:pb-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider opacity-90">
              {title}
            </p>
            <p className="text-sm font-semibold italic text-emerald-200">
              {subtitle}
            </p>
          </div>
          <img
            src={pennyLogo}
            alt="Penny"
            className="size-10 shrink-0 sm:size-12"
          />
        </div>

        {/* Amount */}
        <div className="mt-3 flex items-center gap-2">
          <span className="font-heading text-2xl font-bold sm:text-3xl">
            {showAmount ? `${formatMoney(amount)} VND` : "••••••• VND"}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-primary-foreground/70 hover:bg-white/10 hover:text-primary-foreground"
            onClick={() => setShowAmount(!showAmount)}
          >
            {showAmount ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
          </Button>
        </div>

        {/* Speech bubble + Robot */}
        <div className="mt-2 flex items-end justify-end gap-1.5">
          <div className="mb-6 max-w-[140px] rounded-xl rounded-br-sm bg-white/95 px-2.5 py-1.5 text-xs font-medium text-primary shadow-sm sm:max-w-[160px] sm:text-sm">
            {displayMessage}
          </div>
          <img
            src={pennyImage}
            alt="Penny"
            className="size-14 shrink-0 drop-shadow-md sm:size-16"
          />
        </div>

        {/* Budget Progress Bar */}
        <div className="mt-2">
          <div className="h-2 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: budgetTotal ? `${budgetPct}%` : "0%",
                background: "linear-gradient(to right, #34d399, #fbbf24, #ef4444)",
              }}
            />
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
