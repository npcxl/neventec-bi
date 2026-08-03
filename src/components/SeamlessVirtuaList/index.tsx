import {
  ReactNode,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
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
  const frameRef = useRef<number | null>(null);
  const offsetRef = useRef(0);
  const pausedRef = useRef(false);

  const [offset, setOffset] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  const singleHeight = data.length * itemHeight;

  const measureHeight = () => {
    const el = containerRef.current;
    if (!el) return;
    setContainerHeight(
      el.clientHeight || el.getBoundingClientRect().height || 0,
    );
  };

  useLayoutEffect(() => {
    measureHeight();
  }, [data.length, itemHeight, height]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    measureHeight();

    const resizeObserver = new ResizeObserver(() => {
      measureHeight();
    });
    resizeObserver.observe(el);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const repeatCount = useMemo(() => {
    if (!data.length) return 0;

    if (!containerHeight) return 3;

    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const needCount = data.length + visibleCount + overscan * 2 + 2;

    return Math.max(3, Math.ceil(needCount / data.length));
  }, [data.length, containerHeight, itemHeight, overscan]);

  const loopData = useMemo(() => {
    if (!data.length || !repeatCount) return [];

    return Array.from({ length: repeatCount }).flatMap(() => data);
  }, [data, repeatCount]);

  useEffect(() => {
    if (!data.length) return;
    if (!singleHeight) return;
    if (!containerHeight) return;

    const tick = () => {
      if (!pausedRef.current) {
        offsetRef.current += speed;

        if (offsetRef.current >= singleHeight) {
          offsetRef.current = offsetRef.current - singleHeight;
        }

        setOffset(offsetRef.current);
      }

      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [data.length, singleHeight, containerHeight, speed]);

  const visibleInfo = useMemo(() => {
    if (!loopData.length || !data.length) {
      return {
        startIndex: 0,
        endIndex: 0,
        translateY: 0,
      };
    }

    if (!containerHeight) {
      return {
        startIndex: 0,
        endIndex: Math.min(loopData.length, Math.max(data.length, 12)),
        translateY: 0,
      };
    }

    const rawStart = Math.floor(offset / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight);

    const startIndex = Math.max(0, rawStart - overscan);
    const endIndex = Math.min(
      loopData.length,
      rawStart + visibleCount + overscan * 2,
    );

    const translateY = startIndex * itemHeight - offset;

    return {
      startIndex,
      endIndex,
      translateY,
    };
  }, [
    offset,
    itemHeight,
    containerHeight,
    loopData.length,
    data.length,
    overscan,
  ]);

  const visibleData = loopData.slice(
    visibleInfo.startIndex,
    visibleInfo.endIndex,
  );

  if (!data.length) {
    return (
      <div
        className={className}
        style={{
          height,
          overflow: "hidden",
          position: "relative",
        }}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        height,
        overflow: "hidden",
        position: "relative",
      }}
      onMouseEnter={() => {
        if (pauseOnHover) pausedRef.current = true;
      }}
      onMouseLeave={() => {
        if (pauseOnHover) pausedRef.current = false;
      }}
    >
      <div
        style={{
          transform: `translate3d(0, ${visibleInfo.translateY}px, 0)`,
          willChange: "transform",
        }}
      >
        {visibleData.map((item, i) => {
          const realIndex = visibleInfo.startIndex + i;
          const originIndex = realIndex % data.length;

          return (
            <div
              key={realIndex}
              style={{
                height: itemHeight,
              }}
            >
              {renderItem(item, originIndex)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
