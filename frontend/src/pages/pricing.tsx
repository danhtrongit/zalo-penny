import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check } from "lucide-react";

const plans = [
  {
    name: "6 Tháng",
    price: 99000,
    priceLabel: "99,000đ",
    slug: "6-month",
    popular: true,
    save: "Chỉ ~16,500đ/tháng",
    features: [
      "Bot Zalo cá nhân",
      "Nhắn tin không giới hạn",
      "Ghi chi tiêu & hỏi đáp với AI",
      "Hỗ trợ ảnh hoá đơn & nhập PDF",
      "Báo cáo nâng cao",
      "Ưu tiên hỗ trợ",
    ],
  },
];

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const handleFree = async () => {
    if (!user) {
      navigate("/register");
      return;
    }
    setLoading("free");
    try {
      await api.post("/bot/free");
      toast.success("Đã kích hoạt gói miễn phí! Kết nối bot để bắt đầu.");
      await refreshUser();
      navigate("/onboarding");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Không thể bắt đầu dùng miễn phí");
    } finally {
      setLoading(null);
    }
  };

  const handleSelect = async (slug: string) => {
    if (!user) {
      navigate("/register");
      return;
    }

    setLoading(slug);
    try {
      const { data } = await api.post("/subscriptions", { planSlug: slug });

      // DEV mode: backend auto-approves payment, navigate directly
      if (data.payment?.status === "PAID") {
        toast.success("Đăng ký gói thành công!");
        await refreshUser();
        navigate("/dashboard/settings");
        return;
      }

      // Production: redirect to Sepay checkout page
      if (data.checkoutData?.checkoutUrl) {
        const { checkoutUrl, ...params } = data.checkoutData;

        // Build a form and submit it to Sepay (POST redirect)
        const form = document.createElement("form");
        form.method = "POST";
        form.action = checkoutUrl;
        for (const [key, value] of Object.entries(params)) {
          if (value == null) continue;
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = key;
          input.value = String(value);
          form.appendChild(input);
        }
        document.body.appendChild(form);
        form.submit();
        return;
      }

      // Fallback: unexpected response
      toast.error("Không thể xử lý thanh toán. Vui lòng thử lại.");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Không thể đăng ký gói");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-svh py-16">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-12 text-center">
          <h1 className="font-heading text-4xl font-bold">Chọn gói phù hợp</h1>
          <p className="mt-4 text-muted-foreground">
            Bắt đầu sử dụng Penny với gói phù hợp nhu cầu của bạn
          </p>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            Bạn có thể <span className="font-medium text-foreground">dùng miễn phí</span> với
            10 tin nhắn mỗi ngày — không cần thanh toán. Gói trả phí mở khoá nhắn{" "}
            <span className="font-medium text-foreground">không giới hạn</span> và nhắc ghi
            chép mỗi ngày.
          </p>
        </div>

        <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-2">
          <Card className="border-dashed">
            <CardHeader>
              <Badge variant="secondary" className="mb-2 w-fit">
                Miễn phí
              </Badge>
              <CardTitle className="text-2xl">Dùng thử</CardTitle>
              <p className="text-4xl font-bold">0đ</p>
              <p className="text-sm text-muted-foreground">Không giới hạn thời gian</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                {[
                  "10 tin nhắn mỗi ngày",
                  "Ghi chi tiêu & hỏi đáp với AI",
                  "Báo cáo cơ bản",
                  "Nâng cấp bất cứ lúc nào",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className="size-4 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full"
                variant="outline"
                disabled={loading === "free"}
                onClick={handleFree}
              >
                {loading === "free" ? "Đang xử lý..." : "Bắt đầu miễn phí"}
              </Button>
            </CardContent>
          </Card>

          {plans.map((plan) => (
            <Card
              key={plan.slug}
              className={plan.popular ? "border-primary shadow-lg scale-105" : ""}
            >
              <CardHeader>
                {plan.popular && <Badge className="mb-2 w-fit">Phổ biến nhất</Badge>}
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <p className="text-4xl font-bold">{plan.priceLabel}</p>
                {plan.save && <p className="text-sm text-primary font-medium">{plan.save}</p>}
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <Check className="size-4 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={plan.popular ? "default" : "outline"}
                  disabled={loading === plan.slug}
                  onClick={() => handleSelect(plan.slug)}
                >
                  {loading === plan.slug ? "Đang xử lý..." : "Chọn gói này"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
