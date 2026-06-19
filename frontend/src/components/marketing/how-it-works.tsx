import { MessageSquare, Sparkles, BarChart3 } from "lucide-react";
import { useInView } from "@/hooks/use-in-view";
import { cn } from "@/lib/utils";

const steps = [
  { icon: MessageSquare, title: "Nhắn tin", desc: "“cà phê 35k” hoặc gửi ảnh hoá đơn cho Penny trên Zalo." },
  { icon: Sparkles, title: "Penny tự ghi", desc: "Tự hiểu, phân loại danh mục và lưu lại — không biểu mẫu." },
  { icon: BarChart3, title: "Xem báo cáo", desc: "Hỏi “chi tiêu tuần này” để xem tổng kết chi tiết, chính xác." },
];

export function HowItWorks() {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.3 });
  return (
    <section className="border-t border-border bg-muted/30">
      <div ref={ref} className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-center font-heading text-3xl font-bold">Cách hoạt động</h2>
        <p className="mt-2 text-center text-muted-foreground">Ba bước, mất khoảng 20 giây.</p>

        <div className="relative mt-12 grid gap-6 md:grid-cols-3">
          {/* dotted connector + a single ₫ coin that travels once on reveal (desktop) */}
          <div className="pointer-events-none absolute inset-x-[16%] top-5 hidden md:block">
            <div className="border-t-2 border-dashed border-primary/25" />
            <div
              className={cn(
                "absolute -top-2.5 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground transition-[left] duration-[1400ms] ease-out motion-reduce:transition-none",
                inView ? "left-full" : "left-0"
              )}
              aria-hidden="true"
            >
              ₫
            </div>
          </div>

          {steps.map((s, i) => (
            <div
              key={s.title}
              className={cn(
                "reveal rounded-xl border border-border bg-card p-6",
                inView && "is-visible"
              )}
              style={{ transitionDelay: `${i * 90}ms` }}
            >
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <s.icon className="size-5" />
                </div>
                <span className="font-heading text-sm font-semibold text-muted-foreground">Bước {i + 1}</span>
              </div>
              <h3 className="mt-4 font-heading text-lg font-semibold">{s.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
