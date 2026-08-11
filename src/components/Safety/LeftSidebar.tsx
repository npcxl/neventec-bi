import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Spin } from "antd";
import Highcharts from 'highcharts/esm/highcharts.src.js';
import 'highcharts/esm/highcharts-3d.src.js';
import Scan from "../Scan";
import { SeamlessVirtualList } from "../SeamlessVirtuaList";
import { BoothModal } from "./modal/BoothModal";
import type { SafetyDetailData } from "./modal/BoothModal";
import { screenApi } from "../../api";
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
    <div className="relative h-12">
      <div className="flex h-full w-full items-center bg-[url('/img/sub-title.png')] bg-[length:100%_100%] bg-left bg-no-repeat pl-[clamp(24px,2vw,36px)] text-sm font-medium text-[#d8efff]">
        <span className="pl-[24px] pb-3 text-[18px]">{title}</span>
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
  exhibitionId = "",
  loading = false,
}: {
  galleryRows?: GalleryRow[];
  safetyRows?: SafetyRecord[];
  safetyCollect?: SafetyCollectRow[];
  hallId?: string;
  exhibitionId?: string;
  loading?: boolean;
}) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<SafetyDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const closeDetail = useCallback(() => {
    setDetailOpen(false);
    setDetailData(null);
    setSelectedId(null);
  }, []);

  const handleRowClick = useCallback(async (row: SafetyRecord) => {
    const boothNo = row.boothNo ?? row.boothId ?? '';
    if (!boothNo || !exhibitionId) return;

    setSelectedId(String(boothNo));
    setDetailLoading(true);
    setDetailOpen(true);
    setDetailData(null);

    try {
      const res = await screenApi.getSafetyScreenBooth(
        exhibitionId,
        hallId === 'all' ? '' : hallId,
        boothNo,
      );
      const raw = (res as any)?.data ?? res;
      const detail = Array.isArray(raw) ? raw[0] : (raw?.data ? (Array.isArray(raw.data) ? raw.data[0] : raw.data) : raw);
      setDetailData(detail ?? null);
    } catch {
      setDetailData(null);
    } finally {
      setDetailLoading(false);
    }
  }, [exhibitionId, hallId]);

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
  const hcRef = useRef<Highcharts.Chart | null>(null);
  const listScrollRef = useRef<HTMLDivElement>(null);

  const hcOptions = useMemo(() => ({
    chart: {
      type: 'pie' as const,
      options3d: {
        enabled: true,
        alpha: 55,
        beta: 0,
      },
      backgroundColor: 'transparent',
      style: { fontFamily: 'inherit' },
      spacing: [0, 0, 0, 0],
      margin: [0, 0, 0, 0],
    },
    title: { text: '' },
    subtitle: { text: '' },
    tooltip: {
      pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>',
      style: { color: '#dbeeff' },
      backgroundColor: 'rgba(6,17,34,0.95)',
      borderColor: 'rgba(128,185,255,0.28)',
    },
    credits: { enabled: false },
    plotOptions: {
      pie: {
        allowPointSelect: true,
        cursor: 'pointer',
        depth: 15,
        size: '80%',
        borderColor: 'rgba(9,26,52,0.6)',
        borderWidth: 1.5,
        dataLabels: {
          enabled: true,
          distance: 8,
          connectorWidth: 1,
          connectorColor: 'rgba(128,185,255,0.45)',
          connectorShape: 'straight',
          softConnector: true,
          style: {
            color: '#dbeeff',
            fontSize: '10px',
            fontWeight: 400,
            textOutline: 'none',
          },
          format: '<b>{point.y}</b>',
        },
      },
    },
    series: [{
      type: 'pie' as const,
      name: '违规处理',
      data: [
        { name: '整改合格', y: rectifiedCount || 0, color: '#63F222' },
        { name: '待整改', y: pendingCount || 0, color: '#FA8C16' },
        { name: '整改不合格', y: unRectifiedCount || 0, color: '#F5222D' },
        { name: '拒不整改', y: refusedCount || 0, color: '#2563EB' },
        { name: '已作废', y: cancelledCount || 0, color: '#6B7C93', sliced: true, selected: true },
      ],
    }],
  } as Highcharts.Options), [rectifiedCount, pendingCount, unRectifiedCount, refusedCount, cancelledCount]);

  useEffect(() => {
    const el = pieRef.current;
    if (!el) return;

    if (!hcRef.current) {
      hcRef.current = Highcharts.chart(el, hcOptions);
    } else {
      hcRef.current.update(hcOptions, true, true);
    }
  }, [hcOptions]);

  useEffect(() => {
    return () => {
      if (hcRef.current) {
        hcRef.current.destroy();
        hcRef.current = null;
      }
    };
  }, []);

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
    if (rectifyCheckStatus == "整改合格") return "#63F222";
    if (rectifyCheckStatus == "待整改") return "#FA8C16";
    if (rectifyCheckStatus == "整改不合格") return "#F5222D";
    if (rectifyCheckStatus == "拒不整改") return "#2563EB";
    if (rectifyCheckStatus == "未整改") return "#FA8C16";
    if (rectifyCheckStatus == "已作废" || rectifyCheckStatus == "作废")
      return "#6B7C93";
    return "";
  };

  return (
    <aside className="flex h-full min-h-0 flex-col gap-[clamp(0.2rem,0.55vw,0.8rem)] px-0 sm:px-0 xl:gap-3" style={{ background: 'url(/img/bg-diffuse.png) center/contain no-repeat' }}>
      <section className="relative flex-none overflow-hidden" style={{ height: 260 }}>
        <PanelTitle title="查处违规汇总" />
        <div className="flex flex-col h-[212px] p-1">
          <div className="relative flex-1 min-h-0 min-w-0">
            <div ref={pieRef} className="absolute inset-0" />
            {/* 底部阴影光圈 */}
            <div className="pointer-events-none absolute bottom-[6%] left-1/2 h-[10%] w-[55%] -translate-x-1/2 rounded-[50%]"
              style={{ background: 'radial-gradient(ellipse, rgba(99,179,237,0.22) 0%, transparent 70%)' }}
            />
          </div>
          {/* 底部图例 — 横向排列 */}
          <div className="flex shrink-0 justify-center gap-4 py-1.5">
            {[
              { label: '整改合格', color: '#63F222' },
              { label: '待整改', color: '#FA8C16' },
              { label: '整改不合格', color: '#F5222D' },
              { label: '拒不整改', color: '#2563EB' },
              { label: '已作废', color: '#6B7C93' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: item.color }} />
                <span className="text-[11px] text-[#dbeeff] whitespace-nowrap">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative flex min-h-0 flex-[1.55] overflow-hidden">
        <div className="flex h-full min-h-0 w-full flex-col">
          <PanelTitle title="现场违规记录" />
          <div className="flex min-h-0 flex-1 flex-col px-[16px] py-[8px]" style={{ width: 448 }}>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden text-[14px] text-[#93aed0]">
              <div className="flex shrink-0 min-w-0 items-center gap-2 mb-1.5 py-2 text-[14px] bg-[url('/img/bg-list.png')] bg-[length:100%_100%] px-3">
                <span className="flex-[0.68] min-w-0 whitespace-normal break-words leading-tight">
                  展位号
                </span>
                <span className="flex-[0.98] min-w-0 whitespace-normal break-words leading-tight">
                  施工单位
                </span>
                <span className="flex-[1.16] min-w-0 whitespace-normal break-words leading-tight">
                  违规内容
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
                  itemHeight={42}
                  height="100%"
                  speed={0.35}
                  overscan={8}
                  pauseOnHover={true}
                  paused={detailOpen || selectedId !== null}
                  className="hide-scrollbar h-full"
                  renderItem={(row, index) => {
                    const rowId = String(row.boothNo ?? row.boothId ?? index);
                    const isSelected = selectedId === rowId;
                    return (
                    <div
                      onClick={() => handleRowClick(row)}
                      className={`flex h-full min-w-0 items-center gap-2 px-3 text-[14px] cursor-pointer border-b border-dashed border-[#334155] hover:bg-white/[0.08] ${isSelected ? 'bg-white/[0.12]' : ''}`}
                    >
                      <span
                        className="flex-[0.68] min-w-0 truncate whitespace-nowrap text-white"
                        title={row.boothNo || "-"}
                      >
                        {row.boothNo || "-"}
                      </span>

                      <span
                        className="flex-[0.98] min-w-0 truncate whitespace-nowrap text-white"
                        title={row.company || row.constructionCompany || "-"}
                      >
                        {row.company || row.constructionCompany || "-"}
                      </span>

                      <span
                        className="flex-[1.16] min-w-0 truncate whitespace-nowrap"
                        style={{
                          color:
                            rectifyCheckStatusColor(row.rectifyCheckStatus) ||
                            "#fff",
                        }}
                        title={row.recordContent || "-"}
                      >
                        {row.recordContent || "-"}
                      </span>

                      <span
                        className="flex-[1] min-w-0 truncate whitespace-nowrap"
                        style={{
                          color:
                            rectifyCheckStatusColor(row.rectifyCheckStatus) ||
                            "#fff",
                        }}
                        title={row.safetyStatus || "-"}
                      >
                        {row.safetyStatus || "-"}
                      </span>

                      <span
                        className="flex-[0.72] min-w-0 truncate whitespace-nowrap"
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
                    );
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 违规详情弹窗 */}
      <BoothModal
        visible={detailOpen}
        onClose={closeDetail}
        data={detailData}
        loading={detailLoading}
      />
    </aside>
  );
}
