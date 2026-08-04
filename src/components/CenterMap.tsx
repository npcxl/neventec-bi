import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Empty, Image, Modal, message } from "antd";
import * as echarts from "echarts";
import { screenApi } from "../api";
import XButton from "./Buttons";
import HallOverviewMap from "./HallOverviewMap";
import ConstructCarousel, {
  type ConstructCarouselPicture,
} from "./Safety/ConstructCarousel";
import { BoothModal as ConstructBoothModal } from "./Construct/modal/BoothModal";
import { BoothModal } from "./modal/BoothModal";
import { useBoothColorStrategy } from "../hooks/useBoothColorStrategy";
import { useHallOverviewMap } from "../hooks/useHallOverviewMap";
import { useHallSorter } from "../hooks/useHallSorter";
type DemoBooth = {
  booth_no: string | null;
  exhibitor: string;
  area: string | null;
  raw_texts?: string[];
  bbox: [number, number, number, number];
  center: [number, number];
  width: number;
  height: number;
  corners?: Array<[number, number]>;
};

type HallMode = string;

type BoothRow = {
  boothNo?: string;
  boothId?: string;
  exhibitor?: string;
  report?: string;
  paid?: string;
  declare?: string;
  expoid?: string;
  expoName?: string;
  hallId?: string;
  hallName?: string;
};

type BoothOrderInfo = {
  goodsName?: string;
  buyNum?: number;
  invoiceApply?: boolean;
  refundAmount?: boolean;
  boothId?: string;
};

type BoothDetail = {
  exhibitor?: string;
  contactname?: string;
  phone?: string;
  contactWay?: string;
  constructionCompany?: string;
  remarks?: string;
  fullPaidFee?: boolean;
  orderInfos?: BoothOrderInfo[];
  images?: Array<
    string | { url?: string; imageUrl?: string; picUrl?: string; src?: string }
  >;
  imageUrls?: string[];
  pictureUrls?: string[];
  pics?: string[];
  photoUrls?: string[];
  imgUrls?: string[];
  dataStr?: string;
  address?: string;
  expoid?: string;
  expoName?: string;
  hallId?: string;
  hallName?: string;
};

type SafetyDetail = {
  expoid?: string;
  expoName?: string;
  hallId?: string;
  hallName?: string;
  exhibitor?: string;
  boothNo?: string;
  boothId?: string;
  contactname?: string;
  dutyEntity?: string;
  phone?: string;
  contactWay?: string;
  constructionCompany?: string;
  excompanytype?: string;
  sendViolationEmail?: string;
  liftingPoint?: string;
  structureType?: string;
  complexEngineering?: string;
  safetyInfoList?: Array<{
    riskAssessment?: string;
    createBy?: string;
    createDate?: string;
    recordContent?: string;
    targetCheckTime?: string;
    boothNo?: string;
    safetyStatus?: string;
    boothId?: string;
    imageAddress?: Array<{ address?: string; id?: number; name?: string }>;
  }>;
};

type ConstructDetail = {
  id?: number;
  boothId?: string;
  boothNumber?: string;
  exhibitor?: string;
  exhibitsAdmission?: string;
  constructionCompany?: string;
  excompanytype?: string;
  complexEngineering?: string;
  liftingPoint?: string;
  mainStructureMaterial?: string;
  exhibitionPeriod?: string;
  area?: number;
  hallId?: string;
  exhibitionId?: string;
  recordBy?: string;
  recordDate?: string;
  content?: string;
  recordTimes?: number;
  progressStatus?: string;
  constructExampleImages?: Array<{
    address?: string;
    id?: number;
    name?: string;
  }>;
  recordImages?: Array<{ address?: string; id?: number; name?: string }>;
  constructProgressImages?: Array<{
    address?: string;
    id?: number;
    name?: string;
  }>;
  exhibitEntryImages?: Array<{ address?: string; id?: number; name?: string }>;
  lines?: Array<{
    id?: number;
    content?: string;
    configHeaderId?: number;
    configLineId?: number;
  }>;
  imageList?: string[];
};

type ConstructEnumField =
  | "exhibitsAdmission"
  | "excompanytype"
  | "complexEngineering"
  | "liftingPoint"
  | "mainStructureMaterial"
  | "progressStatus";

const CONSTRUCT_ENUM_LABELS: Record<
  ConstructEnumField,
  Record<string, string>
> = {
  exhibitsAdmission: {
    EXHIBITS_ENTERED: "展品已入场",
    EXHIBITS_NOT_ADMITTED: "展品未入场",
  },
  excompanytype: {
    "1": "标摊",
    "2": "特装",
  },
  complexEngineering: {
    NO: "无",
    PREBUILD: "复杂工艺",
    HIDDENENGINEERING: "隐藏工艺",
  },
  liftingPoint: {
    NO: "无",
    YES: "包含",
  },
  mainStructureMaterial: {
    WOODINESS: "木质",
    PROXIMATEMATTER: "型材",
    SPACERACK: "太空架",
    ORDINARYTRUSS: "普通桁架",
  },
  progressStatus: {
    NOT_ADMISSIBLE_PROGRESS: "暂未入场(空地)",
    NORMAL_PROGRESS: "搭建正常",
    SLOW_PROGRESS: "进度缓慢",
    DELAY_PROGRESS: "严重滞后",
    COMPLETED_PROGRESS: "搭建完成",
    BUILDING_MATERIALS_NOT_BUILT: "有搭建材料（未搭建）",
  },
};

function mapConstructEnum(field: ConstructEnumField, value?: string) {
  return (value && CONSTRUCT_ENUM_LABELS[field]?.[value]) || value || "";
}

function normalizeConstructPictures(imageList?: string[]) {
  return (imageList ?? []).filter(Boolean).map((address, index) => ({
    address,
    dataStr: `图片 ${index + 1}`,
  }));
}

type GalleryRow = {
  boothNum?: number;
  specialArea?: number;
  standArea?: number;
  specialAreaNum?: number;
  standardAreaNum?: number;
  hallId?: string;
  hallName?: string;
};

type SafetyCoordItem = {
  booth_no?: string | null;
  exhibitor?: string;
  area?: string | null;
  raw_texts?: string[];
  bbox?: [number, number, number, number];
  center?: [number, number];
  width?: number;
  height?: number;
  corners?: Array<[number, number]>;
};

type SafetyCoordResponse = {
  dataJson?: string;
  image_size?: { width?: number; height?: number };
  booths?: SafetyCoordItem[];
  data?: {
    dataJson?: string;
    image_size?: { width?: number; height?: number };
    booths?: SafetyCoordItem[];
  };
};

const FLOOR_FILL = "rgba(8,22,44,0.9)";
const FLOOR_STROKE = "rgba(111,181,255,0.6)";
const MAP_MARGIN = 180;
const MIN_ZOOM_VISIBLE_RATIO = 0.55;

function normalizeSafetyCoordResponse(
  response: SafetyCoordResponse | null | undefined,
) {
  const payload = response?.data ?? response;
  let parsed: any = null;
  if (payload?.dataJson) {
    try {
      parsed = JSON.parse(payload.dataJson);
    } catch {
      console.warn("[CenterMap] failed to parse safety coord dataJson, falling back to raw");
      parsed = null;
    }
  }
  const booths = (parsed?.booths ?? payload?.booths ?? []) as SafetyCoordItem[];
  const imageSize = parsed?.image_size ?? payload?.image_size;
  const imageWidth = Number(imageSize?.width);
  const imageHeight = Number(imageSize?.height);
  return {
    imageWidth: Number.isFinite(imageWidth) ? imageWidth : null,
    imageHeight: Number.isFinite(imageHeight) ? imageHeight : null,
    booths,
  };
}

function normalizeBooth(item: SafetyCoordItem): DemoBooth | null {
  const bbox = item.bbox;
  const corners = item.corners;
  const center = item.center;
  const width = Number(item.width ?? (bbox ? bbox[2] - bbox[0] : NaN));
  const height = Number(item.height ?? (bbox ? bbox[3] - bbox[1] : NaN));

  // Validate corners: >= 3 points, each with >= 2 finite coords
  const validCorners = Array.isArray(corners) && corners.length >= 3 &&
    corners.every((c) => Array.isArray(c) && c.length >= 2 && Number.isFinite(c[0]) && Number.isFinite(c[1]));

  // Validate bbox: 4 finite items, center: 2 finite items, width/height finite > 0
  const validBbox = Array.isArray(bbox) && bbox.length >= 4 &&
    bbox.every((v) => Number.isFinite(v)) &&
    Array.isArray(center) && center.length >= 2 &&
    center.every((v) => Number.isFinite(v)) &&
    Number.isFinite(width) && width > 0 &&
    Number.isFinite(height) && height > 0;

  if (!validCorners && !validBbox) return null;

  // If corners are invalid but bbox is valid, clear corners to avoid bad data in series
  const safeCorners = validCorners ? corners : undefined;

  return {
    booth_no: item.booth_no ?? null,
    exhibitor: String(item.exhibitor ?? ""),
    area: item.area ?? null,
    raw_texts: item.raw_texts,
    bbox: bbox ?? [0, 0, 0, 0],
    center: center ?? [0, 0],
    width: Number.isFinite(width) && width > 0 ? width : 0,
    height: Number.isFinite(height) && height > 0 ? height : 0,
    corners: safeCorners as any,
  };
}

function getFontSizes(width: number, height: number) {
  const safeHeight = Number.isFinite(height) ? height : 0;
  const safeWidth = Number.isFinite(width) ? width : 0;
  const sizeBase = Math.min(safeHeight * 0.28, safeWidth * 0.16);
  const nameSize = Math.max(8, Math.min(sizeBase, 22));
  const codeSize = Math.max(8, Math.min(nameSize * 0.7, 16));
  return { codeSize, nameSize };
}

function wrapExhibitorName(name: string, width: number) {
  const text = String(name || "").trim();
  if (!text) return "";

  const maxCharsPerLine = Math.max(4, Math.floor(width / 12));
  if (text.length <= maxCharsPerLine) return text;

  // 小尺寸时优先保持单行，避免文字被压成竖排
  if (width < 72) {
    return `${text.slice(0, Math.max(2, maxCharsPerLine - 1))}…`;
  }

  const secondLineLimit = Math.max(4, maxCharsPerLine - 1);
  const firstLine = text.slice(0, maxCharsPerLine);
  const remaining = text.slice(maxCharsPerLine).trim();
  const secondLine =
    remaining.length > secondLineLimit
      ? `${remaining.slice(0, secondLineLimit)}…`
      : remaining;

  return secondLine ? `${firstLine}\n${secondLine}` : firstLine;
}

// removed in favor of typed enum helpers

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
    <div className={full ? "col-span-2 min-w-0" : "min-w-0"}>
      <span className="text-[11px] text-cyan-100/60">{label || "-"}：</span>
      <span className="break-words text-[11px] text-slate-50">{value}</span>
    </div>
  );
}

const DemoChart = memo(function DemoChart({
  onSelect,
  onBoothChange,
  booths,
  imageWidth,
  imageHeight,
  moduleMode,
  getColor,
}: {
  onSelect: (item: {
    code: string;
    name: string;
    area: string;
    x: number;
    y: number;
    w: number;
    h: number;
  }) => void;
  onBoothChange?: (boothId: string, boothName?: string) => void;
  booths: DemoBooth[];
  imageWidth: number | null;
  imageHeight: number | null;
  moduleMode: string;
  getColor: (booth: DemoBooth, index: number) => string;
}) {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const chartInstance = useRef<echarts.EChartsType | null>(null);
  const activeIndexRef = useRef(0);
  const hasAppliedDefaultZoomRef = useRef(false);
  const onSelectRef = useRef(onSelect);
  const onBoothChangeRef = useRef(onBoothChange);
  const getColorRef = useRef(getColor);
  const pointsRef = useRef<any[]>([]);
  const zoomLevelRef = useRef(1);
  onSelectRef.current = onSelect;
  onBoothChangeRef.current = onBoothChange;
  getColorRef.current = getColor;
  const points = useMemo(
    () =>
      booths.map((b, index) => ({
        value: [b.center[0], b.center[1], b.width, b.height],
        code: String(b.raw_texts?.[0] || b.booth_no || ""),
        name: String(b.raw_texts?.[1] || b.exhibitor || ""),
        area: String(b.area || ""),
        color: getColor(b, index),
        corners: b.corners,
      })),
    [booths, getColor],
  );
  pointsRef.current = points;

  useEffect(() => {
    if (!chartRef.current) return;
    const chart =
      echarts.getInstanceByDom(chartRef.current) ??
      echarts.init(chartRef.current, undefined, { renderer: "canvas" });
    chartInstance.current = chart;
    let disposed = false;
    let resizeObserver: ResizeObserver | null = null;
    let dataZoomRafId: number | null = null;
    let resizeRafId: number | null = null;
    let pendingDataZoom: (() => void) | null = null;
    const prevDataIndexRef = { current: -1 };
    const prevZoomLevelRef = { current: 1 };
    const prevResizeDimsRef = { width: 0, height: 0 };

    // --- Optimized hover: only downplay previous, highlight new ---
    const focusPoint = (index: number) => {
      const currentPoints = pointsRef.current;
      if (!currentPoints.length || disposed || chart.isDisposed()) return;
      const nextIndex =
        ((index % currentPoints.length) + currentPoints.length) % currentPoints.length;
      if (prevDataIndexRef.current === nextIndex) return; // same booth, skip
      // Downplay only the previous highlighted item
      if (prevDataIndexRef.current >= 0) {
        chart.dispatchAction({ type: "downplay", seriesIndex: 0, dataIndex: prevDataIndexRef.current });
      }
      chart.dispatchAction({ type: "highlight", seriesIndex: 0, dataIndex: nextIndex });
      prevDataIndexRef.current = nextIndex;
      activeIndexRef.current = nextIndex;
    };

    // --- mouseout: only downplay current highlighted item ---
    const handleMouseOut = () => {
      if (prevDataIndexRef.current >= 0 && !disposed && !chart.isDisposed()) {
        chart.dispatchAction({ type: "downplay", seriesIndex: 0, dataIndex: prevDataIndexRef.current });
        prevDataIndexRef.current = -1;
      }
    };

    if (!pointsRef.current.length) {
      chart.clear();
      chart.setOption({ backgroundColor: "transparent" }, true);
      return () => {
        disposed = true;
        resizeObserver?.disconnect();
        chart.off("click");
        chart.off("mouseover");
        chart.off("mouseout");
        if (dataZoomRafId !== null) cancelAnimationFrame(dataZoomRafId);
        if (resizeRafId !== null) cancelAnimationFrame(resizeRafId);
      };
    }

    const baseWidth = Number.isFinite(imageWidth) ? imageWidth : 1;
    const baseHeight = Number.isFinite(imageHeight) ? imageHeight : 1;
    const containerWidth = chartRef.current.clientWidth || 1;
    const containerHeight = chartRef.current.clientHeight || 1;
    const baseRatio = baseWidth / baseHeight;
    const containerRatio = containerWidth / containerHeight;
    let gridWidth = containerWidth;
    let gridHeight = containerHeight;
    let gridLeft = 0;
    let gridTop = 0;
    if (containerRatio > baseRatio) {
      gridHeight = containerHeight;
      gridWidth = gridHeight * baseRatio;
      gridLeft = (containerWidth - gridWidth) / 2;
    } else {
      gridWidth = containerWidth;
      gridHeight = gridWidth / baseRatio;
      gridTop = (containerHeight - gridHeight) / 2;
    }
    const gridRight = containerWidth - gridLeft - gridWidth;
    const gridBottom = containerHeight - gridTop - gridHeight;
    const coverScale = Math.max(
      containerWidth / baseWidth,
      containerHeight / baseHeight,
    );
    const visibleRatio = Math.max(
      MIN_ZOOM_VISIBLE_RATIO,
      Math.min(1, 1 / Math.max(coverScale, 1)) * 0.25,
    );
    const zoomStart = Math.max(0, ((1 - visibleRatio) / 2) * 100);
    const zoomEnd = Math.min(100, zoomStart + visibleRatio * 100);

    chart.setOption(
      {
        animation: false,
        backgroundColor: "transparent",
        grid: {
          left: gridLeft,
          right: gridRight,
          top: gridTop,
          bottom: gridBottom,
          containLabel: false,
        },
        xAxis: {
          min: 0,
          max: baseWidth,
          show: false,
          type: "value",
          splitLine: { show: false },
          axisLine: { show: false },
          axisTick: { show: false },
        },
        yAxis: {
          min: 0,
          max: baseHeight,
          show: false,
          inverse: true,
          type: "value",
          splitLine: { show: false },
          axisLine: { show: false },
          axisTick: { show: false },
        },
        dataZoom: [
          {
            type: "inside",
            xAxisIndex: 0,
            filterMode: "none",
            zoomOnMouseWheel: true,
            moveOnMouseMove: true,
            preventDefaultMouseMove: true,
            start: zoomStart,
            end: zoomEnd,
          },
          {
            type: "inside",
            yAxisIndex: 0,
            filterMode: "none",
            zoomOnMouseWheel: true,
            moveOnMouseMove: true,
            preventDefaultMouseMove: true,
            start: zoomStart,
            end: zoomEnd,
          },
        ],
        tooltip: {
          trigger: "item",
          backgroundColor: "rgba(7,18,34,0.96)",
          borderColor: "transparent",
          textStyle: { color: "#eaf6ff" },
          formatter: (p: any) => {
            const d = p?.data;
            const v = d?.value;
            if (!v) return "";
            return [
              `<b>${d?.code || "未编号"}</b>`,
              `展商：${d?.name || ""}`,
              `坐标：(${Math.round(v[0])}, ${Math.round(v[1])})`,
              `尺寸：${Math.round(v[2])} × ${Math.round(v[3])}`,
              d?.area ? `面积：${d.area}` : "",
            ]
              .filter(Boolean)
              .join("<br/>");
          },
        },
        series: [
          {
            type: "custom",
            coordinateSystem: "cartesian2d",
            cursor: "pointer",
            data: [],
            renderItem: (params: any, api: any) => {
              const currentItem = pointsRef.current[params.dataIndex];
              const code = String(currentItem?.code || "");
              const name = String(currentItem?.name || "");
              const color = String(currentItem?.color || "rgba(74, 163, 255, 0.28)");
              const corners = currentItem?.corners;

              const polygonPoints =
                Array.isArray(corners) && corners.length >= 3
                  ? corners
                      .map((corner) => api.coord([Number(corner[0]), Number(corner[1])]))
                      .filter((point: number[]) =>
                        point.every((value) => Number.isFinite(value)),
                      )
                  : [];

              const hasPolygon = polygonPoints.length >= 3;
              const bboxBox = hasPolygon
                ? null
                : (() => {
                    const x = Number(api.value(0));
                    const y = Number(api.value(1));
                    const w = Number(api.value(2));
                    const h = Number(api.value(3));
                    if (![x, y, w, h].every(Number.isFinite)) return null;
                    const p1 = api.coord([x - w / 2, y - h / 2]);
                    const p2 = api.coord([x + w / 2, y + h / 2]);
                    if (![p1[0], p1[1], p2[0], p2[1]].every(Number.isFinite))
                      return null;
                    const width = p2[0] - p1[0];
                    const height = p2[1] - p1[1];
                    const x0 = p1[0];
                    const y0 = p1[1];
                    if (![x0, y0, width, height].every(Number.isFinite)) return null;
                    return { x0, y0, width, height };
                  })();

              const x0 = hasPolygon ? Math.min(...polygonPoints.map((p) => p[0])) : bboxBox?.x0 ?? 0;
              const y0 = hasPolygon ? Math.min(...polygonPoints.map((p) => p[1])) : bboxBox?.y0 ?? 0;
              const width = hasPolygon
                ? Math.max(...polygonPoints.map((p) => p[0])) - x0
                : bboxBox?.width ?? 0;
              const height = hasPolygon
                ? Math.max(...polygonPoints.map((p) => p[1])) - y0
                : bboxBox?.height ?? 0;
              if (![x0, y0, width, height].every(Number.isFinite))
                return { type: "group", children: [] };

              const { codeSize, nameSize } = getFontSizes(width, height);
              const zoomLevel = zoomLevelRef.current;
              const isTinyZoom = zoomLevel >= MIN_ZOOM_VISIBLE_RATIO;
              const shouldShowName = width > 16 && height > 12;
              const shouldShowCode = width > 40 && height > 22;
              const shouldWrapText = width > 92 && height > 34 && !isTinyZoom;
              const nameText = shouldWrapText
                ? wrapExhibitorName(name, width - 8)
                : name;
              const nameOverflow = isTinyZoom ? "truncate" : "break";
              const codeBadgeWidth = Math.max(22, Math.min(width * 0.46, 48));
              const codeBadgeHeight = Math.max(12, Math.min(height * 0.22, 18));
              const codeBadgePadding = 3;
              const children: any[] = [];

              if (hasPolygon) {
                children.push({
                  type: "polygon",
                  shape: { points: polygonPoints },
                  style: {
                    fill: color,
                  },
                });
              } else {
                children.push(
                  {
                    type: "rect",
                    shape: { x: x0, y: y0, width, height },
                    style: {
                      fill: color,
                    },
                  },
                );
              }
              if (shouldShowName) {
                children.push({
                  type: "text",
                  style: {
                    x: x0 + width / 2,
                    y: y0 + height / 2,
                    text: nameText,
                    fill: "#f2f8ff",
                    font: `700 ${nameSize}px sans-serif`,
                    textAlign: "center",
                    textVerticalAlign: "middle",
                    width: Math.max(0, width - 16),
                    height: Math.max(0, height - 16),
                    lineHeight: Math.max(12, Math.round(nameSize * 1.18)),
                    overflow: nameOverflow,
                  },
                });
              }
              if (shouldShowCode && !isTinyZoom) {
                children.push({
                  type: "rect",
                  shape: {
                    x: x0 + width - codeBadgeWidth - codeBadgePadding,
                    y: y0 + codeBadgePadding,
                    width: codeBadgeWidth,
                    height: codeBadgeHeight,
                  },
                  style: {
                    fill: "rgba(8, 22, 44, 0.72)",
                    r: 4,
                  },
                });
                children.push({
                  type: "text",
                  style: {
                    x: x0 + width - codeBadgePadding - codeBadgeWidth / 2,
                    y: y0 + codeBadgePadding + codeBadgeHeight / 2,
                    text: code,
                    fill: "#d6ebff",
                    font: `${codeSize}px sans-serif`,
                    textAlign: "center",
                    textVerticalAlign: "middle",
                    width: Math.max(0, codeBadgeWidth - 6),
                    height: codeBadgeHeight,
                    overflow: "truncate",
                    ellipsis: "...",
                  },
                });
              }
              return { type: "group", children };
            },
          },
        ],
        graphic: [],
      },
      true,
    );

    const handleChartClick = (params: any) => {
      if (params.componentType === "series" && params.seriesType === "custom") {
        const currentPoints = pointsRef.current;
        const clickedIndex = params.dataIndex;
        const clickedBooth = currentPoints[clickedIndex];
        if (!clickedBooth) return;
        onSelectRef.current({
          code: clickedBooth.code,
          name: clickedBooth.name,
          area: clickedBooth.area,
          x: clickedBooth.value[0],
          y: clickedBooth.value[1],
          w: clickedBooth.value[2],
          h: clickedBooth.value[3],
        });
        onBoothChangeRef.current?.(clickedBooth.code, clickedBooth.name);
      }
    };

    // --- Optimized datazoom: rAF-merged, no getOption/refreshImmediately ---
    const TEXT_LEVEL_THRESHOLD = MIN_ZOOM_VISIBLE_RATIO;
    const handleDataZoom = (params: any) => {
      // Compatible: batch[0] or direct params
      const zoom = params?.batch?.[0] ?? params;
      if (typeof zoom?.start !== "number" || typeof zoom?.end !== "number") return;
      const newLevel = Math.max(0.01, (zoom.end - zoom.start) / 100);
      zoomLevelRef.current = newLevel;

      // Only update series when crossing text visibility threshold
      const wasShowingText = prevZoomLevelRef.current >= TEXT_LEVEL_THRESHOLD;
      const isShowingText = newLevel >= TEXT_LEVEL_THRESHOLD;
      if (wasShowingText !== isShowingText) {
        prevZoomLevelRef.current = newLevel;
        pendingDataZoom = () => {
          if (disposed || chart.isDisposed()) return;
          chart.setOption({ series: [{ data: pointsRef.current }] }, false, true);
        };
        if (dataZoomRafId === null) {
          dataZoomRafId = requestAnimationFrame(() => {
            dataZoomRafId = null;
            const fn = pendingDataZoom;
            pendingDataZoom = null;
            fn?.();
          });
        }
      }
    };

    const handleMouseOver = (params: any) => {
      if (params.componentType !== "series" || params.seriesType !== "custom")
        return;
      const hoveredIndex = params.dataIndex;
      if (typeof hoveredIndex === "number") {
        focusPoint(hoveredIndex);
      }
    };

    chart.off("click");
    chart.off("mouseover");
    chart.off("mouseout");
    chart.off("datazoom");
    chart.on("click", handleChartClick);
    chart.on("mouseover", handleMouseOver);
    chart.on("mouseout", handleMouseOut);
    chart.on("datazoom", handleDataZoom);

    // --- Optimized ResizeObserver: separate rAF, skip no-change ---
    prevResizeDimsRef.width = chartRef.current.clientWidth || 0;
    prevResizeDimsRef.height = chartRef.current.clientHeight || 0;
    resizeObserver = new ResizeObserver(() => {
      if (disposed || chart.isDisposed()) return;
      const w = chartRef.current?.clientWidth || 0;
      const h = chartRef.current?.clientHeight || 0;
      if (w <= 0 || h <= 0) return; // guard: skip when container has no size
      if (w === prevResizeDimsRef.width && h === prevResizeDimsRef.height) return;
      prevResizeDimsRef.width = w;
      prevResizeDimsRef.height = h;
      if (resizeRafId === null) {
        resizeRafId = requestAnimationFrame(() => {
          resizeRafId = null;
          if (!disposed && !chart.isDisposed()) chart.resize();
        });
      }
    });
    resizeObserver.observe(chartRef.current);

    return () => {
      disposed = true;
      if (dataZoomRafId !== null) {
        cancelAnimationFrame(dataZoomRafId);
        dataZoomRafId = null;
      }
      if (resizeRafId !== null) {
        cancelAnimationFrame(resizeRafId);
        resizeRafId = null;
      }
      resizeObserver?.disconnect();
      chart.off("click", handleChartClick);
      chart.off("mouseover", handleMouseOver);
      chart.off("mouseout", handleMouseOut);
      chart.off("datazoom", handleDataZoom);
      if (!chart.isDisposed()) chart.dispose();
    };
  }, [imageWidth, imageHeight]);

  useEffect(() => {
    const chart = chartInstance.current;
    if (!chart || chart.isDisposed()) return;
    chart.setOption(
      {
        series: [
          {
            data: pointsRef.current,
          },
        ],
      },
      false,
      true,
    );
  }, [points]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div ref={chartRef} className="absolute inset-0" />
    </div>
  );
});

export default function CenterMap({
  mode = "all",
  moduleMode = "ExhibitionOverview",
  onModeChange,
  onBoothChange,
  initData,
  boothRows = [],
  safetyRows = [],
  constructProcessRows = [],
  galleryRows = [],
  compact = false,
  fillAvailableHeight = false,
}: {
  mode?: HallMode;
  moduleMode?: "ExhibitionOverview" | "ConstructOverview" | "SafetyOverview";
  onModeChange?: (mode: HallMode) => void;
  onBoothChange?: (boothId: string, boothName?: string) => void;
  initData?: {
    exhibitionId: string;
    halls: Array<{ hallId: string; hallName: string }>;
  };
  boothRows?: BoothRow[];
  safetyRows?: Array<{
    boothId?: string;
    boothNo?: string;
    rectifyCheckStatus?: string;
    safetyStatus?: string;
    riskAssessment?: string;
  }>;
  constructProcessRows?: Array<{
    boothId?: string;
    boothNo?: string;
    progressValue?: string;
  }>;
  galleryRows?: GalleryRow[];
  compact?: boolean;
  fillAvailableHeight?: boolean;
}) {
  const [selected, setSelected] = useState<{
    code: string;
    name: string;
    area: string;
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const [boothDetail, setBoothDetail] = useState<BoothDetail | null>(null);
  const [safetyDetail, setSafetyDetail] = useState<SafetyDetail | null>(null);
  const [constructDetail, setConstructDetail] =
    useState<ConstructDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [imageWidth, setImageWidth] = useState(3640);
  const [imageHeight, setImageHeight] = useState(7070);
  const [booths, setBooths] = useState<DemoBooth[]>([]);
  const [orderInfos, setOrderInfos] = useState<BoothOrderInfo[]>([]);
  const [constructLoading, setConstructLoading] = useState(false);
  const safetyCoordCacheRef = useRef<
    Record<
      string,
      {
        imageWidth: number | null;
        imageHeight: number | null;
        booths: DemoBooth[];
      }
    >
  >({});
  const safetyInfoList = useMemo(
    () => safetyDetail?.safetyInfoList ?? [],
    [safetyDetail],
  );
  const safetyViolationCount = safetyInfoList.length;
  const constructImages = useMemo(
    () => normalizeConstructPictures(constructDetail?.imageList),
    [constructDetail?.imageList],
  );
  const constructTimelineItems = useMemo(
    () => constructDetail?.lines ?? [],
    [constructDetail],
  );
  const safetyCarouselPictures = useMemo(
    () =>
      safetyDetail?.safetyInfoList
        ?.flatMap((info) =>
          (info.imageAddress ?? []).map((img) => ({
            address: img.address || "",
            dataStr: img.name || info.createDate || "",
            hallId: safetyDetail?.hallId,
            hallName: safetyDetail?.hallName,
          })),
        )
        .filter(
          (
            item,
          ): item is {
            address: string;
            dataStr: string;
            hallId?: string;
            hallName?: string;
          } => Boolean(item.address),
        ) ?? [],
    [safetyDetail],
  );
  const halls = useHallSorter(initData?.halls ?? []);
  const hallOverview = useHallOverviewMap(halls, galleryRows);
  const tabsScrollRef = useRef<HTMLDivElement | null>(null);
  const tabButtonRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const progressRows = useMemo(
    () => constructProcessRows,
    [constructProcessRows],
  );
  const safetyColorRows = useMemo(
    () =>
      safetyRows.map((row) => ({
        boothId: row.boothId,
        boothNo: row.boothNo,
        rectifyCheckStatus: row.rectifyCheckStatus,
        safetyStatus: row.safetyStatus,
        riskAssessment: row.riskAssessment,
      })),
    [safetyRows],
  );
  const { getColor } = useBoothColorStrategy({
    moduleMode,
    boothRows,
    safetyRows: safetyColorRows,
    progressRows,
  });
  useEffect(() => {
    setSelected(null);
    setBoothDetail(null);
    setSafetyDetail(null);
    setDetailOpen(false);
  }, [mode, compact, moduleMode]);

  useEffect(() => {
    const fetchSafetyCoord = async () => {
      if (mode === "all") {
        setBooths([]);
        return;
      }

      const hallId = mode;
      if (!hallId) {
        setBooths([]);
        return;
      }

      const cached = safetyCoordCacheRef.current[hallId];
      if (cached) {
        setImageWidth(cached.imageWidth);
        setImageHeight(cached.imageHeight);
        setBooths(cached.booths);
        return;
      }

      try {
        const response = await screenApi.getSafetyCoordByHallId(hallId);
        const normalized = normalizeSafetyCoordResponse(
          response as SafetyCoordResponse,
        );
        const nextBooths = normalized.booths
          .map(normalizeBooth)
          .filter(Boolean) as DemoBooth[];
        safetyCoordCacheRef.current[hallId] = {
          imageWidth: normalized.imageWidth,
          imageHeight: normalized.imageHeight,
          booths: nextBooths,
        };
        setImageWidth(normalized.imageWidth);
        setImageHeight(normalized.imageHeight);
        setBooths(nextBooths);
        //console.log('[CenterMap] safetyCoordCacheRef', JSON.stringify(safetyCoordCacheRef.current, null, 2));
      } catch (error) {
        console.error("获取安全坐标失败", error);
        setBooths([]);
        const details = error instanceof Error ? error.message : "未知错误";
        message.error(`安全坐标加载失败：${details}`);
      }
    };

    void fetchSafetyCoord();
  }, [mode]);

  const detailRequestSeqRef = useRef(0);
  const handleSelect = useCallback(
    async (item: {
      code: string;
      name: string;
      area: string;
      x: number;
      y: number;
      w: number;
      h: number;
    }) => {
      setSelected(item);
      const boothId = item.code?.trim();
      const exhibitionId = initData?.exhibitionId?.trim();
      if (!boothId || !exhibitionId) {
        setBoothDetail(null);
        setDetailOpen(true);
        message.warning("当前没有可查询的展会或展位编号");
        return;
      }

      const requestSeq = ++detailRequestSeqRef.current;
      setDetailLoading(true);
      setBoothDetail(null);
      setOrderInfos([]);
      const loadingKey = "booth-detail-loading";
      message.loading({
        content: "正在拉取接口返回...",
        key: loadingKey,
        duration: 0,
      });
      try {
        const response =
          moduleMode === "SafetyOverview"
            ? await screenApi.getSafetyScreenBooth(
                exhibitionId,
                mode === "all" ? "" : mode,
                boothId,
              )
            : moduleMode === "ConstructOverview"
              ? await screenApi.getConstructProcessByHallInfo(
                  exhibitionId,
                  mode === "all" ? "" : mode,
                  boothId,
                )
              : await screenApi.getBoothScreenDetail(exhibitionId, boothId);
        if (requestSeq !== detailRequestSeqRef.current) return;
        const rawData = response as any;
        let item;
        if (moduleMode === "ConstructOverview") {
          item = Array.isArray(rawData)
            ? rawData[0]
            : (rawData?.data?.[0] ?? rawData?.data ?? rawData);
        
        } else {
          const safetyPayload = rawData?.data;
          item = Array.isArray(safetyPayload)
            ? safetyPayload[0]
            : (safetyPayload?.[0] ?? safetyPayload ?? rawData);
          console.log("[safety detail]", item, rawData);
        }

        setDetailOpen(true);
        if (moduleMode === "SafetyOverview") {
          setSafetyDetail(item as SafetyDetail);
          setConstructDetail(null);
          setBoothDetail(null);
          setOrderInfos([]);
        } else if (moduleMode === "ConstructOverview") {
          const constructItem = item as ConstructDetail;
          console.log("[ConstructOverview detail item]", constructItem);
          setConstructDetail(constructItem);
          setBoothDetail(null);
          setSafetyDetail(null);
          setOrderInfos([]);
        } else {
          const boothItem = item as BoothDetail;
          setBoothDetail(boothItem);
          setSafetyDetail(null);
          setConstructDetail(null);
          setOrderInfos((boothItem?.orderInfos ?? []) as BoothOrderInfo[]);
        }
        message.success({
          content: "接口返回已打印到控制台",
          key: loadingKey,
          duration: 1.2,
        });
      } catch (error) {
        if (requestSeq !== detailRequestSeqRef.current) return;
        console.error("获取接口返回失败", error);
        setBoothDetail(null);
        setSafetyDetail(null);
        setConstructDetail(null);
        setOrderInfos([]);
        message.error({
          content: "接口加载失败，请稍后重试",
          key: loadingKey,
          duration: 2,
        });
      } finally {
        if (requestSeq === detailRequestSeqRef.current) {
          setDetailLoading(false);
          message.destroy(loadingKey);
        }
      }
    },
    [initData?.exhibitionId, moduleMode, mode],
  );

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const fetchSafetyDetail = async () => {
      const boothNo = selected?.code?.trim();
      const exhibitionId = initData?.exhibitionId?.trim();
      const hallId = mode === "all" ? "" : mode;

      try {
        if (moduleMode !== "SafetyOverview") {
          setSafetyDetail(null);
          return;
        }

        if (!boothNo || !exhibitionId || !hallId) {
          setSafetyDetail(null);
          return;
        }

        const response = await screenApi.getSafetyScreenBooth(
          exhibitionId,
          hallId,
          boothNo,
          controller.signal,
        );
        if (cancelled || controller.signal.aborted) return;
        const rawData = response as any;
        const payload = rawData?.data;
        const item = Array.isArray(payload)
          ? payload[0]
          : (payload?.[0] ?? payload ?? rawData);
        if (
          !item ||
          (typeof item === "object" &&
            !Array.isArray(item) &&
            !Object.keys(item).length)
        ) {
          setSafetyDetail(null);
          return;
        }
        setSafetyDetail(item as SafetyDetail);
      } catch (error) {
        if (cancelled || controller.signal.aborted) return;
        console.error("获取现场安全详情失败", error);
        setSafetyDetail(null);
      }
    };

    void fetchSafetyDetail();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [initData?.exhibitionId, moduleMode, mode, selected?.code]);

  useEffect(() => {
    if (!compact) return;
    setSelected(null);
    setBoothDetail(null);
    setOrderInfos([]);
    setDetailOpen(false);
  }, [compact, mode, moduleMode]);

  useEffect(() => {
    const activeTab = mode === "all" ? "all" : mode;
    const activeButton = tabButtonRefs.current[activeTab];
    const scrollContainer = tabsScrollRef.current;
    if (!activeButton || !scrollContainer) return;

    const containerRect = scrollContainer.getBoundingClientRect();
    const buttonRect = activeButton.getBoundingClientRect();
    const delta =
      buttonRect.left -
      containerRect.left -
      containerRect.width / 2 +
      buttonRect.width / 2;

    scrollContainer.scrollBy({ left: delta, behavior: "smooth" });
  }, [mode]);

  return (
    <section
      className={
        fillAvailableHeight
          ? "relative flex h-full min-h-0 w-full min-w-0 overflow-hidden rounded-3xl"
          : compact
            ? "relative flex w-full min-h-[22rem] flex-1 min-w-0 rounded-3xl"
            : "relative flex w-full min-h-[clamp(32rem,72vh,52rem)] flex-1 min-w-0 rounded-3xl"
      }
    >
      <div className="relative z-10 flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-[22px] bg-[#081120]">
        <div className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[20px] bg-[rgba(10,25,47,0.72)]">
          <div className="relative z-20 mb-3 flex shrink-0 flex-col items-center px-4 py-3 text-sm text-[#cfe5ff]">
            <div className="relative min-w-0 w-full">
              <div
                ref={tabsScrollRef}
                className="flex min-w-0 flex-nowrap gap-2 overflow-x-auto pb-1"
                style={{ scrollbarWidth: 'none' }}
              >
                <div
                  ref={(node) => {
                    tabButtonRefs.current.all = node;
                  }}
                >
                  <XButton
                    mode="all"
                    active={mode === "all"}
                    onModeChange={onModeChange}
                  />
                </div>
                {halls.map((hall) => (
                  <div
                    key={hall.hallId}
                    ref={(node) => {
                      tabButtonRefs.current[hall.hallId] = node;
                    }}
                  >
                    <XButton
                      mode={hall.hallId}
                      active={mode === hall.hallId}
                      onModeChange={onModeChange}
                    >
                      {hall.hallName}
                    </XButton>
                  </div>
                ))}
              </div>
              <img
                src="/img/左侧滚动显示.svg"
                alt=""
                className="absolute left-0 top-1/2 -translate-y-1/2 h-6 pointer-events-none z-10"
                ref={(node) => {
                  if (node && tabsScrollRef.current) {
                    const container = tabsScrollRef.current;
                    const update = () => {
                      node.style.opacity = container.scrollLeft > 5 ? '1' : '0';
                    };
                    update();
                    container.addEventListener('scroll', update);
                    return () => container.removeEventListener('scroll', update);
                  }
                }}
              />
            </div>
            <img
              src="/img/展馆按钮底部线条.png"
              alt=""
              className="w-full h-auto mt-1"
            />
          </div>

          <div className="map-card-frame relative min-h-0 flex-1 overflow-hidden">
            <div className="map-card-bg" />
            <div className="map-card-blob" />
            <div className="absolute inset-0 z-10 min-h-0 min-w-0 overflow-hidden">
              {mode === "all" ? (
                <HallOverviewMap
                  halls={hallOverview}
                  activeHallId={mode}
                  onHallSelect={onModeChange}
                />
              ) : booths.length ? (
                <DemoChart
                  onSelect={handleSelect}
                  onBoothChange={onBoothChange}
                  booths={booths}
                  imageWidth={imageWidth}
                  imageHeight={imageHeight}
                  moduleMode={moduleMode}
                  getColor={getColor}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                      <span className="text-slate-200/75">暂无展位数据</span>
                    }
                  />
                </div>
              )}
            </div>
          </div>

          {moduleMode === "ConstructOverview" ? (
            <ConstructBoothModal
              visible={detailOpen}
              onClose={() => setDetailOpen(false)}
              data={constructDetail ?? {}}
            />
          ) : moduleMode === "ExhibitionOverview" ? (
            <BoothModal
              visible={detailOpen}
              onClose={() => setDetailOpen(false)}
              data={{
                expoName: boothDetail?.expoName,
                hallName: boothDetail?.hallName,
                exhibitor: boothDetail?.exhibitor,
                contactname: boothDetail?.contactname,
                phone: boothDetail?.phone,
                contactWay: boothDetail?.contactWay,
                constructionCompany: boothDetail?.constructionCompany,
                remarks: boothDetail?.remarks,
                fullPaidFee: boothDetail?.fullPaidFee,
                orderInfos: orderInfos as any,
              }}
            />
          ) : (
            <Modal
              open={detailOpen}
              onCancel={() => setDetailOpen(false)}
              footer={null}
              centered
              width={760}
              destroyOnHidden
              getContainer={false}
              title={null}
              closeIcon={null}
              styles={{
                mask: {
                  backgroundColor: "rgba(0, 0, 0, 0.65)",
                },
                container: {
                  padding: 0,
                  background: "#0f213a",
                  border: "none",
                  borderRadius: "8px",
                  overflow: "hidden",
                  width: "760px",
                  maxWidth: "90vw",
                  maxHeight: "76vh",
                  height: "auto",
                },
              }}
            >
              <div
                style={{
                  color: "#f1f5f9",
                  padding: "16px 18px 12px",
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  height: "auto",
                  minHeight: 0,
                  maxHeight: "76vh",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingBottom: "10px",
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: "12px" }}
                  >
                    <div>
                      <div
                        style={{
                          marginTop: "4px",
                          fontSize: "12px",
                          color: "rgba(165, 243, 252, 0.6)",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <span
                          style={{
                            background: "rgba(0, 229, 255, 0.1)",
                            border: "none",
                            padding: "1px 6px",
                            borderRadius: "3px",
                            color: "#cffafe",
                          }}
                        >
                          {selected?.code || "未分配"}
                        </span>
                        <span>·</span>
                        <span>{selected?.name || "未知展位"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className="map-overview-scrollbar"
                  style={{
                    marginTop: "10px",
                    display: "flex",
                    minHeight: 0,
                    flexDirection: "column",
                    gap: "10px",
                    overflowY: "auto",
                    paddingRight: "4px",
                    maxHeight: "calc(76vh - 90px)",
                  }}
                >
                  <div
                    style={{
                      position: "sticky",
                      top: 0,
                      zIndex: 1,
                      padding: "10px 12px",
                      borderRadius: "8px",
                      background: "rgba(10, 21, 38, 0.96)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "10px",
                        marginBottom: "8px",
                        fontSize: "13px",
                        fontWeight: 600,
                        color: "#cffafe",
                      }}
                    >
                      {moduleMode === "SafetyOverview" ? (
                        <span
                          style={{
                            border: "1px solid rgba(56,189,248,0.3)",
                            background: "rgba(56,189,248,0.1)",
                            color: "#9fe2ff",
                            borderRadius: "999px",
                            padding: "2px 8px",
                            fontSize: "11px",
                            fontWeight: 500,
                          }}
                        >
                          共 {safetyViolationCount} 条违规
                        </span>
                      ) : null}
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                        gap: "5px 8px",
                        fontSize: "12px",
                      }}
                    >
                      {moduleMode === "SafetyOverview" ? (
                        <>
                          <DetailItem
                            label="施工单位"
                            value={safetyDetail?.constructionCompany || "-"}
                          />
                          <DetailItem
                            label="参展商"
                            value={safetyDetail?.exhibitor || "-"}
                          />
                          <DetailItem
                            label="展位号"
                            value={safetyDetail?.boothNo || selected?.code || "-"}
                          />
                          <DetailItem
                            label="展馆"
                            value={safetyDetail?.hallName || "-"}
                          />
                          <DetailItem
                            label="责任主体"
                            value={safetyDetail?.dutyEntity || "-"}
                          />
                          <DetailItem
                            label="联系方式"
                            value={safetyDetail?.contactWay || "-"}
                          />
                          <div className="col-span-2 flex flex-wrap gap-1.5">
                            <span className="inline-flex items-center rounded-sm bg-[#34d399]/12 px-2 py-0.5 text-[11px] text-[#7cf0c6]">
                              {safetyDetail?.excompanytype || "展位类型"}
                            </span>
                            <span className="inline-flex items-center rounded-sm bg-[#4ade80]/12 px-2 py-0.5 text-[11px] text-[#86efac]">
                              {safetyDetail?.structureType || "结构类型"}
                            </span>
                            <span className="inline-flex items-center rounded-sm bg-[#facc15]/12 px-2 py-0.5 text-[11px] text-[#fde68a]">
                              {safetyDetail?.complexEngineering || "复杂工程"}
                            </span>
                          </div>
                        </>
                      ) : null}
                    </div>
                  </div>

                  {moduleMode === "SafetyOverview" ? (
                    <div
                      style={{
                        padding: "10px 12px",
                        borderRadius: "8px",
                        background: "rgba(8, 22, 44, 0.55)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "10px",
                          marginBottom: "8px",
                          fontSize: "13px",
                          fontWeight: 600,
                          color: "#cffafe",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            minWidth: 0,
                          }}
                        >
                          <div
                            style={{
                              height: "10px",
                              width: "3px",
                              borderRadius: "2px",
                              backgroundColor: "#38bdf8",
                              flexShrink: 0,
                            }}
                          />
                          <span>现场安全管理</span>
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                        }}
                      >
                        {safetyInfoList.length ? (
                          safetyInfoList.map((info, index) => (
                            <div
                              key={`${info.boothId || info.boothNo || "safety"}-${info.createDate || index}`}
                              style={{
                                borderRadius: "8px",
                                border: "none",
                                background: "rgba(255,255,255,0.03)",
                                padding: "9px 10px",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  gap: "8px",
                                  minWidth: 0,
                                  alignItems: "stretch",
                                }}
                              >
                                <div style={{ width: "112px", flex: "0 0 auto" }}>
                                  {info.imageAddress?.[0]?.address ? (
                                    <img
                                      src={info.imageAddress[0].address}
                                      alt="现场安全图片"
                                      style={{
                                        width: "112px",
                                        height: "96px",
                                        objectFit: "cover",
                                        borderRadius: "6px",
                                        border: "none",
                                      }}
                                    />
                                  ) : (
                                    <div
                                      style={{
                                        width: "112px",
                                        height: "96px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        borderRadius: "6px",
                                        border:
                                          "1px dashed rgba(255,255,255,0.14)",
                                        color: "#94a3b8",
                                        fontSize: "11px",
                                      }}
                                    >
                                      暂无图片
                                    </div>
                                  )}
                                </div>
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <div
                                    style={{
                                      display: "flex",
                                      flexWrap: "wrap",
                                      gap: "4px",
                                      marginBottom: "6px",
                                      fontSize: "10px",
                                    }}
                                  >
                                    <span
                                      style={{
                                        border: "1px solid rgba(56,189,248,0.28)",
                                        background: "rgba(56,189,248,0.1)",
                                        color: "#9fe2ff",
                                        borderRadius: "4px",
                                        padding: "1px 5px",
                                      }}
                                    >
                                      {info.createDate || "-"}
                                    </span>
                                    <span
                                      style={{
                                        border: "1px solid rgba(250,204,21,0.28)",
                                        background: "rgba(250,204,21,0.1)",
                                        color: "#fde68a",
                                        borderRadius: "4px",
                                        padding: "1px 5px",
                                      }}
                                    >
                                      {info.riskAssessment || "-"}
                                    </span>
                                    <span
                                      style={{
                                        border: "1px solid rgba(52,211,153,0.28)",
                                        background: "rgba(52,211,153,0.1)",
                                        color: "#7cf0c6",
                                        borderRadius: "4px",
                                        padding: "1px 5px",
                                      }}
                                    >
                                      {info.safetyStatus || "-"}
                                    </span>
                                  </div>
                                  <div
                                    style={{
                                      display: "grid",
                                      gridTemplateColumns:
                                        "repeat(2, minmax(0, 1fr))",
                                      gap: "4px 8px",
                                      fontSize: "11px",
                                    }}
                                  >
                                    <DetailItem
                                      label="创建人"
                                      value={info.createBy || "-"}
                                    />
                                    <DetailItem
                                      label="目标整改时间"
                                      value={info.targetCheckTime || "-"}
                                    />
                                    <DetailItem
                                      label="展位号"
                                      value={
                                        info.boothNo || selected?.code || "-"
                                      }
                                    />
                                    <DetailItem
                                      label="违规内容"
                                      value={info.recordContent || "-"}
                                      full
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div
                            style={{
                              borderRadius: "8px",
                              border: "none",
                              padding: "10px",
                              textAlign: "center",
                              color: "#a7c0de",
                              fontSize: "12px",
                            }}
                          >
                            暂无现场安全记录
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>

                {safetyInfoList.length > 0 && (
                  <div
                    style={{
                      marginTop: "12px",
                      display: "flex",
                      justifyContent: "flex-end",
                      borderTop: "none",
                      paddingTop: "10px",
                      flexShrink: 0,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setDetailOpen(false)}
                      style={{
                        cursor: "pointer",
                        padding: "6px 20px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        color: "#eef2ff",
                        background: "rgba(0, 229, 255, 0.1)",
                      }}
                      className="transition-all hover:bg-cyan-500/30"
                    >
                      关闭
                    </button>
                  </div>
                )}
              </div>
            </Modal>
          )}
        </div>
      </div>
    </section>
  );
}
