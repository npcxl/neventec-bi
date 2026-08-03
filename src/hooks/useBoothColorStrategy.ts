import { useMemo } from 'react';

type BoothRow = {
  boothNo?: string;
  boothId?: string;
  paid?: string;
};

type SafetyRecordRow = {
  boothId?: string;
  boothNo?: string;
  rectifyCheckStatus?: string;
  safetyStatus?: string;
  riskAssessment?: string;
};

type ConstructProgressRow = {
  boothId?: string;
  boothNo?: string;
  boothNumber?: string;
  exNun?: string;
  progressValue?: string;
};

type DemoBooth = {
  booth_no: string | null;
  raw_texts?: string[];
};

type ModuleMode = 'ExhibitionOverview' | 'ConstructOverview' | 'SafetyOverview';

type UseBoothColorStrategyOptions = {
  moduleMode: ModuleMode;
  boothRows?: BoothRow[];
  safetyRows?: SafetyRecordRow[];
};

type ColorStrategy = {
  getColor: (booth: DemoBooth, index: number) => string;
};

const DEFAULT_COLOR = 'rgba(5, 212, 248, 0.7)';
const WARNING_COLOR = 'rgba(60, 255, 0, 0.7)';
const CAUTION_COLOR = 'rgba(255, 208, 94, 0.7)';
const DANGER_COLOR = 'rgba(252, 212, 212, 0.7)';
const DONE_COLOR = 'rgba(127, 231, 196, 0.7)';
const MATERIAL_COLOR = 'rgba(216, 166, 255, 0.7)';

function normalizeKey(value?: string | null) {
  return String(value ?? '').trim();
}

function resolvePaidColor(paid?: string) {
  const text = normalizeKey(paid);
  if (!text) return DEFAULT_COLOR;

  const unpaidKeywords = ['未缴', '未支付', '未付款', '待缴', '欠费', '欠缴', '未结清', '未缴清', '部分缴费', '未完成'];
  if (unpaidKeywords.some((keyword) => text.includes(keyword))) {
    return CAUTION_COLOR;
  }

  return DEFAULT_COLOR;
}

function resolveSafetyColor(status?: string) {
  const text = normalizeKey(status);
  if (!text) return DEFAULT_COLOR;
  if (text.includes('一般风险')) return '#FAAD14';
  if (text.includes('较大风险')) return '#F5222D';
  return DEFAULT_COLOR;
}

function createExhibitionOverviewStrategy(boothRows: BoothRow[]): ColorStrategy {
  const paidMap = boothRows.reduce<Record<string, string>>((acc, row) => {
    const paid = normalizeKey(row.paid);
    if (row.boothNo) acc[normalizeKey(row.boothNo)] = paid;
    if (row.boothId) acc[normalizeKey(row.boothId)] = paid;
    return acc;
  }, {});

  return {
    getColor: (booth) => {
      const boothKey = normalizeKey(booth.booth_no || booth.raw_texts?.[0]);
      return resolvePaidColor(paidMap[boothKey]);
    },
  };
}

function resolveConstructProgressColor(progressValue?: string) {
  const text = normalizeKey(progressValue);
  if (!text) return DEFAULT_COLOR;
  if (text.includes('暂未入场')||text.includes('NOT_ADMISSIBLE_PROGRESS')) return '#8fb4d8';
  if (text.includes('搭建正常')||text.includes('NORMAL_PROGRESS')) return '#6dc8ff';
  if (text.includes('进度缓慢')||text.includes('SLOW_PROGRESS')) return '#ffb84d';
  if (text.includes('严重滞后')||text.includes('DELAY_PROGRESS')) return '#ff8f8f';
  if (text.includes('搭建完成')||text.includes('COMPLETED_PROGRESS')) return '#7fe7c4';
  if (text.includes('有搭建材料') || text.includes('未搭建')||text.includes('BUILDING_MATERIALS_NOT_BUILT')) return '#d8a6ff';
  return DEFAULT_COLOR;
}

function createConstructOverviewStrategy(progressRows: ConstructProgressRow[] = []): ColorStrategy {
  const progressMap = progressRows.reduce<Record<string, string>>((acc, row) => {
    const progressValue = normalizeKey(row.progressValue);
    if (row.boothNo) acc[normalizeKey(row.boothNo)] = progressValue;
    if (row.boothId) acc[normalizeKey(row.boothId)] = progressValue;
    return acc;
  }, {});

  return {
    getColor: (booth) => {
      const boothKey = normalizeKey(booth.booth_no || booth.raw_texts?.[0]);
      return resolveConstructProgressColor(progressMap[boothKey]);
    },
  };
}

function createSafetyOverviewStrategy(safetyRows: SafetyRecordRow[]): ColorStrategy {
  const statusMap = safetyRows.reduce<Record<string, string>>((acc, row) => {
    const status = normalizeKey(row.rectifyCheckStatus);
    if (row.boothNo) acc[normalizeKey(row.boothNo)] = status;
    if (row.boothId) acc[normalizeKey(row.boothId)] = status;
    return acc;
  }, {});
 
  return {
    getColor: (booth) => {
      const boothKey = normalizeKey(booth.booth_no || booth.raw_texts?.[0]);
      const status = statusMap[boothKey];
      if (status === '整改合格') return 'rgb(53, 213, 167,0.8)';
      if (status === '待整改' || status === '未整改') return 'rgb(250, 173, 20,0.8)';
      if (status === '整改不合格') return 'rgb(255, 34, 45,0.8)';
      if (status === '拒不整改') return 'rgb(0, 127, 255,0.8)';
      if (status === '已作废' || status === '作废') return 'rgb(153, 153, 153,0.8)';
      return 'rgba(5, 212, 248, 0.97)';
    },
  };
}

function createStrategy(moduleMode: ModuleMode, boothRows: BoothRow[], safetyRows: SafetyRecordRow[], progressRows: ConstructProgressRow[]): ColorStrategy {
  if (moduleMode === 'ExhibitionOverview') return createExhibitionOverviewStrategy(boothRows);
  if (moduleMode === 'ConstructOverview') return createConstructOverviewStrategy(progressRows);
  return createSafetyOverviewStrategy(safetyRows);
}

export function useBoothColorStrategy({ moduleMode, boothRows = [], safetyRows = [], progressRows = [] as ConstructProgressRow[] }: UseBoothColorStrategyOptions & { progressRows?: ConstructProgressRow[] }) {
  return useMemo(() => createStrategy(moduleMode, boothRows, safetyRows, progressRows), [boothRows, safetyRows, progressRows, moduleMode]);
}
