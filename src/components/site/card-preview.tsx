"use client";

import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";

// The renderer + algorithm bundle loads only once a card scrolls into view.
const LivePreview = lazy(() => import("./live-preview"));

/**
 * Shows `fallback` (a static glyph) until the card is on screen, then swaps in a live,
 * auto-playing thumbnail that pauses whenever it scrolls away. Reduced motion keeps the glyph.
 */
export function CardPreview({ slug, fallback }: { slug: string; fallback: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [activated, setActivated] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
        if (entry.isIntersecting) setActivated(true);
      },
      { rootMargin: "120px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="h-full w-full">
      {activated ? (
        <Suspense fallback={fallback}>
          <LivePreview slug={slug} playing={visible} />
        </Suspense>
      ) : (
        fallback
      )}
    </div>
  );
}
