import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Spin } from "antd";
import * as echarts from "echarts";

type SafetyRightSidebarProps = {
  violationTypeData?: any;
  violationRecordData?: any;
  rectificationSituationData?: any;
  hallId?: string;
  loading?: boolean;
  variant?: "landscape";
};

type RiskRow = {
  checkDate?: string;
  lowRisk?: number;
  mediumRisk?: number;
  highRisk?: number;
};

type ViolationRecordRow = {
  safetyLines?: Array<{
    recordTypeContent?: string;
    recordGroupContent?: string;
    recordContent?: string;
  }>;
};

type RectificationRow = {
  name?: string;
  num?: number;
  hallId?: string;
  hallName?: string;
};

function PanelTitle({ title }: { title: string }) {
  return (
    <div className="relative h-11 px-3">
      <div className="flex h-full w-full items-center bg-[url('/img/小标题.png')] bg-[length:100%_100%] bg-left bg-no-repeat pl-[clamp(24px,2vw,36px)] text-sm font-medium text-[#d8efff]">
        <span className="pl-10 pb-1">{title}</span>
      </div>
    </div>
  );
}

function useChart() {
  const elRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<echarts.EChartsType | null>(null);
  const roRef = useRef<ResizeObserver | null>(null);

  const setRef = useCallback((node: HTMLDivElement | null) => {
    elRef.current = node;
  }, []);

  useEffect(() => {
    if (!elRef.current) return;

    const chart =
      echarts.getInstanceByDom(elRef.current) ?? echarts.init(elRef.current);
    chartRef.current = chart;

    const onResize = () => {
      if (!chart.isDisposed()) chart.resize();
    };

    // ResizeObserver for container size changes (layout switch)
    if (elRef.current) {
      const ro = new ResizeObserver(onResize);
      ro.observe(elRef.current);
      roRef.current = ro;
    }

    // Also keep window.resize for font scaling etc.
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      if (roRef.current) {
        roRef.current.disconnect();
        roRef.current = null;
      }
      chartRef.current = null;
      if (!chart.isDisposed()) chart.dispose();
    };
  }, []);

  return [setRef, chartRef] as const;
}

export function SafetyRightSidebar({
  violationTypeData,
  violationRecordData,
  rectificationSituationData,
  loading = false,
  variant,
}: SafetyRightSidebarProps) {
  const isLandscape = variant === "landscape";
  const riskRows: RiskRow[] = Array.isArray(violationTypeData)
    ? violationTypeData
    : (violationTypeData?.data ??
      violationTypeData?.list ??
      violationTypeData?.rows ??
      []);
  const recordRows: ViolationRecordRow[] = Array.isArray(violationRecordData)
    ? violationRecordData
    : (violationRecordData?.data ?? violationRecordData?.list ?? []);
  const rectRows: RectificationRow[] = Array.isArray(rectificationSituationData)
    ? rectificationSituationData
    : (rectificationSituationData?.data ??
      rectificationSituationData?.list ??
      []);

  const { type, status, riskDates, lowRiskData, mediumRiskData, highRiskData } =
    useMemo(() => {
      const nextType = recordRows.reduce(
        (acc, row) => {
          (row.safetyLines || []).forEach((line) => {
            const key =
              line.recordTypeContent ||
              line.recordGroupContent ||
              line.recordContent ||
              "未知";
            acc[key] = (acc[key] || 0) + 1;
          });
          return acc;
        },
        {} as Record<string, number>,
      );

      const nextStatus = rectRows.reduce(
        (acc, row) => {
          const key = row.name || "未知";
          acc[key] = (acc[key] || 0) + Number(row.num || 0);
          return acc;
        },
        {} as Record<string, number>,
      );

      const sortedRiskRows = [...riskRows].sort((a, b) =>
        String(a.checkDate ?? "").localeCompare(String(b.checkDate ?? "")),
      );
      const groupedRisk = sortedRiskRows.reduce((acc, row) => {
        const checkDate = row.checkDate || "未知";
        const current = acc.get(checkDate) || {
          lowRisk: 0,
          mediumRisk: 0,
          highRisk: 0,
        };
        current.lowRisk += Number(row.lowRisk ?? 0);
        current.mediumRisk += Number(row.mediumRisk ?? 0);
        current.highRisk += Number(row.highRisk ?? 0);
        acc.set(checkDate, current);
        return acc;
      }, new Map<string, { lowRisk: number; mediumRisk: number; highRisk: number }>());

      const nextRiskDates = Array.from(groupedRisk.keys());
      const values = Array.from(groupedRisk.values());

      return {
        type: nextType,
        status: nextStatus,
        riskDates: nextRiskDates,
        lowRiskData: values.map((row) => row.lowRisk),
        mediumRiskData: values.map((row) => row.mediumRisk),
        highRiskData: values.map((row) => row.highRisk),
      };
    }, [recordRows, rectRows, riskRows]);

  const typeMemoKey = useMemo(
    () =>
      Object.entries(type)
        .map(([name, value]) => `${name}:${value}`)
        .join("|"),
    [type],
  );
  const statusMemoKey = useMemo(
    () =>
      Object.entries(status)
        .map(([name, value]) => `${name}:${value}`)
        .join("|"),
    [status],
  );
  const riskMemoKey = useMemo(
    () =>
      `${riskDates.join("|")}|${lowRiskData.join(",")}|${mediumRiskData.join(",")}|${highRiskData.join(",")}`,
    [riskDates, lowRiskData, mediumRiskData, highRiskData],
  );
  const [riskOffset, setRiskOffset] = useState(0);
  const [isRiskPaused, setIsRiskPaused] = useState(false);
  const riskWindow = 3;
  const riskSlice = (arr: number[] | string[]) => {
    if (!arr.length) return [];
    const start = riskOffset % arr.length;
    const out = arr.slice(start, start + riskWindow);
    return out.length < riskWindow
      ? [...out, ...arr.slice(0, riskWindow - out.length)]
      : out;
  };
  const riskShownDates = riskSlice(riskDates);
  const riskShownLow = riskSlice(lowRiskData);
  const riskShownMedium = riskSlice(mediumRiskData);
  const riskShownHigh = riskSlice(highRiskData);
  const [riskRef, riskChartRef] = useChart();
  const riskTooltipTimerRef = useRef<number | null>(null);
  const clearRiskTooltipTimer = () => {
    if (riskTooltipTimerRef.current !== null) {
      window.clearInterval(riskTooltipTimerRef.current);
      riskTooltipTimerRef.current = null;
    }
  };

  const showRiskTooltipAt = (chart: echarts.EChartsType, index: number) => {
    if (!riskShownDates.length) return;
    const nextIndex =
      ((index % riskShownDates.length) + riskShownDates.length) %
      riskShownDates.length;
    chart.dispatchAction({ type: "showTip", seriesIndex: 0, dataIndex: nextIndex });
  };

  useEffect(() => {
    clearRiskTooltipTimer();
    if (riskDates.length <= riskWindow || isRiskPaused) return;
    const timer = window.setInterval(() => {
      setRiskOffset((prev) => (prev + 1) % Math.max(1, riskDates.length));
    }, 4500);
    riskTooltipTimerRef.current = timer;
    return () => clearRiskTooltipTimer();
  }, [riskDates.length, isRiskPaused, riskWindow]);

  useEffect(() => {
    const chart = riskChartRef.current;
    if (!chart || riskShownDates.length === 0) return;
    showRiskTooltipAt(chart, 1);
  }, [riskMemoKey, riskOffset]);

  useEffect(() => () => clearRiskTooltipTimer(), []);

  useEffect(() => {
    const chart = riskChartRef.current;
    if (!chart) return;
    chart.setOption({
      animation: true,
      animationDuration: 500,
      animationEasing: "cubicOut",
      backgroundColor: "transparent",
      grid: { left: 50, right: 18, top: 20, bottom: 28 },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: "rgba(7,18,34,0.96)",
        borderColor: "rgba(41, 124, 30, 0.96)",
        textStyle: { color: "#eaf6ff" },
        extraCssText: "z-index:99;",
        z: 99,
        appendToBody: true,
      },
      xAxis: {
        type: "category",
        data: riskShownDates,
        axisLabel: {
          color: "#9ec6ef",
          rotate: 0,
          fontSize: 12,
          margin: 12,
          formatter: (value: string) => value.slice(5),
        },
        axisLine: { lineStyle: { color: "rgba(145,171,205,0.35)" } },
      },
      yAxis: {
        type: "value",
        axisLabel: { color: "#7f9cbc" },
        splitLine: { lineStyle: { color: "rgba(145,171,205,0.12)" } },
      },
      series: [
        {
          name: "低风险",
          type: "bar",
          stack: "risk",
          data: riskShownLow,
          barWidth: 16,
          itemStyle: { color: "#67b8ff" },
          emphasis: { focus: "series" },
        },
        {
          name: "中风险",
          type: "bar",
          stack: "risk",
          data: riskShownMedium,
          barWidth: 16,
          itemStyle: { color: "#ffd066" },
          emphasis: { focus: "series" },
        },
        {
          name: "高风险",
          type: "bar",
          stack: "risk",
          data: riskShownHigh,
          barWidth: 16,
          itemStyle: { color: "#ff5e5e" },
          emphasis: { focus: "series" },
        },
      ],
    });
    showRiskTooltipAt(chart, 1);
  }, [
    riskMemoKey,
    riskOffset,
    riskShownDates,
    riskShownLow,
    riskShownMedium,
    riskShownHigh,
  ]);

  const [typeRef, typeChartRef] = useChart();
  const [rectRef, rectChartRef] = useChart();

  useEffect(() => {
    const chart = typeChartRef.current;
    if (!chart) return;
    const data = Object.entries(type).map(([name, value]) => ({ name, value }));
    chart.setOption({
      animation: false,
      backgroundColor: "transparent",
      tooltip: { trigger: "item" },
      label: { color: "#dbeeff", formatter: "{b} {c}" },
      series: [
        {
          type: "pie",
          radius: ["42%", "68%"],
          center: ["50%", "50%"],
          data,
          label: { color: "#dbeeff" },
          itemStyle: { borderColor: "#0b1f3d", borderWidth: 2 },
        },
      ],
    });
  }, [typeMemoKey]);

  useEffect(() => {
    const chart = rectChartRef.current;
    if (!chart) return;
    const data = Object.entries(status).map(([name, value]) => ({
      name,
      value,
    }));
    chart.setOption({
      animation: false,
      backgroundColor: "transparent",
      tooltip: { trigger: "item", formatter: "{a} <br/>{b} : {c} ({d}%)" },
      series: [
        {
          type: "pie",
          radius: ["28%", "45%"],
          center: ["50%", "52%"],
          roseType: "area",
          data,
          label: { color: "#dbeeff", formatter: "{b} {c}" },
          itemStyle: { borderColor: "#0b1f3d", borderWidth: 2 },
        },
      ],
    });
  }, [statusMemoKey]);

  const riskSection = (
    <section
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
      onMouseEnter={() => setIsRiskPaused(true)}
      onMouseLeave={() => setIsRiskPaused(false)}
    >
      <PanelTitle title="违规风险等级" />
      <div className="min-h-0 flex-1 p-2.5">
        {loading ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-white/10 ">
            <Spin size="large" tip="正在加载风险数据..." />
          </div>
        ) : (
          <div
            ref={riskRef}
            className="h-full w-full rounded-xl border border-white/10 p-2"
          />
        )}
      </div>
    </section>
  );

  const typeSection = (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <PanelTitle title="违规类型统计" />
      <div className="min-h-0 flex-1 p-2.5">
        {loading ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-white/10 bg-[rgba(8,23,42,0.72)]">
            <Spin size="large" tip="正在加载类型数据..." />
          </div>
        ) : (
          <div
            ref={typeRef}
            className="h-full w-full rounded-xl border border-white/10 bg-[rgba(8,23,42,0.68)] p-2"
          />
        )}
      </div>
    </section>
  );

  return (
    <aside className={isLandscape
      ? "relative flex min-h-[360px] min-w-0 flex-col rounded-2xl border border-[rgba(128,185,255,0.22)] bg-[linear-gradient(180deg,rgba(8,20,38,0.92),rgba(5,13,26,0.96))] p-2 shadow-[inset_0_0_24px_rgba(80,157,255,0.08)]"
      : "relative flex h-full min-h-0 flex-col rounded-2xl border border-[rgba(128,185,255,0.22)] bg-[linear-gradient(180deg,rgba(8,20,38,0.92),rgba(5,13,26,0.96))] p-2 shadow-[inset_0_0_24px_rgba(80,157,255,0.08)]"
    }>
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-[#07111d]/60 backdrop-blur-sm">
          <div className="rounded-xl border border-white/10 bg-[#081726]/90 px-4 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
            <div className="flex items-center gap-3 text-sm text-[#dbeeff]">
              <span className="inline-flex">
                <Spin size="large" tip="正在加载安全信息..." />
              </span>
              <span>正在加载安全信息...</span>
            </div>
          </div>
        </div>
      )}
      {isLandscape ? (
        <div className="grid min-h-full min-w-0 grid-cols-2 gap-3">
          <div className="min-h-0 min-w-0 overflow-hidden">
            {riskSection}
          </div>
          <div className="min-h-0 min-w-0 overflow-hidden">
            {typeSection}
          </div>
        </div>
      ) : (
        <>
          {riskSection}
          <div className="mt-2" />
          {typeSection}
        </>
      )}
    </aside>
  );
}
