import { useEffect, useMemo, useState } from "react";
import { useConstructProgress } from "../../hooks/useConstructProgress";
import { SeamlessVirtualList } from "../SeamlessVirtuaList";

function PanelTitle({ title }: { title: string }) {
  return (
    <div className="relative h-[clamp(40px,3.5vw,52px)] px-[clamp(10px,0.8vw,14px)] shrink-0">
      <div className="flex h-full w-full items-center bg-[url('/img/小标题.png')] bg-[length:100%_100%] bg-left bg-no-repeat pl-[clamp(24px,2vw,36px)] text-[clamp(12px,0.82vw,15px)] font-medium text-[#d8efff]">
        <span className="pl-10 pb-1">{title}</span>
      </div>
    </div>
  );
}

export function ConstructLeftSidebar({
  constructOverviewData,
  constructProcessData,
  exhibitionProcessData,
  hallId = "all",
  loading = false,
  processLoading = false,
}: {
  constructOverviewData?: any;
  constructProcessData?: any;
  exhibitionProcessData?: any;
  hallId?: string;
  loading?: boolean;
  overviewLoading?: boolean;
  processLoading?: boolean;
}) {
  const {
    processRows,
    getProgressMeta,
  } = useConstructProgress({
    overviewData: constructOverviewData,
    processData: constructProcessData,
    hallId,
  });

  const shouldAutoScroll = processRows.length > 6;
  const isProcessLoading = loading || processLoading;

  // Process overview data
  const processRows2 = useMemo(() => {
    const source = exhibitionProcessData?.data ?? exhibitionProcessData?.list ?? exhibitionProcessData?.rows ?? exhibitionProcessData?.result ?? exhibitionProcessData?.records ?? exhibitionProcessData?.content ?? exhibitionProcessData;
    const arr = Array.isArray(source) ? source : Array.isArray(source?.data) ? source.data : [];
    return arr;
  }, [exhibitionProcessData]);

  const [processIndex, setProcessIndex] = useState(0);

  useEffect(() => {
    setProcessIndex(0);
    if (processRows2.length <= 1) return;
    const timer = window.setInterval(() => {
      setProcessIndex((current) => (current + 1) % processRows2.length);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [processRows2.length]);

  const currentProcess = processRows2[processIndex] ?? null;

  return (
    <aside className="flex h-full min-h-0 min-w-0 flex-col gap-[clamp(0.35rem,0.6vw,0.65rem)] xl:gap-2 overflow-hidden">
      {/* Process overview — always show section, even if no data */}
      <section className="shrink-0 overflow-hidden bg-[linear-gradient(180deg,rgba(11,31,61,0.94),rgba(5,14,28,0.96))] shadow-[inset_0_0_30px_rgba(80,157,255,0.08)]">
        <PanelTitle title="展会进程情况" />
        <div className="px-4 pb-3 pt-1">
          {currentProcess ? (
            <div className="rounded-lg bg-[rgba(8,23,42,0.68)] p-3">
              <div className="flex items-center justify-between gap-3 text-xs text-[#dbeeff]">
                <span className="truncate">{currentProcess?.name ?? '展会进程情况'}</span>
                <span className="shrink-0 text-[#7da7cf]">
                  {Math.round(
                    ((Number(currentProcess?.completion ?? 0) + Number(currentProcess?.commence ?? 0)) > 0
                      ? (Number(currentProcess?.completion ?? 0) / (Number(currentProcess?.completion ?? 0) + Number(currentProcess?.commence ?? 0))) * 100
                      : 0)
                  )}%
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-[#7da7cf]">
                <span>已完成 {currentProcess?.completion ?? 0}</span>
                <span>进行中 {currentProcess?.commence ?? 0}</span>
                <span>总计 {(Number(currentProcess?.completion ?? 0) + Number(currentProcess?.commence ?? 0))}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-[#7da7cf] mt-1">
                <span>第 {processIndex + 1} / {processRows2.length} 条</span>
              </div>
            </div>
          ) : (
            <div className="flex h-16 items-center justify-center rounded-lg bg-[rgba(8,23,42,0.68)] text-sm text-[#93aed0]">
              暂无数据
            </div>
          )}
        </div>
      </section>

      {/* Process detail */}
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[linear-gradient(180deg,rgba(11,31,61,0.94),rgba(5,14,28,0.96))] shadow-[inset_0_0_30px_rgba(80,157,255,0.08)]">
        <PanelTitle title="搭建进度明细" />
        <div className="flex min-h-0 flex-1 flex-col px-[clamp(6px,0.7vw,12px)] pb-[clamp(6px,0.7vw,12px)] pt-[clamp(4px,0.6vw,8px)] max-[640px]:px-1.5 max-[640px]:pb-1.5 max-[640px]:pt-1">
          <div className="grid min-w-0 grid-cols-[20%_15%_40%_20%] gap-2 overflow-hidden rounded-lg bg-[rgba(118,169,255,0.1)] px-3 py-1 text-xs text-[#93aed0]">
            <span className="block truncate whitespace-nowrap text-center">展位号</span>
            <span className="block truncate whitespace-nowrap text-center">面积</span>
            <span className="block truncate whitespace-nowrap text-center">最新进程</span>
            <span className="block truncate whitespace-nowrap text-center">展位进度</span>
          </div>
          <div className="demo-br2-scroll mt-1 min-h-0 flex-1 overflow-hidden rounded-lg">
            {isProcessLoading ? (
              <div className="flex h-20 items-center justify-center text-sm text-[#93aed0]">
                正在加载明细数据...
              </div>
            ) : processRows.length === 0 ? (
              <div className="flex h-20 items-center justify-center text-sm text-[#93aed0]">
                暂无明细数据
              </div>
            ) : (
              <SeamlessVirtualList
                data={processRows}
                itemHeight={42}
                height="100%"
                speed={shouldAutoScroll ? 0.45 : 0}
                overscan={8}
                pauseOnHover={false}
                className="h-full rounded-lg"
                renderItem={(row, index) => {
                  const meta = getProgressMeta(row.progressStatus);

                  return (
                    <div
                      className={`grid h-full grid-cols-[20%_15%_40%_20%] items-center gap-2 rounded-xl px-3 text-[12px] leading-tight transition-all xl:gap-2 xl:px-3 xl:text-[12px] max-[768px]:text-[11px] max-[640px]:px-2 max-[640px]:text-[10px] ${
                        index % 2 === 1
                          ? "bg-[rgba(118,169,255,0.08)]"
                          : "bg-[rgba(8,23,42,0.45)]"
                      }`}
                    >
                      <div className="flex min-w-0 items-center justify-center whitespace-nowrap text-[#93aed0]">
                        <span className="min-w-0 truncate text-center font-medium tabular-nums">
                          {row.boothNumber || "-"}
                        </span>
                      </div>
                      <div className="flex min-w-0 items-center justify-center text-[#dbeeff]">
                        <span className="truncate text-center tabular-nums">
                          {row.area || "-"}
                        </span>
                      </div>
                      <div className="min-w-0 truncate text-center text-[#d8efff]">
                        {row.latestLine || "-"}
                      </div>
                      <div className={`min-w-0 truncate whitespace-nowrap text-center ${meta.color}`}>
                        {row.progressLabel || "-"}
                      </div>
                    </div>
                  );
                }}
              />
            )}
          </div>
        </div>
      </section>
    </aside>
  );
}
