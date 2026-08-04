import { useEffect, useRef, useState, useCallback } from "react";

export const CARD_WIDTH = 300;
export const CARD_GAP = 12;
export const STEP = CARD_WIDTH + CARD_GAP; // 312px per card
const SCROLL_SPEED = 0.8; // px per frame at 60fps
const BUFFER_COUNT = 2; // buffer cards on each side
const MAX_DOM_CARDS = 12;

function calcContentWidth(total: number) {
  if (total <= 0) return 0;
  return total * CARD_WIDTH + Math.max(0, total - 1) * CARD_GAP;
}

type VisibleItem<T> = {
  item: T;
  realIndex: number;
  /** 0 = first visible, viewportCount-1 = last visible, >= viewportCount = buffer */
  slotIndex: number;
  isEager: boolean;
};

export function useWindowedCarousel<T>(items: T[], totalCount: number) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const roRef = useRef<ResizeObserver | null>(null);
  const rafRef = useRef<number | null>(null);
  const localOffsetRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);
  const windowStartRef = useRef(0);
  const hoverPausedRef = useRef(false);
  const visibilityPausedRef = useRef(false);
  const reducedMotionRef = useRef(false);

  const [windowStart, setWindowStart] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  // viewportCount: cards needed to fill container
  const viewportCount = containerWidth > 0 ? Math.ceil(containerWidth / STEP) : 0;
  // renderCount: viewport + buffers, capped at MAX_DOM_CARDS and totalCount
  const renderCount = Math.min(MAX_DOM_CARDS, totalCount, viewportCount + BUFFER_COUNT * 2);
  // content width to determine scroll
  const contentWidth = calcContentWidth(totalCount);
  const needsScroll = contentWidth > containerWidth;

  // --- Callback ref for container: triggers measurement immediately ---
  const setContainerRef = useCallback((node: HTMLDivElement | null) => {
    // Disconnect old observer
    if (roRef.current) {
      roRef.current.disconnect();
      roRef.current = null;
    }
    containerRef.current = node;
    if (!node) return;

    const measure = () => {
      const w = node.clientWidth || node.getBoundingClientRect().width || 0;
      setContainerWidth((prev) => (prev === w ? prev : w));
    };
    measure();

    roRef.current = new ResizeObserver(measure);
    roRef.current.observe(node);
  }, []);

  // Cleanup observer on unmount
  useEffect(() => {
    return () => {
      if (roRef.current) {
        roRef.current.disconnect();
        roRef.current = null;
      }
    };
  }, []);

  // Reduced motion
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = mq.matches;
    const handler = (e: MediaQueryListEvent) => {
      const prev = reducedMotionRef.current;
      reducedMotionRef.current = e.matches;
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

  // Check if should be paused
  const isPaused = () => hoverPausedRef.current || visibilityPausedRef.current || reducedMotionRef.current;

  // rAF scroll loop
  useEffect(() => {
    if (!totalCount || containerWidth === 0 || !needsScroll || reducedMotionRef.current) {
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
  }, [totalCount, containerWidth, needsScroll]);

  // Build visible window with slotIndex and isEager
  const visibleItems: VisibleItem<T>[] = [];
  for (let i = 0; i < renderCount; i++) {
    const idx = (windowStart + i) % totalCount;
    if (idx >= 0 && idx < items.length) {
      // slotIndex: 0 = first visible card, viewportCount-1 = last visible
      // isEager: current viewport cards + next 1 buffer card
      visibleItems.push({
        item: items[idx],
        realIndex: idx,
        slotIndex: i,
        isEager: i < viewportCount + 1,
      });
    }
  }

  return {
    trackRef,
    containerRef: setContainerRef,
    visibleItems,
    viewportCount,
    hoverPausedRef,
    needsScroll,
  };
}
