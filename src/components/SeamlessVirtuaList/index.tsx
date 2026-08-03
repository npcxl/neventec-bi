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
  const prevStartIndexRef = useRef(-1);
  const reducedMotionRef = useRef(false);

  const [containerHeight, setContainerHeight] = useState(0);
  const [startIndex, setStartIndex] = useState(0);

  const singleHeight = data.length * itemHeight;
  const visibleCount = containerHeight > 0 ? Math.ceil(containerHeight / itemHeight) : 0;

  // Reduced motion detection
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = mq.matches;
    const handler = (e: MediaQueryListEvent) => {
      reducedMotionRef.current = e.matches;
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Visibility detection
  useEffect(() => {
    const handler = () => {
      if (document.hidden) {
        pausedRef.current = true;
      } else {
        pausedRef.current = false;
      }
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

  // rAF scroll loop - DOM only, no setState
  useEffect(() => {
    if (!data.length || !containerHeight) return;
    if (singleHeight <= containerHeight) return; // data fits, no scroll needed
    if (reducedMotionRef.current) return;

    const tick = (timestamp: number) => {
      if (lastTimestampRef.current === null) {
        lastTimestampRef.current = timestamp;
      }
      const dt = timestamp - lastTimestampRef.current;
      lastTimestampRef.current = timestamp;

      if (!pausedRef.current) {
        offsetRef.current += speed * (dt / 16.67); // normalize to 60fps
        if (offsetRef.current >= singleHeight) {
          offsetRef.current -= singleHeight;
        }

        // Update DOM transform directly
        const track = trackRef.current;
        if (track) {
          track.style.transform = `translate3d(0, ${-offsetRef.current}px, 0)`;
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

    offsetRef.current = 0;
    lastTimestampRef.current = null;
    prevStartIndexRef.current = 0;
    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [data.length, singleHeight, containerHeight, speed, itemHeight]);

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

  // translateY for data-fits case
  const translateY = -offsetRef.current;

  if (!data.length) {
    return (
      <div
        className={className}
        style={{ height, overflow: "hidden", position: "relative" }}
      />
    );
  }

  const needsScroll = singleHeight > containerHeight;

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
          transform: needsScroll
            ? `translate3d(0, ${translateY}px, 0)`
            : `translate3d(0, ${visibleData.length > 0 ? startIndex * itemHeight - offsetRef.current : 0}px, 0)`,
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
