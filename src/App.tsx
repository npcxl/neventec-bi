import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Flex, Image } from "antd";
import { DashboardHeader } from "./components/DashboardHeader";
import { ExhibitionLeftSidebar } from "./components/Exhibition/LeftSidebar";
import { ExhibitionRightSidebar } from "./components/Exhibition/RightSidebar";
import { ConstructLeftSidebar } from "./components/Construct/LeftSidebar";
import { ConstructRightSidebar } from "./components/Construct/RightSidebar";
import { SafetyLeftSidebar } from "./components/Safety/LeftSidebar";
import { SafetyRightSidebar } from "./components/Safety/RightSidebar";
import CenterMap from "./components/CenterMap";
import Hall3D from "./components/Hall3D"; //暂时不用 给个入口
import Loader from "./components/Loading/hallLoading";
import { screenApi } from "./api";
import Button2 from "./components/Button2";
import ConstructCarousel from "./components/Construct/ConstructCarousel";
import SafetyCarousel from "./components/Safety/ConstructCarousel";
import { useSequentialApiPolling } from "./hooks/useSequentialApiPolling";

const STORAGE_KEY_PREFIX = "db-demo:app-prefs:v3";
type HallSummary = {
  boothNum?: number;
  expoName?: string;
  expoid?: string;
  hallId?: string;
  hallName?: string;
  specialArea?: number;
  specialAreaNum?: number;
  standArea?: number;
  standardAreaNum?: number;
};
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

type SafetyRow = {
  boothNo?: string;
  company?: string;
  recordContent?: string;
  riskAssessment?: string;
  rectifyCheckStatus?: string;
  safetyStatus?: string;
  targetCheckTime?: string;
  hallId?: string;
  hallName?: string;
};

// Lightweight UI preferences only
type AppPersistedPrefs = {
  exhibitionId: string;
  selectedHallId: string;
  hallMode: ModuleKey;
  expoName: string;
};

//从url中获取exhibitionId

const UNKNOWN_HALL_ID = "__unknown__";

type ModuleKey = "ExhibitionOverview" | "ConstructOverview" | "SafetyOverview";

const SWITCH_LOAD_TIMEOUT_MS = 60000;
const POLLING_TIMEOUT_MS = 60000;
const MEMORY_RELEASE_INTERVAL_MS = 60000;
const MODULE_CACHE_TTL_MS = 60000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string) {
  let timerId: number | null = null;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timerId = window.setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timerId !== null) {
      window.clearTimeout(timerId);
    }
  });
}

function logRequestGroup(group: string, labels: string[]) {
  console.log(`[App][${group}] start`, labels);
}

function logRequestError(group: string, error: unknown) {
  console.error(`[App][${group}] failed`, error);
}

function isAbortError(error: unknown) {
  return error instanceof DOMException
    ? error.name === "AbortError"
    : error instanceof Error &&
        (error.name === "AbortError" ||
          error.message.includes("已中止") ||
          error.message.includes("aborted"));
}

function getStorageKey(exhibitionId: string) {
  return `${STORAGE_KEY_PREFIX}:${exhibitionId || "unknown"}`;
}

function readPersistedPrefs(exhibitionId: string): AppPersistedPrefs | null {
  try {
    const raw = window.localStorage.getItem(getStorageKey(exhibitionId));
    if (!raw) return null;
    return JSON.parse(raw) as AppPersistedPrefs;
  } catch {
    return null;
  }
}

function writePersistedPrefs(prefs: AppPersistedPrefs) {
  try {
    const prevRaw = window.localStorage.getItem(getStorageKey(prefs.exhibitionId));
    const prev = prevRaw ? (JSON.parse(prevRaw) as AppPersistedPrefs) : null;
    if (prev && prev.selectedHallId === prefs.selectedHallId && prev.hallMode === prefs.hallMode && prev.expoName === prefs.expoName) {
      return; // no change, skip write
    }
    window.localStorage.setItem(getStorageKey(prefs.exhibitionId), JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

function normalizeCarouselPictures(source: unknown[] = []) {
  const flattenSource = (items: unknown[]): any[] =>
    items.flatMap((item: any) => {
      if (Array.isArray(item)) return flattenSource(item);

      const nested =
        item?.data ??
        item?.list ??
        item?.rows ??
        item?.records ??
        item?.result ??
        item?.items;
        
      if (Array.isArray(nested)) {
        return [item, ...flattenSource(nested)];
      }

      return [item];
    });

  return flattenSource(source)
    .map((item: any) => ({
      address:
        item?.address ??
        item?.imgUrl ??
        item?.imgurl ??
        item?.url ??
        item?.pictureUrl ??
        item?.imageUrl ??
        item?.fileUrl ??
        item?.picUrl ??
        item?.photoUrl ??
        item?.image ??
        item?.src ??
        "",
      dataStr:
        item?.dataStr ??
        item?.date ??
        item?.createTime ??
        item?.time ??
        item?.name ??
        item?.fileName ??
        item?.title ??
        "",
      boothId: item?.boothId ?? item?.boothNo ?? item?.booth_id ?? "",
      boothNo:
        item?.boothNo ??
        item?.booth_no ??
        item?.boothId ??
        item?.booth_id ??
        "",
      exhibitor:
        item?.exhibitor ??
        item?.exhibitorName ??
        item?.companyName ??
        item?.company ??
        "",
      hallId: item?.hallId ?? item?.hall_id ?? "",
      hallName: item?.hallName ?? item?.hall_name ?? "",
    }))
    .filter((item) => item.address);
}

function formatCurrentTime(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  const weekMap = ["日", "一", "二", "三", "四", "五", "六"];
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}：${pad(date.getMinutes())}：${pad(date.getSeconds())} 周${weekMap[date.getDay()]}`;
}

const MenuButtonGroup = memo(function MenuButtonGroup({
  items,
  onMenuClick,
}: {
  items: Array<{ key: string; label: string; active: boolean }>;
  onMenuClick: (key: string) => void;
}) {
  return (
    <Flex
      wrap
      gap="small"
      className="absolute left-2 top-[40px] overflow-x-auto"
    >
      {items.map((item) => (
        <Button2
          key={item.key}
          mode={item.key}
          active={item.active}
          onModeChange={onMenuClick}
        >
          {item.label}
        </Button2>
      ))}
    </Flex>
  );
});

const CurrentTimeButton = memo(function CurrentTimeButton() {
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="absolute right-2 top-[40px]">
      <div className="text-[clamp(12px,0.9vw,14px)] text-[#dbeeff]">
        <Button2 mode="refresh-current-time" onModeChange={() => setCurrentTime(new Date())}>
          当前时间：{" "}
          <span className="font-medium text-white">
            {formatCurrentTime(currentTime)}
          </span>
        </Button2>
      </div>
    </div>
  );
});

const ExhibitionMapPanel = memo(function ExhibitionMapPanel({
  selectedHallId,
  hallMode,
  setSelectedHallId,
  setSelectedBoothId,
  initData,
  boothRows,
  safetyRows,
  constructProcessData,
  galleryRows,
}: {
  selectedHallId: string;
  hallMode: ModuleKey;
  setSelectedHallId: (hallId: string) => void;
  setSelectedBoothId: (boothId: string) => void;
  initData: {
    exhibitionId: string;
    halls: Array<{ hallId: string; hallName: string }>;
  };
  boothRows: BoothRow[];
  safetyRows: SafetyRow[];
  constructProcessData: any;
  galleryRows: HallSummary[];
}) {
  return (
    <>
      <ExhibitionLeftSidebar
        loading={false}
        galleryRows={galleryRows}
        boothRows={boothRows}
        hallId={selectedHallId}
      />
      <CenterMap
        mode={selectedHallId}
        moduleMode={hallMode}
        onModeChange={setSelectedHallId}
        onBoothChange={(boothId) => setSelectedBoothId(boothId)}
        initData={initData}
        boothRows={boothRows}
        safetyRows={safetyRows}
        constructProcessRows={
          Array.isArray(constructProcessData)
            ? constructProcessData
            : (constructProcessData?.rows ?? constructProcessData?.data ?? [])
        }
        galleryRows={galleryRows}
      />
    </>
  );
});

export default function App() {
  const idExhibition = new URLSearchParams(window.location.search).get(
    "exhibitionId",
  );
  const DEFAULT_EXHIBITION_ID = idExhibition ?? "unknown";
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSwitchLoading, setIsSwitchLoading] = useState(false);
  const [isModuleLoading, setIsModuleLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"overview" | "hall3d">(() =>
    new URLSearchParams(window.location.search).get("view") === "hall3d"
      ? "hall3d"
      : "overview",
  );
  const initialLoadingTimerRef = useRef<number | null>(null);
  // Skip first module request for ExhibitionOverview+all (data already loaded by loadOverview)
  const skipInitialOverviewRequestRef = useRef(true);
  const initialPrefs = useMemo(() => readPersistedPrefs(DEFAULT_EXHIBITION_ID), [DEFAULT_EXHIBITION_ID]);
  const [hallMode, setHallMode] = useState<ModuleKey>(initialPrefs?.hallMode ?? "ExhibitionOverview");
  const [selectedHallId, setSelectedHallId] = useState<string>(initialPrefs?.selectedHallId ?? "all");
  const [initData, setInitData] = useState<{
    exhibitionId: string;
    halls: Array<{ hallId: string; hallName: string }>;
  }>({
    exhibitionId: DEFAULT_EXHIBITION_ID,
    halls: [],
  });
  const [galleryRows, setGalleryRows] = useState<HallSummary[]>([]);
  const [boothRows, setBoothRows] = useState<BoothRow[]>([]); //展位信息
  const [constructOverviewData, setConstructOverviewData] = useState<any>(null); //搭建信息概览
  const [constructProcessData, setConstructProcessData] = useState<any>(null); //搭建进度
  const [constructMaterialData, setConstructMaterialData] = useState<any>(null); //搭建材料
  const [boothProgressData, setBoothProgressData] = useState<any>(null); //展位进度
  const [boothProgressPictures, setBoothProgressPictures] = useState<any[]>([]); //展位进度图片
  const [selectedBoothId, setSelectedBoothId] = useState<string>(""); //选中展位
  const [constructCarouselLoading, setConstructCarouselLoading] =
    useState(false);
  const [safetyCarouselLoading, setSafetyCarouselLoading] = useState(false);
  const [safetyCarouselPicturesState, setSafetyCarouselPictures] = useState<
    any[]
  >([]);
  const [exhibitionProcessData, setExhibitionProcessData] = useState<any>(null); //展会进度
  const [safetyRows, setSafetyRows] = useState<
    Array<{
      boothNo?: string;
      company?: string;
      recordContent?: string;
      riskAssessment?: string;
      rectifyCheckStatus?: string;
      safetyStatus?: string;
      targetCheckTime?: string;
      hallId?: string;
      hallName?: string;
    }>
  >([]); //现场安全
  const [safetyCollect, setSafetyCollect] = useState<any>(null);
  const [violationTypeData, setViolationTypeData] = useState<any>(null); //违规类型
  const [violationRecordData, setViolationRecordData] = useState<any>(null); //违规记录
  const [violationSituationData, setViolationSituationData] =
    useState<any>(null); //违规情况
  const [orderCollectData, setOrderCollectData] = useState<any>(null); //水电网络申报
  const [expoName, setExpoName] = useState<string>(initialPrefs?.expoName || "展会标题-v1.0"); //展会标题
  const memoryMonitorTimerRef = useRef<number | null>(null);
  const memoryMonitorSnapshotRef = useRef<{
    usedJSHeapSize?: number;
    domNodes?: number;
  } | null>(null);
  // Carousel image cache (60s TTL, memory only)
  const carouselCacheRef = useRef<Record<string, { at: number; pictures: any[] }>>({});
  const CAROUSEL_CACHE_TTL = 60_000;
  const moduleFetchCacheRef = useRef<
    Record<
      string,
      {
        at: number;
        data: { summary: Record<string, unknown>; [key: string]: unknown };
      }
    >
  >({}); // 60s 模块缓存
  const moduleFetchInFlightRef = useRef(false); // 防止轮询和切换同时抢请求
  const lastActiveModuleRef = useRef<{
    hallMode: ModuleKey;
    selectedHallId: string;
  }>({ hallMode: "ExhibitionOverview", selectedHallId: "all" });
  const latestStateRef = useRef({
    initData,
    selectedHallId,
    hallMode,
    expoName,
    galleryRows,
    boothRows,
    constructOverviewData,
    constructProcessData,
    constructMaterialData,
    boothProgressData,
    boothProgressPictures,
    exhibitionProcessData,
    safetyRows,
    safetyCollect,
    violationTypeData,
    violationRecordData,
    violationSituationData,
    orderCollectData,
  });

  useEffect(() => {
    latestStateRef.current = {
      initData,
      selectedHallId,
      hallMode,
      expoName,
      galleryRows,
      boothRows,
      constructOverviewData,
      constructProcessData,
      constructMaterialData,
      boothProgressData,
      boothProgressPictures,
      exhibitionProcessData,
      safetyRows,
      safetyCollect,
      violationTypeData,
      violationRecordData,
      violationSituationData,
      orderCollectData,
    };
  }, [
    boothProgressData,
    boothProgressPictures,
    boothRows,
    constructMaterialData,
    constructOverviewData,
    constructProcessData,
    expoName,
    galleryRows,
    hallMode,
    initData,
    orderCollectData,
    safetyCollect,
    safetyRows,
    selectedHallId,
    exhibitionProcessData,
    violationRecordData,
    violationSituationData,
    violationTypeData,
  ]);

  // Lightweight UI prefs persistence (1s debounce)
  useEffect(() => {
    if (isInitialLoading) return;
    if (!DEFAULT_EXHIBITION_ID) return;

    const timer = window.setTimeout(() => {
      writePersistedPrefs({
        exhibitionId: DEFAULT_EXHIBITION_ID,
        selectedHallId,
        hallMode,
        expoName,
      });
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [DEFAULT_EXHIBITION_ID, selectedHallId, hallMode, expoName, isInitialLoading]);

  const loadOverview = async (signal?: AbortSignal) => {
    if (!DEFAULT_EXHIBITION_ID) return;
    // Only load common data + current module data on first screen
    const [galleryRes, boothRes, orderCollectRes] = await Promise.all([
      screenApi.getGalleryInfo(DEFAULT_EXHIBITION_ID, signal),
      screenApi.getSceneBoothPageInfo(DEFAULT_EXHIBITION_ID, signal),
      screenApi.getOrderCollect(DEFAULT_EXHIBITION_ID, signal),
    ]);
    const data = (galleryRes?.data ?? galleryRes ?? {}) as
      | HallSummary[]
      | { halls?: HallSummary[]; expoid?: string };
    const halls = Array.isArray(data) ? data : (data.halls ?? []);
    const exhibitionId = Array.isArray(data)
      ? data[0]?.expoid || DEFAULT_EXHIBITION_ID
      : data.expoid || DEFAULT_EXHIBITION_ID;
    const normalizedRows = halls.map((item) => ({
      ...item,
      hallId: item.hallId?.trim() ? item.hallId : UNKNOWN_HALL_ID,
      hallName: item.hallName?.trim() ? item.hallName : "未知",
    }));

    const boothData = (boothRes?.data ?? boothRes ?? []) as BoothRow[];
    const normalizedBooths = boothData.map((item) => ({
      ...item,
      hallId: item.hallId?.trim() ? item.hallId : UNKNOWN_HALL_ID,
      hallName: item.hallName?.trim() ? item.hallName : "未知",
    }));

    setGalleryRows(normalizedRows);
    setBoothRows(normalizedBooths);
    setOrderCollectData(orderCollectRes?.data ?? orderCollectRes ?? null);
    setExpoName(
      normalizedRows.find((item) => item.expoName?.trim())?.expoName?.trim() ||
        "第I0届中国南亚博览会暨第30届中国昆明进出口商品交易会",
    );
    setInitData({
      exhibitionId,
      halls: normalizedRows.map((item) => ({
        hallId: item.hallId || UNKNOWN_HALL_ID,
        hallName: item.hallName || "未知",
      })),
    });
    // Validate restored selectedHallId against loaded halls
    const savedHallId = initialPrefs?.selectedHallId;
    if (savedHallId && savedHallId !== "all") {
      const exists = normalizedRows.some((h) => h.hallId === savedHallId);
      if (!exists) {
        setSelectedHallId("all");
      }
    }
    setSelectedBoothId("");
  };

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const minLoadingPromise = new Promise<void>((resolve) => {
      initialLoadingTimerRef.current = window.setTimeout(() => {
        resolve();
      }, 200);
    });

    void Promise.all([loadOverview(controller.signal), minLoadingPromise])
      .catch(() => {
        // 首次加载失败时仍然关闭遮罩，页面保留已有状态
      })
      .finally(() => {
        if (cancelled) return;
        if (initialLoadingTimerRef.current !== null) {
          window.clearTimeout(initialLoadingTimerRef.current);
        }
        setIsInitialLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
      if (initialLoadingTimerRef.current !== null) {
        window.clearTimeout(initialLoadingTimerRef.current);
      }
    };
  }, []);

  const items = useMemo(
    () => [
      { key: "ExhibitionOverview", label: "展会概况总览" },
      { key: "ConstructOverview", label: "搭建信息概览" },
      { key: "SafetyOverview", label: "现场安全总览" },
    ],
    [],
  );
  const isHall3DView = viewMode === "hall3d";

  const menuButtons = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        active: hallMode === item.key,
      })),
    [hallMode, items],
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (isHall3DView) {
      params.set("view", "hall3d");
    } else {
      params.delete("view");
    }
    const nextSearch = params.toString();
    const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`;
    window.history.replaceState({}, "", nextUrl);
  }, [isHall3DView]);

  useEffect(() => {
    if (isInitialLoading) return;

    // Skip first ExhibitionOverview+all request (data already loaded by loadOverview)
    if (skipInitialOverviewRequestRef.current && hallMode === "ExhibitionOverview" && selectedHallId === "all") {
      skipInitialOverviewRequestRef.current = false;
      return;
    }
    // If restored prefs are ExhibitionOverview+hall, skip only when it matches the skip flag
    if (skipInitialOverviewRequestRef.current) {
      skipInitialOverviewRequestRef.current = false;
    }

    let cancelled = false;
    const controller = new AbortController();
    const now = Date.now();
    const throttleKey = `${hallMode}:${selectedHallId}`;
    const cachedEntry = moduleFetchCacheRef.current[throttleKey];
    const isThrottled = Boolean(cachedEntry && now - cachedEntry.at < 60_000);
    const shouldShowLoading = !isThrottled;

    const refreshFromCache = (entry: typeof cachedEntry | undefined) => {
      if (!entry) return false;
      const d = entry.data as any;
      if (d.boothRows !== undefined) setBoothRows(d.boothRows);
      if (d.constructOverviewData !== undefined) setConstructOverviewData(d.constructOverviewData);
      if (d.constructProcessData !== undefined) setConstructProcessData(d.constructProcessData);
      if (d.constructMaterialData !== undefined) setConstructMaterialData(d.constructMaterialData);
      if (d.boothProgressData !== undefined) setBoothProgressData(d.boothProgressData);
      if (d.boothProgressPictures !== undefined) setBoothProgressPictures(d.boothProgressPictures);
      if (d.exhibitionProcessData !== undefined) setExhibitionProcessData(d.exhibitionProcessData);
      if (d.safetyRows !== undefined) setSafetyRows(d.safetyRows);
      if (d.safetyCollect !== undefined) setSafetyCollect(d.safetyCollect);
      if (d.violationTypeData !== undefined) setViolationTypeData(d.violationTypeData);
      if (d.violationRecordData !== undefined) setViolationRecordData(d.violationRecordData);
      if (d.violationSituationData !== undefined) setViolationSituationData(d.violationSituationData);
      if (d.orderCollectData !== undefined) setOrderCollectData(d.orderCollectData);
      return true;
    };

    const saveCache = (
      summary: Record<string, unknown>,
      data?: any,
      at = Date.now(),
    ) => {
      moduleFetchCacheRef.current[throttleKey] = {
        at,
        data: {
          ...data,
          summary,
        },
      };
    };

    if (isThrottled && cachedEntry) {
      console.log("[App] 命中 60s 切换缓存，直接复用", throttleKey);
      refreshFromCache(cachedEntry);
      setIsModuleLoading(false);
      setIsSwitchLoading(false);
      lastActiveModuleRef.current = { hallMode, selectedHallId };
      return;
    }

    setIsModuleLoading(shouldShowLoading);
    setIsSwitchLoading(shouldShowLoading);
    lastActiveModuleRef.current = { hallMode, selectedHallId };

    const run = async () => {
      moduleFetchInFlightRef.current = true;
      setIsSwitchLoading(shouldShowLoading);
      setIsModuleLoading(shouldShowLoading);

      try {
        if (hallMode === "ExhibitionOverview") {
          const requestLabels =
            selectedHallId === "all"
              ? ["getSceneBoothPageInfo", "getOrderCollect"]
              : ["getSceneBoothPageInfoByHallId", "getOrderCollectByHallId"];
          logRequestGroup("ExhibitionOverview", requestLabels);

          const result = await withTimeout(
            Promise.all(
              selectedHallId === "all"
                ? [
                    screenApi.getSceneBoothPageInfo(
                      DEFAULT_EXHIBITION_ID,
                      controller.signal,
                    ),
                    screenApi.getOrderCollect(
                      DEFAULT_EXHIBITION_ID,
                      controller.signal,
                    ),
                  ]
                : [
                    screenApi.getSceneBoothPageInfoByHallId(
                      DEFAULT_EXHIBITION_ID,
                      selectedHallId,
                      controller.signal,
                    ),
                    screenApi.getOrderCollectByHallId(
                      DEFAULT_EXHIBITION_ID,
                      selectedHallId,
                      controller.signal,
                    ),
                  ],
            ),
            SWITCH_LOAD_TIMEOUT_MS,
            "切换到展会总览",
          ).catch((error) => {
            if (!isAbortError(error)) {
              delete moduleFetchCacheRef.current[throttleKey];
              logRequestError("ExhibitionOverview", error);
            }
            return null as [unknown, unknown] | null;
          });

          if (cancelled || !result) return;
          const [boothRes, orderCollectRes] = result as any[];

          const boothData = (boothRes?.data ?? boothRes ?? []) as BoothRow[];
          const normalizedBooths = boothData.map((item) => ({
            ...item,
            hallId: item.hallId?.trim() ? item.hallId : UNKNOWN_HALL_ID,
            hallName: item.hallName?.trim() ? item.hallName : "未知",
          }));
          const nextBoothRows = normalizedBooths;
          const nextOrderCollectData =
            (orderCollectRes as any)?.data ?? orderCollectRes ?? null;
          setBoothRows(nextBoothRows);
          setOrderCollectData(nextOrderCollectData);
          saveCache(
            {
              hallMode,
              selectedHallId,
              boothRowsCount: nextBoothRows.length,
              orderCollectCount: Array.isArray(nextOrderCollectData)
                ? nextOrderCollectData.length
                : 1,
            },
            {
              boothRows: nextBoothRows,
              orderCollectData: nextOrderCollectData,
            },
          );
          return;
        }

        if (hallMode === "ConstructOverview") {
          const requestLabels =
            selectedHallId === "all"
              ? [
                  "getConstructOverview",
                  "getConstructProcess",
                  "getMaterialStatistics",
                  "getBoothProcess",
                  "getExhibitionProcess",
                ]
              : [
                  "getConstructOverviewByHallId",
                  "getConstructProcessByHallId",
                  "getMaterialStatistics",
                  "getBoothProcessByHallId",
                  "getExhibitionProcessByHallId",
                ];
          logRequestGroup("ConstructOverview", requestLabels);

          // Critical: constructOverview + constructProcess + materialStatistics + boothProcess
          const criticalRequests =
            selectedHallId === "all"
              ? [
                  screenApi.getConstructOverview(DEFAULT_EXHIBITION_ID, controller.signal),
                  screenApi.getConstructProcess(DEFAULT_EXHIBITION_ID, controller.signal),
                  screenApi.getMaterialStatistics(DEFAULT_EXHIBITION_ID, controller.signal),
                  screenApi.getBoothProcess(DEFAULT_EXHIBITION_ID, controller.signal),
                ]
              : [
                  screenApi.getConstructOverviewByHallId(DEFAULT_EXHIBITION_ID, selectedHallId, controller.signal),
                  screenApi.getConstructProcessByHallId(DEFAULT_EXHIBITION_ID, selectedHallId, controller.signal),
                  screenApi.getMaterialStatistics(DEFAULT_EXHIBITION_ID, controller.signal),
                  screenApi.getBoothProcessByHallId(DEFAULT_EXHIBITION_ID, selectedHallId, controller.signal),
                ];
          // Background: exhibitionProcess only (boothProgressPicture is handled by ConstructCarousel effect)
          const backgroundRequests =
            selectedHallId === "all"
              ? [screenApi.getExhibitionProcess(DEFAULT_EXHIBITION_ID, controller.signal)]
              : [screenApi.getExhibitionProcessByHallId(DEFAULT_EXHIBITION_ID, selectedHallId, controller.signal)];

          const criticalResult = await withTimeout(
            Promise.all(criticalRequests),
            SWITCH_LOAD_TIMEOUT_MS,
            "切换到搭建信息概览",
          ).catch((error) => {
            if (!isAbortError(error)) {
              delete moduleFetchCacheRef.current[throttleKey];
              logRequestError("ConstructOverview", error);
            }
            return null;
          });

          if (cancelled || !criticalResult) return;
          const [overviewRes, processRes, materialRes, boothProcessRes] = criticalResult as any[];
          const nextConstructOverviewData = (overviewRes as any)?.data ?? overviewRes ?? null;
          const nextConstructProcessData = (processRes as any)?.data ?? processRes ?? null;
          const nextConstructMaterialData = (materialRes as any)?.data ?? materialRes ?? null;
          const nextBoothProgressData = (boothProcessRes as any)?.data ?? boothProcessRes ?? null;

          setConstructOverviewData(nextConstructOverviewData);
          setConstructProcessData(nextConstructProcessData);
          setConstructMaterialData(nextConstructMaterialData);
          setBoothProgressData(nextBoothProgressData);

          void Promise.all(backgroundRequests)
            .then(([exhibitionProcessRes]) => {
              if (cancelled) return;
              const nextExhibitionProcessData = (exhibitionProcessRes as any)?.data ?? exhibitionProcessRes ?? null;
              setExhibitionProcessData(nextExhibitionProcessData);
              saveCache(
                {
                  constructOverviewData: nextConstructOverviewData,
                  constructProcessData: nextConstructProcessData,
                  constructMaterialData: nextConstructMaterialData,
                  boothProgressData: nextBoothProgressData,
                  exhibitionProcessData: nextExhibitionProcessData,
                },
                {
                  constructOverviewData: nextConstructOverviewData,
                  constructProcessData: nextConstructProcessData,
                  constructMaterialData: nextConstructMaterialData,
                  boothProgressData: nextBoothProgressData,
                  exhibitionProcessData: nextExhibitionProcessData,
                },
              );
            })
            .catch((error) => {
              logRequestError("ConstructOverview", error);
            });
          return;
        }

        if (hallMode === "SafetyOverview") {
          const requestLabels =
            selectedHallId === "all"
              ? [
                  "getSafetyCollect",
                  "getSafetyPageInfo",
                  "getViolationType",
                  "getViolationRecord",
                  "getViolationSituation",
                ]
              : [
                  "getSafetyCollectByHallId",
                  "getSafetyPageInfoByHallId",
                  "getViolationTypeByHallId",
                  "getViolationRecordByHallId",
                  "getRectificationSituationByHallId",
                ];
          logRequestGroup("SafetyOverview", requestLabels);

          const requests =
            selectedHallId === "all"
              ? [
                  screenApi.getSafetyCollect(
                    DEFAULT_EXHIBITION_ID,
                    controller.signal,
                  ),
                  screenApi.getSafetyPageInfo(
                    DEFAULT_EXHIBITION_ID,
                    controller.signal,
                  ),
                  screenApi.getViolationType(
                    DEFAULT_EXHIBITION_ID,
                    controller.signal,
                  ),
                  screenApi.getViolationRecord(
                    DEFAULT_EXHIBITION_ID,
                    controller.signal,
                  ),
                  screenApi.getViolationSituation(
                    DEFAULT_EXHIBITION_ID,
                    controller.signal,
                  ),
                ]
              : [
                  screenApi.getSafetyCollectByHallId(
                    DEFAULT_EXHIBITION_ID,
                    selectedHallId,
                    controller.signal,
                  ),
                  screenApi.getSafetyPageInfoByHallId(
                    DEFAULT_EXHIBITION_ID,
                    selectedHallId,
                    controller.signal,
                  ),
                  screenApi.getViolationTypeByHallId(
                    DEFAULT_EXHIBITION_ID,
                    selectedHallId,
                    controller.signal,
                  ),
                  screenApi.getViolationRecordByHallId(
                    DEFAULT_EXHIBITION_ID,
                    selectedHallId,
                    controller.signal,
                  ),
                  screenApi.getRectificationSituationByHallId(
                    DEFAULT_EXHIBITION_ID,
                    selectedHallId,
                    controller.signal,
                  ),
                ];
          const [
            collectRes,
            pageRes,
            violationTypeRes,
            violationRecordRes,
            rectificationSituationRes,
          ] =
            (await withTimeout(
              Promise.all(requests),
              SWITCH_LOAD_TIMEOUT_MS,
              "切换到现场安全总览",
            ).catch((error) => {
              if (!isAbortError(error)) {
                delete moduleFetchCacheRef.current[throttleKey];
                logRequestError("SafetyOverview", error);
              }
              return [];
            })) ?? [];

          if (cancelled) return;
          const safetyData = (pageRes?.data ?? pageRes ?? []) as Array<{
            boothNo?: string;
            company?: string;
            recordContent?: string;
            riskAssessment?: string;
            rectifyCheckStatus?: string;
            safetyStatus?: string;
            targetCheckTime?: string;
            hallId?: string;
            hallName?: string;
          }>;
          const normalizedSafetyRows = safetyData.map((item) => ({
            ...item,
            hallId: item.hallId?.trim() ? item.hallId : UNKNOWN_HALL_ID,
            hallName: item.hallName?.trim() ? item.hallName : "未知",
          }));

          const nextSafetyCollect = collectRes?.data ?? collectRes ?? null;
          const nextViolationTypeData =
            violationTypeRes?.data ?? violationTypeRes ?? null;
          const nextViolationRecordData =
            violationRecordRes?.data ?? violationRecordRes ?? null;
          const nextViolationSituationData =
            rectificationSituationRes?.data ??
            rectificationSituationRes ??
            null;
          setSafetyRows(normalizedSafetyRows);
          setSafetyCollect(nextSafetyCollect);
          setViolationTypeData(nextViolationTypeData);
          setViolationRecordData(nextViolationRecordData);
          setViolationSituationData(nextViolationSituationData);
          saveCache(
            {
              safetyRows: normalizedSafetyRows,
              safetyCollect: nextSafetyCollect,
              violationTypeData: nextViolationTypeData,
              violationRecordData: nextViolationRecordData,
              violationSituationData: nextViolationSituationData,
            },
            {
              safetyRows: normalizedSafetyRows,
              safetyCollect: nextSafetyCollect,
              violationTypeData: nextViolationTypeData,
              violationRecordData: nextViolationRecordData,
              violationSituationData: nextViolationSituationData,
            },
          );
        }
      } finally {
        moduleFetchInFlightRef.current = false;
        if (!cancelled) {
          setIsModuleLoading(false);
          setIsSwitchLoading(false);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [hallMode, selectedHallId, isInitialLoading]);

  const handleMenuClick = (key: string) => {
    const nextMode = key as ModuleKey;
    if (nextMode === hallMode) return;
    setHallMode(nextMode);
    setSelectedHallId("all");
    setSelectedBoothId("");
  };

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const loadCarousel = async () => {
      if (hallMode !== "ConstructOverview") {
        setConstructCarouselLoading(false);
        return;
      }
      const cacheKey = `construct:${selectedHallId}`;
      const cached = carouselCacheRef.current[cacheKey];
      if (cached && Date.now() - cached.at < CAROUSEL_CACHE_TTL) {
        setBoothProgressPictures(cached.pictures);
        setConstructCarouselLoading(false);
        return;
      }
      setConstructCarouselLoading(true);
      try {
        const response =
          selectedHallId === "all"
            ? await screenApi.getBoothProgressPicture(DEFAULT_EXHIBITION_ID, controller.signal)
            : await screenApi.getBoothProgressPictureByHallId(DEFAULT_EXHIBITION_ID, selectedHallId, controller.signal);
        if (cancelled) return;
        const nextPictures = Array.isArray(response?.data ?? response)
          ? (response?.data ?? response)
          : [];
        // Only update if non-empty (don't overwrite with empty array on error)
        if (nextPictures.length > 0 || !cached) {
          setBoothProgressPictures(nextPictures);
          carouselCacheRef.current[cacheKey] = { at: Date.now(), pictures: nextPictures };
        }
      } catch (error) {
        if (!isAbortError(error)) {
          console.error("[App][ConstructCarousel] failed", error);
        }
      } finally {
        if (!cancelled) setConstructCarouselLoading(false);
      }
    };
    void loadCarousel();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [hallMode, selectedHallId]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const loadSafetyCarousel = async () => {
      if (hallMode !== "SafetyOverview") {
        return;
      }
      const cacheKey = `safety:${selectedHallId}`;
      const cached = carouselCacheRef.current[cacheKey];
      if (cached && Date.now() - cached.at < CAROUSEL_CACHE_TTL) {
        setSafetyCarouselPictures(cached.pictures);
        setSafetyCarouselLoading(false);
        return;
      }
      setSafetyCarouselLoading(true);
      try {
        const response =
          selectedHallId === "all"
            ? await screenApi.getViolationPictureByHallId(DEFAULT_EXHIBITION_ID, controller.signal)
            : await screenApi.getViolationPictureByHallIdAndBoothNo(DEFAULT_EXHIBITION_ID, selectedHallId, controller.signal);
        if (cancelled) return;
        const nextPictures = Array.isArray(response?.data ?? response)
          ? (response?.data ?? response)
          : [];
        if (nextPictures.length > 0 || !cached) {
          setSafetyCarouselPictures(nextPictures);
          carouselCacheRef.current[cacheKey] = { at: Date.now(), pictures: nextPictures };
        }
        setSafetyCarouselPictures(nextPictures);
      } catch (error) {
        if (!isAbortError(error)) {
          console.error("[App][SafetyCarousel] failed", error);
        }
      } finally {
        if (!cancelled) setSafetyCarouselLoading(false);
      }
    };
    void loadSafetyCarousel();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [hallMode, selectedHallId]);

  const exhibitionSidebarProps = {
    galleryRows,
    boothRows,
    hallId: selectedHallId,
    loading: isModuleLoading && hallMode === "ExhibitionOverview",
  };
  const constructLeftSidebarProps = {
    constructOverviewData,
    constructProcessData,
    hallId: selectedHallId,
    loading: isModuleLoading && hallMode === "ConstructOverview",
    overviewLoading: isSwitchLoading && hallMode === "ConstructOverview",
    processLoading: false,
  };
  const constructRightSidebarProps = {
    boothProgressData,
    constructProcessData,
    constructMaterialData,
    exhibitionProcessData,
    hallId: selectedHallId,
    loading: isModuleLoading && hallMode === "ConstructOverview",
    materialLoading: isSwitchLoading && hallMode === "ConstructOverview",
    boothProgressLoading: isSwitchLoading && hallMode === "ConstructOverview",
    processLoading: false,
  };
  const safetyCollectRows = Array.isArray(safetyCollect)
    ? safetyCollect
    : (safetyCollect?.data ?? safetyCollect?.list ?? []);
  const safetyLeftSidebarProps = {
    galleryRows,
    safetyRows,
    safetyCollect: safetyCollectRows,
    hallId: selectedHallId,
    loading: isModuleLoading && hallMode === "SafetyOverview",
  };
  const safetyRightSidebarProps = {
    violationTypeData,
    violationRecordData,
    rectificationSituationData: violationSituationData,
    loading: isModuleLoading && hallMode === "SafetyOverview",
  };
  const constructCarouselPicturesMemo = useMemo(
    () => normalizeCarouselPictures(boothProgressPictures),
    [boothProgressPictures],
  );
  const safetyCarouselPicturesMemo = useMemo(
    () => normalizeCarouselPictures(safetyCarouselPicturesState),
    [safetyCarouselPicturesState],
  );

  const pollingTasks = useMemo(() => {
    const safeData = <T,>(res: any, fallback: T): T =>
      (res?.data ?? res ?? fallback) as T;

    const commonTasks = [
      {
        key: "galleryInfo",
        run: async (signal: AbortSignal) => {
          const galleryRes = await screenApi.getGalleryInfo(
            DEFAULT_EXHIBITION_ID,
            signal,
          );
          const data = safeData<
            HallSummary[] | { halls?: HallSummary[]; expoid?: string }
          >(galleryRes, []);
          const halls = Array.isArray(data) ? data : (data.halls ?? []);
          const exhibitionId = Array.isArray(data)
            ? data[0]?.expoid || DEFAULT_EXHIBITION_ID
            : data.expoid || DEFAULT_EXHIBITION_ID;
          const normalizedRows = halls.map((item) => ({
            ...item,
            hallId: item.hallId?.trim() ? item.hallId : UNKNOWN_HALL_ID,
            hallName: item.hallName?.trim() ? item.hallName : "未知",
          }));

          setGalleryRows(normalizedRows);
          setExpoName(
            normalizedRows
              .find((item) => item.expoName?.trim())
              ?.expoName?.trim() || "展会概况总览",
          );
          const nextInitData = {
            exhibitionId,
            halls: normalizedRows.map((item) => ({
              hallId: item.hallId || UNKNOWN_HALL_ID,
              hallName: item.hallName || "未知",
            })),
          };
          setInitData(nextInitData);
        },
      },
      {
        key: "boothInfo",
        run: async (signal: AbortSignal) => {
          const boothRes =
            selectedHallId === "all"
              ? await screenApi.getSceneBoothPageInfo(
                  DEFAULT_EXHIBITION_ID,
                  signal,
                )
              : await screenApi.getSceneBoothPageInfoByHallId(
                  DEFAULT_EXHIBITION_ID,
                  selectedHallId,
                  signal,
                );
          const boothData = safeData<BoothRow[]>(boothRes, []);
          const normalizedBooths = boothData.map((item) => ({
            ...item,
            hallId: item.hallId?.trim() ? item.hallId : UNKNOWN_HALL_ID,
            hallName: item.hallName?.trim() ? item.hallName : "未知",
          }));
          setBoothRows(normalizedBooths);
        },
      },
    ];

    if (hallMode === "ExhibitionOverview") {
      return [
        ...commonTasks,
        {
          key: "orderCollect",
          run: async (signal: AbortSignal) => {
            const res =
              selectedHallId === "all"
                ? await screenApi.getOrderCollect(DEFAULT_EXHIBITION_ID, signal)
                : await screenApi.getOrderCollectByHallId(
                    DEFAULT_EXHIBITION_ID,
                    selectedHallId,
                    signal,
                  );
            setOrderCollectData(safeData<any>(res, null));
          },
        },
      ];
    }

    if (hallMode === "ConstructOverview") {
      return [
        ...commonTasks,
        {
          key: "constructOverview",
          run: async (signal: AbortSignal) => {
            const res =
              selectedHallId === "all"
                ? await screenApi.getConstructOverview(
                    DEFAULT_EXHIBITION_ID,
                    signal,
                  )
                : await screenApi.getConstructOverviewByHallId(
                    DEFAULT_EXHIBITION_ID,
                    selectedHallId,
                    signal,
                  );
            setConstructOverviewData(safeData<any>(res, null));
          },
        },
        {
          key: "constructProcess",
          run: async (signal: AbortSignal) => {
            const res =
              selectedHallId === "all"
                ? await screenApi.getConstructProcess(
                    DEFAULT_EXHIBITION_ID,
                    signal,
                  )
                : await screenApi.getConstructProcessByHallId(
                    DEFAULT_EXHIBITION_ID,
                    selectedHallId,
                    signal,
                  );
            setConstructProcessData(safeData<any>(res, null));
          },
        },
        {
          key: "materialStatistics",
          run: async (signal: AbortSignal) => {
            const res = await screenApi.getMaterialStatistics(
              DEFAULT_EXHIBITION_ID,
              signal,
            );
            setConstructMaterialData(safeData<any>(res, null));
          },
        },
        {
          key: "boothProcess",
          run: async (signal: AbortSignal) => {
            const res =
              selectedHallId === "all"
                ? await screenApi.getBoothProcess(DEFAULT_EXHIBITION_ID, signal)
                : await screenApi.getBoothProcessByHallId(
                    DEFAULT_EXHIBITION_ID,
                    selectedHallId,
                    signal,
                  );
            setBoothProgressData(safeData<any>(res, null));
          },
        },
        // boothProgressPicture is fetched by ConstructCarousel effect only
        {
          key: "exhibitionProcess",
          run: async (signal: AbortSignal) => {
            const res =
              selectedHallId === "all"
                ? await screenApi.getExhibitionProcess(
                    DEFAULT_EXHIBITION_ID,
                    signal,
                  )
                : await screenApi.getExhibitionProcessByHallId(
                    DEFAULT_EXHIBITION_ID,
                    selectedHallId,
                    signal,
                  );
            setExhibitionProcessData(safeData<any>(res, null));
          },
        },
      ];
    }

    return [
      ...commonTasks,
      {
        key: "safetyCollect",
        run: async (signal: AbortSignal) => {
          const res =
            selectedHallId === "all"
              ? await screenApi.getSafetyCollect(DEFAULT_EXHIBITION_ID, signal)
              : await screenApi.getSafetyCollectByHallId(
                  DEFAULT_EXHIBITION_ID,
                  selectedHallId,
                  signal,
                );
          setSafetyCollect(safeData<any>(res, null));
        },
      },
      {
        key: "safetyPageInfo",
        run: async (signal: AbortSignal) => {
          const res =
            selectedHallId === "all"
              ? await screenApi.getSafetyPageInfo(DEFAULT_EXHIBITION_ID, signal)
              : await screenApi.getSafetyPageInfoByHallId(
                  DEFAULT_EXHIBITION_ID,
                  selectedHallId,
                  signal,
                );
          const safetyData = safeData<
            Array<{
              boothNo?: string;
              company?: string;
              recordContent?: string;
              riskAssessment?: string;
              rectifyCheckStatus?: string;
              safetyStatus?: string;
              targetCheckTime?: string;
              hallId?: string;
              hallName?: string;
            }>
          >(res, []);
          const normalizedSafetyRows = safetyData.map((item) => ({
            ...item,
            hallId: item.hallId?.trim() ? item.hallId : UNKNOWN_HALL_ID,
            hallName: item.hallName?.trim() ? item.hallName : "未知",
          }));
          setSafetyRows(normalizedSafetyRows);
        },
      },
      {
        key: "violationType",
        run: async (signal: AbortSignal) => {
          const res =
            selectedHallId === "all"
              ? await screenApi.getViolationType(DEFAULT_EXHIBITION_ID, signal)
              : await screenApi.getViolationTypeByHallId(
                  DEFAULT_EXHIBITION_ID,
                  selectedHallId,
                  signal,
                );
          setViolationTypeData(safeData<any>(res, null));
        },
      },
      {
        key: "violationRecord",
        run: async (signal: AbortSignal) => {
          const res =
            selectedHallId === "all"
              ? await screenApi.getViolationRecord(
                  DEFAULT_EXHIBITION_ID,
                  signal,
                )
              : await screenApi.getViolationRecordByHallId(
                  DEFAULT_EXHIBITION_ID,
                  selectedHallId,
                  signal,
                );
          const nextViolationRecordData = safeData<any>(res, null);
          setViolationRecordData(nextViolationRecordData);
        },
      },
      {
        key: "violationSituation",
        run: async (signal: AbortSignal) => {
          const res =
            selectedHallId === "all"
              ? await screenApi.getViolationSituation(
                  DEFAULT_EXHIBITION_ID,
                  signal,
                )
              : await screenApi.getRectificationSituationByHallId(
                  DEFAULT_EXHIBITION_ID,
                  selectedHallId,
                  signal,
                );
          setViolationSituationData(safeData<any>(res, null));
        },
      },
    ];
  }, [DEFAULT_EXHIBITION_ID, hallMode, selectedHallId]);

  useSequentialApiPolling({
    tasks: pollingTasks,
    intervalMs: 90_000,
    timeoutMs: POLLING_TIMEOUT_MS,
    enabled:
      !isInitialLoading &&
      !isModuleLoading &&
      !isSwitchLoading &&
      Boolean(DEFAULT_EXHIBITION_ID),
    immediate: false,
    onCycleStart: (tasks) => {
      console.log(
        `[Polling] start | module=${hallMode} | tasks=${tasks.map((task) => task.key).join(",")}`,
      );
    },
    onCycleEnd: (tasks) => {
      console.log(
        `[Polling] end   | module=${hallMode} | tasks=${tasks.map((task) => task.key).join(",")}`,
      );
    },
  });

  useEffect(() => {
    lastActiveModuleRef.current = { hallMode, selectedHallId };
    latestStateRef.current = {
      initData,
      selectedHallId,
      hallMode,
      expoName,
      galleryRows,
      boothRows,
      constructOverviewData,
      constructProcessData,
      constructMaterialData,
      boothProgressData,
      boothProgressPictures,
      exhibitionProcessData,
      safetyRows,
      safetyCollect,
      violationTypeData,
      violationRecordData,
      violationSituationData,
      orderCollectData,
    };
  }, [
    boothProgressData,
    boothProgressPictures,
    boothRows,
    constructMaterialData,
    constructOverviewData,
    constructProcessData,
    expoName,
    galleryRows,
    hallMode,
    initData,
    orderCollectData,
    safetyCollect,
    safetyRows,
    selectedHallId,
    exhibitionProcessData,
    violationRecordData,
    violationSituationData,
    violationTypeData,
  ]);

  // Cache cleanup: delete expired entries (do NOT trim active entry data)
  useEffect(() => {
    if (isInitialLoading) return;
    const timer = window.setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of Object.entries(moduleFetchCacheRef.current)) {
        if (now - entry.at > MODULE_CACHE_TTL_MS) {
          delete moduleFetchCacheRef.current[key];
        }
      }
    }, MEMORY_RELEASE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [isInitialLoading]);
  const getApproxValueSize = (value: unknown) => {
    try {
      if (value == null) return 0;
      if (typeof value === "string") return value.length;
      return JSON.stringify(value).length;
    } catch {
      return -1;
    }
  };

  //内存检测
  // useEffect(() => {
  //   const logAppMemory = () => {
  //     const memory = performance.memory;
  //     const domNodes = document.getElementsByTagName("*").length;
  //     const rootNodes = document.body?.querySelectorAll("*").length ?? 0;
  //     const heapUsed = memory?.usedJSHeapSize;
  //     const previous = memoryMonitorSnapshotRef.current;

  //     const stateBreakdown = {
  //       航展基础数据: {
  //         galleryRows: {
  //           条数: galleryRows.length,
  //           近似大小: getApproxValueSize(galleryRows),
  //         },
  //         boothRows: {
  //           条数: boothRows.length,
  //           近似大小: getApproxValueSize(boothRows),
  //         },
  //         safetyRows: {
  //           条数: safetyRows.length,
  //           近似大小: getApproxValueSize(safetyRows),
  //         },
  //       },
  //       模块详情数据: {
  //         constructOverviewData: {
  //           近似大小: getApproxValueSize(constructOverviewData),
  //         },
  //         constructProcessData: {
  //           近似大小: getApproxValueSize(constructProcessData),
  //         },
  //         constructMaterialData: {
  //           近似大小: getApproxValueSize(constructMaterialData),
  //         },
  //         boothProgressData: {
  //           近似大小: getApproxValueSize(boothProgressData),
  //         },
  //         exhibitionProcessData: {
  //           近似大小: getApproxValueSize(exhibitionProcessData),
  //         },
  //         safetyCollect: { 近似大小: getApproxValueSize(safetyCollect) },
  //         violationTypeData: {
  //           近似大小: getApproxValueSize(violationTypeData),
  //         },
  //         violationRecordData: {
  //           近似大小: getApproxValueSize(violationRecordData),
  //         },
  //         violationSituationData: {
  //           近似大小: getApproxValueSize(violationSituationData),
  //         },
  //         orderCollectData: { 近似大小: getApproxValueSize(orderCollectData) },
  //       },
  //       图片与轮播: {
  //         boothProgressPictures: {
  //           条数: boothProgressPictures.length,
  //           近似大小: getApproxValueSize(boothProgressPictures),
  //         },
  //       },
  //       缓存与持久化: {
  //         moduleFetchCacheKeys: {
  //           条数: Object.keys(moduleFetchCacheRef.current).length,
  //           近似大小: getApproxValueSize(moduleFetchCacheRef.current),
  //         },
  //         initData: { 近似大小: getApproxValueSize(initData) },
  //       },
  //     };

  //     if (memory) {
  //       console.log("[App][内存监控]", {
  //         已用JS堆内存: memory.usedJSHeapSize,
  //         总JS堆内存: memory.totalJSHeapSize,
  //         JS堆内存上限: memory.jsHeapSizeLimit,
  //         DOM节点数: domNodes,
  //         根节点数: rootNodes,
  //         已用JS堆内存变化量:
  //           previous?.usedJSHeapSize != null
  //             ? memory.usedJSHeapSize - previous.usedJSHeapSize
  //             : null,
  //         DOM节点变化量:
  //           previous?.domNodes != null ? domNodes - previous.domNodes : null,
  //         当前视图模式: viewMode,
  //         当前展厅模式: hallMode,
  //         当前选中展厅: selectedHallId,
  //         分项内存估算: stateBreakdown,
  //       });
  //     } else {
  //       console.log("[App][内存监控]", {
  //         DOM节点数: domNodes,
  //         根节点数: rootNodes,
  //         浏览器不支持performanceMemory: true,
  //         当前视图模式: viewMode,
  //         当前展厅模式: hallMode,
  //         当前选中展厅: selectedHallId,
  //         分项内存估算: stateBreakdown,
  //       });
  //     }

  //     memoryMonitorSnapshotRef.current = {
  //       usedJSHeapSize: heapUsed,
  //       domNodes,
  //     };
  //   };

  //   logAppMemory();
  //   memoryMonitorTimerRef.current = window.setInterval(logAppMemory, 10000);

  //   return () => {
  //     if (memoryMonitorTimerRef.current !== null) {
  //       window.clearInterval(memoryMonitorTimerRef.current);
  //       memoryMonitorTimerRef.current = null;
  //     }
  //   };
  // }, [hallMode, selectedHallId, viewMode]);

  const pagePadding = "px-[clamp(12px,1.4vw,24px)]";
  const pageGap = "gap-[clamp(12px,1.1vw,20px)]";
  const fontScaleClass = "text-[clamp(12px,0.78vw,16px)]";

  return (
    <div
      className={`relative h-dvh w-screen overflow-hidden  text-slate-100 ${fontScaleClass}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(63,124,255,0.2),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(0,198,255,0.12),transparent_28%),linear-gradient(180deg,#07172b_0%,#040d18_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(transparent_0%,rgba(255,255,255,0.02)_50%,transparent_100%)] opacity-40" />
      {isInitialLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[rgba(4,13,24,0.86)] backdrop-blur-sm">
          <Loader />
        </div>
      )}
      <Flex
        vertical
        className={`relative mx-auto h-full w-full min-w-0 overflow-hidden pb-[clamp(12px,1.2vw,24px)] 2xl:max-w-[1920px]`}
      >
        <div className="pointer-events-none absolute left-0 top-[clamp(56px,4.8vw,72px)] z-0 hidden h-[calc(100%-128px)] w-auto overflow-hidden select-none xl:block 2xl:left-[-18px]">
          <Image
            src="/img/zuo@2x.png"
            alt=""
            preview={{ src: "/img/zuo@2x.png" }}
            aria-hidden
            className="h-full w-auto animate-float-slow opacity-85 xl:max-h-[calc(100vh-156px)]"
          />
        </div>
        <div className="pointer-events-none absolute right-0 top-[clamp(56px,4.8vw,72px)] z-0 hidden h-[calc(100%-128px)] w-auto overflow-hidden select-none xl:block 2xl:right-[-18px]">
          <Image
            src="/img/you@2x.png"
            alt=""
            preview={{ src: "/img/you@2x.png" }}
            aria-hidden
            className="h-full w-auto animate-float-slow opacity-85 [animation-delay:1.2s] xl:max-h-[calc(100vh-156px)]"
          />
        </div>
        {/* <div className="pointer-events-none absolute bottom-0 left-1/2 z-20 w-[calc(100%-16px)] max-w-none -translate-x-1/2 select-none sm:w-[calc(100%-24px)] lg:w-[calc(100%-32px)] xl:w-[calc(100%-40px)] 2xl:w-[calc(100%-56px)]">
          <img src="/img/dibiao@2x.png" alt="" aria-hidden className="block h-auto w-full max-w-none opacity-95 drop-shadow-[0_0_18px_rgba(0,229,255,0.12)]" />
        </div> */}

        <Flex
          vertical
          className="relative z-10 h-full w-full min-h-0 container-bg"
        >
          {isHall3DView ? (
            <Hall3D
              hallId={selectedHallId}
              expoName={expoName}
              exhibitionId={DEFAULT_EXHIBITION_ID}
            />
          ) : (
            <>
              <DashboardHeader title={expoName} />
              <MenuButtonGroup
                items={menuButtons}
                onMenuClick={handleMenuClick}
              />
              <CurrentTimeButton />
              <main
                className={`grid min-h-0 flex-1 grid-cols-1 ${pageGap} overflow-hidden px-[clamp(10px,1vw,20px)] pb-[clamp(10px,1vw,18px)] pt-[clamp(8px,0.8vw,14px)] md:grid-cols-[minmax(320px,26%)_minmax(0,48%)_minmax(320px,26%)] lg:grid-cols-[minmax(340px,26%)_minmax(0,48%)_minmax(340px,26%)] 2xl:grid-cols-[minmax(360px,26%)_minmax(0,48%)_minmax(360px,26%)]`}
              >
                {hallMode === "ExhibitionOverview" && (
                  <>
                    <ExhibitionMapPanel
                      selectedHallId={selectedHallId}
                      hallMode={hallMode}
                      setSelectedHallId={setSelectedHallId}
                      setSelectedBoothId={setSelectedBoothId}
                      initData={initData}
                      boothRows={boothRows}
                      safetyRows={safetyRows}
                      constructProcessData={constructProcessData}
                      galleryRows={galleryRows}
                    />
                    <ExhibitionRightSidebar
                      boothRows={boothRows}
                      orderCollect={orderCollectData}
                      hallId={selectedHallId}
                      loading={
                        isModuleLoading && hallMode === "ExhibitionOverview"
                      }
                    />
                  </>
                )}

                {hallMode === "ConstructOverview" && (
                  <>
                    <ConstructLeftSidebar {...constructLeftSidebarProps} />
                    <Flex
                      vertical
                      className="min-h-0 min-w-0 gap-[clamp(12px,1.1vw,18px)] overflow-hidden"
                    >
                      <div className="flex min-h-0 flex-[0.66] min-w-0">
                        <CenterMap
                          mode={selectedHallId}
                          moduleMode={hallMode}
                          onModeChange={setSelectedHallId}
                          onBoothChange={(boothId) =>
                            setSelectedBoothId(boothId)
                          }
                          initData={initData}
                          boothRows={boothRows}
                          safetyRows={safetyRows}
                          constructProcessRows={(Array.isArray(
                            constructProcessData,
                          )
                            ? constructProcessData
                            : (constructProcessData?.rows ??
                              constructProcessData?.data ??
                              [])
                          ).map((item: any) => ({
                            boothId:
                              item.boothId ?? item.boothID ?? item.booth_id,
                            boothNumber:
                              item.boothNumber ??
                              item.boothNo ??
                              item.exNun ??
                              item.booth_no,
                            boothNo:
                              item.boothNo ??
                              item.exNun ??
                              item.booth_no ??
                              item.boothNumber,
                            progressValue:
                              item.progressValue ??
                              item.progressStatus ??
                              item.status ??
                              item.processStatus,
                          }))}
                          galleryRows={galleryRows}
                          compact={hallMode === "ConstructOverview"}
                        />
                      </div>
                      <section className="flex min-h-0 flex-[0.34] min-w-0 flex-col overflow-hidden rounded-2xl border border-[rgba(128,185,255,0.28)] bg-[linear-gradient(180deg,rgba(9,26,52,0.88),rgba(6,17,34,0.94))] shadow-[inset_0_0_24px_rgba(80,157,255,0.08)] backdrop-blur-sm">
                        <div className="min-h-0 flex-1 overflow-hidden px-[clamp(12px,1vw,16px)] py-[clamp(12px,1vw,16px)]">
                          <ConstructCarousel
                            pictures={constructCarouselPicturesMemo}
                            loading={constructCarouselLoading}
                          />
                        </div>
                      </section>
                    </Flex>
                    <ConstructRightSidebar {...constructRightSidebarProps} />
                  </>
                )}

                {hallMode === "SafetyOverview" && (
                  <>
                    <SafetyLeftSidebar {...safetyLeftSidebarProps} />
                    <Flex
                      vertical
                      className="min-h-0 min-w-0 gap-[clamp(12px,1.1vw,18px)] overflow-hidden"
                    >
                      <div className="flex min-h-0 flex-[0.66] min-w-0">
                        <CenterMap
                          mode={selectedHallId}
                          moduleMode={hallMode}
                          onModeChange={setSelectedHallId}
                          onBoothChange={(boothId) =>
                            setSelectedBoothId(boothId)
                          }
                          initData={initData}
                          boothRows={boothRows}
                          safetyRows={safetyRows}
                          galleryRows={galleryRows}
                          compact={hallMode === "SafetyOverview"}
                        />
                      </div>
                      <section className="flex min-h-0 flex-[0.34] min-w-0 flex-col overflow-hidden rounded-2xl border border-[rgba(128,185,255,0.28)] bg-[linear-gradient(180deg,rgba(9,26,52,0.88),rgba(6,17,34,0.94))] shadow-[inset_0_0_24px_rgba(80,157,255,0.08)] backdrop-blur-sm">
                        <div className="min-h-0 flex-1 overflow-hidden px-[clamp(12px,1vw,16px)] py-[clamp(12px,1vw,16px)]">
                          <SafetyCarousel
                            pictures={safetyCarouselPicturesMemo}
                            loading={safetyCarouselLoading}
                          />
                        </div>
                      </section>
                    </Flex>
                    <SafetyRightSidebar {...safetyRightSidebarProps} />
                  </>
                )}
              </main>
            </>
          )}
        </Flex>
      </Flex>
    </div>
  );
}
