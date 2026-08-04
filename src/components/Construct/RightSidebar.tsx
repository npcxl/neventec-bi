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
      <div className="flex h-full items-center bg-[url('/img/小标题.png')] bg-[length:100%_100%] bg-left bg-no-repeat pl-[clamp(24px,2vw,36px)] text-sm font-medium text-[#d8efff]">
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

/* ============================================
   状态映射与颜色
   ============================================ */

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  // 数字枚举
  '11': { label: '搭建正常', color: '#2563EB' },
  '12': { label: '搭建缓慢', color: '#FA8C16' },
  '13': { label: '严重滞后', color: '#F5222D' },
  '14': { label: '搭建完成', color: '#63F222' },
  // 英文枚举
  'NORMAL_PROGRESS': { label: '搭建正常', color: '#2563EB' },
  'SLOW_PROGRESS': { label: '搭建缓慢', color: '#FA8C16' },
  'DELAY_PROGRESS': { label: '严重滞后', color: '#F5222D' },
  'COMPLETED_PROGRESS': { label: '搭建完成', color: '#63F222' },
  // 中文枚举
  '搭建正常': { label: '搭建正常', color: '#2563EB' },
  '搭建缓慢': { label: '搭建缓慢', color: '#FA8C16' },
  '严重滞后': { label: '严重滞后', color: '#F5222D' },
  '搭建完成': { label: '搭建完成', color: '#63F222' },
};

const STATUS_ORDER = ['搭建正常', '搭建完成', '搭建缓慢', '严重滞后'] as const;

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

/* ============================================
   数据提取：按 STATUS_ORDER 汇总
   ============================================ */

type StatusEntry = { label: string; color: string; count: number };

function extractStatusData(rawData: any): StatusEntry[] {
  const rows: Array<Record<string, any>> =
    Array.isArray(rawData)
      ? rawData
      : (rawData?.data ?? rawData?.list ?? rawData?.rows ?? rawData?.result ?? []);

  const map = new Map<string, number>();
  STATUS_ORDER.forEach((label) => map.set(label, 0));

  for (const row of rows) {
    // 兼容多种字段名
    const statusKey = String(
      row.enumName ?? row.progressStatus ?? row.status ?? row.name ?? ''
    ).trim();
    const count = Number(row.num ?? row.count ?? row.value ?? 0) || 0;
    const info = STATUS_MAP[statusKey];
    if (info && STATUS_ORDER.includes(info.label as any)) {
      map.set(info.label, (map.get(info.label) ?? 0) + count);
    } else if (statusKey) {
      if (import.meta.env.DEV) {
        console.warn('[ConstructOverview] 未识别的状态值:', statusKey, row);
      }
    }
  }

  return STATUS_ORDER.map((label) => ({
    label,
    color: STATUS_MAP[label]!.color,
    count: map.get(label) ?? 0,
  }));
}

/* ============================================
   2.5D 圆环 Canvas 绘制（更细更精致）
   ============================================ */

function draw25DRing(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  entries: StatusEntry[],
) {
  const dpr = window.devicePixelRatio || 1;
  ctx.canvas.width = w * dpr;
  ctx.canvas.height = h * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  const cx = w / 2;
  const cy = h * 0.42;
  const outerRx = Math.min(w * 0.38, h * 0.40);
  const outerRy = outerRx * 0.56;
  // 更细的圆环：内径增大到 75%
  const innerRx = outerRx * 0.75;
  const innerRy = outerRy * 0.75;

  // 四等分：每类固定 25%
  const quarterAngle = (Math.PI * 2) / 4;
  const gapAngle = 0.03;
  const sliceAngle = quarterAngle - gapAngle;

  // 侧壁高度由数量控制
  const minDepth = 3;
  const maxDepth = 16;
  const maxCount = Math.max(...entries.map((e) => e.count), 1);
  const depths = entries.map((e) =>
    e.count > 0 ? minDepth + (e.count / maxCount) * (maxDepth - minDepth) : 0,
  );
  const actualMaxDepth = Math.max(...depths);

  // 减弱底部阴影
  ctx.fillStyle = 'rgba(20, 92, 210, 0.12)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + actualMaxDepth + 2, outerRx + 2, outerRy + 1.5, 0, 0, Math.PI * 2);
  ctx.fill();

  for (let i = 0; i < 4; i++) {
    const entry = entries[i];
    const startAngle = -Math.PI / 2 + i * quarterAngle + gapAngle / 2;
    const endAngle = startAngle + sliceAngle;
    const topColor = entry.color;
    const depth = depths[i];
    const hasData = entry.count > 0;

    if (hasData) {
      // 外侧面
      const sideColor = darken(topColor, 0.35);
      ctx.fillStyle = sideColor;
      ctx.beginPath();
      for (let a = startAngle; a <= endAngle; a += 0.02) {
        const x = cx + Math.cos(a) * outerRx;
        const y = cy + Math.sin(a) * outerRy;
        a === startAngle ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      for (let a = endAngle; a >= startAngle; a -= 0.02) {
        ctx.lineTo(cx + Math.cos(a) * outerRx, cy + Math.sin(a) * outerRy + depth);
      }
      ctx.closePath();
      ctx.fill();

      // 内侧面
      ctx.fillStyle = darken(topColor, 0.45);
      ctx.beginPath();
      for (let a = startAngle; a <= endAngle; a += 0.02) {
        const x = cx + Math.cos(a) * innerRx;
        const y = cy + Math.sin(a) * innerRy;
        a === startAngle ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      for (let a = endAngle; a >= startAngle; a -= 0.02) {
        ctx.lineTo(cx + Math.cos(a) * innerRx, cy + Math.sin(a) * innerRy + depth);
      }
      ctx.closePath();
      ctx.fill();
    }

    // 顶面（有数据时正常颜色，无数据时低透明度）
    ctx.fillStyle = hasData ? topColor : topColor + '33';
    ctx.beginPath();
    for (let a = startAngle; a <= endAngle; a += 0.02) {
      const x = cx + Math.cos(a) * outerRx;
      const y = cy + Math.sin(a) * outerRy;
      a === startAngle ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    for (let a = endAngle; a >= startAngle; a -= 0.02) {
      ctx.lineTo(cx + Math.cos(a) * innerRx, cy + Math.sin(a) * innerRy);
    }
    ctx.closePath();
    ctx.fill();

    // 细描边
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  // 内孔边缘
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.ellipse(cx, cy, innerRx, innerRy, 0, 0, Math.PI * 2);
  ctx.stroke();

  // 减弱光晕
  ctx.strokeStyle = 'rgba(37, 99, 235, 0.10)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(cx, cy, outerRx + 1, outerRy + 1, 0, 0, Math.PI * 2);
  ctx.stroke();

  // 中心总数
  const centerTotal = entries.reduce((sum, e) => sum + e.count, 0);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.max(14, outerRx * 0.28)}px "Source Han Sans CN", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(centerTotal), cx, cy - 4);

  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = `${Math.max(9, outerRx * 0.14)}px "Source Han Sans CN", sans-serif`;
  ctx.fillText('展位总数', cx, cy + Math.max(12, outerRx * 0.16));
}

/* ============================================
   圆环图组件（Canvas 只画圆环，右侧用 DOM）
   ============================================ */

function ConstructOverviewChart({ data }: { data?: any }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const roRef = useRef<ResizeObserver | null>(null);

  const entries = useMemo(() => extractStatusData(data), [data]);

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
      draw25DRing(ctx, w, h, entries);
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(container);
    roRef.current = ro;
    return () => { ro.disconnect(); roRef.current = null; };
  }, [entries]);

  return (
    <div ref={containerRef} className="relative h-full w-full min-h-0 min-w-0">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}

/* ============================================
   右侧状态列表
   ============================================ */

function StatusLegend({ entries }: { entries: StatusEntry[] }) {
  return (
    <div className="flex flex-col gap-2.5 px-3 py-2">
      {entries.map((entry) => (
        <div
          key={entry.label}
          className="grid items-center text-sm leading-[22px]"
          style={{ gridTemplateColumns: '8px minmax(0,1fr) 40px 44px', columnGap: 8 }}
        >
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="truncate text-white/80">{entry.label}</span>
          <span className="text-right tabular-nums text-white">{entry.count}</span>
          <span className="text-right tabular-nums text-white/50">25%</span>
        </div>
      ))}
    </div>
  );
}

/* ============================================
   ConstructRightSidebar 主组件
   ============================================ */

export function ConstructRightSidebar({
  boothProgressData,
  variant,
  constructCarouselPictures = [],
  constructCarouselLoading = false,
}: ConstructRightSidebarProps) {
  const isLandscape = variant === "landscape";

  const displayPictures =
    constructCarouselPictures.length > 0
      ? constructCarouselPictures
      : MOCK_CONSTRUCT_PICTURES;

  const entries = useMemo(() => extractStatusData(boothProgressData), [boothProgressData]);

  const overviewSection = (
    <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <div className="shrink-0">
        <PanelTitle title="搭建总览" />
      </div>
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* 左侧圆环 */}
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <ConstructOverviewChart data={boothProgressData} />
        </div>
        {/* 右侧状态列表 */}
        <div className="flex shrink-0 items-center" style={{ width: 140 }}>
          <StatusLegend entries={entries} />
        </div>
      </div>
    </section>
  );

  const carouselSection = (
    <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <div className="shrink-0 w-1/2">
        <PanelTitle title="现场图片" />
      </div>
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden p-3">
        <ConstructCarousel
          pictures={displayPictures}
          loading={constructCarouselLoading}
          title={undefined}
        />
      </div>
    </section>
  );

  if (isLandscape) {
    return (
      <aside className="grid h-full min-h-0 w-full min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3 overflow-hidden">
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
