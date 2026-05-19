import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Handshake,
  Briefcase,
  Home,
  Dumbbell,
  Laugh,
  PiggyBank,
  Check,
  type LucideIcon,
} from "lucide-react";
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
          <RadioGroup
            value={style}
            onValueChange={setStyle}
            className="grid grid-cols-3 gap-2"
          >
            {PERSONAS.map((p) => (
              <div key={p.value} className="relative">
                <RadioGroupItem
                  value={p.value}
                  id={`persona-${p.value}`}
                  className="peer sr-only"
                />
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
          <Button
            variant="ghost"
            onClick={() => save(true)}
            disabled={saving}
            className="flex-1"
          >
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
