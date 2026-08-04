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
    <div className="relative h-11 px-3">
      <div className="flex h-full w-full items-center bg-[url('/img/小标题.png')] bg-[length:100%_100%] bg-left bg-no-repeat pl-[clamp(24px,2vw,36px)] text-sm font-medium text-[#d8efff]">
        <span className="pl-10 pb-1">{title}</span>
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
}: {
  boothRows?: BoothRow[];
  orderCollect?: unknown;
  hallId?: string;
  loading?: boolean;
}) {
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

  return (
    <aside className="flex h-full min-h-0 flex-col gap-[clamp(0.6rem,1vw,0.9rem)] xl:gap-3">
      {/* ===== 特装费用缴纳 ===== */}
      <section className="flex min-h-0 flex-[0.38] flex-col overflow-hidden">
        <PanelTitle title="特装费用缴纳" />

        <div className="flex min-h-0 flex-1 flex-col px-4 pb-3 pt-1">
          {loading ? (
            <div className="flex min-h-0 flex-1 items-center justify-center rounded-xl">
              <Spin size="large" />
            </div>
          ) : (
            <>
              {/* 环形进度图区域 */}
              <div className="flex items-center gap-4">
                {/* 左侧环形图 */}
                <div className="relative flex h-[120px] w-[120px] shrink-0 items-center justify-center">
                  <PieRing
                    percent={parseFloat(paidRate)}
                    size={120}
                    color1="#13B8D6"
                    color2="#2563EB"
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span style={{ color: "rgba(255,255,255,0.8)", fontFamily: '"Source Han Sans CN"', fontSize: 12, fontWeight: 400, lineHeight: "20px" }}>缴费完成率</span>
                    <span style={{ color: "#FFF", fontFamily: '"Source Han Sans CN"', fontSize: 20, fontWeight: 500, lineHeight: "28px" }}>{paidRate}%</span>
                  </div>
                </div>

                {/* 右侧数据 */}
                <div className="flex flex-1 flex-col gap-2">
                  <div className="text-xl font-bold text-white">
                    {paidCount}<span className="text-sm font-normal text-white/80">/{totalBooth}</span>
                  </div>
                  <div className="flex items-center gap-10">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm text-[rgba(255,255,255,0.8)]">已缴费</span>
                      <span className="text-sm font-medium text-[#63F222]">{paidCount}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm text-[rgba(255,255,255,0.8)]">未缴费</span>
                      <span className="text-sm font-medium text-[#F5222D]">{unpaidCount}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tab 切换 */}
              <div className="mt-2 flex border-b border-[rgba(255,255,255,0.1)]">
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

              {/* 列表 */}
              <div className="mt-1 flex min-h-0 flex-1 flex-col overflow-hidden rounded-md bg-black/10">
                <div className="grid flex-none grid-cols-[100px_minmax(0,1fr)] gap-4 px-4 py-2 text-xs text-[rgba(255,255,255,0.8)]">
                  <span>展位号</span>
                  <span>参展商</span>
                </div>
                <div className="min-h-0 flex-1 overflow-hidden">
                  <SeamlessVirtualList
                    data={displayRows}
                    itemHeight={32}
                    height="100%"
                    speed={0.35}
                    overscan={8}
                    pauseOnHover={false}
                    className="h-full"
                    renderItem={(row) => (
                      <div className="grid h-full grid-cols-[100px_minmax(0,1fr)] items-center gap-4 border-b border-dashed border-[rgba(255,255,255,0.08)] px-4 text-xs">
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

      {/* ===== 未报到展位汇总 ===== */}
      <section className="flex min-h-0 flex-[0.24] flex-col overflow-hidden">
        <PanelTitle title="未报到展位汇总" />

        <div className="flex min-h-0 flex-1 flex-col px-4 pb-3 pt-1">
          {/* 统计行 */}
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

          {/* 进度条 */}
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[rgba(255,255,255,0.1)]">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#2563EB,#7DE3F7)] transition-all duration-500"
              style={{ width: `${reportRate}%` }}
            />
          </div>

          {/* 列表 */}
          <div className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden rounded-md bg-black/10">
            <div className="grid flex-none grid-cols-[44px_72px_minmax(0,1fr)] gap-2 px-3 py-1.5 text-xs text-[rgba(255,255,255,0.8)]">
              <span>序号</span>
              <span>展位号</span>
              <span>参展商</span>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              <SeamlessVirtualList
                data={unReportedRows}
                itemHeight={32}
                height="100%"
                speed={0.35}
                overscan={8}
                pauseOnHover={false}
                className="h-full"
                renderItem={(row, index) => (
                  <div className="grid h-full grid-cols-[44px_72px_minmax(0,1fr)] items-center gap-2 border-b border-dashed border-[rgba(255,255,255,0.08)] px-3 text-xs">
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

      {/* ===== 水电气网络申报订单数量 ===== */}
      <section className="flex min-h-0 flex-[0.38] flex-col overflow-hidden">
        <PanelTitle title="水电气网络申报订单数量" />
        <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 pb-4 pt-2">
          {(() => {
            const maxNum = Math.max(...orderItems.map((i) => i.num), 1);
            const maxLabelLen = Math.max(...orderItems.map((i) => i.name.length), 1);
            return orderItems.map((item) => {
              const barWidth = (item.num / maxNum) * 100;
              return (
                <div key={item.name} className="flex items-center gap-3">
                  <div
                    className="flex h-5 shrink-0 items-center justify-start rounded text-xs text-[rgba(255,255,255,0.8)]"
                    style={{ width: `${maxLabelLen * 18 + 8}px` }}
                  >
                    {item.name}
                  </div>
                  <div className="flex h-4 flex-1 items-center overflow-hidden rounded-full bg-[rgba(16,45,129,0.08)]">
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
