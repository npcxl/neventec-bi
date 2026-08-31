import { useEffect, useMemo, useRef } from "react";
import { Spin } from "antd";
import Highcharts from 'highcharts/esm/highcharts.src.js';
import SafetyCarousel from "./ConstructCarousel";
import { SafetyFloatCards } from "./SafetyFloatCards";

const MOCK_SAFETY_PICTURES = [
  {
    address: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1200&q=80",
    dataStr: "安全巡检01",
    boothNo: "A01",
    exhibitor: "安全现场",
    hallId: "",
    hallName: "",
  },
  {
    address: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80",
    dataStr: "安全巡检02",
    boothNo: "A02",
    exhibitor: "违规记录",
    hallId: "",
    hallName: "",
  },
  {
    address: "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80",
    dataStr: "安全巡检03",
    boothNo: "A03",
    exhibitor: "现场检查",
    hallId: "",
    hallName: "",
  },
];

type SafetyRightSidebarProps = {
  violationTypeData?: any;
  violationRecordData?: any;
  rectificationSituationData?: any;
  checkDrawingsSummary?: any; // 关键工序-图纸核查汇总（选展馆时返回）
  hallId?: string;
  loading?: boolean;
  variant?: "landscape";
  safetyCarouselPictures?: Array<{ address: string; dataStr: string }>;
  safetyCarouselLoading?: boolean;
  showFloatCards?: boolean;
};

type RiskRow = {
  checkDate?: string;
  lowRisk?: number;
  mediumRisk?: number;
  highRisk?: number;
};

function PanelTitle({ title }: { title: string }) {
  return (
    <div className="relative h-12 ">
      <div className="flex h-full w-full items-center bg-[url('/img/sub-title.png')] bg-[length:100%_100%] bg-left bg-no-repeat pl-[14%] text-sm font-medium text-[#d8efff]">
        <span className="pb-3 text-[18px]">{title}</span>
      </div>
    </div>
  );
}

const RISK_COLORS = {
  highRisk: "#F5222D",
  mediumRisk: "#FA8C16",
  lowRisk: "#2563EB",
};

export function SafetyRightSidebar({
  violationTypeData,
  violationRecordData,
  rectificationSituationData,
  checkDrawingsSummary,
  loading = false,
  variant,
  safetyCarouselPictures = [],
  safetyCarouselLoading = false,
  showFloatCards = false,
}: SafetyRightSidebarProps) {
  const isLandscape = variant === "landscape";
  const isPortrait = !isLandscape;

  const riskRows: RiskRow[] = Array.isArray(violationTypeData)
    ? violationTypeData
    : (violationTypeData?.data ??
      violationTypeData?.list ??
      violationTypeData?.rows ??
      []);

  const { riskDates, lowRiskData, mediumRiskData, highRiskData } =
    useMemo(() => {
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
        riskDates: nextRiskDates,
        lowRiskData: values.map((row) => row.lowRisk),
        mediumRiskData: values.map((row) => row.mediumRisk),
        highRiskData: values.map((row) => row.highRisk),
      };
    }, [riskRows]);

  // 展示全部日期，不补位、不轮播
  // Highcharts 图表
  const riskRef = useRef<HTMLDivElement | null>(null);
  const hcRef = useRef<Highcharts.Chart | null>(null);

  const hcOptions = useMemo(() => {
    const categories = riskDates.map((d) => d.slice(5)); // MM-DD
    // 横版用 column（竖的柱状图），竖版也用 column
    const chartType = 'column' as const;
    // 最多显示 6 个分类，超出时自动横向滚动（轮播平移，无滚动条）
    const VISIBLE_COUNT = 6;
    const exceedLimit = categories.length > VISIBLE_COUNT;
    return {
      chart: {
        type: chartType,
        backgroundColor: 'transparent',
        style: { fontFamily: 'inherit' },
        spacing: isPortrait ? [2, 8, 2, 4] : [4, 8, 4, 4],
        height: 230,
        animation: { duration: 600 },
      },
      title: { text: '' },
      credits: { enabled: false },
      xAxis: {
        categories,
        ...(categories.length > 0
          ? { min: 0, max: Math.min(categories.length - 1, VISIBLE_COUNT - 1) }
          : {}),
        labels: {
          style: { color: '#9ec6ef', fontSize: '11px' },
        },
        lineColor: 'rgba(145,171,205,0.35)',
        tickColor: 'rgba(145,171,205,0.35)',
      },
      yAxis: {
        min: 0,
        title: { text: '' },
        labels: {
          style: { color: '#7f9cbc', fontSize: '10px' },
        },
        gridLineColor: 'rgba(145,171,205,0.12)',
      },
      legend: {
        reversed: true,
        itemStyle: { color: '#cfe5ff', fontSize: '11px' },
        itemHoverStyle: { color: '#fff' },
      },
      plotOptions: {
        [chartType]: {
          stacking: 'normal' as const,
          dataLabels: {
            enabled: true,
            formatter: function (this: any) {
              if (this.y === 0 || this.y == null) return '';
              return String(this.y);
            },
            style: {
              color: '#fff',
              fontSize: '13px',
              textOutline: 'none',
              fontWeight: 'bold',
            },
          },
        },
        series: {
          states: {
            inactive: { opacity: 1 },
          },
        },
      },
      tooltip: {
        shared: true,
        backgroundColor: 'rgba(7,18,34,0.96)',
        borderColor: 'rgba(37,99,235,0.6)',
        style: { color: '#eaf6ff', fontSize: '12px' },
      },
      series: [
        {
          name: '高风险',
          type: chartType,
          data: highRiskData,
          color: RISK_COLORS.highRisk,
        },
        {
          name: '较大风险',
          type: chartType,
          data: mediumRiskData,
          color: RISK_COLORS.mediumRisk,
        },
        {
          name: '一般风险',
          type: chartType,
          data: lowRiskData,
          color: RISK_COLORS.lowRisk,
        },
      ],
    } as Highcharts.Options;
  }, [riskDates, highRiskData, mediumRiskData, lowRiskData, isLandscape, isPortrait]);

  useEffect(() => {
    const el = riskRef.current;
    if (!el) return;

    if (hcRef.current) {
      hcRef.current.destroy();
      hcRef.current = null;
    }
    hcRef.current = Highcharts.chart(el, hcOptions);

    return () => {
      if (hcRef.current) {
        hcRef.current.destroy();
        hcRef.current = null;
      }
    };
  }, [hcOptions]);

  // 超出 6 个分类时自动横向轮播（无滚动条）
  useEffect(() => {
    const total = riskDates.length;
    const windowSize = 6;
    if (total <= windowSize) return;
    const maxStart = total - windowSize;
    let start = 0;
    const id = window.setInterval(() => {
      start += 1;
      if (start > maxStart) start = 0;
      const axis = hcRef.current?.xAxis?.[0];
      if (axis) axis.update({ min: start, max: start + windowSize - 1 });
    }, 2500);
    return () => window.clearInterval(id);
  }, [riskDates]);

  const riskSection = (
    <section
      className={isLandscape ? "flex flex-col overflow-hidden" : "flex min-h-0 flex-1 flex-col overflow-hidden"}
      style={isLandscape ? { height: 268 } : undefined}
    >
      <div className={isLandscape ? "shrink-0 w-full" : "shrink-0 w-full"}>
        <PanelTitle title="违规风险等级" />
      </div>
      <div className="min-h-0 flex-1 p-2.5">
        {riskDates.length === 0 ? (
          <div className="flex h-full w-full items-center justify-center">
            <img src="/img/empty/违规风险等级.png" alt="暂无数据" style={{ maxWidth: "280px", maxHeight: "220px", objectFit: "contain" }} />
          </div>
        ) : (
          <div ref={riskRef} className="h-full w-full rounded-xl p-2" />
        )}
      </div>
    </section>
  );

  const carouselSection = (vertical?: boolean) => (
    <section className={isLandscape ? "flex flex-col overflow-hidden" : "flex h-full min-h-0 flex-col overflow-hidden"}>
      <div className={isLandscape ? "shrink-0 w-full" : "shrink-0 w-full"}>
        <PanelTitle title="现场图片" />
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <SafetyCarousel
          pictures={safetyCarouselPictures}
          loading={safetyCarouselLoading}
          vertical={vertical}
        />
      </div>
    </section>
  );

  return isLandscape ? (
    <aside className="flex h-full min-h-0 w-full min-w-0 flex-col gap-3 overflow-hidden p-2">
      {showFloatCards && <SafetyFloatCards />}
      <div className="relative grid min-h-0 flex-1 grid-cols-2 gap-3 overflow-hidden">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-[#07111d]/60 backdrop-blur-sm">
            <div className="rounded-xl border border-white/10 bg-[#081726]/90 px-4 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
              <div className="flex items-center gap-3 text-sm text-[#dbeeff]">
                <span className="inline-flex">
                  <Spin size="large" />
                </span>
                <span>正在加载安全信息...</span>
              </div>
            </div>
          </div>
        )}
        {riskSection}
        {carouselSection()}
      </div>
    </aside>
  ) : (
    <aside className="relative flex h-full min-h-0 flex-col p-2 gap-2" style={{ background: 'url(/img/bg-diffuse.png) center/contain no-repeat' }}>
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-[#07111d]/60 backdrop-blur-sm">
          <div className="rounded-xl border border-white/10 bg-[#081726]/90 px-4 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
            <div className="flex items-center gap-3 text-sm text-[#dbeeff]">
              <span className="inline-flex">
                <Spin size="large" />
              </span>
              <span>正在加载安全信息...</span>
            </div>
          </div>
        </div>
      )}
      <div className="flex-[0.33] min-h-0 flex flex-col">
        {riskSection}
      </div>
      <div className="flex-[0.67] min-h-0 flex flex-col">
        {carouselSection(true)}
      </div>
    </aside>
  );
}
