import {
  ReactNode,
  useEffect,
  useLayoutEffect,
  useMemo,
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const offsetRef = useRef(0);
  const pausedRef = useRef(false);
  const lastTimestampRef = useRef<number | null>(null);
  const prevStartIndexRef = useRef(0);
  const reducedMotionRef = useRef(false);
  const rAFVersionRef = useRef(0);

  const [containerHeight, setContainerHeight] = useState(0);
  const [startIndex, setStartIndex] = useState(0);

  const singleHeight = data.length * itemHeight;
  const visibleCount = containerHeight > 0 ? Math.ceil(containerHeight / itemHeight) : 0;
  const needsScroll = data.length > 0 && containerHeight > 0 && singleHeight > containerHeight;

  // Reduced motion detection - triggers rAF re-evaluation on change
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = mq.matches;
    const handler = (e: MediaQueryListEvent) => {
      const wasReduced = reducedMotionRef.current;
      reducedMotionRef.current = e.matches;
      // Trigger rAF re-evaluation by bumping version
      if (wasReduced !== e.matches) {
        rAFVersionRef.current += 1;
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Visibility detection
  useEffect(() => {
    const handler = () => {
      pausedRef.current = document.hidden;
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  // Measure container
  const measureHeight = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const h = el.clientHeight || el.getBoundingClientRect().height || 0;
    setContainerHeight((prev) => (prev === h ? prev : h));
  }, []);

  useLayoutEffect(() => {
    measureHeight();
  }, [data.length, itemHeight, height, measureHeight]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    measureHeight();
    const ro = new ResizeObserver(() => measureHeight());
    ro.observe(el);
    return () => ro.disconnect();
  }, [measureHeight]);

  // rAF scroll loop - DOM only, no setState in rAF
  // Uses rAFVersionRef to re-trigger when reduced-motion changes
  useEffect(() => {
    if (!data.length || !containerHeight) return;
    if (!needsScroll) {
      // data fits: reset offset, show from top
      offsetRef.current = 0;
      prevStartIndexRef.current = 0;
      setStartIndex(0);
      const track = trackRef.current;
      if (track) track.style.transform = "translate3d(0, 0, 0)";
      return;
    }
    if (reducedMotionRef.current) return;

    let cancelled = false;
    const version = rAFVersionRef.current;

    const tick = (timestamp: number) => {
      if (cancelled) return;
      if (rAFVersionRef.current !== version) return; // stale version, stop

      if (lastTimestampRef.current === null) {
        lastTimestampRef.current = timestamp;
      }
      const dt = timestamp - lastTimestampRef.current;
      lastTimestampRef.current = timestamp;

      if (!pausedRef.current) {
        offsetRef.current += speed * (dt / 16.67);
        if (offsetRef.current >= singleHeight) {
          offsetRef.current -= singleHeight;
        }

        // Update DOM transform directly (no setState in rAF)
        const track = trackRef.current;
        if (track) {
          // Virtual window displacement:
          // The visible window starts at startIndex, we show items [startIndex, endIndex).
          // Their natural position would be startIndex*itemHeight.
          // We offset by -offsetRef.current to create the scroll illusion.
          const windowStart = prevStartIndexRef.current;
          track.style.transform = `translate3d(0, ${windowStart * itemHeight - offsetRef.current}px, 0)`;
        }

        // Only update startIndex when crossing a row boundary
        const newStartIndex = Math.floor(offsetRef.current / itemHeight);
        if (newStartIndex !== prevStartIndexRef.current) {
          prevStartIndexRef.current = newStartIndex;
          setStartIndex(newStartIndex);
        }
      }

      frameRef.current = requestAnimationFrame(tick);
    };

    // Reset state on data/container change
    offsetRef.current = 0;
    lastTimestampRef.current = null;
    prevStartIndexRef.current = 0;
    setStartIndex(0);
    frameRef.current = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [data.length, singleHeight, containerHeight, speed, itemHeight, needsScroll, rAFVersionRef.current]);

  const repeatCount = useMemo(() => {
    if (!data.length) return 0;
    if (!containerHeight) return 3;
    const needCount = data.length + visibleCount + overscan * 2 + 2;
    return Math.max(3, Math.ceil(needCount / data.length));
  }, [data.length, containerHeight, itemHeight, overscan, visibleCount]);

  const loopData = useMemo(() => {
    if (!data.length || !repeatCount) return [];
    return Array.from({ length: repeatCount }).flatMap(() => data);
  }, [data, repeatCount]);

  const endIndex = Math.min(
    loopData.length,
    startIndex + visibleCount + overscan * 2,
  );

  const visibleData = loopData.slice(startIndex, endIndex);

  // Initial render position (before rAF kicks in)
  const initialTranslateY = needsScroll
    ? startIndex * itemHeight - offsetRef.current
    : 0;

  if (!data.length) {
    return (
      <div
        className={className}
        style={{ height, overflow: "hidden", position: "relative" }}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ height, overflow: "hidden", position: "relative" }}
      onMouseEnter={() => {
        if (pauseOnHover) pausedRef.current = true;
      }}
      onMouseLeave={() => {
        if (pauseOnHover) pausedRef.current = false;
      }}
    >
      <div
        ref={trackRef}
        style={{
          transform: `translate3d(0, ${initialTranslateY}px, 0)`,
        }}
      >
        {visibleData.map((item, i) => {
          const realIndex = startIndex + i;
          const originIndex = realIndex % data.length;
          return (
            <div key={realIndex} style={{ height: itemHeight }}>
              {renderItem(item, originIndex)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
