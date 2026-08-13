import { memo, useMemo } from "react";
import { Image } from "antd";
import { useWindowedCarousel, CARD_WIDTH } from "../../hooks/useWindowedCarousel";

export type ConstructCarouselPicture = {
  address: string;
  dataStr: string;
  boothId?: string;
  hallId?: string;
  hallName?: string;
  boothNo?: string;
  exhibitor?: string;
};

type Props = {
  pictures: ConstructCarouselPicture[];
  loading?: boolean;
  /** 竖版模式：上下滚动 */
  vertical?: boolean;
};

function ConstructCarousel({ pictures, loading = false, vertical = false }: Props) {
  const normalizedPictures = useMemo(
    () =>
      pictures
        .map((item) => ({
          ...item,
          boothNo: item.boothNo ?? item.boothId ?? "",
          exhibitor: item.exhibitor ?? "",
        }))
        .filter((item) => item.address),
    [pictures],
  );

  const { trackRef, containerRef, visibleItems, hoverPausedRef } = useWindowedCarousel(
    normalizedPictures,
    normalizedPictures.length,
    { horizontalPadding: 24 },
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[rgba(255,255,255,0.4)]">
        图片加载中...
      </div>
    );
  }

  if (normalizedPictures.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[rgba(255,255,255,0.4)]">
        暂无图片
      </div>
    );
  }

  // 竖版：自动垂直滚动（CSS animation）
  if (vertical) {
    const cardHeight = 192; // 150px 图片 + 30px 标题 + 12px gap
    const totalHeight = normalizedPictures.length * cardHeight;
    const duration = Math.max(12, normalizedPictures.length * 4);
    const style = {
      '--demo-br2-scroll-distance': `-${totalHeight}px`,
      '--demo-br2-scroll-duration': `${duration}s`,
    } as React.CSSProperties;

    return (
      <div className="relative h-full overflow-hidden rounded-xl bg-[rgba(8,23,42,0.72)]">
        <div className="demo-br2-scroll-track flex flex-col gap-3 p-3" style={style}>
          {normalizedPictures.map((item, index) => (
            <div
              key={`a-${index}-${item.address}`}
              className="flex-shrink-0 overflow-hidden rounded-lg bg-[rgba(5,15,28,0.9)]"
            >
              <div className="relative flex items-center justify-center overflow-hidden bg-black/10">
                <Image
                  src={item.address}
                  alt={item.dataStr || `图片-${index + 1}`}
                  preview={{ src: item.address }}
                  className="h-[150px] w-full object-cover"
                />
              </div>
              <div className="flex h-[30px] items-center justify-center overflow-hidden rounded-lg px-3">
                <span className="text-[14px] font-semibold text-[#cffafe]">
                  {item.boothNo} - {item.exhibitor}
                </span>
              </div>
            </div>
          ))}
          {normalizedPictures.map((item, index) => (
            <div
              key={`b-${index}-${item.address}`}
              className="flex-shrink-0 overflow-hidden rounded-lg bg-[rgba(5,15,28,0.9)]"
            >
              <div className="relative flex items-center justify-center overflow-hidden bg-black/10">
                <Image
                  src={item.address}
                  alt={item.dataStr || `图片-${index + 1}`}
                  preview={{ src: item.address }}
                  className="h-[150px] w-full object-cover"
                />
              </div>
              <div className="flex h-[30px] items-center justify-center overflow-hidden rounded-lg px-3">
                <span className="text-[14px] font-semibold text-[#cffafe]">
                  {item.boothNo} - {item.exhibitor}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative h-full overflow-hidden rounded-xl border border-white/10 bg-[rgba(8,23,42,0.72)]"
      onMouseEnter={() => { hoverPausedRef.current = true; }}
      onMouseLeave={() => { hoverPausedRef.current = false; }}
    >
      <div ref={containerRef} className="flex h-full overflow-hidden">
        <div ref={trackRef} className="flex h-full gap-3 px-3 py-3" style={{ willChange: "transform" }}>
          {visibleItems.map(({ item, realIndex, slotIndex, isEager }) => (
            <div
              key={`${slotIndex}-${realIndex}-${item.address}`}
              className="flex h-full flex-shrink-0 flex-col overflow-hidden rounded-lg border border-white/10 bg-[rgba(5,15,28,0.9)] shadow-[0_0_18px_rgba(0,229,255,0.05)]"
              style={{ width: CARD_WIDTH }}
            >
              <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black/10">
                <Image
                  src={item.address}
                  alt={item.dataStr || `图片-${realIndex + 1}`}
                  preview={{ src: item.address }}
                  loading={isEager ? "eager" : "lazy"}
                  className="h-[150px] w-full object-cover"
                />
              </div>
              <div className="flex h-[30px] items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-[rgba(5,15,28,0.9)] px-3 py-3">
                <span className="text-[14px] font-semibold text-[#cffafe]">
                  {item.boothNo} - {item.exhibitor}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default memo(ConstructCarousel);
