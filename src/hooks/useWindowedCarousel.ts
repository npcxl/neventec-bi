import { useEffect, useRef, useState, useCallback } from "react";

const CARD_WIDTH = 320;
const CARD_GAP = 12;
const STEP = CARD_WIDTH + CARD_GAP; // 332px per card
const SCROLL_SPEED = 0.8; // px per frame at 60fps

/**
 * Windowed seamless carousel hook.
 * - Only renders visible cards + 2 buffer cards in DOM.
 * - Uses rAF to update DOM transform directly (no per-frame setState).
 * - Handles hover pause, visibility pause, reduced-motion, and cleanup.
 */
export function useWindowedCarousel<T>(items: T[], totalCount: number) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const offsetRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);
  const pausedRef = useRef(false);
  const windowStartRef = useRef(0);
  const prefersReducedRef = useRef(false);

  const [windowStart, setWindowStart] = useState(0);
  const [visibleCount, setVisibleCount] = useState(0);

  // Measure container width to determine visible cards
  const measureVisibleCount = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const w = el.clientWidth || el.getBoundingClientRect().width || 0;
    const count = Math.max(1, Math.ceil(w / STEP) + 1);
    setVisibleCount((prev) => (prev === count ? prev : count));
  }, []);

  useEffect(() => {
    measureVisibleCount();
    const ro = new ResizeObserver(() => measureVisibleCount());
    const el = containerRef.current;
    if (el) ro.observe(el);
    return () => ro.disconnect();
  }, [measureVisibleCount]);

  // Reduced motion
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    prefersReducedRef.current = mq.matches;
    const handler = (e: MediaQueryListEvent) => {
      prefersReducedRef.current = e.matches;
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Visibility
  useEffect(() => {
    const handler = () => {
      pausedRef.current = document.hidden;
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  // rAF scroll loop
  useEffect(() => {
    if (!totalCount || visibleCount === 0 || totalCount <= visibleCount || prefersReducedRef.current) {
      // Not enough items to scroll: reset
      offsetRef.current = 0;
      windowStartRef.current = 0;
      setWindowStart(0);
      const track = trackRef.current;
      if (track) track.style.transform = "translate3d(0, 0, 0)";
      return;
    }

    let cancelled = false;

    const tick = (timestamp: number) => {
      if (cancelled) return;
      if (lastTimeRef.current === null) lastTimeRef.current = timestamp;
      const dt = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      if (!pausedRef.current && !prefersReducedRef.current) {
        offsetRef.current += SCROLL_SPEED * (dt / 16.67);

        const totalTrackWidth = totalCount * STEP;
        if (offsetRef.current >= totalTrackWidth) {
          offsetRef.current -= totalTrackWidth;
        }

        // Update DOM transform
        const track = trackRef.current;
        if (track) {
          track.style.transform = `translate3d(${-offsetRef.current}px, 0, 0)`;
        }

        // Update windowStart when crossing a card boundary
        const newWindowStart = Math.floor(offsetRef.current / STEP) % totalCount;
        if (newWindowStart !== windowStartRef.current) {
          windowStartRef.current = newWindowStart;
          setWindowStart(newWindowStart);
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [totalCount, visibleCount]);

  // Build visible window: startIndex + visibleCount + 2 buffer
  const bufferCount = 2;
  const totalSlots = visibleCount + bufferCount * 2;
  const visibleItems: { item: T; realIndex: number }[] = [];

  for (let i = 0; i < Math.min(totalSlots, totalCount); i++) {
    const idx = (windowStart + i) % totalCount;
    if (idx >= 0 && idx < items.length) {
      visibleItems.push({ item: items[idx], realIndex: idx });
    }
  }

  return {
    trackRef,
    containerRef,
    visibleItems,
    pausedRef,
    needsScroll: totalCount > visibleCount,
  };
}
