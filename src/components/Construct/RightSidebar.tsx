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
    <div className="relative h-11 px-3 shrink-0">
      <div className="flex h-full w-full items-center bg-[url('/img/小标题.png')] bg-[length:100%_100%] bg-left bg-no-repeat pl-[clamp(24px,2vw,36px)] text-sm font-medium text-[#d8efff]">
        <span className="pl-10 pb-1">{title}</span>
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
  variant?: "landscape";
  constructCarouselPictures?: ConstructCarouselPicture[];
  constructCarouselLoading?: boolean;
};

export function ConstructRightSidebar({
  variant,
  constructCarouselPictures = [],
  constructCarouselLoading = false,
}: ConstructRightSidebarProps) {
  const isLandscape = variant === "landscape";

  const displayPictures =
    constructCarouselPictures.length > 0
      ? constructCarouselPictures
      : MOCK_CONSTRUCT_PICTURES;

  const carouselSection = (
    <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-[linear-gradient(180deg,rgba(9,26,52,0.88),rgba(6,17,34,0.94))] shadow-[inset_0_0_24px_rgba(80,157,255,0.08)]">
      <PanelTitle title="现场图片" />
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden p-3">
        <div className="h-full rounded-lg bg-[rgba(8,23,42,0.68)] overflow-hidden">
          <ConstructCarousel
            pictures={displayPictures}
            loading={constructCarouselLoading}
            title={undefined}
          />
        </div>
      </div>
    </section>
  );

  if (isLandscape) {
    return (
      <aside className="h-full min-h-0 w-full min-w-0 overflow-hidden">
        {carouselSection}
      </aside>
    );
  }

  // Portrait
  return (
    <aside className="flex h-full min-h-0 flex-col gap-3">
      {carouselSection}
    </aside>
  );
}
