import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useConstructProgress } from "../../hooks/useConstructProgress";
import { SeamlessVirtualList } from "../SeamlessVirtuaList";
import { BoothModal } from "./modal/BoothModal";
import type { ConstructDetailData } from "./modal/BoothModal";
import { screenApi } from "../../api";

function PanelTitle({ title }: { title: string }) {
  return (
    <div className="relative h-12 px-3 shrink-0">
      <div className="flex h-full w-full items-center bg-[url('/img/小标题.png')] bg-[length:100%_100%] bg-left bg-no-repeat pl-[clamp(24px,2vw,36px)] text-sm font-medium text-[#d8efff]">
        <span className="pl-10 pb-3">{title}</span>
      </div>
    </div>
  );
}

const VISIBLE_COUNT = 5;
const SCROLL_INTERVAL = 5000;
const ANIMATION_DURATION = 500;
const ROW_HEIGHT = 34; // py-1(4px) + bar 20px + py-1(4px) + gap

function ProgressRow({ item }: { item: { name: string; completion: number; commence: number } }) {
  const total = item.completion + item.commence;
  const pct = total > 0 ? Math.min(100, Math.round((item.completion / total) * 100)) : 0;
  return (
    <div
      className="grid flex-shrink-0 items-center gap-[10px] px-4 py-1"
      style={{ gridTemplateColumns: '88px minmax(0,1fr) 44px', height: ROW_HEIGHT }}
    >
      <span className="truncate text-xs text-[#93aed0]">{item.name || '-'}</span>
      <div className="progress-track h-[20px] overflow-hidden rounded">
        <div
          className="progress-fill h-full rounded"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-right text-xs tabular-nums text-[#dbeeff]">{pct}%</span>
    </div>
  );
}

function ProgressOverviewList({ items }: { items: Array<{ name: string; completion: number; commence: number }> }) {
  const [startIndex, setStartIndex] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const animTimeoutRef = useRef<number | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const needsScroll = items.length > VISIBLE_COUNT;

  const displayItems = useMemo(() => {
    if (items.length === 0) return [];
    const count = Math.min(items.length, VISIBLE_COUNT + 1);
    return Array.from({ length: count }, (_, offset) =>
      items[(startIndex + offset) % items.length],
    );
  }, [items, startIndex]);

  const clearAllTimers = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (animTimeoutRef.current !== null) {
      window.clearTimeout(animTimeoutRef.current);
      animTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    clearAllTimers();
    setStartIndex(0);
    setIsScrolling(false);

    if (!needsScroll) return;

    intervalRef.current = window.setInterval(() => {
      setIsScrolling(true);

      animTimeoutRef.current = window.setTimeout(() => {
        setIsScrolling(false);
        setStartIndex((idx) => (idx + 1) % items.length);
        animTimeoutRef.current = null;
      }, ANIMATION_DURATION);
    }, SCROLL_INTERVAL);

    return clearAllTimers;
  }, [needsScroll, items.length, clearAllTimers]);

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center px-4 pb-3 pt-1 text-sm text-[#93aed0]" style={{ height: VISIBLE_COUNT * ROW_HEIGHT }}>
        暂无进程数据
      </div>
    );
  }

  if (!needsScroll) {
    return (
      <div className="px-4 pb-3 pt-1">
        {items.map((item, i) => (
          <ProgressRow key={`${item.name}-${i}`} item={item} />
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-hidden px-0" style={{ height: VISIBLE_COUNT * ROW_HEIGHT }}>
      <div
        ref={listRef}
        className="transition-none"
        style={{
          transform: isScrolling ? `translateY(-${ROW_HEIGHT}px)` : 'translateY(0)',
          transition: isScrolling ? `transform ${ANIMATION_DURATION}ms cubic-bezier(0.4,0,0.2,1)` : 'none',
          willChange: 'transform',
        }}
      >
        {displayItems.map((item, i) => {
          const globalIndex = (startIndex + i) % items.length;
          return <ProgressRow key={`${globalIndex}-${item.name}`} item={item} />;
        })}
      </div>
    </div>
  );
}

export function ConstructLeftSidebar({
  constructOverviewData,
  constructProcessData,
  exhibitionProcessData,
  hallId = "all",
  exhibitionId = "",
  loading = false,
  processLoading = false,
}: {
  constructOverviewData?: any;
  constructProcessData?: any;
  exhibitionProcessData?: any;
  hallId?: string;
  exhibitionId?: string;
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
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState<ConstructDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const closeDetail = useCallback(() => {
    setDetailOpen(false);
    setDetailData(null);
    setDetailError(false);
    setSelectedId(null);
  }, []);

  const handleRowClick = useCallback(async (row: any) => {
    const boothNo =
      row.boothNo ??
      row.boothNumber ??
      row.exNun ??
      row.boothId ??
      '';
    if (!boothNo || boothNo === '-' || !exhibitionId) return;

    // 设置选中状态
    setSelectedId(String(row.boothNumber ?? row.boothNo ?? row.boothId ?? ''));

    setDetailLoading(true);
    setDetailError(false);
    setDetailOpen(true);
    setDetailData(null);
    try {
      const res = await screenApi.getConstructProcessByHallInfo(
        exhibitionId,
        hallId === 'all' ? '' : hallId,
        boothNo,
      );
      const raw = (res as any)?.data ?? res;
      const detail = Array.isArray(raw)
        ? raw[0]
        : Array.isArray(raw?.data)
          ? raw.data[0]
          : raw?.data ?? raw;
      setDetailData(detail ?? null);
    } catch {
      setDetailError(true);
      setDetailData(null);
    } finally {
      setDetailLoading(false);
    }
  }, [exhibitionId, hallId]);

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
    <aside className="flex h-full min-h-0 min-w-0 flex-col gap-3 xl:gap-3 overflow-hidden">
      {/* Progress overview — progress bars with page switching */}
      <section className="shrink-0 overflow-hidden">
        <PanelTitle title="搭建进程总览" />
        {processOverviewItems.length > 0 ? (
          <ProgressOverviewList items={processOverviewItems} />
        ) : (
          <div className="flex h-[calc(5*34px)] items-center justify-center px-4 pb-3 pt-1 text-sm text-[#93aed0]">
            暂无进程数据
          </div>
        )}
      </section>

      {/* Process detail */}
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <PanelTitle title="搭建进度明细" />
        <div className="flex min-h-0 flex-1 flex-col px-3 pb-3 pt-1">
          <div className="grid min-w-0 shrink-0 grid-cols-[20%_15%_40%_20%] gap-2 overflow-hidden px-3 py-1.5 text-xs text-[#93aed0] border-b border-[rgba(111,170,255,0.1)]">
            <span className="block truncate whitespace-nowrap text-center">展位号</span>
            <span className="block truncate whitespace-nowrap text-center">面积</span>
            <span className="block truncate whitespace-nowrap text-center">最新进程</span>
            <span className="block truncate whitespace-nowrap text-center">展位进度</span>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
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
                pauseOnHover={true}
                paused={detailOpen || selectedId !== null}
                className="h-full"
                renderItem={(row, index) => {
                  const meta = getProgressMeta(row.progressStatus);
                  const rowId = String(row.boothNumber ?? row.boothNo ?? index);
                  const isSelected = selectedId === rowId;

                  return (
                    <div
                      onClick={() => handleRowClick(row)}
                      className={`progress-detail-row grid h-full grid-cols-[20%_15%_40%_20%] items-center gap-2 px-3 text-[12px] leading-tight xl:gap-2 xl:px-3 xl:text-[12px] max-[768px]:text-[11px] max-[640px]:px-2 max-[640px]:text-[10px]${isSelected ? ' is-selected' : ''}`}
                    >
                      <div className="flex min-w-0 items-center justify-center whitespace-nowrap">
                        <span className="min-w-0 truncate text-center font-medium tabular-nums text-[#93aed0]">
                          {row.boothNumber || "-"}
                        </span>
                      </div>
                      <div className="flex min-w-0 items-center justify-center">
                        <span className="truncate text-center tabular-nums text-[#dbeeff]">
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

      {/* Detail Modal — 搭建信息详情 */}
      <BoothModal
        visible={detailOpen}
        onClose={closeDetail}
        data={detailLoading
          ? { boothNumber: '加载中...' }
          : detailError
            ? { boothNumber: '详情加载失败' }
            : detailData ?? {}
        }
      />
    </aside>
  );
}
  