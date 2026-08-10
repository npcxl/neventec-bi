import { useEffect, useRef } from "react";
import { Spin } from "antd";
import * as echarts from "echarts";
import Scan from "../Scan";
import { SeamlessVirtualList } from "../SeamlessVirtuaList";
type GalleryRow = {
  boothNum?: number;
  specialArea?: number;
  standArea?: number;
  specialAreaNum?: number;
  standardAreaNum?: number;
  hallId?: string;
};

type SafetyInfo = {
  riskAssessment?: string;
  createBy?: string;
  createDate?: string;
  recordContent?: string;
  targetCheckTime?: string;
  boothNo?: string;
  safetyStatus?: string;
  boothId?: string;
  imageAddress?: Array<{ address?: string }>;
};

type SafetyCollectRow = {
  safetyNum?: number;
  rectifyNum?: number;
  rectifyCheckNum?: number;
  notRectifyNum?: number;
  cancelNum?: number;
  refuseRectifyNum?: number;
  expoid?: string;
  expoName?: string;
  hallId?: string;
  hallName?: string;
};

type SafetyRecord = {
  boothId?: string;
  boothName?: string;
  boothNo?: string;
  company?: string;
  recordContent?: string;
  riskAssessment?: string;
  rectifyCheckStatus?: string;
  safetyStatus?: string;
  expoid?: string;
  expoName?: string;
  hallId?: string;
  hallName?: string;
  targetCheckTime?: string;
  dutyEntity?: string;
  contactWay?: string;
  constructionCompany?: string;
  excompanytype?: string;
  sendViolationEmail?: string;
  liftingPoint?: string;
  structureType?: string;
  complexEngineering?: string;
  safetyInfoList?: SafetyInfo[];
};

function PanelTitle({ title }: { title: string }) {
  return (
    <div className="relative h-12 px-3">
      <div className="flex h-full w-full items-center bg-[url('/img/小标题.png')] bg-[length:100%_100%] bg-left bg-no-repeat pl-[clamp(24px,2vw,36px)] text-sm font-medium text-[#d8efff]">
        <span className="pl-10 pb-1">{title}</span>
      </div>
    </div>
  );
}

function DetailItem({
  label,
  value,
  full = false,
}: {
  label: string;
  value: string;
  full?: boolean;
}) {
  return (
    <div
      className={
        full
          ? "col-span-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2"
          : "rounded-lg border border-white/10 bg-white/5 px-3 py-2"
      }
    >
      <div className="text-[10px] text-[#9ec4e6]">{label}</div>
      <div className="mt-1 break-words text-[11px] text-[#eef7ff]">{value}</div>
    </div>
  );
}

export function SafetyLeftSidebar({
  galleryRows = [],
  safetyRows = [],
  safetyCollect = [],
  hallId = "all",
  loading = false,
}: {
  galleryRows?: GalleryRow[];
  safetyRows?: SafetyRecord[];
  safetyCollect?: SafetyCollectRow[];
  hallId?: string;
  loading?: boolean;
}) {
  const normalizeHallId = (value?: string) => `${value ?? ""}`.trim();
  const shouldFilterByHall = Boolean(hallId && hallId !== "all");
  const visibleRows = shouldFilterByHall
    ? galleryRows.filter(
        (row) => normalizeHallId(row.hallId) === normalizeHallId(hallId),
      )
    : galleryRows;
  const visibleSafetyRows = shouldFilterByHall
    ? safetyRows.filter(
        (row) => normalizeHallId(row.hallId) === normalizeHallId(hallId),
      )
    : safetyRows;
  const visibleCollectRows = shouldFilterByHall
    ? safetyCollect.filter(
        (row) => normalizeHallId(row.hallId) === normalizeHallId(hallId),
      )
    : safetyCollect;
  const fallbackCollectRows =
    visibleCollectRows.length > 0 || !shouldFilterByHall
      ? visibleCollectRows
      : safetyCollect;

  const sumField = (field: keyof SafetyCollectRow) =>
    fallbackCollectRows.reduce((sum, row) => sum + Number(row[field] ?? 0), 0);
  const rectifiedCount = sumField("rectifyCheckNum");
  const pendingCount = sumField("rectifyNum");
  const unRectifiedCount = sumField("notRectifyNum");
  const cancelledCount = sumField("cancelNum");
  const refusedCount = sumField("refuseRectifyNum");
  const pieRef = useRef<HTMLDivElement>(null);
  const listScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = pieRef.current;
    if (!el) return;

    const chart = echarts.init(el);
    chart.setOption({
      backgroundColor: "transparent",
      tooltip: { trigger: "item" },
      legend: {
        bottom: 0,
        textStyle: { color: "#cfe5ff", fontSize: 12 },
      },
      series: [
        {
          name: "违规处理",
          type: "pie",
          radius: ["42%", "55%"],
          center: ["50%", "44%"],
          avoidLabelOverlap: true,
          minAngle: 6,
          stillShowZeroSum: true,
          itemStyle: {
            borderRadius: 8,
            borderColor: "#0b1f3d",
            borderWidth: 2,
          },
          label: { color: "#dbeeff", formatter: "{b}\n{c}" },
          labelLine: { lineStyle: { color: "#7fb7eb" } },
          emphasis: { scale: true, scaleSize: 8 },
          data: [
            {
              value: rectifiedCount,
              name: "整改合格",
              itemStyle: { color: "#35d5a7" },
            },
            {
              value: pendingCount,
              name: "待整改",
              itemStyle: { color: "#f7c948" },
            },
            {
              value: unRectifiedCount,
              name: "整改不合格",
              itemStyle: { color: "#ff6b6b" },
            },
            {
              value: refusedCount,
              name: "拒不整改",
              itemStyle: { color: "#007FFF" },
            },
            {
              value: cancelledCount,
              name: "已作废",
              itemStyle: { color: "#999999" },
            },
          ],
        },
      ],
    });

    requestAnimationFrame(() => chart.resize());

    const resizeObserver = new ResizeObserver(() => {
      chart.resize();
    });
    resizeObserver.observe(el);
    const handleResize = () => chart.resize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      resizeObserver.disconnect();
      chart.dispose();
    };
  }, [
    rectifiedCount,
    pendingCount,
    unRectifiedCount,
    refusedCount,
    cancelledCount,
  ]);

  useEffect(() => {
    const el = listScrollRef.current;
    if (!el) return;

    const shouldAutoScroll = el.scrollHeight > el.clientHeight;
    if (!shouldAutoScroll) return;

    let rafId = 0;
    let scrollTop = el.scrollTop;
    let direction = 1;
    const speed = 0.35;
    const pauseAtEdge = 1200;
    let pausedUntil = 0;

    const tick = (now: number) => {
      if (el.scrollHeight > el.clientHeight) {
        if (now < pausedUntil) {
          rafId = window.requestAnimationFrame(tick);
          return;
        }

        const maxScrollTop = el.scrollHeight - el.clientHeight;
        scrollTop += direction * speed;

        if (scrollTop >= maxScrollTop) {
          scrollTop = maxScrollTop;
          direction = -1;
          pausedUntil = now + pauseAtEdge;
        } else if (scrollTop <= 0) {
          scrollTop = 0;
          direction = 1;
          pausedUntil = now + pauseAtEdge;
        }

        el.scrollTop = scrollTop;
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [visibleSafetyRows.length]);

  //整改状态颜色
  const rectifyCheckStatusColor = (rectifyCheckStatus?: string) => {
    if (rectifyCheckStatus == "整改合格") return "#35d5a7";
    if (rectifyCheckStatus == "待整改") return "#FAAD14";
    if (rectifyCheckStatus == "整改不合格") return "#F5222D";
    if (rectifyCheckStatus == "拒不整改") return "#007FFF";
    if (rectifyCheckStatus == "未整改") return "#FAAD14";
    if (rectifyCheckStatus == "已作废" || rectifyCheckStatus == "作废")
      return "#999999";
    return "";
  };

  return (
    <aside className="flex h-full min-h-0 flex-col gap-[clamp(0.2rem,0.55vw,0.8rem)] px-0 sm:px-0 xl:gap-3">
      <section className="relative flex-none h-[42%] min-h-[248px] overflow-hidden border border-[rgba(128,185,255,0.32)] bg-[linear-gradient(180deg,rgba(11,31,61,0.94),rgba(5,14,28,0.96))] shadow-[0_0_0_1px_rgba(88,150,255,0.12),inset_0_0_30px_rgba(80,157,255,0.08)] backdrop-blur-sm">
        <PanelTitle title="查处违规汇总" />
        <div className="relative h-[calc(100%-3rem)] px-0.5 pb-0.5 pt-0.5 sm:px-[clamp(10px,0.9vw,14px)] sm:pb-[clamp(10px,0.9vw,14px)] sm:pt-[clamp(8px,0.8vw,12px)]">
          <div ref={pieRef} className="absolute inset-0 z-[10]" />
        </div>
      </section>

      <section className="relative flex min-h-0 flex-[1.55] overflow-hidden border border-[rgba(128,185,255,0.32)] bg-[linear-gradient(180deg,rgba(11,31,61,0.94),rgba(5,14,28,0.96))] shadow-[0_0_0_1px_rgba(88,150,255,0.12),inset_0_0_30px_rgba(80,157,255,0.08)] backdrop-blur-sm">
        <div className="flex h-full min-h-0 w-full flex-col">
          <PanelTitle title="现场违规记录" />
          <div className="flex min-h-0 flex-1 flex-col  pb-0.5 pt-0.5 sm:px-[clamp(10px,0.9vw,14px)] sm:pb-[clamp(10px,0.9vw,14px)] sm:pt-[clamp(8px,0.8vw,12px)]">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-white/5 bg-[rgba(118,169,255,0.1)] text-[clamp(8px,0.68vw,12px)] text-[#93aed0] sm:text-[clamp(10px,0.75vw,12px)]">
              <div className="flex shrink-0 min-w-0 items-center gap-0.25 border-b border-white/10 py-0.75 sm:gap-2 ">
                <span className="flex-[0.68] min-w-0 whitespace-normal break-words leading-tight">
                  展位号
                </span>
                <span className="flex-[0.98] min-w-0 whitespace-normal break-words leading-tight">
                  施工单位
                </span>
                <span className="flex-[1.16] min-w-0 whitespace-normal break-words leading-tight">
                  违规内容
                </span>
                <span className="flex-[0.76] min-w-0 whitespace-normal break-words leading-tight">
                  风险评估
                </span>
                <span className="flex-[1] min-w-0 whitespace-normal break-words leading-tight">
                  整改措施
                </span>
                <span className="flex-[0.72] min-w-0 whitespace-normal break-words leading-tight">
                  整改状态
                </span>
              </div>
              <div className="min-h-0 flex-1 overflow-hidden">
                <SeamlessVirtualList
                  data={visibleSafetyRows}
                  itemHeight={80}
                  height="100%"
                  speed={0.35}
                  overscan={8}
                  pauseOnHover={false}
                  className="hide-scrollbar h-full"
                  renderItem={(row, index) => (
                    <div
                      className={`flex h-full min-w-0 items-start gap-0.25 px-0.5 text-[9px] leading-tight sm:items-center sm:gap-2 sm:px-3 sm:text-[10px] ${
                        index % 2 === 1
                          ? "bg-white/[0.04]"
                          : "border-t border-white/10"
                      } hover:bg-white/[0.07]`}
                    >
                      <span
                        className="flex-[0.68] min-w-0 break-words text-[#dbeeff]"
                        title={row.boothNo || "-"}
                      >
                        {row.boothNo || "-"}
                      </span>

                      <span
                        className="flex-[0.98] min-w-0 break-words text-[#dbeeff]"
                        title={row.company || row.constructionCompany || "-"}
                      >
                        {row.company || row.constructionCompany || "-"}
                      </span>

                      <span
                        className="flex-[1.16] min-w-0 break-words"
                        style={{
                          color:
                            rectifyCheckStatusColor(row.rectifyCheckStatus) ||
                            "#dbeeff",
                        }}
                        title={row.recordContent || "-"}
                      >
                        {row.recordContent || "-"}
                      </span>

                      <span
                        className="flex-[0.76] min-w-0 break-words"
                        style={{
                          color:
                            rectifyCheckStatusColor(row.rectifyCheckStatus) ||
                            "#dbeeff",
                        }}
                        title={row.riskAssessment || "-"}
                      >
                        {row.riskAssessment || "-"}
                      </span>

                      <span
                        className="flex-[1] min-w-0 break-words"
                        style={{
                          color:
                            rectifyCheckStatusColor(row.rectifyCheckStatus) ||
                            "#dbeeff",
                        }}
                        title={row.safetyStatus || "-"}
                      >
                        {row.safetyStatus || "-"}
                      </span>

                      <span
                        className="flex-[0.72] min-w-0 break-words"
                        style={{
                          color:
                            rectifyCheckStatusColor(row.rectifyCheckStatus) ||
                            "#dbeeff",
                        }}
                        title={row.rectifyCheckStatus || "-"}
                      >
                        {row.rectifyCheckStatus || "-"}
                      </span>
                    </div>
                  )}
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </aside>
  );
}
