import { useEffect, useMemo, useRef, useState } from "react";
import { Spin } from "antd";
import * as echarts from "echarts";
import { SeamlessVirtualList } from "../SeamlessVirtuaList";

type BoothRow = {
  boothNo?: string;
  exhibitor?: string;
  report?: string;
  paid?: string;
  declare?: string;
  hallId?: string;
  hallName?: string;
};

function isPaid(row: BoothRow) {
  const paid = `${row.paid ?? ""}`;
  return paid.includes("已") || paid === "0";
}

function isReported(row: BoothRow) {
  const report = `${row.report ?? ""}`;
  return report.includes("已") || report === "0";
}

function PanelTitle({ title }: { title: string }) {
  return (
    <div className="relative h-12">
      <div className="flex h-full w-full items-center bg-[url('/img/sub-title.png')] bg-[length:100%_100%] bg-left bg-no-repeat pl-[clamp(24px,2vw,36px)] text-sm font-medium text-[#d8efff]">
        <span className="pl-[8px] pb-3 text-[18px]">{title}</span>
      </div>
    </div>
  );
}

type OrderItem = { name: string; num: number };

function normalizeOrderCollect(data: unknown): OrderItem[] {
  if (Array.isArray(data)) return data as OrderItem[];
  if (data && typeof data === "object") {
    const record = data as { data?: unknown; list?: unknown; rows?: unknown; result?: unknown };
    return normalizeOrderCollect(record.data ?? record.list ?? record.rows ?? record.result);
  }
  return [];
}

export function ExhibitionRightSidebar({
  boothRows = [],
  orderCollect = [],
  hallId = "all",
  loading = false,
  variant,
}: {
  boothRows?: BoothRow[];
  orderCollect?: unknown;
  hallId?: string;
  loading?: boolean;
  /** "landscape" makes the top two sections side-by-side */
  variant?: "landscape";
}) {
  const isLandscape = variant === "landscape";
  const [payMode, setPayMode] = useState<"paid" | "unpaid">("unpaid");

  const visibleRows =
    hallId === "all"
      ? boothRows
      : boothRows.filter((row) => (row.hallId || "__unknown__") === hallId);

  const paidRows = useMemo(() => visibleRows.filter(isPaid), [visibleRows]);
  const unpaidRows = useMemo(() => visibleRows.filter((row) => !isPaid(row)), [visibleRows]);
  const unReportedRows = useMemo(() => visibleRows.filter((row) => !isReported(row)), [visibleRows]);

  const totalBooth = visibleRows.length;
  const paidCount = paidRows.length;
  const unpaidCount = unpaidRows.length;
  const unReportCount = unReportedRows.length;
  const paidRate = totalBooth > 0 ? ((paidCount / totalBooth) * 100).toFixed(1) : "0.0";
  const reportRate = totalBooth > 0 ? (((totalBooth - unReportCount) / totalBooth) * 100).toFixed(1) : "0.0";

  const orderItems = useMemo(() => normalizeOrderCollect(orderCollect), [orderCollect]);
  const displayRows = payMode === "paid" ? paidRows : unpaidRows;

  const landscapeSectionClass = "flex h-full min-h-0 min-w-0 flex-col overflow-hidden";

  // Shared sections extracted so they render once regardless of layout
  const expenseSection = (
    <section className={isLandscape ? landscapeSectionClass : "flex min-h-0 flex-1 flex-col overflow-hidden"}>
      <div className="shrink-0 w-2/3"><PanelTitle title="特装费用缴纳" /></div>
      <div className="flex min-h-0 flex-1 flex-col px-4 pb-3 pt-1">
        {loading ? (
          <div className="flex min-h-0 flex-1 items-center justify-center rounded-xl">
            <Spin size="large" />
          </div>
        ) : (
          <>
            {/* 已缴费 / 未缴费 汇总 + 环形进度图（仅竖版显示） */}
            {!isLandscape && (
              <div className="flex items-center gap-3 py-1 relative">
                <PieRing percent={Number(paidRate)} color2="#2563EB" color1="#7DE3F7" size={110} />
                <div className="absolute top-[40px] left-[25px] flex flex-col items-center justify-center">
                  <div className="text-[rgba(255, 255, 255, 0.80)];">
                    <span className="text-[12px]">缴费完成率</span>
                  </div>
                  <div>
                    <span className="text-[20px] bold-500"> {paidRate}%</span>
                  </div>
                </div>
                <div className="gap-[16px] ml-[57px]">
                  <div className="mb-4">
                    <span className="text-[24px] bold-700"> {paidCount}</span> / <span>{totalBooth}  </span>
                  </div>
                  <div>
                    <span className="text-[14px]">已缴费</span> <span className="text-[14px] text-[#63F222]">{paidCount}</span>
                    <span className="ml-[42px] text-[14px]">未缴费</span> <span className="text-[14px] text-[#F5222D]">{unpaidCount}</span>
                  </div>
                </div>
              </div>
            )}
            <div className="mt-1 flex border-b border-[rgba(255,255,255,0.1)]">
              <button
                className={`flex-1 pb-2 text-center text-sm transition-colors ${payMode === "paid" ? "text-[#93C5FD] border-b-2 border-[#93C5FD]" : "text-[#738AA9] border-b-2 border-transparent"}`}
                onClick={() => setPayMode("paid")}
              >
                已缴费 {paidCount}
              </button>
              <button
                className={`flex-1 pb-2 text-center text-sm transition-colors ${payMode === "unpaid" ? "text-[#93C5FD] border-b-2 border-[#93C5FD]" : "text-[#738AA9] border-b-2 border-transparent"}`}
                onClick={() => setPayMode("unpaid")}
              >
                未缴费 {unpaidCount}
              </button>
            </div>
            <div className="mt-1 flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg">
              <div className="grid flex-none grid-cols-[100px_minmax(0,1fr)] gap-2 px-3 py-2 text-[14px] text-[rgba(255,255,255,0.8)] bg-[url('/img/bg-list.png')] bg-[length:100%_100%]">
                <span>展位号</span>
                <span>参展商</span>
              </div>
              <div className="min-h-0 flex-1 overflow-hidden">
                <SeamlessVirtualList
                  data={displayRows}
                  itemHeight={38}
                  height="100%"
                  speed={0.35}
                  overscan={8}
                  pauseOnHover={false}
                  className="h-full"
                  renderItem={(row) => (
                    <div className="grid h-full grid-cols-[100px_minmax(0,1fr)] items-center gap-2 border-b border-dashed border-[#334155] px-3 text-[14px] hover:bg-white/[0.08]">
                      <span className="truncate whitespace-nowrap text-white">{row.boothNo || "-"}</span>
                      <span className="truncate whitespace-nowrap text-white">{row.exhibitor || "-"}</span>
                    </div>
                  )}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );

  const unreportedSection = (
    <section className={isLandscape ? landscapeSectionClass : "flex min-h-0 flex-1 flex-col overflow-hidden"}>
      <div className="shrink-0 w-2/3"><PanelTitle title="未报到展位汇总" /></div>
      <div className="flex min-h-0 flex-1 flex-col px-4 pb-3 pt-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-[rgba(255,255,255,0.8)]">未报到</span>
            <span className="text-lg font-bold text-white">{unReportCount}</span>
            <span className="text-xs text-[rgba(255,255,255,0.6)]">个</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-[rgba(255,255,255,0.8)]">报到完成率</span>
            <span className="text-lg font-bold text-[#93C5FD]">{reportRate}%</span>
          </div>
        </div>
        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[rgba(255,255,255,0.1)]">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,#2563EB,#7DE3F7)] transition-all duration-500"
            style={{ width: `${reportRate}%` }}
          />
        </div>
        <div className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg">
          <div className="grid flex-none grid-cols-[44px_72px_minmax(0,1fr)] gap-2 px-3 py-2 text-[14px] text-[rgba(255,255,255,0.8)] bg-[url('/img/bg-list.png')] bg-[length:100%_100%]">
            <span>序号</span>
            <span>展位号</span>
            <span>参展商</span>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            <SeamlessVirtualList
              data={unReportedRows}
              itemHeight={38}
              height="100%"
              speed={0.35}
              overscan={8}
              pauseOnHover={false}
              className="h-full"
              renderItem={(row, index) => (
                <div className="grid h-full grid-cols-[44px_72px_minmax(0,1fr)] items-center gap-2 border-b border-dashed border-[#334155] px-3 text-[14px] hover:bg-white/[0.08]">
                  <span className="text-white">{index + 1}</span>
                  <span className="truncate whitespace-nowrap text-white">{row.boothNo || "-"}</span>
                  <span className="truncate whitespace-nowrap text-white">{row.exhibitor || "-"}</span>
                </div>
              )}
            />
          </div>
        </div>
      </div>
    </section>
  );

  const ordersSection = (
    <section className={isLandscape ? landscapeSectionClass : "flex min-h-0 flex-[0.38] flex-col overflow-hidden"}>
      <div className="shrink-0 w-2/3"><PanelTitle title="水电气网络申报" /></div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 pb-4 pt-2">
        {(() => {
          const maxNum = Math.max(...orderItems.map((i) => i.num), 1);
          const maxLabelLen = Math.max(...orderItems.map((i) => i.name.length), 1);
          return orderItems.map((item) => {
            const barWidth = (item.num / maxNum) * 100;
            return (
              <div
                key={item.name}
                className="flex items-center gap-3 px-3 py-2 bg-[url('/img/order-item-bg.png')] bg-[length:100%_100%] bg-center bg-no-repeat rounded-md"
              >
                <div
                  className="flex h-5 shrink-0 items-center justify-start text-xs text-[rgba(255,255,255,0.8)]"
                  style={{ width: `${maxLabelLen * 18 + 8}px` }}
                >
                  {item.name}
                </div>
                <div className="flex h-4 flex-1 items-center overflow-hidden rounded-full bg-[url('/img/progress-track-bg.png')] bg-[length:100%_100%]">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#2563EB,#7DE3F7)] transition-all duration-700"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
                <span className="text-xs text-white shrink-0">{item.num}单</span>
              </div>
            );
          });
        })()}
        {orderItems.length === 0 && (
          <div className="flex flex-1 items-center justify-center text-sm text-[rgba(255,255,255,0.4)]">
            暂无数据
          </div>
        )}
      </div>
    </section>
  );

  return isLandscape ? (
    /* LANDSCAPE: 3-column grid */
    <aside className="grid h-full min-h-0 w-full min-w-0 grid-cols-3 gap-[clamp(0.6rem,1vw,0.9rem)] xl:gap-3 overflow-hidden">
      {expenseSection}
      {unreportedSection}
      {ordersSection}
    </aside>
  ) : (
    /* PORTRAIT: original vertical stacking */
    <aside className="flex h-full min-h-0 flex-col gap-[clamp(0.6rem,1vw,0.9rem)] xl:gap-3">
      <div className="flex min-h-0 flex-[0.40] flex-col overflow-hidden">
        {expenseSection}
      </div>
      <div className="flex min-h-0 flex-[0.28] flex-col overflow-hidden">
        {unreportedSection}
      </div>
      {ordersSection}
    </aside>
  );
}

/** 环形进度图组件 */
function PieRing({
  percent,
  size = 80,
  color1 = "#13B8D6",
  color2 = "#2563EB",
}: {
  percent: number;
  size?: number;
  color1?: string;
  color2?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<echarts.EChartsType | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.getInstanceByDom(ref.current) ?? echarts.init(ref.current);
    chartRef.current = chart;

    chart.setOption({
      series: [
        {
          type: "pie",
          radius: ["65%", "78%"],
          center: ["50%", "50%"],
          silent: true,
          label: { show: false },
          data: [
            { value: percent, itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: color1 }, { offset: 1, color: color2 }]) } },
            { value: 100 - percent, itemStyle: { color: "#1E293B" } },
          ],
          animation: true,
          animationDuration: 1000,
        },
      ],
    });

    const onResize = () => chart.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (!chart.isDisposed()) chart.dispose();
      chartRef.current = null;
    };
  }, [percent, color1, color2]);

  return <div ref={ref} style={{ width: size, height: size }} />;
}
