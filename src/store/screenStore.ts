import { useCallback, useMemo, useRef, useState } from 'react';
import { screenApi, type GalleryInfo, type SceneBoothItem } from '../api';

type ApiListResponse<T> = {
  list?: T[];
  rows?: T[];
  records?: T[];
  data?: T[];
};

type HallMeta = { hallId: string; hallName: string; imageAddress?: string; exhibitionArea?: number };

type SafetyRecord = {
  boothId?: string;
  boothNo?: string;
  company?: string;
  recordContent?: string;
  riskAssessment?: string;
  rectifyCheckStatus?: string;
  safetyStatus?: string;
  targetCheckTime?: string;
};

type BoothDetail = {
  boothId?: string;
  exhibitor?: string;
  remarks?: string;
};

export type HallStats = {
  total: number;
  normal: number;
  attention: number;
  abnormal: number;
  reported: number;
  unreported: number;
  paidDone: number;
  unpaid: number;
};

type ScreenState = {
  exhibitionId: string;
  overview: GalleryInfo | null;
  halls: HallMeta[];
  boothById: Record<string, SceneBoothItem>;
  boothIdsByHall: Record<string, string[]>;
  safetyByBoothId: Record<string, SafetyRecord>;
  boothDetailById: Record<string, BoothDetail>;
  hallFetchAt: Record<string, number>;
  orderCountByScope: Record<string, number>;
  apiErrors: Record<string, string>;
  loading: boolean;
  loadingText: string;
  loadedStages: string[];
  failedStages: string[];
  requestFailedOnce: boolean;
  bootstrapAttempted: boolean;
  bootstrapFailed: boolean;
};

type DashboardSummary = {
  exhibitionId: string;
  hallCount: number;
  boothCount: number;
  specialBoothCount: number;
  standardBoothCount: number;
  specialArea: number;
  standArea: number;
  totalArea: number;
  reportedCount: number;
  unreportedCount: number;
  paidCount: number;
  unpaidCount: number;
  abnormalCount: number;
  attentionCount: number;
  normalCount: number;
  orderCount: number;
};

const DEFAULT_EXHIBITION_ID = '8927739dfc4445088f8b2d1ee5bc1520';
const HALL_CACHE_TTL = 60_000;

function toBoolReported(v?: string) {
  return (v || '').includes('已报到');
}
function toBoolPaid(v?: string) {
  return (v || '').includes('已缴清');
}

function toNumber(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function getBoothKey(booth: SceneBoothItem, hallId?: string) {
  return booth.boothId || `${hallId || 'unknown'}__${booth.boothNo || 'unknown'}`;
}

function normalizeBoothList(list: SceneBoothItem[], hallId?: string) {
  return list.map((b) => ({ ...b, boothId: getBoothKey(b, hallId) }));
}

function toStatusFromSafety(s?: SafetyRecord): '正常' | '关注' | '异常' {
  if (!s) return '正常';
  const risk = `${s.riskAssessment ?? ''}`;
  const rectify = `${s.rectifyCheckStatus ?? ''}${s.safetyStatus ?? ''}`;
  if (risk.includes('高') || rectify.includes('不合格') || rectify.includes('未整改')) return '异常';
  if (risk || rectify || s.recordContent) return '关注';
  return '正常';
}

export function useScreenStore() {
  const [state, setState] = useState<ScreenState>({
    exhibitionId: DEFAULT_EXHIBITION_ID,
    overview: null,
    halls: [],
    boothById: {},
    boothIdsByHall: {},
    safetyByBoothId: {},
    boothDetailById: {},
    hallFetchAt: {},
    orderCountByScope: {},
    apiErrors: {},
    loading: false,
    loadingText: '',
    loadedStages: [],
    failedStages: [],
    requestFailedOnce: false,
    bootstrapAttempted: false,
    bootstrapFailed: false,
  });
  const bootstrapRunRef = useRef(false);
  const loadingHallIdsRef = useRef(new Set<string>());

  const setLoading = useCallback((loading: boolean, loadingText = '') => {
    setState((prev) => ({ ...prev, loading, loadingText }));
  }, []);

  const markStageLoaded = useCallback((stage: string) => {
    setState((prev) => ({
      ...prev,
      loadedStages: prev.loadedStages.includes(stage) ? prev.loadedStages : [...prev.loadedStages, stage],
      failedStages: prev.failedStages.filter((s) => s !== stage),
    }));
  }, []);

  const markStageFailed = useCallback((stage: string, message: string) => {
    setState((prev) => ({
      ...prev,
      failedStages: prev.failedStages.includes(stage) ? prev.failedStages : [...prev.failedStages, stage],
      apiErrors: prev.apiErrors[stage] ? prev.apiErrors : { ...prev.apiErrors, [stage]: message },
      requestFailedOnce: true,
      bootstrapFailed: stage === 'overview' ? true : prev.bootstrapFailed,
    }));
  }, []);

  const loadOverview = useCallback(async (exhibitionId?: string) => {
    const stage = 'overview';
    if (state.failedStages.includes(stage) || state.bootstrapAttempted) {
      console.info('[screenStore] skip loadOverview', { stage, bootstrapAttempted: state.bootstrapAttempted, failedStages: state.failedStages });
      return null;
    }
    const expoid = exhibitionId || state.exhibitionId;
    console.info('[screenStore] loadOverview start', { expoid });
    setState((prev) => ({ ...prev, bootstrapAttempted: true }));
    try {
      const res = await screenApi.getGalleryInfo(expoid);
      const data = res.data as any;
      const halls = (Array.isArray(data) ? data : (data?.halls ?? [])) as HallMeta[];
      const nextExpoId = (Array.isArray(data) ? data?.[0]?.expoid : data?.expoid) || expoid;
      setState((prev) => ({ ...prev, exhibitionId: nextExpoId, overview: data, halls }));
      markStageLoaded(stage);
      return { expoid: nextExpoId, halls, overview: data };
    } catch (err) {
      markStageFailed(stage, err instanceof Error ? err.message : '加载总览失败');
      return null;
    }
  }, [state.exhibitionId, state.failedStages, state.bootstrapAttempted, markStageLoaded, markStageFailed]);

  const loadHallData = useCallback(async (hallId: string, force = false) => {
    const stage = `hall:${hallId}`;
    if (state.failedStages.includes(stage)) {
      console.info('[screenStore] skip loadHallData failed stage', { hallId, stage, failedStages: state.failedStages });
      return;
    }
    const last = state.hallFetchAt[hallId] ?? 0;
    const now = Date.now();
    if (!force && now - last < HALL_CACHE_TTL) {
      console.info('[screenStore] skip loadHallData cache hit', { hallId, stage, last, now, ttl: HALL_CACHE_TTL });
      return;
    }
    if (loadingHallIdsRef.current.has(hallId)) {
      console.info('[screenStore] skip loadHallData in-flight', { hallId, stage });
      return;
    }

    console.info('[screenStore] loadHallData start', { hallId, stage, force, exhibitionId: state.exhibitionId });
    loadingHallIdsRef.current.add(hallId);
    try {
      console.info('[screenStore] requesting booth pageInfo', { hallId, expoid: state.exhibitionId });
      const boothRes = await screenApi.getSceneBoothPageInfo(state.exhibitionId);
      const boothData = boothRes.data as SceneBoothItem[] | null | undefined;
      const boothListRaw = Array.isArray(boothData) ? boothData : [];
      const scopedBooths = boothListRaw.filter((b) => !b.hallId || b.hallId === hallId);
      console.info('[screenStore] booth pageInfo ok', { hallId, count: scopedBooths.length });
      const boothList = normalizeBoothList(scopedBooths, hallId);
      const boothIds: string[] = [];
      setState((prev) => {
        const nextBoothById = { ...prev.boothById };
        boothList.forEach((b) => {
          const id = b.boothId || `${hallId}__${b.boothNo}`;
          nextBoothById[id] = { ...b, boothId: id };
          boothIds.push(id);
        });
        return {
          ...prev,
          boothById: nextBoothById,
          boothIdsByHall: { ...prev.boothIdsByHall, [hallId]: boothIds },
          hallFetchAt: { ...prev.hallFetchAt, [hallId]: now },
        };
      });

      // Safety records are intentionally not loaded on bootstrap for now.
      markStageLoaded(stage);
    } catch (err) {
      markStageFailed(stage, err instanceof Error ? err.message : `加载展馆 ${hallId} 失败`);
    } finally {
      loadingHallIdsRef.current.delete(hallId);
    }
  }, [state.exhibitionId, state.hallFetchAt, state.failedStages, markStageLoaded, markStageFailed]);

  const loadBoothDetail = useCallback(async (boothId: string) => {
    const stage = `booth:${boothId}`;
    if (state.failedStages.includes(stage)) return;
    try {
      const safetyRes = await screenApi.getSafetyScreenBooth(boothId);
      const safetyData = safetyRes.data as any;
      const safetyList = Array.isArray(safetyData)
        ? safetyData
        : (safetyData?.safetyInfoList ?? []);
      const firstSafety = safetyList[0] as SafetyRecord | undefined;
      setState((prev) => ({
        ...prev,
        boothDetailById: {
          ...prev.boothDetailById,
          [boothId]: {
            boothId,
            exhibitor: firstSafety?.company ?? prev.boothDetailById[boothId]?.exhibitor,
            remarks: firstSafety?.recordContent ?? prev.boothDetailById[boothId]?.remarks,
          },
        },
        safetyByBoothId: { ...prev.safetyByBoothId, ...(firstSafety ? { [boothId]: firstSafety } : {}) },
      }));
      markStageLoaded(stage);
    } catch (err) {
      markStageFailed(stage, err instanceof Error ? err.message : `加载展位 ${boothId} 失败`);
    }
  }, [state.failedStages, markStageLoaded, markStageFailed]);

  const loadOrderCount = useCallback(async (hallIdOrAll: string) => {
    const stage = `order:${hallIdOrAll}`;
    if (state.failedStages.includes(stage)) return;
    const key = hallIdOrAll;
    if (state.orderCountByScope[key] !== undefined) return;

    try {
      const res = hallIdOrAll === 'all'
        ? await screenApi.getOrderCollect(state.exhibitionId)
        : await screenApi.getOrderCollectByHallId(state.exhibitionId, hallIdOrAll);
      const data = res.data as any;
      const count = Number(data?.orderCount ?? data?.count ?? data?.total ?? data?.num ?? 0);
      setState((prev) => ({ ...prev, orderCountByScope: { ...prev.orderCountByScope, [key]: count } }));
      markStageLoaded(stage);
    } catch (err) {
      markStageFailed(stage, err instanceof Error ? err.message : `加载订单统计 ${hallIdOrAll} 失败`);
    }
  }, [state.exhibitionId, state.orderCountByScope, state.failedStages, markStageLoaded, markStageFailed]);

  const getSummary = useCallback((hallIdOrAll: string = 'all'): DashboardSummary => {
    const isAll = hallIdOrAll === 'all';
    const hallIds = isAll ? state.halls.map((h) => h.hallId) : [hallIdOrAll];
    const uniqueBoothIds = Array.from(new Set(hallIds.flatMap((id) => state.boothIdsByHall[id] ?? [])));
    const booths = uniqueBoothIds.map((id) => state.boothById[id]).filter(Boolean);
    const hallSubset = isAll ? state.halls : state.halls.filter((h) => h.hallId === hallIdOrAll);

    const boothCountFromOverview = isAll
      ? (Array.isArray(state.overview)
          ? (state.overview as Array<{ boothNum?: number }>).reduce((sum, item) => sum + toNumber(item?.boothNum), 0)
          : toNumber((state.overview as { boothNum?: number } | null)?.boothNum))
      : 0;
    const boothCount = booths.length > 0 ? booths.length : boothCountFromOverview;

    const reportedCount = booths.length > 0 ? booths.filter((b) => toBoolReported(b.report)).length : 0;
    const unreportedCount = boothCount > 0 ? boothCount - reportedCount : 0;
    const paidCount = booths.length > 0 ? booths.filter((b) => toBoolPaid(b.paid)).length : 0;
    const unpaidCount = boothCount > 0 ? boothCount - paidCount : 0;
    const hallSummary = Array.isArray(state.overview)
      ? state.overview.find((item: any) => item?.hallId === hallIdOrAll)
      : state.overview;

    let abnormalCount = 0;
    let attentionCount = 0;
    let normalCount = 0;
    booths.forEach((b) => {
      const status = toStatusFromSafety(state.safetyByBoothId[b.boothId]);
      if (status === '异常') abnormalCount += 1;
      else if (status === '关注') attentionCount += 1;
      else normalCount += 1;
    });

    const specialBoothCount = isAll
      ? (Array.isArray(state.overview)
          ? (state.overview as Array<{ specialAreaNum?: number }>).reduce((sum, item) => sum + toNumber(item?.specialAreaNum), 0)
          : toNumber((state.overview as { specialAreaNum?: number } | null)?.specialAreaNum))
      : toNumber((hallSummary as any)?.specialAreaNum ?? booths.length);
    const standardBoothCount = isAll
      ? (Array.isArray(state.overview)
          ? (state.overview as Array<{ standardAreaNum?: number }>).reduce((sum, item) => sum + toNumber(item?.standardAreaNum), 0)
          : toNumber((state.overview as { standardAreaNum?: number } | null)?.standardAreaNum))
      : toNumber((hallSummary as any)?.standardAreaNum);
    const specialArea = isAll
      ? (Array.isArray(state.overview)
          ? (state.overview as Array<{ specialArea?: number }>).reduce((sum, item) => sum + toNumber(item?.specialArea), 0)
          : toNumber((state.overview as { specialArea?: number } | null)?.specialArea))
      : toNumber((hallSummary as any)?.specialArea);
    const standArea = isAll
      ? (Array.isArray(state.overview)
          ? (state.overview as Array<{ standArea?: number }>).reduce((sum, item) => sum + toNumber(item?.standArea), 0)
          : toNumber((state.overview as { standArea?: number } | null)?.standArea))
      : toNumber((hallSummary as any)?.standArea);
    const areaFromHall = hallSubset.reduce((sum, h) => sum + toNumber(h.exhibitionArea), 0);
    const totalArea = areaFromHall > 0 ? areaFromHall : specialArea + standArea;

    return {
      exhibitionId: state.exhibitionId,
      hallCount: isAll ? state.halls.length : hallSubset.length,
      boothCount,
      specialBoothCount,
      standardBoothCount,
      specialArea,
      standArea,
      totalArea,
      reportedCount,
      unreportedCount,
      paidCount,
      unpaidCount,
      abnormalCount,
      attentionCount,
      normalCount,
      orderCount: state.orderCountByScope[hallIdOrAll] ?? 0,
    };
  }, [state]);



  const loadAllSequentially = useCallback(async () => {
    if (bootstrapRunRef.current || state.loading || state.loadedStages.includes('all')) return;
    bootstrapRunRef.current = true;
    setLoading(true, '正在加载总览...');
    try {
      await loadOverview();
      markStageLoaded('all');
    } finally {
      setLoading(false, '');
    }
  }, [state.loading, state.loadedStages, loadOverview, markStageLoaded, setLoading]);

  const summary = useMemo(() => ({
    all: getSummary('all'),
    byHall: Object.fromEntries(state.halls.map((h) => [h.hallId, getSummary(h.hallId)])),
  }), [state.halls, getSummary, state.boothById, state.boothIdsByHall, state.safetyByBoothId, state.orderCountByScope, state.overview]);

  const selectors = useMemo(() => ({
    getHallBooths: (hallId: string): SceneBoothItem[] => {
      const ids = state.boothIdsByHall[hallId] ?? [];
      return ids.map((id) => state.boothById[id]).filter(Boolean);
    },
    getHallSafety: (hallId: string): SafetyRecord[] => {
      const ids = state.boothIdsByHall[hallId] ?? [];
      return ids.map((id) => state.safetyByBoothId[id]).filter(Boolean);
    },
    getBoothDetail: (boothId?: string) => (boothId ? state.boothDetailById[boothId] : undefined),
    getBoothSafety: (boothId?: string) => (boothId ? state.safetyByBoothId[boothId] : undefined),
    getBoothStatus: (boothId?: string) => (boothId ? toStatusFromSafety(state.safetyByBoothId[boothId]) : '正常'),
    getHallStats: (hallId: string): HallStats => {
      const summary = getSummary(hallId);
      return {
        total: summary.boothCount,
        normal: summary.normalCount,
        attention: summary.attentionCount,
        abnormal: summary.abnormalCount,
        reported: summary.reportedCount,
        unreported: summary.unreportedCount,
        paidDone: summary.paidCount,
        unpaid: summary.unpaidCount,
      };
    },
    getScopeStats: (hallIdOrAll: string) => {
      const isAll = hallIdOrAll === 'all';
      const hallIds = isAll ? state.halls.map((h) => h.hallId) : [hallIdOrAll];
      const uniqueBoothIds = Array.from(new Set(hallIds.flatMap((id) => state.boothIdsByHall[id] ?? [])));
      const booths = uniqueBoothIds.map((id) => state.boothById[id]).filter(Boolean);

      const summary = getSummary(hallIdOrAll);

      const unpaidRows = booths
        .filter((b) => !toBoolPaid(b.paid))
        .map((b) => ({ boothNo: b.boothNo, exhibitor: b.exhibitor, paid: b.paid, report: b.report, declare: b.declare }));
      const unreportedRows = booths
        .filter((b) => !toBoolReported(b.report))
        .map((b) => ({ boothNo: b.boothNo, exhibitor: b.exhibitor, paid: b.paid, report: b.report, declare: b.declare }));
      const specialRows = booths.map((b) => ({ boothNo: b.boothNo, exhibitor: b.exhibitor, report: b.report, paid: b.paid, declare: b.declare }));
      const safetyRows = booths.map((b) => {
        const s = state.safetyByBoothId[b.boothId] as any;
        return {
          boothNo: b.boothNo,
          exhibitor: b.exhibitor,
          riskLevel: `${s?.riskAssessment ?? ''}` || '一般',
          recordContent: `${s?.recordContent ?? ''}`,
          rectifyStatus: `${s?.rectifyCheckStatus ?? s?.safetyStatus ?? ''}` || '待整改',
          targetCheckTime: `${s?.targetCheckTime ?? ''}`,
        };
      });

      return {
        hallCount: summary.hallCount,
        boothCount: summary.boothCount,
        paidCount: summary.paidCount,
        unpaidCount: summary.unpaidCount,
        reportedCount: summary.reportedCount,
        unreportedCount: summary.unreportedCount,
        abnormalCount: summary.abnormalCount,
        attentionCount: summary.attentionCount,
        normalCount: summary.normalCount,
        totalArea: summary.totalArea,
        specialArea: summary.specialArea,
        standArea: summary.standArea,
        specialBoothCount: summary.specialBoothCount,
        standardBoothCount: summary.standardBoothCount,
        specialRows,
        unpaidRows,
        unreportedRows,
        safetyRows,
        orderCount: summary.orderCount,
      };
    },
    getSummary,
  }), [state, getSummary]);

  return { state, summary, loadOverview, loadHallData, loadBoothDetail, loadOrderCount, loadAllSequentially, setLoading, selectors };
}
