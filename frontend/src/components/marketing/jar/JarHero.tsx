import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { JarFallback } from "./JarFallback";
import { useInView } from "@/hooks/use-in-view";
import { prefersReducedMotion, hasWebGL } from "@/lib/jar-gates";

const JarScene = lazy(() => import("./JarScene"));

const CHIPS = [
  { label: "cà phê 35k", amount: 35000 },
  { label: "bún 40k", amount: 40000 },
  { label: "grab 22k", amount: 22000 },
];
const STARTERS = [420000, 380000, 440000]; // load-fill: 3 coins → 1.240.000đ
const MAX_COINS = 6;

const fmt = (n: number) => Math.round(n).toLocaleString("vi-VN") + "đ";

export function JarHero() {
  const { ref, inView } = useInView<HTMLDivElement>({ once: true, threshold: 0.25 });
  const [coins, setCoins] = useState(0);
  const [total, setTotal] = useState(0);
  const [display, setDisplay] = useState(0);
  const [nonce, setNonce] = useState(0);
  const [mount3D, setMount3D] = useState(false);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = prefersReducedMotion();
  }, []);

  // Animate the counter toward `total`.
  useEffect(() => {
    if (reduced.current) {
      setDisplay(total);
      return;
    }
    let raf = 0;
    const from = display;
    const start = performance.now();
    const dur = 450;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      setDisplay(from + (total - from) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  const drop = (amount: number) => {
    setCoins((c) => Math.min(MAX_COINS, c + 1));
    setTotal((t) => t + amount);
    setNonce((n) => n + 1);
  };

  // Load-fill once the hero is seen; decide 3D vs static.
  useEffect(() => {
    if (!inView) return;
    if (reduced.current) {
      setCoins(STARTERS.length);
      setTotal(STARTERS.reduce((a, b) => a + b, 0));
      return;
    }
    if (hasWebGL()) setMount3D(true);
    const timers = STARTERS.map((amt, i) => setTimeout(() => drop(amt), 350 + i * 420));
    return () => timers.forEach(clearTimeout);
  }, [inView]);

  return (
    <div ref={ref} className="mx-auto w-full max-w-sm md:max-w-none">
      <div className="relative flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-border bg-secondary/40 p-4 sm:min-h-[340px]">
        <div className="absolute right-4 top-4 text-right">
          <p className="text-xs text-muted-foreground">Hũ chi tiêu</p>
          <p className="font-heading text-xl font-bold tabular-nums text-primary">{fmt(display)}</p>
        </div>

        <div className="flex h-[240px] w-full items-center justify-center sm:h-[290px]">
          {mount3D ? (
            <Suspense fallback={<JarFallback coins={coins} />}>
              <JarScene coins={coins} dropNonce={nonce} />
            </Suspense>
          ) : (
            <JarFallback coins={coins} />
          )}
        </div>

        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {CHIPS.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={() => drop(c.amount)}
              aria-label={`Thêm ${c.label} vào hũ`}
              className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:border-primary hover:text-primary"
            >
              {c.label}
            </button>
          ))}
        </div>
        <p className="mt-2.5 text-center text-[11px] text-muted-foreground">Chạm một chip — đồng xu rơi vào hũ</p>
      </div>
    </div>
  );
}
