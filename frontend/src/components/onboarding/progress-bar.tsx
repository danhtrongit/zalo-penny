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
            <span
              className={cn(
                "text-[10px] text-center leading-tight",
                active ? "font-medium text-foreground" : "text-muted-foreground"
              )}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
