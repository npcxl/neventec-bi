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
};

function ConstructCarousel({ pictures, loading = false }: Props) {
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
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-white/10 bg-[rgba(8,23,42,0.6)] text-sm text-[#93aed0]">
        图片加载中...
      </div>
    );
  }

  if (normalizedPictures.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-white/10 bg-[rgba(8,23,42,0.6)] text-sm text-[#93aed0]">
        暂无数据
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
