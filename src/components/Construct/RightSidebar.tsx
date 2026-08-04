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

function darken(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const f = 1 - factor;
  const rr = Math.round(r * f).toString(16).padStart(2, '0');
  const gg = Math.round(g * f).toString(16).padStart(2, '0');
  const bb = Math.round(b * f).toString(16).padStart(2, '0');
  return `#${rr}${gg}${bb}`;
}

/**
 * Draw a 2.5D donut ring chart.
 * - Hollow center (inner ring)
 * - 4 equal-angle arcs with gaps
 * - Downward extrusion depth controlled by data value
 * - Base shadow ellipse below
 * - Guide lines + labels on outside
 */
function draw25DRing(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  values: number[],
) {
  const dpr = window.devicePixelRatio || 1;
  ctx.canvas.width = w * dpr;
  ctx.canvas.height = h * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  const cx = w / 2;
  const cy = h * 0.42;
  // Ellipse: wide horizontally, narrow vertically (perspective)
  const outerRx = Math.min(w * 0.34, h * 0.36);
  const outerRy = outerRx * 0.56;
  // Inner hole: ~48% of outer
  const innerRx = outerRx * 0.48;
  const innerRy = outerRy * 0.48;

  // Depth: controlled by value
  const maxVal = Math.max(...values, 1);
  const minDepth = 6;
  const maxDepth = 16;
  const depths = values.map((v) =>
    maxVal > 0 ? minDepth + (v / maxVal) * (maxDepth - minDepth) : minDepth,
  );

  // Gap between arcs
  const gapAngle = 0.04;
  const sliceAngle = (Math.PI * 2) / 4 - gapAngle;

  // --- 1. Base shadow ---
  ctx.fillStyle = 'rgba(20, 92, 210, 0.25)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + maxDepth + 4, outerRx + 4, outerRy + 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // --- 2. Draw each arc (top face + outer side + inner side) ---
  for (let i = 0; i < 4; i++) {
    const startAngle = -Math.PI / 2 + i * (Math.PI * 2) / 4 + gapAngle / 2;
    const endAngle = startAngle + sliceAngle;
    const topColor = OVERVIEW_COLORS[OVERVIEW_LABELS[i]];
    const sideColor = darken(topColor, 0.3);
    const depth = depths[i];

    // Draw outer side wall (extruded downward)
    ctx.fillStyle = sideColor;
    ctx.beginPath();
    for (let a = startAngle; a <= endAngle; a += 0.015) {
      const x = cx + Math.cos(a) * outerRx;
      const y = cy + Math.sin(a) * outerRy;
      a === startAngle ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    for (let a = endAngle; a >= startAngle; a -= 0.015) {
      const x = cx + Math.cos(a) * outerRx;
      const y = cy + Math.sin(a) * outerRy + depth;
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();

    // Draw inner side wall
    ctx.fillStyle = darken(topColor, 0.4);
    ctx.beginPath();
    for (let a = startAngle; a <= endAngle; a += 0.015) {
      const x = cx + Math.cos(a) * innerRx;
      const y = cy + Math.sin(a) * innerRy;
      a === startAngle ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    for (let a = endAngle; a >= startAngle; a -= 0.015) {
      const x = cx + Math.cos(a) * innerRx;
      const y = cy + Math.sin(a) * innerRy + depth;
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();

    // Draw top face (ring segment)
    ctx.fillStyle = topColor;
    ctx.beginPath();
    // Outer arc
    for (let a = startAngle; a <= endAngle; a += 0.015) {
      const x = cx + Math.cos(a) * outerRx;
      const y = cy + Math.sin(a) * outerRy;
      a === startAngle ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    // Inner arc (reverse)
    for (let a = endAngle; a >= startAngle; a -= 0.015) {
      const x = cx + Math.cos(a) * innerRx;
      const y = cy + Math.sin(a) * innerRy;
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();

    // Top face edge highlight
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.lineWidth = 0.6;
    ctx.stroke();
  }

  // --- 3. Inner hole edge (subtle) ---
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.ellipse(cx, cy, innerRx, innerRy, 0, 0, Math.PI * 2);
  ctx.stroke();

  // --- 4. Guide lines and labels ---
  // Label positions: top-right, bottom-right, bottom-left, top-left
  const labelPositions = [
    { ax: 1, ay: -1, tx: 1.05, ty: -1.05 },   // top-right: 搭建正常
    { ax: 1, ay: 1, tx: 1.05, ty: 1.05 },     // bottom-right: 搭建完成
    { ax: -1, ay: 1, tx: -1.05, ty: 1.05 },   // bottom-left: 搭建缓慢
    { ax: -1, ay: -1, tx: -1.05, ty: -1.05 }, // top-left: 严重滞后
  ];

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${Math.max(10, outerRx * 0.13)}px "Source Han Sans CN", sans-serif`;

  for (let i = 0; i < 4; i++) {
    const midAngle = -Math.PI / 2 + i * (Math.PI * 2) / 4;
    const label = OVERVIEW_LABELS[i];
    const color = OVERVIEW_COLORS[label];
    const pos = labelPositions[i];

    // Start point on outer edge
    const sx = cx + Math.cos(midAngle) * outerRx;
    const sy = cy + Math.sin(midAngle) * outerRy;

    // Guide line end point
    const guideLen = outerRx * 0.28;
    const ex = cx + Math.cos(midAngle) * (outerRx + guideLen);
    const ey = cy + Math.sin(midAngle) * (outerRy + guideLen * 0.56);

    // Draw guide line
    ctx.strokeStyle = color + '99'; // 60% opacity
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();

    // Draw dot at ring edge
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Draw value number
    const nx = ex + pos.ax * outerRx * 0.1;
    const ny = ey + pos.ay * outerRy * 0.1;
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.max(11, outerRx * 0.15)}px "Source Han Sans CN", sans-serif`;
    ctx.fillText(String(values[i]), nx, ny);

    // Draw label below value
    ctx.fillStyle = color;
    ctx.font = `${Math.max(9, outerRx * 0.11)}px "Source Han Sans CN", sans-serif`;
    ctx.fillText(label, nx, ny + outerRy * 0.18);
  }

  // --- 5. Glow ring ---
  ctx.strokeStyle = 'rgba(37, 99, 235, 0.15)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(cx, cy, outerRx + 2, outerRy + 1.5, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function ConstructOverviewChart({ data }: { data?: any }) {
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
      draw25DRing(ctx, w, h, values);
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
    <div ref={containerRef} className="relative h-full w-full min-h-0 min-w-0">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
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
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <ConstructOverviewChart data={boothProgressData} />
      </div>
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
