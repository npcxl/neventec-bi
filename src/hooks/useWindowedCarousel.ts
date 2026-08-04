import { useEffect, useRef, useState, useCallback } from "react";

export const CARD_WIDTH = 300;
export const CARD_GAP = 12;
export const STEP = CARD_WIDTH + CARD_GAP; // 312px per card
const SCROLL_SPEED = 0.8; // px per frame at 60fps

/**
 * Windowed seamless carousel hook.
 * - Only renders visible cards + 2 buffer cards in DOM.
 * - Uses rAF to update DOM transform (no per-frame setState).
 * - Handles hover/visibility/reduced-motion pause independently.
 */
export function useWindowedCarousel<T>(items: T[], totalCount: number) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const localOffsetRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);
  const windowStartRef = useRef(0);
  const hoverPausedRef = useRef(false);
  const visibilityPausedRef = useRef(false);
  const reducedMotionRef = useRef(false);

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

  // ResizeObserver - re-bind when container appears
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    measureVisibleCount();
    const ro = new ResizeObserver(() => measureVisibleCount());
    ro.observe(el);
    return () => ro.disconnect();
  }, [measureVisibleCount, totalCount]);

  // Reduced motion
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = mq.matches;
    const handler = (e: MediaQueryListEvent) => {
      const prev = reducedMotionRef.current;
      reducedMotionRef.current = e.matches;
      // Reset lastTime when transitioning from reduced to non-reduced
      if (prev && !e.matches) {
        lastTimeRef.current = null;
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Visibility
  useEffect(() => {
    const handler = () => {
      visibilityPausedRef.current = document.hidden;
      if (!document.hidden) {
        lastTimeRef.current = null;
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  // Check if should be paused (all 3 reasons independently)
  const isPaused = () => hoverPausedRef.current || visibilityPausedRef.current || reducedMotionRef.current;

  // rAF scroll loop
  useEffect(() => {
    if (!totalCount || visibleCount === 0 || totalCount <= visibleCount || reducedMotionRef.current) {
      // Not enough items or reduced motion: reset
      localOffsetRef.current = 0;
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

      if (!isPaused()) {
        localOffsetRef.current += SCROLL_SPEED * (dt / 16.67);

        // Handle crossing one or more card boundaries
        let crossed = 0;
        while (localOffsetRef.current >= STEP) {
          localOffsetRef.current -= STEP;
          crossed++;
        }
        if (crossed > 0) {
          windowStartRef.current = (windowStartRef.current + crossed) % totalCount;
          setWindowStart(windowStartRef.current);
        }

        // Update DOM transform: always within [-STEP, 0) range relative to current window
        const track = trackRef.current;
        if (track) {
          track.style.transform = `translate3d(${-localOffsetRef.current}px, 0, 0)`;
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    lastTimeRef.current = null;
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [totalCount, visibleCount]);

  // Build visible window: startIndex + visibleCount + 2 buffer on each side
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
    visibleCount,
    hoverPausedRef,
    needsScroll: totalCount > visibleCount,
  };
}
