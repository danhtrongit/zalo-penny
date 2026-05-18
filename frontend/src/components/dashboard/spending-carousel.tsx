import { useRef, useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SpendingCarouselProps {
  children: React.ReactNode[];
}

export function SpendingCarousel({ children }: SpendingCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const totalSlides = children.length;

  const updateActiveIndex = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;
    const scrollLeft = container.scrollLeft;
    const width = container.offsetWidth;
    const index = Math.round(scrollLeft / width);
    setActiveIndex(Math.min(index, totalSlides - 1));
  }, [totalSlides]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    container.addEventListener("scroll", updateActiveIndex, { passive: true });
    return () => container.removeEventListener("scroll", updateActiveIndex);
  }, [updateActiveIndex]);

  const scrollTo = (index: number) => {
    const container = scrollRef.current;
    if (!container) return;
    const target = Math.max(0, Math.min(index, totalSlides - 1));
    container.scrollTo({
      left: target * container.offsetWidth,
      behavior: "smooth",
    });
  };

  if (totalSlides === 0) return null;
  if (totalSlides === 1) {
    return <div className="px-1">{children[0]}</div>;
  }

  return (
    <div>
      {/* Scroll wrapper is its own `relative` parent so the nav arrows align
          to the visible card center — NOT to the whole carousel that includes
          the dots row below. Cards push their main body down by mt-16 to
          leave room for the flap decorations; the arrows compensate with
          mt-8 so they land near the main card vertical center. */}
      <div className="relative">
        <div
          ref={scrollRef}
          className="flex snap-x snap-mandatory gap-0 scrollbar-hide"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            overflowX: "scroll",
            overflowY: "visible",
          }}
        >
          {children.map((child, i) => (
            <div key={i} className="w-full shrink-0 snap-center px-1">
              {child}
            </div>
          ))}
        </div>

        <Button
          variant="secondary"
          size="icon"
          className="absolute top-16 bottom-0 -left-2 z-10 my-auto size-8 rounded-full shadow-md sm:-left-4 sm:size-9"
          onClick={() => scrollTo(activeIndex - 1)}
          disabled={activeIndex === 0}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="absolute top-16 bottom-0 -right-2 z-10 my-auto size-8 rounded-full shadow-md sm:-right-4 sm:size-9"
          onClick={() => scrollTo(activeIndex + 1)}
          disabled={activeIndex === totalSlides - 1}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {/* Dots */}
      <div className="mt-3 flex justify-center gap-1.5">
        {children.map((_, i) => (
          <button
            key={i}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              i === activeIndex
                ? "w-6 bg-primary"
                : "w-1.5 bg-muted-foreground/30"
            )}
            onClick={() => scrollTo(i)}
          />
        ))}
      </div>
    </div>
  );
}
