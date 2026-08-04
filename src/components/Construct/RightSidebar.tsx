import { useMemo } from 'react';
import { Spin } from 'antd';
import ConstructCarousel from './ConstructCarousel';

type BoothProgressItem = {
  name?: string;
  num?: number;
  hallId?: string;
  hallName?: string;
};

function PanelTitle({ title }: { title: string }) {
  return (
    <div className="relative h-11 px-3 shrink-0">
      <div className="flex h-full w-full items-center bg-[url('/img/小标题.png')] bg-[length:100%_100%] bg-left bg-no-repeat pl-[clamp(24px,2vw,36px)] text-sm font-medium text-[#d8efff]">
        <span className="pl-10 pb-1">{title}</span>
      </div>
    </div>
  );
}

const OVERVIEW_LABELS = ['搭建完成', '搭建正常', '进度缓慢', '严重滞后'] as const;
const OVERVIEW_COLORS: Record<string, string> = {
  '搭建完成': '#7fe7c4',
  '搭建正常': '#6dc8ff',
  '进度缓慢': '#ffb84d',
  '严重滞后': '#ff8f8f',
};

type ConstructCarouselPicture = {
  address: string;
  dataStr: string;
  boothId?: string;
  hallId?: string;
  hallName?: string;
  boothNo?: string;
  exhibitor?: string;
};

type ConstructRightSidebarProps = {
  boothProgressData?: any;
  hallId?: string;
  loading?: boolean;
  variant?: "landscape";
  /** Carousel props for the "现场图片" section */
  constructCarouselPictures?: ConstructCarouselPicture[];
  constructCarouselLoading?: boolean;
};

function OverviewStatusItem({ label, value }: { label: string; value: number }) {
  const color = OVERVIEW_COLORS[label] || '#8fb4d8';
  return (
    <div className="flex flex-col items-center justify-center rounded-lg bg-[rgba(118,169,255,0.1)] p-3">
      <span className="text-xs text-[#93aed0] mb-1">{label}</span>
      <span className="text-2xl font-black leading-none" style={{ color }}>
        {value}
      </span>
    </div>
  );
}

function OverviewSection({ data, loading = false }: { data?: any; loading?: boolean }) {
  const overviewItems = useMemo(() => {
    const rows: BoothProgressItem[] = Array.isArray(data)
      ? data
      : (data?.data ?? data?.list ?? data?.rows ?? []);
    return OVERVIEW_LABELS.map((label) => {
      const row = rows.find((item) => item.name === label);
      return { label, value: Number(row?.num ?? 0) };
    });
  }, [data]);

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-[linear-gradient(180deg,rgba(9,26,52,0.88),rgba(6,17,34,0.94))] shadow-[inset_0_0_24px_rgba(80,157,255,0.08)]">
      <PanelTitle title="搭建总览" />
      <div className="min-h-0 flex-1 p-3">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Spin size="default" />
          </div>
        ) : (
          <div className="grid min-h-0 h-full grid-cols-2 grid-rows-2 gap-3 rounded-lg bg-[rgba(8,23,42,0.68)] p-3">
            {overviewItems.map((item) => (
              <OverviewStatusItem key={item.label} label={item.label} value={item.value} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export function ConstructRightSidebar({
  boothProgressData,
  hallId = 'all',
  loading = false,
  variant,
  constructCarouselPictures = [],
  constructCarouselLoading = false,
}: ConstructRightSidebarProps) {
  const isLandscape = variant === "landscape";

  if (isLandscape) {
    return (
      <aside className="grid h-full min-h-0 w-full min-w-0 grid-cols-[repeat(2,minmax(0,1fr))] gap-3 overflow-hidden">
        <OverviewSection data={boothProgressData} loading={loading} />
        <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-[linear-gradient(180deg,rgba(9,26,52,0.88),rgba(6,17,34,0.94))] shadow-[inset_0_0_24px_rgba(80,157,255,0.08)]">
          <PanelTitle title="现场图片" />
          <div className="min-h-0 min-w-0 flex-1 overflow-hidden p-3">
            <div className="h-full rounded-lg bg-[rgba(8,23,42,0.68)] overflow-hidden">
              <ConstructCarousel
                pictures={constructCarouselPictures}
                loading={constructCarouselLoading}
              />
            </div>
          </div>
        </section>
      </aside>
    );
  }

  // Portrait: keep original structure (but simplified — remove MaterialSection and PieChart sections)
  return (
    <aside className="flex h-full min-h-0 flex-col gap-3">
      <OverviewSection data={boothProgressData} loading={loading} />
    </aside>
  );
}
