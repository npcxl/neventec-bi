import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Empty, Image, Modal, message } from "antd";
import { screenApi } from "../api";
import XButton from "./Buttons";
import HallOverviewMap from "./HallOverviewMap";
import HallMap from "./HallMap";
import type { Booth as HallBooth, HallData } from "./HallMap/types";
import { transformMockToHallData, transformApiToHallData } from "./HallMap/utils/transform";
import ConstructCarousel, {
  type ConstructCarouselPicture,
} from "./Safety/ConstructCarousel";
import { BoothModal as ConstructBoothModal } from "./Construct/modal/BoothModal";
import { BoothModal } from "./modal/BoothModal";
import { BoothModal as SafetyBoothModal } from "./Safety/modal/BoothModal";
import { useBoothColorStrategy } from "../hooks/useBoothColorStrategy";
import { useHallOverviewMap } from "../hooks/useHallOverviewMap";
import { useHallSorter } from "../hooks/useHallSorter";

// 导入 mock 数据
import mockBeijing from "../../mock/北京方案展_export.json";
import mockShougang from "../../mock/首钢会展中心4号馆1层_export.json";
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
  const [orderInfos, setOrderInfos] = useState<BoothOrderInfo[]>([]);
  const [constructLoading, setConstructLoading] = useState(false);

  // HallData: 根据 mode 映射到对应的数据
  // 1号馆/2号馆使用 Mock 数据，其他展馆使用 API 数据
  const [hallData, setHallData] = useState<HallData | null>(null);
  const hallDataCacheRef = useRef<Record<string, HallData>>({});

  // 判断是否使用 Mock 数据的展馆
  const isMockHall = useMemo(() => {
    if (mode === "all") return false;
    const halls = initData?.halls ?? [];
    const currentHall = halls.find((h) => h.hallId === mode);
    const hallName = currentHall?.hallName || "";
    return hallName.includes("方案展") || hallName.includes("1号") ||
      hallName.includes("4号馆") || hallName.includes("首钢") || hallName.includes("2号");
  }, [mode, initData?.halls]);

  // Mock 数据直接同步计算
  const mockHallData = useMemo<HallData | null>(() => {
    if (!isMockHall || mode === "all") return null;
    const halls = initData?.halls ?? [];
    const currentHall = halls.find((h) => h.hallId === mode);
    const hallName = currentHall?.hallName || "";

    if (hallName.includes("方案展") || hallName.includes("1号")) {
      return transformMockToHallData(mockBeijing as any, hallName);
    }
    return transformMockToHallData(mockShougang as any, hallName);
  }, [isMockHall, mode, initData?.halls]);

  // API 数据异步加载（非 Mock 展馆）
  useEffect(() => {
    if (mode === "all" || isMockHall) {
      if (isMockHall) setHallData(mockHallData);
      else setHallData(null);
      return;
    }

    const cached = hallDataCacheRef.current[mode];
    if (cached) {
      setHallData(cached);
      return;
    }

    let cancelled = false;
    const fetchApi = async () => {
      try {
        const response = await screenApi.getSafetyCoordByHallId(mode);
        const payload = (response as any)?.data ?? response;
        let parsed: any = null;
        if (payload?.dataJson) {
          try { parsed = JSON.parse(payload.dataJson); } catch {}
        }
        const booths = (parsed?.booths ?? payload?.booths ?? []) as any[];
        const imageSize = parsed?.image_size ?? payload?.image_size;
        const imageWidth = Number(imageSize?.width) || 1000;
        const imageHeight = Number(imageSize?.height) || 1000;
        const currentHall = (initData?.halls ?? []).find((h) => h.hallId === mode);
        const hallName = currentHall?.hallName || "";
        const backgroundUrl = parsed?.image ? `/mock/${parsed.image}` : '';

        const data = transformApiToHallData(booths, hallName, imageWidth, imageHeight, backgroundUrl);
        hallDataCacheRef.current[mode] = data;
        if (!cancelled) setHallData(data);
      } catch (error) {
        console.error("获取展馆坐标失败", error);
        if (!cancelled) setHallData(null);
      }
    };

    void fetchApi();
    return () => { cancelled = true; };
  }, [mode, isMockHall, mockHallData, initData?.halls]);


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
          } => Boolean(item?.address),
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

  // HallMap 展位点击回调
  const handleBoothClick = useCallback(
    (booth: HallBooth) => {
      const code = booth.boothNo || booth.id;
      handleSelect({
        code,
        name: booth.name,
        area: booth.area || "",
        x: booth.polygon[0]?.[0] ?? 0,
        y: booth.polygon[0]?.[1] ?? 0,
        w: booth.polygon[1]?.[0] ? booth.polygon[1][0] - booth.polygon[0][0] : 0,
        h: booth.polygon[2]?.[1] ? booth.polygon[2][1] - booth.polygon[0][1] : 0,
      });
      onBoothChange?.(code, booth.name);
    },
    [handleSelect, onBoothChange],
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
          ? "relative flex h-full min-h-0 w-full min-w-0 overflow-visible"
          : compact
            ? "relative flex w-full min-h-[22rem] flex-1 min-w-0 overflow-visible"
            : "relative flex w-full min-h-[clamp(32rem,72vh,52rem)] flex-1 min-w-0 overflow-visible"
      }
    >
      <div className="relative z-10 flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-[22px] ">
        <div className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[20px]">
          <div className="relative z-20 mb-3 flex shrink-0 flex-col items-center px-4 py-3 text-sm text-[#cfe5ff]">
            <div className="relative flex w-full min-w-0 items-center gap-1">
              <button
                className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-[rgba(37,99,235,0.3)] text-white text-xs hover:bg-[rgba(37,99,235,0.5)] transition-colors"
                onClick={() => {
                  if (tabsScrollRef.current) {
                    tabsScrollRef.current.scrollBy({ left: -200, behavior: 'smooth' });
                  }
                }}
                ref={(node) => {
                  if (node && tabsScrollRef.current) {
                    const container = tabsScrollRef.current;
                    const update = () => {
                      const maxScroll = container.scrollWidth - container.clientWidth;
                      node.style.opacity = maxScroll > 0 && container.scrollLeft > 5 ? '1' : '0.3';
                    };
                    update();
                    container.addEventListener('scroll', update);
                    return () => container.removeEventListener('scroll', update);
                  }
                }}
              >
                ‹
              </button>
              <div
                ref={tabsScrollRef}
                className="flex min-w-0 flex-1 flex-nowrap gap-2 overflow-x-auto pb-1"
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
              <button
                className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-[rgba(37,99,235,0.3)] text-white text-xs hover:bg-[rgba(37,99,235,0.5)] transition-colors"
                onClick={() => {
                  if (tabsScrollRef.current) {
                    tabsScrollRef.current.scrollBy({ left: 200, behavior: 'smooth' });
                  }
                }}
                ref={(node) => {
                  if (node && tabsScrollRef.current) {
                    const container = tabsScrollRef.current;
                    const update = () => {
                      const maxScroll = container.scrollWidth - container.clientWidth;
                      node.style.opacity = maxScroll > 0 && container.scrollLeft < maxScroll - 5 ? '1' : '0.3';
                    };
                    update();
                    container.addEventListener('scroll', update);
                    return () => container.removeEventListener('scroll', update);
                  }
                }}
              >
                ›
              </button>
            </div>
            <img
              src="/img/hall-tab-line.png"
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
              ) : hallData ? (
                <HallMap
                  hallData={hallData}
                  getBoothColor={(booth, index) =>
                    getColor(
                      {
                        booth_no: booth.boothNo || booth.id,
                        raw_texts: [booth.boothNo || booth.id, booth.name],
                      },
                      index,
                    )
                  }
                  onBoothClick={handleBoothClick}
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
            <SafetyBoothModal
              visible={detailOpen}
              onClose={() => setDetailOpen(false)}
              data={safetyDetail}
              loading={detailLoading}
            />
          )}
        </div>
      </div>
    </section>
  );
}
