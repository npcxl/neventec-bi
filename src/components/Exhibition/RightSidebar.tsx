import { useEffect, useMemo, useRef, useState } from "react";
import { Spin } from "antd";
import * as echarts from "echarts";
import type { OrderCollectItem } from "../../api";
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
      <div className="flex h-full w-full items-center gap-2 bg-[url('/img/biaoti@2x.png')] bg-[length:100%_100%] bg-left bg-no-repeat pl-3 text-sm font-medium text-[#d8efff]">
        <span className="pl-5 pt-3">{title}</span>
      </div>
    </div>
  );
}

function normalizeOrderCollect(data: unknown): OrderCollectItem[] {
  if (Array.isArray(data)) return data as OrderCollectItem[];
  if (data && typeof data === "object") {
    const record = data as {
      data?: unknown;
      list?: unknown;
      rows?: unknown;
      result?: unknown;
    };
    return normalizeOrderCollect(
      record.data ?? record.list ?? record.rows ?? record.result,
    );
  }
  return [];
}

function OrderChart({ items }: { items: OrderCollectItem[] }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<echarts.EChartsType | null>(null);
  const timerRef = useRef<number | null>(null);
  const categories = useMemo(() => items.map((item) => item.name), [items]);
  const values = useMemo(() => items.map((item) => item.num), [items]);

  useEffect(() => {
    if (!ref.current) return;
    const chart =
      echarts.getInstanceByDom(ref.current) ?? echarts.init(ref.current);
    chartRef.current = chart;

    const onResize = () => chart.resize();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (!chart.isDisposed()) {
        chart.dispose();
      }
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || chart.isDisposed()) return;

    const visibleCount = Math.max(4, Math.min(6, categories.length || 0));
    const hasOverflow = categories.length > visibleCount;

    chart.setOption({
      animation: true,
      animationDuration: 600,
      animationDurationUpdate: 400,
      backgroundColor: "transparent",
      grid: { left: 24, right: 18, top: 18, bottom: 48, containLabel: true },
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      xAxis: {
        type: "category",
        data: categories,
        axisLine: { lineStyle: { color: "rgba(145,171,205,0.45)" } },
        axisTick: { show: false },
        axisLabel: {
          color: "#9ec6ef",
          fontSize: 12,
          margin: 14,
          interval: 0,
          rotate: categories.length > 5 ? 20 : 0,
        },
      },
      yAxis: {
        type: "value",
        axisLine: { lineStyle: { color: "rgba(145,171,205,0.45)" } },
        axisTick: { show: false },
        axisLabel: { color: "#7f9cbc", fontSize: 11 },
        splitLine: { lineStyle: { color: "rgba(145,171,205,0.12)" } },
      },
      dataZoom: hasOverflow
        ? [
            {
              type: "inside",
              xAxisIndex: 0,
              zoomOnMouseWheel: false,
              moveOnMouseWheel: false,
            },
            {
              type: "slider",
              xAxisIndex: 0,
              bottom: 6,
              height: 10,
              show: false,
              startValue: 0,
              endValue: visibleCount - 1,
            },
          ]
        : [],
      series: [
        {
          type: "bar",
          data: values,
          barWidth: 22,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "#18c7ff" },
              { offset: 1, color: "#2a63ff" },
            ]),
            borderRadius: [8, 8, 0, 0],
          },
          label: {
            show: true,
            position: "top",
            color: "#9be7ff",
            fontSize: 13,
            formatter: "{c}",
          },
        },
      ],
    });

    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (hasOverflow) {
      let start = 0;
      timerRef.current = window.setInterval(() => {
        start = (start + 1) % categories.length;
        const end = Math.min(start + visibleCount - 1, categories.length - 1);
        chart.dispatchAction({
          type: "dataZoom",
          startValue: start,
          endValue: end,
        });
      }, 2500);
    }
  }, [categories, values]);

  return <div ref={ref} className="h-full w-full" />;
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
  const [payMode, setPayMode] = useState<"paid" | "unpaid">("paid");
  const visibleRows =
    hallId === "all"
      ? boothRows
      : boothRows.filter((row) => (row.hallId || "__unknown__") === hallId);
  const paidRows = useMemo(() => visibleRows.filter(isPaid), [visibleRows]);
  const unpaidRows = useMemo(
    () => visibleRows.filter((row) => !isPaid(row)),
    [visibleRows],
  );
  const totalBooth = visibleRows.length;
  const paidBooth = paidRows.length;
  const unpaidBooth = unpaidRows.length;
  const unReportBooth = visibleRows.filter((row) => !isReported(row)).length;
  const orderCollectItems = useMemo(
    () => normalizeOrderCollect(orderCollect),
    [orderCollect],
  );
  const rowsByPayMode = payMode === "paid" ? paidRows : unpaidRows;
  const chartItems = orderCollectItems;
  //如果名字中存在【展馆搭建】 就去掉
  const getBoothName = (name: string) => {
    if (name?.includes("【展馆搭建】")) {
      return name?.replace("【展馆搭建】", "");
    }
    return name;
  };

  return (
    <aside className="flex h-full min-h-0 flex-col gap-[clamp(0.6rem,1vw,0.9rem)] xl:gap-3">
      <section className="flex min-h-0 flex-[0.36] flex-col overflow-hidden border border-[rgba(128,185,255,0.28)] bg-[linear-gradient(180deg,rgba(9,26,52,0.88),rgba(6,17,34,0.94))] shadow-[inset_0_0_24px_rgba(80,157,255,0.08)]">
        <PanelTitle title="特装费用缴纳" />

        <div className="flex min-h-0 flex-1 flex-col px-4 pb-3 pt-1 text-[#93aed0]">
          {loading ? (
            <div className="flex min-h-0 flex-1 items-center justify-center rounded-xl border border-white/10 bg-[rgba(8,23,42,0.72)]">
              <Spin size="large" tip="正在加载费用数据..." />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div
                  className="group animate-fade-in-up relative flex flex-col items-center justify-center rounded-lg border border-white/5 bg-white/[0.02] py-2.5 transition-all duration-300 hover:border-white/20 hover:bg-white/5"
                  style={{ animationDelay: "0ms" }}
                >
                  <div className="text-[12px] text-[#8ba3bd]">总展位数量</div>
                  <div className="mt-0.5 text-[26px] font-bold text-white transition-all group-hover:drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
                    {totalBooth}
                  </div>
                </div>

                <div
                  className="group animate-fade-in-up relative flex flex-col items-center justify-center rounded-lg border border-[#00e5ff]/20 bg-[#00e5ff]/[0.03] py-2.5 transition-all duration-300 hover:border-[#00e5ff]/40 hover:bg-[#00e5ff]/10"
                  style={{ animationDelay: "150ms" }}
                >
                  <div className="text-[12px] text-[#00e5ff]/70">
                    已缴费展位
                  </div>
                  <div className="mt-0.5 text-[26px] font-bold text-[#00e5ff] transition-all group-hover:drop-shadow-[0_0_12px_rgba(0,229,255,0.6)]">
                    {paidBooth}
                  </div>
                </div>

                <div
                  className="group animate-fade-in-up relative flex flex-col items-center justify-center rounded-lg border border-[#ffb84d]/20 bg-[#ffb84d]/[0.03] py-2.5 transition-all duration-300 hover:border-[#ffb84d]/40 hover:bg-[#ffb84d]/10"
                  style={{ animationDelay: "300ms" }}
                >
                  <div className="text-[12px] text-[#ffb84d]/70">
                    未缴费展位
                  </div>
                  <div className="mt-0.5 text-[26px] font-bold text-[#ffb84d] transition-all group-hover:drop-shadow-[0_0_12px_rgba(255,184,77,0.6)]">
                    {unpaidBooth}
                  </div>
                </div>
              </div>

              {/* 2. 底部滚动列表 */}
              <div
                className="animate-fade-in-up mt-2.5 grid min-h-0 flex-1 px-1 sm:mt-3 sm:px-2 md:px-0"
                style={{ animationDelay: "450ms" }}
              >
                <div className="flex min-h-0 flex-col overflow-hidden rounded-md border border-white/10 bg-black/20">
                  {/* 表头 */}
                  <div className="grid grid-cols-[72px_72px_minmax(0,1fr)] border-b border-white/10 bg-[#0c1b33]/80 px-2 py-1.5 text-[11px] font-medium text-[#8ba3bd] sm:grid-cols-[82px_72px_minmax(0,1.2fr)] sm:px-3 sm:py-2 sm:text-[12px]">
                    <span className="truncate whitespace-nowrap">展位号</span>
                    <span className="truncate whitespace-nowrap">未缴费</span>
                    <span className="truncate whitespace-nowrap pl-1">参展商</span>
                  </div>

                  {/* 数据滚动区 */}
                  <div className="demo-br2-scroll min-h-0 flex-1 overflow-hidden">
                    <SeamlessVirtualList
                      data={unpaidRows}
                      itemHeight={25}
                      height="100%"
                      speed={0.35}
                      overscan={8}
                      pauseOnHover={false}
                      className="h-full"
                      renderItem={(row, idx) => {
                        const unpaidStatus = `${row.paid ?? ""}` || "-";

                        return (
                          <div
                            className={`group grid h-full grid-cols-[72px_72px_minmax(0,1.2fr)] items-center border-b border-white/[0.02] px-2.5 text-[11px] transition-all duration-300 hover:bg-white/10 sm:grid-cols-[82px_72px_minmax(0,1.2fr)] sm:px-3 sm:text-[13px] ${
                              idx % 2 === 0
                                ? "bg-transparent"
                                : "bg-white/[0.02]"
                            }`}
                          >
                            <span className="truncate whitespace-nowrap font-semibold text-[#ffd84d] transition-transform duration-300 group-hover:translate-x-1">
                              {row.boothNo || "-"}
                            </span>

                            <span className="truncate whitespace-nowrap text-[#ffd36a] transition-transform duration-300 group-hover:translate-x-1">
                              {unpaidStatus.includes("未")
                                ? unpaidStatus
                                : "未缴费"}
                            </span>

                            <span className="truncate whitespace-nowrap pl-1 text-[#d6ecff]">
                              {getBoothName(row.exhibitor) || "-"}
                            </span>
                          </div>
                        );
                      }}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="flex min-h-0 flex-[0.32] flex-col overflow-hidden border border-[rgba(128,185,255,0.28)] bg-[linear-gradient(180deg,rgba(9,26,52,0.88),rgba(6,17,34,0.94))] shadow-[inset_0_0_24px_rgba(80,157,255,0.08)]">
        <PanelTitle title="未报到展位汇总" />
        <div className="px-3 pb-2 text-[10px] leading-tight text-[#9ec6ef] sm:px-4 ">
          未报到展位数量{" "}
          <span className="text-sm font-medium text-white sm:text-xl">
            {unReportBooth}
          </span>
          个 <span className="mx-1.5 text-[#6ea9d8] sm:mx-2 ">/</span> 报到率{" "}
          <span className="text-white sm:text-xl">
            {totalBooth > 0
              ? (((totalBooth - unReportBooth) / totalBooth) * 100).toFixed(2)
              : "0.00"}
            %
          </span>
        </div>
        <div className="flex min-h-0 flex-1 flex-col px-2.5 pb-2.5 sm:px-3 sm:pb-3">
          <div className="grid grid-cols-[44px_72px_minmax(0,1fr)] gap-1.5 bg-[rgba(118,169,255,0.1)] px-2.5 py-1.5 text-[10px] text-[#93aed0] sm:grid-cols-[56px_90px_1fr] sm:gap-2 sm:px-3 sm:py-2 sm:text-xs">
            <span>序号</span>
            <span>展位号</span>
            <span>参展商</span>
          </div>
          <div className="demo-br2-scroll min-h-0 flex-1 overflow-hidden">
            <SeamlessVirtualList
              data={rowsByPayMode}
              itemHeight={36}
              height="100%"
              speed={0.35}
              overscan={8}
              pauseOnHover={false}
              className="h-full"
              renderItem={(row, index) => (
                <div
                  className={`grid h-full grid-cols-[44px_72px_minmax(0,1fr)] items-center gap-1.5 px-2.5 text-[10px] sm:grid-cols-[56px_90px_1fr] sm:gap-2 sm:px-3 sm:text-xs ${
                    index % 2 === 1 ? "bg-white/10" : "bg-white/5"
                  }`}
                >
                  <span className="text-[#93aed0]">{index + 1}</span>

                  <span className="truncate whitespace-nowrap text-[#d6ecff]">
                    {row.boothNo || "-"}
                  </span>

                  <span className="truncate whitespace-nowrap text-[#d6ecff]">
                    {row.exhibitor || "-"}
                  </span>
                </div>
              )}
            />
          </div>
        </div>
      </section>

      <section className="flex min-h-0 flex-[0.34] flex-col overflow-hidden border border-[rgba(128,185,255,0.28)] bg-[linear-gradient(180deg,rgba(9,26,52,0.88),rgba(6,17,34,0.94))] shadow-[inset_0_0_24px_rgba(80,157,255,0.08)]">
        <PanelTitle title="水电气网络申报订单数量" />
        <div className="min-h-0 flex-1 px-4 pb-4 pt-2 sm:px-5 sm:pb-5 sm:pt-3">
          <div className="h-[400px]  overflow-hidden rounded-lg border border-white/10 bg-[rgba(8,23,42,0.68)] p-3 2xl:h-[260px] sm:h-[200px] sm:min-h-[200px] sm:p-4">
            <OrderChart items={chartItems} />
          </div>
        </div>
      </section>
    </aside>
  );
}
