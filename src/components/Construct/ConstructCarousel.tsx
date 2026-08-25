import { memo, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Image } from "antd";
import { useWindowedCarousel, CARD_WIDTH } from "../../hooks/useWindowedCarousel";
import { thumbUrl, fullUrl } from "../../utils/image";

export type ConstructCarouselPicture = {
  address: string;
  dataStr: string;
  boothId?: string;
  hallId?: string;
  hallName?: string;
  boothNo?: string;
  exhibitor?: string;
};

export type ConstructTimelineItem = {
  id?: number;
  content?: string;
  createDate?: string;
};

type Props = {
  pictures: ConstructCarouselPicture[];
  records?: ConstructTimelineItem[];
  title?: string;
  loading?: boolean;
  /** 竖版模式：上下滚动 */
  vertical?: boolean;
};

function ConstructCarousel({
  pictures,
  records = [],
  title,
  loading = false,
  vertical = false,
}: Props) {
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

  // 竖版：测量容器高度，判断内容是否超出，决定是否滚动
  const verticalViewportRef = useRef<HTMLDivElement>(null);
  const [verticalNeedsScroll, setVerticalNeedsScroll] = useState(true);
  useLayoutEffect(() => {
    const el = verticalViewportRef.current;
    if (!el || !vertical) return;
    const cardHeight = 162; // 150px 图片 + 12px gap
    const gap = 12;
    const viewportH = el.clientHeight;
    const contentH = normalizedPictures.length * cardHeight - (normalizedPictures.length > 0 ? gap : 0);
    setVerticalNeedsScroll(contentH > viewportH);
  }, [vertical, normalizedPictures]);

  if (loading)
    return (
      <div className="flex h-full items-center justify-center text-sm text-[rgba(255,255,255,0.4)]">
        图片加载中...
      </div>
    );

  if (normalizedPictures.length === 0 && records.length === 0)
    return (
      <div className="flex h-full items-center justify-center text-sm text-[rgba(255,255,255,0.4)]">
        暂无图片
      </div>
    );

  const renderPictureCard = (item: ConstructCarouselPicture, index: number, keyPrefix: string) => (
    <div
      key={`${keyPrefix}-${index}-${item.address}`}
      className="flex-shrink-0"
    >
      <div className="relative overflow-hidden rounded-xl">
        <Image
          src={thumbUrl(item.address, 400, 300)}
          alt={item.dataStr || `图片-${index + 1}`}
          preview={{ src: fullUrl(item.address) }}
          classNames={{ root: "block w-full" }}
  
          style={{ height: 220 }}
        />
        <div className="absolute inset-x-0 top-0 z-10 flex h-[30px] items-center justify-center bg-[rgba(8,23,42,0.55)] px-3 backdrop-blur-md">
          <span className="truncate text-[14px] font-semibold text-[#cffafe]">
            {item.boothNo} - {item.exhibitor}
          </span>
        </div>
      </div>
    </div>
  );

  // 竖版：内容超出容器才自动垂直滚动（CSS animation），否则静态展示
  if (vertical) {
    const cardHeight = 162; // 150px 图片 + 12px gap
    const totalHeight = normalizedPictures.length * cardHeight;
    const duration = Math.max(12, normalizedPictures.length * 4);
    const style = {
      '--demo-br2-scroll-distance': `-${totalHeight}px`,
      '--demo-br2-scroll-duration': `${duration}s`,
    } as React.CSSProperties;

    return (
      <div className="demo-br2-scroll relative h-full overflow-hidden">
        <div className="flex h-full min-h-0 flex-col gap-2 p-3">
          {title ? (
            <div className="shrink-0 text-sm font-medium text-[#dbeeff]">{title}</div>
          ) : null}
          <div ref={verticalViewportRef} className="flex h-full min-h-0 flex-col overflow-hidden">
            {verticalNeedsScroll ? (
              <div className="demo-br2-scroll-track flex flex-col gap-3" style={style}>
                {normalizedPictures.map((item, index) => renderPictureCard(item, index, 'a'))}
                {normalizedPictures.map((item, index) => renderPictureCard(item, index, 'b'))}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {normalizedPictures.map((item, index) => renderPictureCard(item, index, 'a'))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative h-full overflow-hidden"
      onMouseEnter={() => { hoverPausedRef.current = true; }}
      onMouseLeave={() => { hoverPausedRef.current = false; }}
    >
      <div className="flex h-full min-h-0 flex-col gap-2 p-3">
        {title ? (
          <div className="shrink-0 text-sm font-medium text-[#dbeeff]">{title}</div>
        ) : null}
        <div ref={containerRef} className="flex h-full min-h-0 overflow-hidden">
          <div ref={trackRef} className="flex h-full gap-3" style={{ willChange: "transform" }}>
            {visibleItems.map(({ item, realIndex, slotIndex, isEager }) => (
              <div
                key={`${slotIndex}-${realIndex}-${item.address}`}
                className="flex h-full flex-shrink-0 flex-col"
                style={{ width: CARD_WIDTH }}
              >
                <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl">
                  <Image
                    src={thumbUrl(item.address, 400, 220)}
                    alt={item.dataStr || `图片-${realIndex + 1}`}
                    preview={{ src: fullUrl(item.address) }}
                    loading={isEager ? "eager" : "lazy"}
                    classNames={{ root: "block w-full" }}
                    className="h-[150px] w-full object-cover"
                    style={{ height: 220 }}
                  />
                  <div className="absolute inset-x-0 top-0 z-10 flex h-[30px] items-center justify-center bg-[rgba(8,23,42,0.55)] px-3 backdrop-blur-md">
                    <span className="truncate text-[14px] font-semibold text-[#cffafe]">
                      {item.boothNo} - {item.exhibitor}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(ConstructCarousel);
