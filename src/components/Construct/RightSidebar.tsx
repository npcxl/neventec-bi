import { useEffect, useMemo, useRef } from 'react';
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
  boothProgressData?: any;
  variant?: "landscape";
  constructCarouselPictures?: ConstructCarouselPicture[];
  constructCarouselLoading?: boolean;
  loading?: boolean;
};

const OVERVIEW_LABELS = ['搭建正常', '搭建完成', '搭建缓慢', '严重滞后'] as const;
const OVERVIEW_COLORS: Record<string, string> = {
  '搭建正常': '#2563EB',
  '搭建完成': '#63F222',
  '搭建缓慢': '#FA8C16',
  '严重滞后': '#F5222D',
};
const OVERVIEW_SIDE_COLORS: Record<string, string> = {
  '搭建正常': '#1a47b8',
  '搭建完成': '#3db316',
  '搭建缓慢': '#c46e0d',
  '严重滞后': '#c41a1a',
};

/** Draw a 2.5D pie chart on canvas: 4 equal-angle sectors with varying height */
function draw25DPie(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  values: number[],
) {
  const dpr = window.devicePixelRatio || 1;
  const cw = w * dpr;
  const ch = h * dpr;
  ctx.canvas.width = cw;
  ctx.canvas.height = ch;
  ctx.scale(dpr, dpr);

  const cx = w * 0.45;
  const cy = h * 0.45;
  const rx = Math.min(w * 0.35, h * 0.32);
  const ry = rx * 0.52; // ellipse perspective

  const maxVal = Math.max(...values, 1);
  const minH = rx * 0.08;
  const maxH = rx * 0.32;
  const heights = values.map((v) => minH + (v / maxVal) * (maxH - minH));

  const gapAngle = 0.03;
  const sliceAngle = (Math.PI * 2) / 4 - gapAngle;

  for (let i = 0; i < 4; i++) {
    const startAngle = -Math.PI / 2 + i * (Math.PI * 2) / 4 + gapAngle / 2;
    const endAngle = startAngle + sliceAngle;
    const topColor = OVERVIEW_COLORS[OVERVIEW_LABELS[i]];
    const sideColor = OVERVIEW_SIDE_COLORS[OVERVIEW_LABELS[i]];
    const hh = heights[i];

    // Draw side (extruded)
    ctx.fillStyle = sideColor;
    ctx.beginPath();
    for (let a = startAngle; a <= endAngle; a += 0.02) {
      const sx = cx + Math.cos(a) * rx;
      const sy = cy + Math.sin(a) * ry + hh;
      if (a === startAngle) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    // bottom arc back
    for (let a = endAngle; a >= startAngle; a -= 0.02) {
      const sx = cx + Math.cos(a) * rx;
      const sy = cy + Math.sin(a) * ry;
      ctx.lineTo(sx, sy);
    }
    ctx.closePath();
    ctx.fill();

    // Draw top face
    ctx.fillStyle = topColor;
    ctx.beginPath();
    ctx.ellipse(cx, cy + hh, rx, ry, 0, startAngle, endAngle);
    ctx.lineTo(cx, cy + hh);
    ctx.closePath();
    ctx.fill();
  }

  // Draw top ellipse outline
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function Overview25DPie({ data }: { data?: any }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const roRef = useRef<ResizeObserver | null>(null);

  const values = useMemo(() => {
    const rows: Array<{ name?: string; num?: number }> = Array.isArray(data)
      ? data
      : (data?.data ?? data?.list ?? data?.rows ?? []);
    return OVERVIEW_LABELS.map((label) => {
      const row = rows.find((item) => item.name === label);
      return Number(row?.num ?? 0);
    });
  }, [data]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const draw = () => {
      const w = container.clientWidth || 1;
      const h = container.clientHeight || 1;
      if (w <= 0 || h <= 0) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      draw25DPie(ctx, w, h, values);
    };

    draw();

    const ro = new ResizeObserver(draw);
    ro.observe(container);
    roRef.current = ro;

    return () => {
      ro.disconnect();
      roRef.current = null;
    };
  }, [values]);

  return (
    <div className="flex min-h-0 flex-1 flex-col p-2">
      <div ref={containerRef} className="min-h-0 flex-1 relative">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      </div>
      <div className="grid shrink-0 grid-cols-2 gap-x-2 gap-y-1 px-2 pb-1 text-xs text-[#93aed0]">
        {OVERVIEW_LABELS.map((label, i) => (
          <div key={label} className="flex items-center gap-1.5 truncate">
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: OVERVIEW_COLORS[label] }}
            />
            <span className="truncate">{label}</span>
            <span className="ml-auto shrink-0 tabular-nums font-medium text-white">
              {values[i]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ConstructRightSidebar({
  boothProgressData,
  variant,
  constructCarouselPictures = [],
  constructCarouselLoading = false,
  loading = false,
}: ConstructRightSidebarProps) {
  const isLandscape = variant === "landscape";

  const displayPictures =
    constructCarouselPictures.length > 0
      ? constructCarouselPictures
      : MOCK_CONSTRUCT_PICTURES;

  const overviewSection = (
    <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-[linear-gradient(180deg,rgba(9,26,52,0.88),rgba(6,17,34,0.94))] shadow-[inset_0_0_24px_rgba(80,157,255,0.08)]">
      <PanelTitle title="搭建总览" />
      <Overview25DPie data={boothProgressData} />
    </section>
  );

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
      <aside className="grid h-full min-h-0 w-full min-w-0 grid-cols-[repeat(2,minmax(0,1fr))] gap-3 overflow-hidden">
        {overviewSection}
        {carouselSection}
      </aside>
    );
  }

  return (
    <aside className="flex h-full min-h-0 flex-col gap-3">
      {overviewSection}
      {carouselSection}
    </aside>
  );
}
