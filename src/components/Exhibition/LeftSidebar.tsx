import { useMemo } from "react";
import { Icon } from "@iconify/react";
import { Spin } from "antd";
import { SeamlessVirtualList } from "../SeamlessVirtuaList";

function PanelTitle({ title }: { title: string }) {
  return (
    <div className="relative h-12 px-3">
      <div className="flex h-full w-full items-center gap-2 bg-[url('/img/biaoti@2x.png')] bg-[length:100%_100%] bg-left bg-no-repeat pl-3 text-sm font-medium text-[#d8efff]">
        <span className="pl-5">{title}</span>
      </div>
    </div>
  );
}

export function ExhibitionLeftSidebar({
  galleryRows = [],
  boothRows = [],
  hallId = "all",
  loading = false,
}: {
  galleryRows?: Array<{
    boothNum?: number;
    specialArea?: number;
    standArea?: number;
    specialAreaNum?: number;
    standardAreaNum?: number;
    hallId?: string;
  }>;
  boothRows?: Array<{
    boothId?: string;
    boothNo?: string;
    exhibitor?: string;
    report?: string;
    paid?: string;
    declare?: string;
    hallId?: string;
    hallName?: string;
  }>;
  hallId?: string;
  loading?: boolean;
}) {
  const shouldFilterByHall = Boolean(hallId && hallId !== "all");
  const visibleRows = shouldFilterByHall
    ? galleryRows.filter((row) => (row.hallId || "") === hallId)
    : galleryRows;
  const visibleBoothRows = shouldFilterByHall
    ? boothRows.filter((row) => (row.hallId || "") === hallId)
    : boothRows;
  const totalBooths = visibleRows.reduce(
    (sum, item) => sum + Number(item.boothNum || 0),
    0,
  );
  const totalArea = visibleRows.reduce(
    (sum, item) =>
      sum + Number(item.specialArea || 0) + Number(item.standArea || 0),
    0,
  );
  const totalSpecial = visibleRows.reduce(
    (sum, item) => sum + Number(item.specialAreaNum || 0),
    0,
  );
  const repeatedBoothRows = useMemo(
    () => [
      ...visibleBoothRows,
      ...visibleBoothRows,
      ...visibleBoothRows,
      ...visibleBoothRows,
    ],
    [visibleBoothRows],
  );
  const scrollRowsPerCycle = Math.max(1, visibleBoothRows.length);
  const scrollDuration = Math.max(
    180,
    Math.min(720, 72 + scrollRowsPerCycle * 14),
  );
  const scrollDistance = "-25%";
  const metricCards = [
    {
      title: "展位总数量",
      value: totalBooths.toLocaleString(),
      unit: "个",
      icon: <Icon icon="mdi:storefront-outline" className="h-4.5 w-4.5" />,
    },
    {
      title: "展位总面积",
      value: totalArea.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      unit: "㎡",
      icon: <Icon icon="mdi:ruler-square-compass" className="h-4.5 w-4.5" />,
    },
    {
      title: "特装展位",
      value: totalSpecial.toLocaleString(),
      unit: "家",
      icon: (
        <Icon
          icon="mdi:star-four-points-circle-outline"
          className="h-4.5 w-4.5"
        />
      ),
    },
  ];

  return (
    <aside className="flex h-full min-h-0 flex-col gap-[clamp(0.6rem,1vw,0.9rem)] xl:gap-3">
      <section className="relative flex-none h-[42%] min-h-[248px] overflow-hidden border border-[rgba(128,185,255,0.32)] bg-[linear-gradient(180deg,rgba(11,31,61,0.94),rgba(5,14,28,0.96))] shadow-[0_0_0_1px_rgba(88,150,255,0.12),inset_0_0_30px_rgba(80,157,255,0.08)] backdrop-blur-sm">
        <PanelTitle title="展位情况总览" />
        <div className="relative h-[calc(100%-3rem)] px-3 pb-3 pt-2 xl:px-2.5 xl:pb-2.5">
          {loading ? (
            <div className="flex h-full items-center justify-center rounded-xl border border-white/10 bg-[rgba(8,23,42,0.72)]">
              <Spin size="large" tip="正在加载展位概况..." />
            </div>
          ) : (
            <div className="grid h-full grid-rows-3 gap-3">
              {" "}
              {/* 间距 gap-2 改为 gap-3，增加呼吸感 */}
              {metricCards.map((card, index) => (
                <div
                  key={card.title}
                  /* 核心动画修改：增加 transition, hover 效果，以及入场 animate 类 */
                  className={`group animate-fade-in-up relative overflow-hidden rounded-xl border px-5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-18px_40px_rgba(5,16,34,0.35),0_10px_26px_rgba(2,8,18,0.38)] transition-all duration-500 ease-out hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,140,255,0.25)] ${
                    index === 0
                      ? "border-[rgba(164,213,255,0.2)] bg-[linear-gradient(148deg,rgba(24,58,103,0.58),rgba(7,20,42,0.88))] hover:border-[rgba(164,213,255,0.4)]"
                      : "border-[rgba(160,208,255,0.16)] bg-[linear-gradient(148deg,rgba(18,43,79,0.58),rgba(8,22,45,0.8))] hover:border-[rgba(160,208,255,0.3)]"
                  }`}
                  /* 利用 index 延迟触发动画，形成级联展示效果 (stagger) */
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  {/* 背景光晕：增加 group-hover 响应，鼠标移入时变亮 */}
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(72%_56%_at_10%_14%,rgba(141,204,255,0.1),transparent_62%)] transition-opacity duration-500 group-hover:opacity-100 opacity-70" />

                  <div className="relative z-10 flex h-full items-center justify-between gap-4">
                    <div className="flex items-center gap-3 text-[#9ec5ea]">
                      {/* 图标容器：增加缩放动画，鼠标移入时轻微放大并提亮 */}
                      <span className="grid h-10 w-10 place-items-center rounded-lg border border-white/20 bg-[rgba(125,187,255,0.14)] text-[18px] shadow-[0_0_16px_rgba(111,180,255,0.36)] transition-transform duration-300 group-hover:scale-110 group-hover:text-white">
                        {card.icon}
                      </span>
                      <span className="text-[13px] tracking-[0.16em] font-medium text-[#b5d3f2] transition-colors group-hover:text-white">
                        {card.title}
                      </span>
                    </div>

                    {/* 排版优化：将 items-end 改为 items-baseline，确保数字和单位的底部基线完美对齐 */}
                    <div className="flex items-baseline gap-1.5 leading-none">
                      <strong
                        className={`transition-all duration-300 ${
                          index === 0
                            ? "text-[1.5rem] font-black text-white drop-shadow-[0_0_12px_rgba(110,176,236,0.3)] group-hover:drop-shadow-[0_0_20px_rgba(110,176,236,0.6)]"
                            : "text-[1.5rem] font-bold text-white/95 group-hover:text-white"
                        }`}
                      >
                        {card.value}
                      </strong>
                      {/* 单位文字略微调小，拉开与数值的字号对比度 */}
                      <span className="text-[13px] font-medium text-[#8ab2d9]">
                        {card.unit}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="relative flex min-h-0 flex-1 overflow-hidden border border-[rgba(128,185,255,0.32)] bg-[linear-gradient(180deg,rgba(11,31,61,0.94),rgba(5,14,28,0.96))] shadow-[0_0_0_1px_rgba(88,150,255,0.12),inset_0_0_30px_rgba(80,157,255,0.08)] backdrop-blur-sm">
        <div className="flex h-full min-h-0 w-full flex-col">
          <PanelTitle title="特装展位报馆" />
          <div className="flex min-h-0 flex-1 flex-col px-3 pb-3 pt-2">
            <div className="grid min-w-0 grid-cols-[56px_minmax(0,1.8fr)_repeat(3,minmax(0,0.58fr))] gap-2 overflow-hidden rounded-lg border border-white/5 bg-[rgba(118,169,255,0.1)] px-3 py-1 text-xs text-[#93aed0] sm:grid-cols-[64px_minmax(0,1.6fr)_repeat(3,minmax(0,0.65fr))]">
              <span className="block truncate whitespace-nowrap">展位号</span>
              <span className="block truncate whitespace-nowrap">参展商</span>
              <span className="block truncate whitespace-nowrap">报到</span>
              <span className="block truncate whitespace-nowrap">缴费</span>
              <span className="block truncate whitespace-nowrap">申报</span>
            </div>
            <div className="mt-1.5 min-h-0 flex-1 overflow-hidden rounded-lg relative">
              <SeamlessVirtualList
                data={boothRows}
                itemHeight={36}
                height="100%"
                speed={0.35}
                overscan={8}
                pauseOnHover={false}
                className="demo-br2-scroll h-full rounded-lg"
                renderItem={(row, index) => {
                  const statusClass = (status?: string) => {
                    if ((status || "").includes("未"))
                      return "text-[#ffd36a]";
                    if ((status || "").includes("已"))
                      return "text-[#5fe08a]";
                    return "text-[#6dc8ff]";
                  };

                  return (
                    <div
                      className={`grid h-full min-w-0 grid-cols-[56px_minmax(0,1.8fr)_repeat(3,minmax(0,0.58fr))] items-center gap-2 px-3 text-xs transition-colors sm:grid-cols-[64px_minmax(0,1.6fr)_repeat(3,minmax(0,0.65fr))] ${
                        index % 2 === 1
                          ? "bg-white/[0.04]"
                          : "border-t border-white/10"
                      } hover:bg-white/[0.07]`}
                    >
                      <span className="min-w-0 truncate whitespace-nowrap text-[#93aed0]">
                        {row.boothNo || "-"}
                      </span>

                      <span className="min-w-0 truncate whitespace-nowrap text-[#dbeeff]">
                        {row.exhibitor || "-"}
                      </span>

                      <span
                        className={`min-w-0 truncate whitespace-nowrap ${statusClass(
                          row.report,
                        )}`}
                      >
                        {row.report || "-"}
                      </span>

                      <span
                        className={`min-w-0 truncate whitespace-nowrap ${statusClass(
                          row.paid,
                        )}`}
                      >
                        {row.paid || "-"}
                      </span>

                      <span
                        className={`min-w-0 truncate whitespace-nowrap ${statusClass(
                          row.declare,
                        )}`}
                      >
                        {row.declare || "-"}
                      </span>
                    </div>
                  );
                }}
              />

              {loading && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg bg-[rgba(8,23,42,0.34)] backdrop-blur-[1px] text-sm text-[#dbeeff]">
                  <Spin size="default" tip="正在加载报馆数据..." />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </aside>
  );
}
