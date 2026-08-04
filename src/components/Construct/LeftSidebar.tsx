import { Icon } from "@iconify/react";
import { Spin } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useConstructProgress } from "../../hooks/useConstructProgress";
import { SeamlessVirtualList } from "../SeamlessVirtuaList";

function PanelTitle({ title }: { title: string }) {
  return (
    <div className="relative h-[clamp(40px,3.5vw,52px)] px-[clamp(10px,0.8vw,14px)]">
      <div className="flex h-full w-full items-center bg-[url('/img/小标题.png')] bg-[length:100%_100%] bg-left bg-no-repeat pl-[clamp(24px,2vw,36px)] text-[clamp(12px,0.82vw,15px)] font-medium text-[#d8efff]">
        <span className="pl-10 pb-1">{title}</span>
      </div>
    </div>
  );
}

type ConstructOverviewRow = {
  name?: string;
  enumName?: number | string;
  num?: number;
  ratio?: number;
  expoid?: string;
  expoName?: string;
  hallId?: string;
  hallName?: string;
};

const OVERVIEW_CARDS = [
  '搭建完成',
  '进度缓慢',
  '暂未入场(空地)',
  '搭建正常',
  '严重滞后',
  '有搭建材料（未搭建）',
] as const;

type ConstructProcessRow = {
  id?: number | string;
  boothId?: string;
  boothNumber?: string;
  exhibitor?: string;
  excompanytype?: string | number;
  complexEngineering?: string;
  liftingPoint?: string;
  mainStructureMaterial?: string;
  exhibitionPeriod?: string;
  area?: number | string;
  hallId?: string;
  exhibitionId?: string;
  recordDate?: string;
  content?: string;
  recordTimes?: number;
  progressStatus?: number | string;
  lines?: Array<{ id?: number | string; content?: string }>;
  recordLineId?: number | string;
  exNun?: string;
  progressValue?: string;
  expoid?: string;
  expoName?: string;
  hallName?: string;
};

const OVERVIEW_STATUS_META: Record<string, { label: string; color: string; icon: string; chartColor: string }> = {
  '10': { label: '暂未入场(空地)', color: 'text-[#8fb4d8]', icon: 'mdi:map-marker-off-outline', chartColor: '#8fb4d8' },
  '11': { label: '搭建正常', color: 'text-[#6dc8ff]', icon: 'mdi:check-circle-outline', chartColor: '#6dc8ff' },
  '12': { label: '进度缓慢', color: 'text-[#ffb84d]', icon: 'mdi:clock-alert-outline', chartColor: '#ffb84d' },
  '13': { label: '严重滞后', color: 'text-[#ff8f8f]', icon: 'mdi:alert-octagon-outline', chartColor: '#ff8f8f' },
  '14': { label: '搭建完成', color: 'text-[#7fe7c4]', icon: 'mdi:checkbox-marked-circle-outline', chartColor: '#7fe7c4' },
  '15': { label: '有搭建材料（未搭建）', color: 'text-[#d8a6ff]', icon: 'mdi:package-variant-closed', chartColor: '#d8a6ff' },
};

export function ConstructLeftSidebar({
  constructOverviewData,
  constructProcessData,
  exhibitionProcessData,
  hallId = "all",
  loading = false,
  overviewLoading = false,
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
  const overviewList: ConstructOverviewRow[] = Array.isArray(
    constructOverviewData,
  )  
    ? constructOverviewData
    : (constructOverviewData?.data ??
      constructOverviewData?.list ??
      constructOverviewData?.rows ??
      []);

  const processList: ConstructProcessRow[] = Array.isArray(constructProcessData)
    ? constructProcessData
    : (constructProcessData?.data ??
      constructProcessData?.list ??
      constructProcessData?.rows ??
      []);

  const normalizeHallId = (value?: string | number) => `${value ?? ""}`.trim();

  const overviewCards = useMemo(() => {
    return ['14', '12', '10', '11', '13', '15'].map((code) => {
      const meta = OVERVIEW_STATUS_META[code];
      const row = overviewList.find((item) => `${item.enumName ?? ''}`.trim() === code || item.name === meta.label);
      return {
        code,
        label: meta.label,
        color: meta.color,
        icon: meta.icon,
        chartColor: meta.chartColor,
        count: Number(row?.num ?? 0),
      };
    });
  }, [overviewList]);

  const {
    processRows,
    getProgressMeta,
  } = useConstructProgress({
    overviewData: constructOverviewData,
    processData: constructProcessData,
    hallId,
  });

  const totalRecords = useMemo(
    () => overviewList.reduce((sum, row) => sum + Number(row.num ?? 0), 0),
    [overviewList],
  );
  const shouldAutoScroll = processRows.length > 6;
  const isProcessLoading = loading || processLoading;
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
    <aside className="relative flex h-full min-h-0 min-w-0 flex-col gap-[clamp(0.35rem,0.6vw,0.65rem)] xl:gap-2">
      {(loading || overviewLoading) && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-[#07111d]/60 backdrop-blur-sm">
          <Spin size="large" tip="正在加载搭建概况..." />
        </div>
      )}
      {/* Process section moved to left sidebar, first position */}
      {currentProcess && (
        <section className="relative flex-none overflow-hidden bg-[linear-gradient(180deg,rgba(11,31,61,0.94),rgba(5,14,28,0.96))] shadow-[inset_0_0_30px_rgba(80,157,255,0.08)]">
          <PanelTitle title="展会进程情况" />
          <div className="px-4 pb-3 pt-1">
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
          </div>
        </section>
      )}

      <section className="relative flex-none overflow-hidden bg-[linear-gradient(180deg,rgba(11,31,61,0.94),rgba(5,14,28,0.96))] shadow-[inset_0_0_30px_rgba(80,157,255,0.08)] backdrop-blur-sm max-[1280px]:min-h-[280px]">
        <div className="flex h-full min-h-0 w-full flex-col">
          <PanelTitle title="搭建总览" />
          <div className="flex min-h-0 flex-col px-[clamp(6px,0.7vw,12px)] pb-[clamp(3px,0.35vw,6px)] pt-[clamp(4px,0.6vw,8px)] max-[640px]:px-1.5 max-[640px]:pb-1 max-[640px]:pt-1">
            <div className="rounded-xl border border-white/10 bg-[rgba(8,23,42,0.72)] px-[clamp(8px,0.8vw,14px)] py-[clamp(8px,0.8vw,14px)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] max-[640px]:px-2 max-[640px]:py-2">
              <div className="flex items-start gap-[clamp(6px,0.7vw,10px)] text-left max-[640px]:items-center">
                <div className="grid h-[clamp(40px,3.5vw,60px)] w-[clamp(40px,3.5vw,60px)] shrink-0 place-items-center rounded-2xl border border-cyan-400/20 bg-[rgba(64,162,255,0.16)] text-[#8bd6ff] shadow-[0_0_24px_rgba(42,99,255,0.25)] max-[640px]:h-10 max-[640px]:w-10">
                  <Icon
                    icon="mdi:layers-triple-outline"
                    className="h-[clamp(18px,1.5vw,28px)] w-[clamp(18px,1.5vw,28px)]"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[clamp(9px,0.72vw,12px)] tracking-[0.16em] text-[#6fbef0] max-[640px]:text-[9px]">
                    总记录
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-end gap-x-1 gap-y-0 text-white">
                    <strong className="text-[clamp(20px,2vw,32px)] font-black leading-none">
                      {totalRecords}
                    </strong>
                    <span className="pb-0.5 text-[clamp(10px,0.9vw,14px)] text-[#7aa8cf]">
                      条
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-1 flex flex-wrap gap-[clamp(4px,0.5vw,8px)] max-[640px]:mt-1 max-[640px]:gap-1">
              {overviewCards.map((card) => (
                <div
                  key={card.code}
                  className="flex min-h-[clamp(38px,3vw,50px)] flex-[1_1_calc(33.333%-clamp(4px,0.5vw,8px))] basis-[calc(33.333%-clamp(4px,0.5vw,8px))] min-w-[calc(33.333%-clamp(4px,0.5vw,8px))] flex-col justify-between rounded-lg border border-white/10 bg-[rgba(118,169,255,0.1)] px-[clamp(5px,0.55vw,8px)] py-[clamp(3px,0.35vw,5px)] text-center max-[900px]:flex-[1_1_calc(50%-clamp(4px,0.5vw,8px))] max-[900px]:basis-[calc(50%-clamp(4px,0.5vw,8px))] max-[900px]:min-w-[calc(50%-clamp(4px,0.5vw,8px))] max-[640px]:min-h-[40px] max-[640px]:flex-[1_1_calc(50%-0.25rem)] max-[640px]:basis-[calc(50%-0.25rem)] max-[640px]:min-w-[calc(50%-0.25rem)] max-[640px]:px-1 max-[640px]:py-1"
                >
                  <div className="flex items-center justify-center gap-1 text-[clamp(9px,0.68vw,11px)] text-[#93aed0] max-[640px]:text-[9px]">
                    <span className="min-w-0 truncate">{card.label}</span>
                    <Icon
                      icon={card.icon}
                      className={`h-3 w-3 shrink-0 ${card.color}`}
                    />
                  </div>      
                  <div className={`mt-0.25 text-[clamp(13px,1.2vw,20px)] font-black leading-none ${card.color}`}>
                    {card.count}
                  </div>

                </div>           
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative flex min-h-0 flex-1 overflow-hidden bg-[linear-gradient(180deg,rgba(11,31,61,0.94),rgba(5,14,28,0.96))] shadow-[inset_0_0_30px_rgba(80,157,255,0.08)] backdrop-blur-sm max-[1280px]:min-h-[320px] max-[1280px]:flex-none max-[1280px]:basis-auto">
        <div className="flex h-full min-h-0 w-full flex-col">
          <PanelTitle title="搭建进度明细" />
          <div className="flex min-h-0 flex-1 flex-col px-[clamp(6px,0.7vw,12px)] pb-[clamp(6px,0.7vw,12px)] pt-[clamp(4px,0.6vw,8px)] max-[640px]:px-1.5 max-[640px]:pb-1.5 max-[640px]:pt-1">
            <div className="grid min-w-0 grid-cols-[20%_15%_40%_20%] gap-2 overflow-hidden rounded-lg border border-white/5 bg-[rgba(118,169,255,0.1)] px-3 py-1 text-xs text-[#93aed0]">
              <span className="block truncate whitespace-nowrap text-center">
                展位号
              </span>
              <span className="block truncate whitespace-nowrap text-center">
                面积
              </span>
              <span className="block truncate whitespace-nowrap text-center">
                最新进程
              </span>
              <span className="block truncate whitespace-nowrap text-center">
                展位进度
              </span>
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
                        className={`grid h-full grid-cols-[20%_15%_40%_20%] items-center gap-2 rounded-xl border border-white/5 px-3 text-[12px] leading-tight transition-all xl:gap-2 xl:px-3 xl:text-[12px] max-[768px]:text-[11px] max-[640px]:px-2 max-[640px]:text-[10px] ${
                          index % 2 === 1
                            ? "bg-[rgba(118,169,255,0.08)]"
                            : "bg-[rgba(8,23,42,0.45)]"
                        } hover:border-cyan-300/20 hover:bg-[rgba(64,162,255,0.12)]`}
                      >
                        <div className="flex min-w-0 items-center justify-center whitespace-nowrap text-[#93aed0]">
                          <span className="min-w-0 truncate text-center font-medium tabular-nums">
                            {row.boothNumber || "-"}
                          </span>
                        </div>
                        <div className="flex min-w-0 items-center justify-center  text-[#dbeeff]">
                          <span className="truncate text-center tabular-nums">
                            {row.area || "-"}
                          </span>
                        </div>

                        <div className="min-w-0 truncate  text-center text-[#d8efff]">
                          {row.latestLine || "-"}
                        </div>

                        <div
                          className={`min-w-0 truncate whitespace-nowrap text-center ${meta.color}`}
                        >
                          {row.progressLabel || "-"}
                        </div>
                      </div>
                    );
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </section>
    </aside>
  );
}
