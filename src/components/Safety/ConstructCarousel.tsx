import { memo, useEffect, useMemo, useState } from "react";
import { Image } from "antd";

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

const CARD_WIDTH = 320;
const CARD_GAP = 12;

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
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    setVisibleCount(normalizedPictures.length);
  }, [normalizedPictures.length]);

  const visiblePictures = useMemo(
    () =>
      normalizedPictures.slice(
        0,
        Math.max(1, Math.min(visibleCount, normalizedPictures.length)),
      ),
    [normalizedPictures, visibleCount],
  );
  const loopedPictures = useMemo(
    () => [...visiblePictures, ...visiblePictures],
    [visiblePictures],
  );

  const trackDistance = (CARD_WIDTH + CARD_GAP) * visiblePictures.length;
  const durationSeconds = Math.max(28, visiblePictures.length * 5);

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
    <div className="construct-carousel-shell relative h-full overflow-hidden rounded-xl border border-white/10 bg-[rgba(8,23,42,0.72)]">
      <style>
        {`
          .construct-carousel-track {
            animation-name: construct-carousel-scroll;
            animation-timing-function: linear;
            animation-iteration-count: infinite;
            animation-fill-mode: both;
            will-change: transform;
            transform: translate3d(0,0,0);
          }
          .construct-carousel-shell:hover .construct-carousel-track {        
            animation-play-state: paused;
          }
          @keyframes construct-carousel-scroll {
            from { transform: translate3d(0, 0, 0); }
            to { transform: translate3d(calc(-1 * var(--track-distance)), 0, 0); }
          }
        `}
      </style>

      <div
        className="construct-carousel-track flex h-full w-max gap-3 px-3 py-3"
        style={{
          ["--track-distance" as any]: `${trackDistance}px`,
          animationDuration: `${durationSeconds}s`,
        }}
      >
        {loopedPictures.map((item, index) => (
          <div
            key={`${item.address}-${item.dataStr}-${index}`}
            className="flex h-[full] w-[300px] flex-shrink-0 flex-col overflow-hidden rounded-lg border border-white/10 bg-[rgba(5,15,28,0.9)] shadow-[0_0_18px_rgba(0,229,255,0.05)]"
          >
            <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black/10">
              <Image
                src={item.address}
                alt={item.dataStr || `图片-${index + 1}`}
                preview={{ src: item.address }}
                loading={index < 3 ? "eager" : "lazy"}
                className="h-[150px] w-[full] object-cover "
              />
            </div>
            <div className=" flex h-[30px] items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-[rgba(5,15,28,0.9)] px-3 py-3">
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

export default memo(ConstructCarousel);
