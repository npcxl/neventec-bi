import { Spin } from "antd";
import { SeamlessVirtualList } from "../SeamlessVirtuaList";

function PanelTitle({ title }: { title: string }) {
  return (
    <div className="relative h-12 px-3">
      <div className="flex h-full w-full items-center gap-2 bg-[url('/img/Union.png')] bg-[length:100%_100%] bg-left bg-no-repeat pl-[clamp(24px,2vw,36px)] text-sm font-medium text-[#d8efff]">
        <img src="/img/Frame 7.svg" alt="" className="h-4 w-4 shrink-0" />
        <span>{title}</span>
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

  const statusClass = (status?: string) => {
    if ((status || "").includes("未")) return "text-[#F5222D]";
    if ((status || "").includes("已")) return "text-[#63F222]";
    return "text-[#93aed0]";
  };

  return (
    <aside className="flex h-full min-h-0 flex-col gap-[clamp(0.6rem,1vw,0.9rem)] xl:gap-3">
      {/* ===== 项目运营总览 ===== */}
      <section className="relative flex-none overflow-hidden" style={{ height: 207 }}>
        <PanelTitle title="项目运营总览" />
        <div className="relative flex-1 flex flex-col gap-2 p-1" style={{ height: 159 }}>
          {loading ? (
            <div className="flex h-full items-center justify-center rounded-xl">
              <Spin size="large" />
            </div>
          ) : (
            <>
              {/* 第一行：管理展位总数 */}
              <div
                className="relative flex-1 overflow-hidden rounded-xl bg-[url('/img/展会概况总览-项目运营总览.png')] bg-[length:100%_auto] bg-center bg-no-repeat"
                style={{ backgroundPositionY: "0%" }}
              >
                <div className="flex h-full items-center justify-between px-20 pb-10">
                  <span style={{ color: "rgba(255,255,255,0.8)", fontFamily: '"Source Han Sans CN"', fontSize: 14, fontWeight: 400, lineHeight: "22px" }}>管理展位总数</span>
                  <span className="text-2xl font-bold text-white">
                    {totalBooths.toLocaleString()}
                    <span className="ml-1 text-sm font-normal text-white/80">个</span>
                  </span>
                </div>
              </div>

              {/* 第二行：总展览面积 + 特装展位 */}
              <div
                className="relative flex-1 overflow-hidden rounded-xl bg-[url('/img/展会概况总览-项目运营总览.png')] bg-[length:100%_auto] bg-center bg-no-repeat"
                style={{ backgroundPositionY: "100%" }}
              >
                <div className="flex h-full items-center justify-between px-20 pb-5">
                  <div className="flex flex-col gap-1">
                    <span style={{ color: "rgba(255,255,255,0.8)", fontFamily: '"Source Han Sans CN"', fontSize: 14, fontWeight: 400, lineHeight: "22px" }}>总展览面积</span>
                    <span className="text-2xl font-bold text-white">
                      {totalArea.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      <span className="ml-1 text-sm font-normal text-white/80">㎡</span>
                    </span>
                  </div>
                  <div className="h-[60%] w-px bg-[rgba(147,197,253,0.4)]" />
                  <div className="flex flex-col gap-1 text-right">
                    <span style={{ color: "rgba(255,255,255,0.8)", fontFamily: '"Source Han Sans CN"', fontSize: 14, fontWeight: 400, lineHeight: "22px" }}>特装展位</span>
                    <span className="text-2xl font-bold text-white">
                      {totalSpecial.toLocaleString()}
                      <span className="ml-1 text-sm font-normal text-white/80">个</span>
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ===== 特装展位报馆 ===== */}
      <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <PanelTitle title="项目运营总览" />
        <div className="flex min-h-0 flex-1 flex-col px-3 pb-3 pt-2">
          {/* 表头 */}
          <div className="mb-1.5 grid min-w-0 grid-cols-[55px_minmax(0,1fr)_60px_60px_60px] gap-2 rounded-lg px-3 py-2 text-xs text-[rgba(255,255,255,0.8)]">
            <span className="truncate whitespace-nowrap">展位号</span>
            <span className="truncate whitespace-nowrap">参展商</span>
            <span className="truncate whitespace-nowrap">报到</span>
            <span className="truncate whitespace-nowrap">缴费</span>
            <span className="truncate whitespace-nowrap">申报</span>
          </div>

          {/* 列表 */}
          <div className="min-h-0 flex-1 overflow-hidden rounded-lg">
            <SeamlessVirtualList
              data={visibleBoothRows}
              itemHeight={38}
              height="100%"
              speed={0.35}
              overscan={8}
              pauseOnHover={false}
              className="h-full rounded-lg"
              renderItem={(row, index) => {
                const reportStatus = (row.report || "").includes("已") ? "已报到" : "未报到";
                const paidStatus = (row.paid || "").includes("已") ? "已缴" : "未缴";
                const declareStatus = (row.declare || "").includes("已") ? "已申报" : "未申报";

                return (
                  <div
                    className={`grid h-full min-w-0 grid-cols-[55px_minmax(0,1fr)_60px_60px_60px] items-center gap-2 px-3 text-xs ${index % 2 === 1 ? "bg-white/[0.03]" : ""
                      }`}
                  >
                    <span className="min-w-0 truncate whitespace-nowrap text-white">
                      {row.boothNo || "-"}
                    </span>
                    <span className="min-w-0 truncate whitespace-nowrap text-white">
                      {row.exhibitor || "-"}
                    </span>
                    <span className={`min-w-0 truncate whitespace-nowrap flex items-center gap-1 ${statusClass(row.report)}`}>
                      <span className={`inline-block h-1 w-1 rounded-full ${(row.report || "").includes("已") ? "bg-[#63F222]" : "bg-[#F5222D]"}`} />
                      {reportStatus}
                    </span>
                    <span className={`min-w-0 truncate whitespace-nowrap flex items-center gap-1 ${statusClass(row.paid)}`}>
                      <span className={`inline-block h-1 w-1 rounded-full ${(row.paid || "").includes("已") ? "bg-[#63F222]" : "bg-[#F5222D]"}`} />
                      {paidStatus}
                    </span>
                    <span className={`min-w-0 truncate whitespace-nowrap flex items-center gap-1 ${statusClass(row.declare)}`}>
                      <span className={`inline-block h-1 w-1 rounded-full ${(row.declare || "").includes("已") ? "bg-[#63F222]" : "bg-[#F5222D]"}`} />
                      {declareStatus}
                    </span>
                  </div>
                );
              }}
            />

            {loading && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg bg-[rgba(8,23,42,0.34)] backdrop-blur-[1px] text-sm text-[#dbeeff]">
                <Spin size="default" />
              </div>
            )}
          </div>
        </div>
      </section>
    </aside>
  );
}
