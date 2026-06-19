import { useEffect, useRef, useState } from "react";

/**
 * IntersectionObserver hook. `once` (default) latches true on first intersect
 * for scroll-reveal; pass once:false to track enter/leave (e.g. to pause work).
 */
export function useInView<T extends HTMLElement = HTMLDivElement>(
  { once = true, threshold = 0.15 }: { once?: boolean; threshold?: number } = {}
) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (entry.isIntersecting && once) io.disconnect();
      },
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [once, threshold]);

  return { ref, inView } as const;
}
