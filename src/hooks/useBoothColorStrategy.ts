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

// 安全风险等级图例颜色（与 SafetyFloatCards RISK_LEGEND 保持一致）
const SAFETY_RISK_COLORS = {
  low: '#2563EB',     // 一般风险 - 蓝
  medium: '#FA8C16',  // 较大风险 - 橙
  high: '#F5222D',    // 重大风险 - 红
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
  /** 现场安全模式下有安全风险的展位号集合（key 经 normalizeKey），其他模式为空 */
  riskBoothNos: Set<string>;
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

function normalizeRiskLevel(value?: string): '' | 'low' | 'medium' | 'high' {
  const v = normalizeKey(value).toUpperCase();
  if (!v) return '';
  if (v === 'LOWRISK' || v.includes('一般') || v.includes('低')) return 'low';
  if (v === 'MEDIUMRISK' || v === 'MIDRISK' || v.includes('较大') || v.includes('中')) return 'medium';
  if (v === 'HIGHRISK' || v.includes('重大') || v.includes('严重') || v.includes('高')) return 'high';
  return '';
}

function resolveSafetyColor(status?: string) {
  const level = normalizeRiskLevel(status);
  if (level) return SAFETY_RISK_COLORS[level];
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
    riskBoothNos: new Set<string>(),
  };
}

function resolveConstructProgressColor(progressValue?: string) {
  const text = normalizeKey(progressValue);
  if (!text) return DEFAULT_COLOR;
  if (text.includes('搭建正常')||text.includes('NORMAL_PROGRESS')) return '#2563EB';
  if (text.includes('进度缓慢')||text.includes('搭建缓慢')||text.includes('SLOW_PROGRESS')) return '#FA8C16';
  if (text.includes('严重滞后')||text.includes('DELAY_PROGRESS')) return '#F5222D';
  if (text.includes('搭建完成')||text.includes('COMPLETED_PROGRESS')) return '#63F222';
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
    riskBoothNos: new Set<string>(),
  };
}

// 同一展位多条记录时，保留最新一条（后面的覆盖前面的），
// 这样"第一天有隐患、第二天整改合格"的展位最终按最新状态取色，隐患不再显示
function createSafetyOverviewStrategy(safetyRows: SafetyRecordRow[]): ColorStrategy {
  const riskMap = safetyRows.reduce<Record<string, SafetyRecordRow>>((acc, row) => {
    const keys = [row.boothNo, row.boothId]
      .filter((v): v is string => Boolean(v))
      .map(normalizeKey);
    for (const key of keys) {
      acc[key] = row; // 后者覆盖前者 -> 保留最新记录
    }
    return acc;
  }, {});
  console.log('[地图取色-riskMap] 风险记录索引 keys=%o', Object.keys(riskMap));

  // 基于同一 riskMap 计算"有安全风险"的展位集合（与 getColor 判定口径一致）
  const riskBoothNos = new Set<string>();
  for (const [key, row] of Object.entries(riskMap)) {
    const level = normalizeRiskLevel(row?.riskAssessment);
    const status = normalizeKey(row?.rectifyCheckStatus);
    const isRisk =
      Boolean(level) ||
      status === '待整改' ||
      status === '未整改' ||
      status === '整改不合格' ||
      status === '拒不整改';
    if (isRisk) riskBoothNos.add(key);
  }

  return {
    getColor: (booth) => {
      const boothKey = normalizeKey(booth.booth_no || booth.raw_texts?.[0]);
      const row = riskMap[boothKey];
      // 风险等级优先（与图例一致：一般/较大/重大 -> 蓝/橙/红），兼容枚举 code
      const level = normalizeRiskLevel(row?.riskAssessment);
      let color: string;
      if (level) {
        color = SAFETY_RISK_COLORS[level];
      } else {
        // 无风险等级时回退到整改状态
        const status = normalizeKey(row?.rectifyCheckStatus);
        if (status === '整改合格') color = 'rgba(99,242,34,0.8)';
        else if (status === '待整改' || status === '未整改') color = 'rgba(250,140,22,0.8)';
        else if (status === '整改不合格') color = 'rgba(245,34,45,0.8)';
        else if (status === '拒不整改') color = 'rgba(37,99,235,0.8)';
        else if (status === '已作废' || status === '作废') color = 'rgba(107,124,147,0.8)';
        else color = 'rgba(5, 212, 248, 0.97)';
      }
      console.log(
        '[地图取色] boothKey=%s | riskAssessment=%s | 归一化等级=%s | 整改状态=%s | 最终颜色=%s',
        boothKey,
        row?.riskAssessment ?? '(空)',
        level || '(无)',
        normalizeKey(row?.rectifyCheckStatus) || '(空)',
        color,
      );
      return color;
    },
    riskBoothNos,
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
