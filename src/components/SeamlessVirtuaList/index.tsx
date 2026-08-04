import {
  ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useCallback,
} from "react";

type SeamlessVirtualListProps<T> = {
  data: T[];
  itemHeight: number;
  height?: number | string;
  overscan?: number;
  speed?: number;
  pauseOnHover?: boolean;
  className?: string;
  renderItem: (item: T, index: number) => ReactNode;
};

/** Minimum interval between normal DOM transform writes (~30fps).
 *  Cross-row boundary flushes are NOT throttled. */
const FRAME_INTERVAL = 33;

export function SeamlessVirtualList<T>({
  data,
  itemHeight,
  height = "100%",
  overscan = 6,
  speed = 0.35,
  pauseOnHover = true,
  className,
  renderItem,
}: SeamlessVirtualListProps<T>) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const roRef = useRef<ResizeObserver | null>(null);

  // --- Refs that survive re-renders without restarting rAF ---
  const dataRef = useRef(data);
  dataRef.current = data;
  const renderItemRef = useRef(renderItem);
  renderItemRef.current = renderItem;
  const itemHeightRef = useRef(itemHeight);
  itemHeightRef.current = itemHeight;
  const speedRef = useRef(speed);
  speedRef.current = speed;

  // --- Scroll state (ref-only, no per-frame setState) ---
  const localOffsetRef = useRef(0); // 0 <= localOffset < itemHeight
  const windowStartRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef(0); // for ~30fps transform throttle
  const crossedRef = useRef(false); // true when a row boundary was crossed this tick

  // --- Split pause states ---
  const hoverPausedRef = useRef(false);
  const visibilityPausedRef = useRef(false);
  const reducedMotionRef = useRef(false);

  const [containerHeight, setContainerHeight] = useState(0);
  const [windowStart, setWindowStart] = useState(0);

  const dataLen = data.length;
  const visibleCount = containerHeight > 0 ? Math.ceil(containerHeight / itemHeight) : 0;
  const singleHeight = dataLen * itemHeight;
  const needsScroll = dataLen > 0 && containerHeight > 0 && singleHeight > containerHeight;

  // renderCount: when scrolling, always render at least visibleCount+1 so the
  // bottom never shows blank. Do NOT cap by dataLen — modulo wraps around.
  // When not scrolling, render only what fits (capped by dataLen, no wrapping).
  const renderCount = needsScroll
    ? Math.max(visibleCount + 1, Math.min(dataLen, visibleCount + overscan * 2 + 2))
    : Math.min(dataLen, visibleCount + overscan * 2);

  // --- Measure height directly from the container node (callback ref arg) ---
  const measureFromNode = useCallback((node: HTMLElement) => {
    const h = node.clientHeight || node.getBoundingClientRect().height || 0;
    setContainerHeight((prev) => (prev === h ? prev : h));
  }, []);

  // --- Callback ref: always bind container measurement + ResizeObserver ---
  const setContainerRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (roRef.current) {
        roRef.current.disconnect();
        roRef.current = null;
      }
      if (!node) return;

      measureFromNode(node);

      const ro = new ResizeObserver(() => measureFromNode(node));
      ro.observe(node);
      roRef.current = ro;
    },
    [measureFromNode],
  );

  // Cleanup observer on unmount
  useEffect(() => {
    return () => {
      if (roRef.current) {
        roRef.current.disconnect();
        roRef.current = null;
      }
    };
  }, []);

  // --- Reduced motion detection ---
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

  // --- Visibility detection (separate from hover) ---
  useEffect(() => {
    const handler = () => {
      visibilityPausedRef.current = document.visibilityState !== "visible";
      if (document.visibilityState === "visible") {
        lastTimeRef.current = null;
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  // --- Pause helper (reads all refs) ---
  const isPaused = () =>
    hoverPausedRef.current || visibilityPausedRef.current || reducedMotionRef.current;

  // --- rAF scroll loop ---
  useEffect(() => {
    if (!needsScroll || reducedMotionRef.current) {
      localOffsetRef.current = 0;
      windowStartRef.current = 0;
      setWindowStart(0);
      lastTimeRef.current = null;
      const track = trackRef.current;
      if (track) track.style.transform = "translate3d(0, 0, 0)";
      return;
    }

    let cancelled = false;

    const tick = (timestamp: number) => {
      if (cancelled) return;

      if (lastTimeRef.current === null) {
        lastTimeRef.current = timestamp;
      }
      const dt = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      if (!isPaused()) {
        const curItemHeight = itemHeightRef.current;
        const curSpeed = speedRef.current;
        const curDataLen = dataRef.current.length;

        if (curItemHeight <= 0 || curDataLen <= 0) {
          rafRef.current = requestAnimationFrame(tick);
          return;
        }

        localOffsetRef.current += curSpeed * (dt / 16.67);

        // O(1) integer calculation for row crossing
        const crossed = Math.floor(localOffsetRef.current / curItemHeight);
        localOffsetRef.current = localOffsetRef.current % curItemHeight;

        if (crossed > 0) {
          windowStartRef.current = (windowStartRef.current + crossed) % curDataLen;
          crossedRef.current = true;
          setWindowStart(windowStartRef.current);
        }

        // Normal 30fps throttled transform write (only when no crossing)
        if (!crossedRef.current && timestamp - lastFrameTimeRef.current >= FRAME_INTERVAL) {
          lastFrameTimeRef.current = timestamp;
          const track = trackRef.current;
          if (track) {
            track.style.transform = `translate3d(0, ${-localOffsetRef.current}px, 0)`;
          }
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    lastTimeRef.current = null;
    lastFrameTimeRef.current = 0;
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [needsScroll]);

  // --- useLayoutEffect: after windowStart commit, flush transform synchronously
  //     before paint so the track position matches the new content window.
  //     This write is NOT throttled — it's a boundary correction. ---
  useLayoutEffect(() => {
    if (crossedRef.current) {
      crossedRef.current = false;
      // Reset throttle timer so next normal frame isn't delayed
      lastFrameTimeRef.current = 0;
      const track = trackRef.current;
      if (track) {
        track.style.transform = `translate3d(0, ${-localOffsetRef.current}px, 0)`;
      }
    }
  }, [windowStart]);

  // --- Build visible items via modulo (no loopData / repeatCount).
  //     Key = slotIndex only, so DOM slots are stable across windowStart changes.
  //     React reuses the same <div> and only updates its content. ---
  const visibleItems: Array<{ item: T; realIndex: number; slotIndex: number }> = [];
  if (dataLen > 0 && renderCount > 0) {
    for (let i = 0; i < renderCount; i++) {
      const realIndex = (windowStart + i) % dataLen;
      visibleItems.push({
        item: data[realIndex],
        realIndex,
        slotIndex: i,
      });
    }
  }

  // Initial transform (before rAF first tick)
  const initialTranslateY = needsScroll ? -localOffsetRef.current : 0;

  if (!dataLen) {
    return (
      <div
        ref={setContainerRef}
        className={className}
        style={{ height, overflow: "hidden", position: "relative" }}
      />
    );
  }

  return (
    <div
      ref={setContainerRef}
      className={className}
      style={{ height, overflow: "hidden", position: "relative" }}
      onMouseEnter={() => {
        if (pauseOnHover) hoverPausedRef.current = true;
      }}
      onMouseLeave={() => {
        if (pauseOnHover) hoverPausedRef.current = false;
      }}
    >
      <div
        ref={trackRef}
        style={{
          transform: `translate3d(0, ${initialTranslateY}px, 0)`,
          willChange: "transform",
        }}
      >
        {visibleItems.map(({ item, realIndex, slotIndex }) => (
          <div key={slotIndex} style={{ height: itemHeight }}>
            {renderItem(item, realIndex)}
          </div>
        ))}
      </div>
    </div>
  );
}
