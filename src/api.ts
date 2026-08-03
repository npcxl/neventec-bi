const API_BASE_URL = import.meta.env.VITE_EHS_API_BASE_URL ?? '/ehs-api';

function normalizeApiBaseUrl(baseUrl: string) {
  const trimmed = baseUrl.trim();
  if (!trimmed) return '/ehs-api';
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('/')) return trimmed.replace(/\/$/, '');
  return `/${trimmed.replace(/^\/+/, '').replace(/\/$/, '')}`;
}

type HttpMethod = 'GET' | 'POST';

type QueryValue = string | number | boolean | undefined | null;
type Query = Record<string, QueryValue>;

type RequestOptions = {
  method?: HttpMethod;
  query?: Query;
  body?: unknown;
  signal?: AbortSignal;
  retry?: boolean;
  retryCount?: number;
};

type ApiResponse<T> = {
  resultCode: number;
  message?: string;
  data: T;
};

function buildUrl(path: string, query?: Query) {
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  const base = normalizeApiBaseUrl(API_BASE_URL);
  const url = `${base.endsWith('/') ? base : `${base}/`}${normalizedPath}`;
  if (!query) return url;
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.set(key, String(value));
    }
  });

  const qs = params.toString();
  return qs ? `${url}${url.includes('?') ? '&' : '?'}${qs}` : url;
}

const RETRYABLE_STATUS_CODES = new Set([404, 408, 429, 500, 502, 503, 504]);
const DEFAULT_RETRY_COUNT = 4;
const DEFAULT_RETRY_BASE_DELAY_MS = 1200;

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function shouldRetryStatus(status: number) {
  return RETRYABLE_STATUS_CODES.has(status);
}

async function request<T>(path: string, options: RequestOptions = {}) {
  const method = options.method ?? 'GET';
  const url = buildUrl(path, options.query);
  const retryCount = options.retryCount ?? DEFAULT_RETRY_COUNT;
  const retryEnabled = options.retry !== false;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    if (options.signal?.aborted) {
      throw new Error(`网络请求已中止：${url}`);
    }

    try {
      const response = await fetch(url, {
        method,
        headers: method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
        body: method === 'POST' ? JSON.stringify(options.body ?? {}) : undefined,
        signal: options.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        const error = new Error(`API ${response.status}: ${text}`);
        if (retryEnabled && attempt < retryCount && shouldRetryStatus(response.status)) {
          const delayMs = DEFAULT_RETRY_BASE_DELAY_MS * (attempt + 1);
          await sleep(delayMs);
          lastError = error;
          continue;
        }
        throw error;
      }

      return response.json() as Promise<ApiResponse<T>>;
    } catch (error) {
      const isAbortError = error instanceof DOMException ? error.name === 'AbortError' : error instanceof Error && error.message.includes('aborted');
      if (isAbortError) {
        throw new Error(`网络请求已中止：${url}`);
      }

      if (retryEnabled && attempt < retryCount) {
        lastError = error;
        const delayMs = DEFAULT_RETRY_BASE_DELAY_MS * (attempt + 1);
        await sleep(delayMs);
        continue;
      }

      const details = error instanceof Error ? error.message : String(error);
      throw new Error(`网络请求失败：${url} (${details})`);
    }
  }

  const details = lastError instanceof Error ? lastError.message : String(lastError ?? 'unknown error');
  throw new Error(`网络请求失败：${url} (${details})`);
}

export type GalleryInfo = {
  boothNum: number;//展会数量
  specialArea: number;//特装展位面积
  standArea: number;//标准展位面积
  specialAreaNum: number;//特装展位数量
  standardAreaNum: number;//标准展位数量
  expoid?: string;//展会ID
  expoName?: string;//展会名称
  hallId?: string;//展馆ID
  hallName?: string;//展馆名称
};

export type SceneBoothItem = {
  boothNo: string;
  boothId: string;
  exhibitor: string;
  report: string;
  paid: string;
  declare: string;
  expoid: string;
  expoName: string;
  hallId: string;
  hallName: string;
};

export type OrderCollectItem = {
  name: string;
  num: number;
};

export type BoothProgressEnum = 10 | 11 | 12 | 13 | 14 | 15;

export type BoothProgressItem = {
  enumName: BoothProgressEnum | number;
  num: number;
  expoid: string;
  expoName: string;
  hallId: string;
  hallName: string;
};

export const screenApi = {
  //第一部分 展会信息概览=================================================

  // 1.1 展馆信息预览 - 获取所有展馆信息
  getGalleryInfo: (expoid: string, signal?: AbortSignal) =>
    request<GalleryInfo>('a/api/gallery/galleryInfo', { query: { expoid }, signal }),
  // 1.1.1 获取指定展馆信息 - 获取指定展馆信息
  getGalleryInfoByHallId: (hallId: string, signal?: AbortSignal) =>
    request<GalleryInfo>('a/api/gallery/galleryInfo', { query: { hallId }, signal }),

  // 1.2 特装展会申报情况 boothNo?: string; pageNo?: number; pageSize?: number

  getSceneBoothPageInfo: (
    expoid: string,
    signal?: AbortSignal,
  ) => request<SceneBoothItem[]>('a/api/sceneBoothNumber/pageInfo', { query: { expoid }, signal }),

  // 1.2.1 获取指定特装展馆信息
  getSceneBoothPageInfoByHallId: (expoid: string, hallId: string, signal?: AbortSignal) =>
    request<SceneBoothItem[]>('a/api/sceneBoothNumber/pageInfo', { query: { expoid, hallId }, signal }),

  getSceneBoothInfoByBoothNo: (expoid: string, hallId: string, signal?: AbortSignal) =>
    request<SceneBoothItem>('a/api/sceneBoothNumber/pageInfo', { query: { expoid, hallId }, signal }),
  //获取申报类别统计
  getSceneBoothDeclareType: (expoid: string, signal?: AbortSignal) =>
    request<OrderCollectItem[]>('a/api/order/orderCollect', { query: { expoid }, signal }),
  //获取申报类别展馆统计
  getSceneBoothDeclareTypeByHallId: (expoid: string, hallId: string, signal?: AbortSignal) =>
    request<OrderCollectItem[]>('a/api/order/orderCollect', { query: { expoid, hallId }, signal }),
  // // 1.3 中部大屏-展会底图
  // getProgressPage: (
  //   params: { exhibitionId: string; hallId?: string; pageNo?: number; pageSize?: number },
  //   signal?: AbortSignal,
  // ) => request<any>('a/api/project/progress/progressPage', { query: params, signal }),

  // 1.3.3 中部大屏对应展位详情
  getBoothScreenDetail: (exhibitionId: string, boothNo: string, signal?: AbortSignal) =>
    request<any>('a/api/booth/progress/screen/booth', { query: { exhibitionId, boothNo }, signal }),
    

  // 1.4/1.5 展位费用缴纳与未报到汇总
  getBoothExpense: (
    expoid: string,
    signal?: AbortSignal,
  ) => request<any>('a/api/sceneBoothNumber/expense', { query: { expoid }, signal }),

  // 1.4.1 获取指定展馆费用缴纳情况 
  getBoothExpenseByHallId: (expoid: string, hallId: string, signal?: AbortSignal) =>
    request<any>('a/api/sceneBoothNumber/expense', { query: { expoid, hallId }, signal }),

  // 1.6 水电气网络申报 
  getOrderCollect: (
    expoid: string,
    signal?: AbortSignal,
  ) => request<any>('a/api/order/orderCollect', { query: { expoid }, signal }),

  // 1.6.1 获取指定展馆水电气网络申报情况
  getOrderCollectByHallId: (expoid: string, hallId: string, signal?: AbortSignal) =>
    request<any>('a/api/order/orderCollect', { query: { expoid, hallId }, signal }),


  //第二部分 安全信息概览=================================================

  // 2.1 查处违规汇总
  getSafetyCollect: (
    expoid: string,
    signal?: AbortSignal,
  ) => request<any>('a/api/safety/safetyHeader/collect', { query: { expoid }, signal }),

  // 2.1.1 获取指定展馆安全信息概览
  getSafetyCollectByHallId: (expoid: string, hallId: string, signal?: AbortSignal) =>
    request<any>('a/api/safety/safetyHeader/collect', { query: { expoid, hallId }, signal }),


  // 2.2 现场违规记录
  getSafetyPageInfo: (expoid: string, signal?: AbortSignal) =>
    request<any>('a/api/safety/safetyHeader/pageInfo', { query: { expoid }, signal }),

  // 2.2.1 获取指定展馆现场违规记录
  getSafetyPageInfoByHallId: (expoid: string, hallId: string, signal?: AbortSignal) =>
    request<any>('a/api/safety/safetyHeader/pageInfo', { query: { expoid, hallId }, signal }),


  // 2.3 中部大屏数据 现场安全
  getSafetyScreenBooth: (expoid: string, hallId: string, boothNo?: string, signal?: AbortSignal) =>
    request<any>('a/api/booth/progress/safetyScreen/booth', { query: { expoid, hallId, boothNo }, signal }),

  // 2.4 违规风险等级 右上 1
  getViolationType: (exhibitionId: string, signal?: AbortSignal) =>
    request<any>('a/safety/safetyHeader/summary/getViolationType', { query: { exhibitionId }, signal }),
  // 2.4.1 获取指定展馆违规风险等级
  getViolationTypeByHallId: (exhibitionId: string, hallId: string, signal?: AbortSignal) =>
    request<any>('a/safety/safetyHeader/summary/getViolationType', { query: { exhibitionId, hallId }, signal }),

  // 2.5 违规类型统计 右中
  getViolationRecord: (exhibitionId: string, signal?: AbortSignal) =>
    request<any>('a/safety/safetyHeader/summary/getViolationRisk', { query: { exhibitionId }, signal }),

  // 2.5.1 获取指定展馆现场违规记录统计
  getViolationRecordByHallId: (exhibitionId: string, hallId: string, signal?: AbortSignal) =>
    request<any>('a/safety/safetyHeader/summary/getViolationRisk', { query: { exhibitionId, hallId }, signal }),

  //2.6.0现场违规图片 展会总览
  getViolationPictureByHallId: (exhibitionId: string, signal?: AbortSignal) =>
    request<any>('a/safety/safetyHeader/summary/getViolationRecord', { query: { exhibitionId}, signal }),
  
  //现场违规图片 指定展馆 
  getViolationPictureByHallIdAndBoothNo: (exhibitionId: string, hallId: string, signal?: AbortSignal) =>
    request<any>('a/safety/safetyHeader/summary/getViolationRecord', { query: { exhibitionId, hallId }, signal }),

  //2.6.1现场违规图片返回 点击echarts图表弹出图片
  getViolationPicture: (exhibitionId: string, hallId: string, boothNo: string, signal?: AbortSignal) =>
    request<any>('a/safety/safetyHeader/summary/getViolationRecord', { query: { exhibitionId, hallId, boothNo }, signal }),

  // 2.7 违规整改情况-违规情况
  getViolationSituation: (exhibitionId: string, signal?: AbortSignal) =>
    request<any>('a/safety/safetyHeader/summary/getRectificationSituation', { query: { exhibitionId }, signal }),

  // 2.7.1 获取指定展馆违规整改情况-整改情况
  getRectificationSituationByHallId: (exhibitionId: string, hallId: string, signal?: AbortSignal) =>
    request<any>('a/safety/safetyHeader/summary/getRectificationSituation', { query: { exhibitionId, hallId }, signal }),



  //第三部分 搭建信息概览=================================================

  // 3.1 搭建情况总览
  getConstructOverview: (exhibitionId: string, signal?: AbortSignal) =>
    request<any>('a/api/booth/progress/summary/getConstructOverview', { query: { exhibitionId }, signal }),
  //3.1.1 获取指定展馆搭建情况总览
  getConstructOverviewByHallId: (exhibitionId: string, hallId: string, signal?: AbortSignal) =>
    request<any>('a/api/booth/progress/summary/getConstructOverview', { query: { exhibitionId, hallId }, signal }),


  // 3.2 搭建进程明细
  getConstructProcess: (exhibitionId: string, signal?: AbortSignal) =>
    request<any>('a/api/inspection/record/summary/all', { query: { exhibitionId }, signal }),
  //3.2.1 获取指定展馆搭建进程明细
  getConstructProcessByHallId: (exhibitionId: string, hallId: string, signal?: AbortSignal) =>
    request<any>('a/api/inspection/record/summary/all', { query: { exhibitionId, hallId }, signal }),
  
  //3.2.2 获取指定展馆搭建进程明细
  getConstructProcessByHallIdAndBoothNo: (exhibitionId: string, hallId: string, boothNo: string, signal?: AbortSignal) =>
    request<any>('a/api/inspection/record/summary/all', { query: { exhibitionId, hallId,boothNo }, signal }),
  
  //获取搭建进程明细2
  getConstructProcessByHallInfo: (exhibitionId: string, hallId: string, boothNo: string, signal?: AbortSignal) =>
    request<any>('/a/api/inspection/record/summary/info', { query: { exhibitionId, hallId,boothNo }, signal }),
  // 3.3 中部大屏统计 -- 待集合python服务 重构数据和接口逻辑
  getScreenStatistics: (hallId: string, signal?: AbortSignal) =>
    request<any>('a/safety/safetyHeader/summary/getScreenStatistics', { query: { hallId }, signal }),

  // 3.4 展位搭建记录统计 
  getConstructRecord: (exhibitionId: string, signal?: AbortSignal) =>
    request<any>('a/api/inspection/record/summary/getConstructRecord', { query: { exhibitionId }, signal }),
  //3.4.0 分页查询 只用作与图片的分页[优化方案]
  getConstructRecordPage: (exhibitionId: string, pageNum: number, pageSize: number, signal?: AbortSignal) =>
    request<any>('a/api/inspection/record/summary/getConstructRecord/page', { query: { exhibitionId, pageNum, pageSize }, signal }),
  //3.4.1 获取指定展馆展位搭建记录统计
  getConstructRecordByHallId: (exhibitionId: string, hallId: string, signal?: AbortSignal) =>
    request<any>('a/api/inspection/record/summary/getConstructRecord', { query: { exhibitionId, hallId }, signal }),
  //获取指定展位展位搭建记录统计图片 点击echarts图表更新ehcats
  getBoothProgressPictureByBoothId: (exhibitionId: string, boothId: string, signal?: AbortSignal) =>
    request<any>('a/api/inspection/record/summary/getConstructRecord', { query: { exhibitionId, boothId }, signal }),


  // 3.5 主体结构材质
  getMaterialStatistics: (exhibitionId: string, signal?: AbortSignal) =>
    request<any>('a/api/booth/progress/summary/getMaterialStatistics', { query: { exhibitionId }, signal }),
  //3.5.1 获取指定展馆主体结构材质
  getMaterialStatisticsByHallId: (exhibitionId: string, hallId: string, signal?: AbortSignal) =>
    request<any>('a/api/booth/progress/summary/getMaterialStatistics', { query: { exhibitionId, hallId }, signal }),

  //3.6 展位进程情况
  getBoothProcess: (exhibitionId: string, signal?: AbortSignal) =>
    request<any>('a/api/inspection/record/summary/getBoothProgress', { query: { exhibitionId }, signal }),
  //3.6.1 获取指定展馆展位进程情况
  getBoothProcessByHallId: (exhibitionId: string, hallId: string, signal?: AbortSignal) =>
    request<BoothProgressItem[]>('a/api/inspection/record/summary/getBoothProgress', { query: { exhibitionId, hallId }, signal }),


  // 3.7 展会进程情况（完成率）  
  getExhibitionProcess: (exhibitionId: string, signal?: AbortSignal) =>
    request<any>('a/api/inspection/record/summary/getExhibitionProcess', { query: { exhibitionId }, signal }),
  //3.7.1 获取指定展馆展会进程情况（完成率）
  getExhibitionProcessByHallId: (exhibitionId: string, hallId: string, signal?: AbortSignal) =>
    request<any>('a/api/inspection/record/summary/getExhibitionProcess', { query: { exhibitionId, hallId }, signal }),

  //3.8 获取展位详情
  getBoothDetail: (exhibitionId: string, hallId: string, boothId: string, signal?: AbortSignal) =>
    request<any>('a/api/booth/progress/screen/booth', { query: { exhibitionId, hallId, boothId }, signal }),

  //展位搭建记录统计图片
  getBoothProgressPicture: (exhibitionId: string, signal?: AbortSignal) =>
    request<any>('a/api/inspection/record/summary/getConstructRecord', { query: { exhibitionId }, signal }),
  //获取指定展馆展位搭建记录统计图片  
  getBoothProgressPictureByHallId: (exhibitionId: string, hallId: string, signal?: AbortSignal) =>
    request<any>('a/api/inspection/record/summary/getConstructRecord', { query: { exhibitionId, hallId }, signal }),
  //获取指定展位展位搭建记录统计图片 点击echarts图表更新ehcats下列图片 现场违规图片。
  getBoothProgressPictureByDetailBoothId: (exhibitionId: string, boothNo: string, hallId: string, signal?: AbortSignal) =>
    request<any>('a/api/inspection/record/summary/getConstructRecord', { query: { exhibitionId, boothNo, hallId }, signal }),
   
  //获取展厅的可视化/a/api/safety/coord/ByHallId 定。
  getSafetyCoordByHallId: (hallId: string, signal?: AbortSignal) =>
    request<any>('a/api/safety/coord/ByHallId', { query: { hallId }, signal }),

};



export const screenApiBaseUrl = API_BASE_URL;
