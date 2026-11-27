"use client";
import { useRef, useState, type ReactNode } from "react";
export function BlogCarousel({ cards }: { cards: ReactNode[] }) {
  const [index, setIndex] = useState(1);
  const start = useRef<number | null>(null);
  const move = (by: number) =>
    setIndex((i) => (i + by + cards.length) % cards.length);
  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Latest stories"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          e.preventDefault();
          move(e.key === "ArrowLeft" ? -1 : 1);
        }
      }}
      onTouchStart={(e) => {
        start.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (start.current !== null) {
          const dx = e.changedTouches[0].clientX - start.current;
          if (Math.abs(dx) > 50) move(dx < 0 ? 1 : -1);
          start.current = null;
        }
      }}
    >
      <div className="grid items-center gap-6 md:grid-cols-[1fr_1.3fr_1fr]">
        {[-1, 0, 1].map((offset) => (
          <div
            key={offset}
            className={
              offset ? "hidden opacity-50 md:block md:scale-90" : "min-w-0"
            }
          >
            {cards[(index + offset + cards.length) % cards.length]}
          </div>
        ))}
      </div>
      <div className="mt-8 flex items-center justify-center gap-6">
        <button
          type="button"
          onClick={() => move(-1)}
          aria-label="Previous story"
          className="size-11 rounded-full border border-white/20"
        >
          ←
        </button>
        <p aria-live="polite" className="text-sm text-[#b5accb]">
          {index + 1} / {cards.length}
        </p>
        <button
          type="button"
          onClick={() => move(1)}
          aria-label="Next story"
          className="size-11 rounded-full border border-white/20"
        >
          →
        </button>
      </div>
    </div>
  );
}
