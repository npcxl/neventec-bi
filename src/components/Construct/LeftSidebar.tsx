import { useEffect, useMemo, useRef, useState } from "react";
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

const PAGE_SIZE = 5;
const SWITCH_INTERVAL = 3000;

function ProgressOverviewList({ items }: { items: Array<{ name: string; completion: number; commence: number }> }) {
  const [currentPage, setCurrentPage] = useState(0);
  const timerRef = useRef<number | null>(null);
  const [animKey, setAnimKey] = useState(0);

  const pageCount = Math.ceil(items.length / PAGE_SIZE);
  const visibleItems = items.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(0);
    setAnimKey(0);
    if (pageCount <= 1) {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = window.setInterval(() => {
      setCurrentPage((page) => (page + 1) % pageCount);
      setAnimKey((k) => k + 1);
    }, SWITCH_INTERVAL);

    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [pageCount]);

  return (
    <div key={animKey} className="animate-fade-in-up px-4 pb-3 pt-1">
      {visibleItems.map((item, i) => {
        const total = item.completion + item.commence;
        const pct = total > 0 ? Math.min(100, Math.round((item.completion / total) * 100)) : 0;
        return (
          <div
            key={i}
            className="grid items-center gap-[10px] py-1.5"
            style={{ gridTemplateColumns: '88px minmax(0,1fr) 44px' }}
          >
            <span className="truncate text-xs text-[#93aed0]">{item.name || '-'}</span>
            <div className="progress-track h-2 overflow-hidden rounded-sm">
              <div
                className="progress-fill h-full rounded-sm"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-right text-xs tabular-nums text-[#dbeeff]">{pct}%</span>
          </div>
        );
      })}
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

  // Process overview items for progress bars
  const processOverviewItems = useMemo(() => {
    const source = exhibitionProcessData?.data ?? exhibitionProcessData?.list ?? exhibitionProcessData?.rows ?? exhibitionProcessData?.result ?? exhibitionProcessData?.records ?? exhibitionProcessData?.content ?? exhibitionProcessData;
    const arr: Array<{ name?: string; completion?: number; commence?: number }> = Array.isArray(source) ? source : Array.isArray(source?.data) ? source.data : [];
    return arr.map((row) => ({
      name: row.name || '-',
      completion: Number(row.completion ?? 0),
      commence: Number(row.commence ?? 0),
    }));
  }, [exhibitionProcessData]);

  return (
    <aside className="flex h-full min-h-0 min-w-0 flex-col gap-[clamp(0.35rem,0.6vw,0.65rem)] xl:gap-2 overflow-hidden">
      {/* Progress overview — progress bars with page switching */}
      <section className="shrink-0 overflow-hidden bg-[linear-gradient(180deg,rgba(11,31,61,0.94),rgba(5,14,28,0.96))] shadow-[inset_0_0_30px_rgba(80,157,255,0.08)]">
        <PanelTitle title="搭建进程总览" />
        {processOverviewItems.length > 0 ? (
          <ProgressOverviewList items={processOverviewItems} />
        ) : (
          <div className="flex h-[calc(5*38px)] items-center justify-center px-4 pb-3 pt-1 text-sm text-[#93aed0]">
            暂无进程数据
          </div>
        )}
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
