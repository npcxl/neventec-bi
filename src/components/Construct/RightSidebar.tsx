import { useMemo } from 'react';
import { ConstructProgressPie } from './ConstructProgressPie';
import ConstructCarousel from './ConstructCarousel';

const MOCK_CONSTRUCT_PICTURES = [
  {
    address: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1200&q=80",
    dataStr: "搭建现场01",
    boothNo: "A01",
    exhibitor: "现场搭建",
  },
  {
    address: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80",
    dataStr: "搭建现场02",
    boothNo: "A02",
    exhibitor: "施工进度",
  },
  {
    address: "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80",
    dataStr: "搭建现场03",
    boothNo: "A03",
    exhibitor: "展馆现场",
  },
];

function PanelTitle({ title }: { title: string }) {
  return (
    <div className="relative h-12  shrink-0">
      <div className="flex h-full items-center bg-[url('/img/sub-title.png')] bg-[length:100%_100%] bg-left bg-no-repeat pl-[clamp(24px,2vw,36px)] text-sm font-medium text-[#d8efff]">
        <span className="pl-[24px] pb-3 text-[18px]">{title}</span>
      </div>
    </div>
  );
}

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
  constructOverviewData?: any;
  boothProgressData?: any;
  variant?: "landscape";
  constructCarouselPictures?: ConstructCarouselPicture[];
  constructCarouselLoading?: boolean;
  loading?: boolean;
};

const STATUS_CONFIG: { code: string; names: string[]; label: string; color: string }[] = [
  { code: '11', names: ['搭建正常'], label: '搭建正常', color: '#2563EB' },
  { code: '14', names: ['搭建完成'], label: '搭建完成', color: '#63F222' },
  { code: '12', names: ['进度缓慢', '搭建缓慢'], label: '搭建缓慢', color: '#FA8C16' },
  { code: '13', names: ['严重滞后'], label: '严重滞后', color: '#F5222D' },
  { code: '10', names: ['暂未入场(空地)', '暂未入场'], label: '未进场', color: '#6B7C93' },
];

type StatusEntry = { label: string; color: string; count: number };

function extractStatusData(rawData: any): StatusEntry[] {
  const rows: any[] = Array.isArray(rawData)
    ? rawData
    : (rawData?.data ?? rawData?.list ?? rawData?.rows ?? []);

  return STATUS_CONFIG.map((config) => {
    const row = rows.find((item: any) => {
      const enumCode = String(item.enumName ?? '').trim();
      const name = String(item.name ?? '').trim();
      return enumCode === config.code || config.names.includes(name);
    });
    return {
      label: config.label,
      color: config.color,
      count: Number(row?.num ?? 0),
    };
  });
}

function StatusLegend({ entries }: { entries: StatusEntry[] }) {
  return (
    <div className="flex shrink-0 flex-col gap-2.5 py-2">
      {entries.map((entry) => (
        <div
          key={entry.label}
          className="flex items-center gap-2 text-sm leading-[22px]"
        >
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="whitespace-nowrap text-white">{entry.label}</span>
        </div>
      ))}
    </div>
  );
}

export function ConstructRightSidebar({
  constructOverviewData,
  boothProgressData: _boothProgressData,
  variant,
  constructCarouselPictures = [],
  constructCarouselLoading = false,
}: ConstructRightSidebarProps) {
  const isLandscape = variant === "landscape";

  const displayPictures = constructCarouselPictures;

  const entries = useMemo(
    () => extractStatusData(constructOverviewData),
    [constructOverviewData],
  );

  const overviewSection = (
    <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <div className="shrink-0">
        <PanelTitle title="搭建进度统计" />
      </div>
      {entries.every((e) => e.count === 0) ? (
        <div className="flex flex-1 items-center justify-center text-sm text-[rgba(255,255,255,0.4)]">
          暂无数据
        </div>
      ) : (
        <div
          className="grid min-h-0 flex-1 items-center overflow-hidden"
          style={{ gridTemplateColumns: 'minmax(0,1fr) auto', columnGap: 16 }}
        >
          <ConstructProgressPie entries={entries} />
          <StatusLegend entries={entries} />
        </div>
      )}
    </section>
  );

  const carouselSection = (vertical?: boolean) => (
    <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <div className={isLandscape ? "shrink-0 w-1/2" : "shrink-0 w-full"}>
        <PanelTitle title="现场图片" />
      </div>
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
        <ConstructCarousel
          pictures={displayPictures}
          loading={constructCarouselLoading}
          vertical={vertical}
        />
      </div>
    </section>
  );

  if (isLandscape) {
    return (
      <aside className="grid h-full min-h-0 w-full min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3 overflow-hidden">
        {overviewSection}
        {carouselSection()}
      </aside>
    );
  }

  return (
    <aside className="flex h-full min-h-0 flex-col gap-3" style={{ background: 'url(/img/bg-diffuse.png) center/contain no-repeat' }}>
      <div className="flex-[0.33] min-h-0">
        {overviewSection}
      </div>
      <div className="flex-[0.67] min-h-0">
        {carouselSection(true)}
      </div>
    </aside>
  );
}
