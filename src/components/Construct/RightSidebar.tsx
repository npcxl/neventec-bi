import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { Progress, Spin } from 'antd';
import * as echarts from 'echarts';

type BoothRow = {
  boothNo?: string;
  exhibitor?: string;
  report?: string;
  paid?: string;
  declare?: string;
  hallId?: string;
  hallName?: string;
};

type BoothProgressItem = {
  name?: string;
  completion?: number;
  commence?: number;
  enumName?: number | string;
  num?: number;
  ratio?: number;
  hallId?: string;
  hallName?: string;
  expoid?: string;
  expoName?: string;
  progressStatus?: number | string;
  status?: number | string;
  processStatus?: number | string;
  count?: number;
};

function getConstructOverviewRows(data?: any) {
  const source = data?.data ?? data?.list ?? data?.rows ?? data?.result ?? data?.records ?? data?.content ?? data;
  const rows = Array.isArray(source) ? source : Array.isArray(source?.data) ? source.data : [];
  return rows;
}

const BOOTH_PROGRESS_COLORS: Record<string, string> = {
  '搭建完成': '#7fe7c4',
  '进度缓慢': '#ffb84d',
  '暂未入场(空地)': '#8fb4d8',
  '搭建正常': '#6dc8ff',
  '严重滞后': '#ff8f8f',
  '有搭建材料（未搭建）': '#d8a6ff',
};

function isPaid(row: BoothRow) {
  const paid = `${row.paid ?? ''}`;
  return paid.includes('已') || paid === '0';
}

function isReported(row: BoothRow) {
  const report = `${row.report ?? ''}`;
  return report.includes('已') || report === '0';
}

function PanelTitle({ title }: { title: string }) {
  return (
    <div className="relative h-11 px-3">
      <div className="flex h-full w-full items-center gap-2 bg-[url('/img/Union.png')] bg-[length:100%_100%] bg-left bg-no-repeat pl-[clamp(24px,2vw,36px)] text-sm font-medium text-[#d8efff]">
        <img src="/img/Frame 7.svg" alt="" className="h-4 w-4 shrink-0" />
        <span>{title}</span>
      </div>
    </div>
  );
}

function usePieAutoCycle(chartRef: MutableRefObject<echarts.EChartsType | null>, dataLength: number, intervalMs = 2000) {
  const timerRef = useRef<number | null>(null);
  const activeIndexRef = useRef(0);

  useEffect(() => {
    const chart = chartRef.current;

    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    activeIndexRef.current = 0;

    if (!chart || chart.isDisposed()) return;

    if (dataLength <= 1) {
      if (dataLength === 1) {
        chart.dispatchAction({ type: 'highlight', seriesIndex: 0, dataIndex: 0 });
        chart.dispatchAction({ type: 'showTip', seriesIndex: 0, dataIndex: 0 });
      }
      return;
    }

    const playCurrent = () => {
      const chartInstance = chartRef.current;
      if (!chartInstance || chartInstance.isDisposed()) return;
      const nextIndex = activeIndexRef.current % dataLength;
      chartInstance.dispatchAction({ type: 'downplay', seriesIndex: 0 });
      chartInstance.dispatchAction({ type: 'highlight', seriesIndex: 0, dataIndex: nextIndex });
      chartInstance.dispatchAction({ type: 'showTip', seriesIndex: 0, dataIndex: nextIndex });
      activeIndexRef.current = (nextIndex + 1) % dataLength;
    };

    playCurrent();
    timerRef.current = window.setInterval(playCurrent, intervalMs);

    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [chartRef, dataLength, intervalMs]);

  return timerRef;
}

function DonutChart({ data }: { data: Array<{ name: string; value: number }> }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<echarts.EChartsType | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.getInstanceByDom(ref.current) ?? echarts.init(ref.current);
    chartRef.current = chart;

    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      chartRef.current = null;
      chart.dispose();
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    chart.setOption({
      animation: true,
      animationDuration: 600,
      animationEasing: 'cubicOut',
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item' },
      series: [{
        type: 'pie',
        radius: ['42%', '52%'],
        center: ['50%', '54%'],
        data,
        label: { color: '#dbeeff' },
        itemStyle: { borderColor: '#0b1f3d', borderWidth: 2 },
        emphasis: { scale: true, scaleSize: 8 },
      }],
      replaceMerge: ['series'],
      notMerge: false,
    });
  }, [data]);

  usePieAutoCycle(chartRef, data.length, 2000);

  return <div ref={ref} className="h-full w-full" />;
}

const PROGRESS_LABELS: Record<string, string> = {
  'NOT_ADMISSIBLE_PROGRESS': '暂未入场(空地)',
  'NORMAL_PROGRESS': '搭建正常',
  'SLOW_PROGRESS': '进度缓慢',
  'DELAY_PROGRESS': '严重滞后',
  'COMPLETED_PROGRESS': '搭建完成',
  'BUILDING_MATERIALS_NOT_BUILT': '有搭建材料（未搭建）',
};
  


const PROGRESS_COLORS: Record<string, string> = {
  'NOT_ADMISSIBLE_PROGRESS': '#8fb4d8',
  'NORMAL_PROGRESS': '#6dc8ff',
  'SLOW_PROGRESS': '#ffb84d',
  'DELAY_PROGRESS': '#ff8f8f',
  'COMPLETED_PROGRESS': '#7fe7c4',
  'BUILDING_MATERIALS_NOT_BUILT': '#d8a6ff',
};

function ProgressRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-[#9ec6ef]">
        <span className="truncate">{label}</span>
        <span className="text-[#dbeeff]">{Math.round(value)}%</span>
      </div>
      <Progress
        percent={Math.min(Math.max(value, 0), 100)}
        showInfo={false}
        strokeColor={{
          '0%': '#2a63ff',
          '100%': '#67b8ff',
        }}
        trailColor="#12304e"
      />
    </div>
  );
}

function PieChart({ data }: { data: Array<{ name: string; value: number; itemStyle?: { color?: string } }> }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<echarts.EChartsType | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    const chart = echarts.getInstanceByDom(ref.current) ?? echarts.init(ref.current);
    chartRef.current = chart;

    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      chartRef.current = null;
      chart.dispose();
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item' },
      series: [
        {
          type: 'pie',
          radius: ['28%', '52%'],
          center: ['50%', '42%'],
          itemStyle: {
            borderColor: '#0b1f3d',
            borderWidth: 2,
          },
          label: {
            color: '#dbeeff',
            fontSize: 11,
          },
          labelLine: {
            length: 12,
            length2: 10,
            lineStyle: { color: 'rgba(219,238,255,0.55)' },
          },
          data,
        },
      ],
      replaceMerge: ['series'],
      notMerge: false,
    });
  }, [data]);

  usePieAutoCycle(chartRef, data.length, 2000);

  return <div ref={ref} className="h-full w-full" />;
}

type ConstructRightSidebarProps = {
  constructOverviewData?: any;
  constructProcessData?: any;
  boothProgressData?: any;
  exhibitionProcessData?: any;
  constructMaterialData?: any;
  hallId?: string;
  loading?: boolean;
  materialLoading?: boolean;
  boothProgressLoading?: boolean;
  processLoading?: boolean;
};

type MaterialRow = {
  name?: string;
  num?: number;
  hallId?: string;
  hallName?: string;
};

function MaterialSection({ data, hallId = 'all', loading = false }: { data?: any; hallId?: string; loading?: boolean }) {
  const shouldFilterByHall = Boolean(hallId && hallId !== 'all');
  const materialRows: MaterialRow[] = Array.isArray(data)
    ? data
    : (data?.data ?? data?.list ?? data?.rows ?? []);
  const normalizeHallId = (value?: string) => `${value ?? ''}`.trim();

  const materialCounts = useMemo(() => {
    const filteredRows = shouldFilterByHall
      ? materialRows.filter((row) => normalizeHallId(row.hallId) === normalizeHallId(hallId))
      : materialRows;
    const fallbackRows = filteredRows.length > 0 || !shouldFilterByHall ? filteredRows : materialRows;

    return fallbackRows.reduce((acc: Record<string, number>, row) => {
      const key = row.name || '未知';
      acc[key] = (acc[key] || 0) + Number(row.num || 0);
      return acc;
    }, {});
  }, [hallId, materialRows, shouldFilterByHall]);

  const materialChartData = useMemo(
    () => Object.entries(materialCounts).map(([name, value]) => ({ name, value })),
    [materialCounts],
  );

  return (
    <section className="flex min-h-0 flex-[0.36] flex-col overflow-hidden border border-[rgba(128,185,255,0.28)] bg-[linear-gradient(180deg,rgba(9,26,52,0.88),rgba(6,17,34,0.94))] shadow-[inset_0_0_24px_rgba(80,157,255,0.08)]">
      <PanelTitle title="主体结构材质" />
      <div className="min-h-0 flex-1 p-3">
        <div className="h-full rounded-lg border border-white/10 bg-[rgba(8,23,42,0.68)] p-2">
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-[#dbeeff]">
              <Spin size="large" tip="正在加载材质数据..." />
            </div>
          ) : (
            <DonutChart data={materialChartData} />
          )}
        </div>
      </div>
    </section>
  );
}

function BoothProgressSection({ data, hallId = 'all', loading = false }: { data?: any; hallId?: string; loading?: boolean }) {
  const progressPieData = useMemo(() => {
    const rows = getConstructOverviewRows(data);

    return rows
      .map((row: BoothProgressItem) => {
        const rawName = row?.name ?? '未命名';
        const rawValue = Number(row?.num ?? 0);
        return {
          name: `${rawName}`,
          value: Number.isFinite(rawValue) && rawValue >= 0 ? rawValue : 0,
          itemStyle: { color: BOOTH_PROGRESS_COLORS[`${rawName}`] ?? '#8fb4d8' },
        };
      })
      .filter((item: { name: string; value: number }) => item.name)
      .sort((a: { name: string; value: number }, b: { name: string; value: number }) => b.value - a.value);
  }, [data, hallId]);

  return (
    <section className="flex min-h-0 flex-[0.32] flex-col overflow-hidden border border-[rgba(128,185,255,0.28)] bg-[linear-gradient(180deg,rgba(9,26,52,0.88),rgba(6,17,34,0.94))] shadow-[inset_0_0_24px_rgba(80,157,255,0.08)]">
      <PanelTitle title="展位进展情况" />
      <div className="min-h-0 flex-1 px-3 pb-3">
        <div className="h-full rounded-lg border border-white/10 bg-[rgba(8,23,42,0.68)] p-2">
          {loading ? <div className="flex h-full items-center justify-center text-sm text-[#dbeeff]"><Spin size="large" tip="正在加载进展数据..." /></div> : progressPieData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-[#8fb4d8]">暂无数据</div>
          ) : (
            <PieChart data={progressPieData} />
          )}
        </div>
      </div>
    </section>
  );
}

function ProcessSection({ data, hallId = 'all', loading = false }: { data?: any; hallId?: string; loading?: boolean }) {
  const shouldFilterByHall = Boolean(hallId && hallId !== 'all');
  const rows = useMemo(() => {
    const source = data?.data ?? data?.list ?? data?.rows ?? data?.result ?? data?.records ?? data?.content ?? data;
    const arr = Array.isArray(source) ? source : Array.isArray(source?.data) ? source.data : [];
    return shouldFilterByHall
      ? arr.filter((row: any) => `${row?.hallId ?? ''}`.trim() === `${hallId ?? ''}`.trim())
      : arr;
  }, [data, hallId, shouldFilterByHall]);

  const progressDisplayRows = rows.length > 0
    ? rows.map((row: any) => {
        const completion = Number(row?.completion ?? 0);
        const commence = Number(row?.commence ?? 0);
        const total = completion + commence;
        const ratio = total > 0 ? (completion / total) * 100 : 0;

        return {
          name: row?.name ?? '展会进程情况',
          completion,
          commence,
          total,
          ratio,
        };
      })
    : [
        {
          name: '展会进程情况',
          completion: 0,
          commence: 0,
          total: 0,
          ratio: 0,
        },
      ];
  const [progressIndex, setProgressIndex] = useState(0);

  useEffect(() => {
    setProgressIndex(0);
    if (progressDisplayRows.length <= 1) return;
    const timer = window.setInterval(() => {
      setProgressIndex((current) => (current + 1) % progressDisplayRows.length);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [hallId, progressDisplayRows.length]);

  const currentProgress = progressDisplayRows[progressIndex] ?? progressDisplayRows[0];

  return (
    <section className="flex min-h-0 flex-[0.32] flex-col overflow-hidden border border-[rgba(128,185,255,0.28)] bg-[linear-gradient(180deg,rgba(9,26,52,0.88),rgba(6,17,34,0.94))] shadow-[inset_0_0_24px_rgba(80,157,255,0.08)]">
      <PanelTitle title="展会进程情况" />
      <div className="min-h-0 flex-1 px-4 pb-2 pt-1">
        <div className="h-full rounded-lg border border-white/10 bg-[rgba(8,23,42,0.68)] p-3">
          {loading ? <div className="flex h-full items-center justify-center text-sm text-[#dbeeff]"><Spin size="large" tip="正在加载进程数据..." /></div> : rows.length > 0 ? (
            <div className="flex h-full flex-col justify-center gap-4 overflow-hidden">
              <div className="space-y-3 overflow-hidden">
                <div className="rounded-md border border-white/10 bg-white/5 p-2">
                  <div className="flex items-center justify-between gap-3 text-xs text-[#dbeeff]">
                    <span className="truncate">{currentProgress?.name}</span>
                    <span className="shrink-0 text-[#7da7cf]">{Math.round(currentProgress?.ratio ?? 0)}%</span>
                  </div>
                  <div className="mt-2">
                    <ProgressRow label="完成" value={currentProgress?.ratio ?? 0} />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-[#7da7cf]">
                    <span>已完成 {currentProgress?.completion ?? 0}</span>
                    <span>进行中 {currentProgress?.commence ?? 0}</span>
                    <span>总计 {currentProgress?.total ?? 0}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#7da7cf]">
                  <span>第 {progressIndex + 1} / {progressDisplayRows.length} 条</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-[#8fb4d8]">暂无数据</div>
          )}
        </div>
      </div>
    </section>
  );
}

export function ConstructRightSidebar({ boothProgressData, constructProcessData, exhibitionProcessData, constructMaterialData, hallId = 'all', loading = false, materialLoading = false, boothProgressLoading = false, processLoading = false }: ConstructRightSidebarProps) {
  return (
    <aside className="flex h-full min-h-0 flex-col gap-3">
      <MaterialSection data={constructMaterialData} hallId={hallId} loading={loading || materialLoading} />
      <BoothProgressSection data={boothProgressData} hallId={hallId} loading={loading || boothProgressLoading} />
      <ProcessSection data={exhibitionProcessData} hallId={hallId} loading={loading || processLoading} />
    </aside>
  );
}
