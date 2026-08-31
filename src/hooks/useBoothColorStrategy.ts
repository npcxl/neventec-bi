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

// 地图填充色：审图风险评级（一般/较大/重大）对应的半透明填充，与图例色一致
const SAFETY_RISK_FILL = {
  low: 'rgba(37,99,235,0.8)',    // 一般风险 - 蓝
  medium: 'rgba(250,140,22,0.8)', // 较大风险 - 橙
  high: 'rgba(245,34,45,0.8)',    // 重大风险 - 红
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
  progressRows?: ConstructProgressRow[];
  /** 关键工序-图纸核查汇总（checkDrawings/summary/list），现场安全模式地图颜色按其 riskAssessment 取色 */
  checkDrawingsSummary?: CheckDrawingSummaryRow[];
  /** 展位违规（未整改）列表（safetyHeader/boothViolations）：
   *  hasUnfinishedRectify=true → 地图显示感叹号；
   *  excompanytype=标摊 → 统一视为一般风险（蓝色） */
  boothViolations?: BoothViolationRow[];
};

type CheckDrawingSummaryRow = {
  boothNo?: string;
  boothId?: string;
  riskAssessment?: string;
};

/** 展位违规（未整改）列表项（a/api/safety/safetyHeader/boothViolations） */
type BoothViolationRow = {
  boothNo?: string;
  boothId?: string;
  hasUnfinishedRectify?: boolean;
  /** 展位类型：1/标摊 = 标摊，2/特装 = 特装 */
  excompanytype?: string | number;
  riskAssessment?: string;
};

type ColorStrategy = {
  getColor: (booth: DemoBooth, index: number) => string;
  /** 现场安全模式下有安全风险的展位号集合（key 经 normalizeKey），其他模式为空 */
  riskBoothNos: Set<string>;
  /** 现场安全模式下"未报图"的展位号集合（key 经 normalizeKey）：
   *  特装展位（excompanytype=2）且无任何风险评级（未报图）→ 不填色块，仅白色描边 */
  unreportedBoothNos: Set<string>;
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
  // 注意顺序：high 必须先于 medium，否则「重大风险」含「中」字会被误判为较大风险
  if (v === 'HIGHRISK' || v.includes('重大') || v.includes('严重') || v.includes('高')) return 'high';
  if (v === 'MEDIUMRISK' || v === 'MIDRISK' || v.includes('较大') || v.includes('中风险') || v.includes('中等')) return 'medium';
  if (v === 'LOWRISK' || v.includes('一般') || v.includes('低')) return 'low';
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
    unreportedBoothNos: new Set<string>(),
  };
}

// 与 ConstructFloatCards 搭建进度图例保持一致：未进场为灰色 #ccc
const NOT_ENTERED_COLOR = '#ccc';

function resolveConstructProgressColor(progressValue?: string) {
  const text = normalizeKey(progressValue);
  // 展位状态非 搭建正常/搭建完成/搭建缓慢/严重滞后 的，均视为"未进场"
  if (text.includes('搭建正常')||text.includes('NORMAL_PROGRESS')) return '#2563EB';
  if (text.includes('进度缓慢')||text.includes('搭建缓慢')||text.includes('SLOW_PROGRESS')) return '#FA8C16';
  if (text.includes('严重滞后')||text.includes('DELAY_PROGRESS')) return '#F5222D';
  if (text.includes('搭建完成')||text.includes('COMPLETED_PROGRESS')) return '#63F222';
  // 其余（空值/未知状态等）一律判为未进场
  return NOT_ENTERED_COLOR;
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
    unreportedBoothNos: new Set<string>(),
  };
}

// 现场安全总览地图颜色以"图纸核查汇总"(checkDrawings/summary/list) 接口的
// riskAssessment（审图风险评级）为准，取适配审图风险评级的颜色（一般/较大/重大）。
/** 判断展位类型是否为"标摊"（excompanytype：1 或 含"标摊"文字） */
function isStandardBooth(excompanytype?: string | number): boolean {
  if (excompanytype == null) return false;
  const v = String(excompanytype).trim();
  return v === '1' || v.includes('标摊') || v.toUpperCase() === 'STANDARD';
}

function createSafetyOverviewStrategy(
  safetyRows: SafetyRecordRow[] = [],
  checkDrawingsSummary: CheckDrawingSummaryRow[] = [],
  boothViolations: BoothViolationRow[] = [],
): ColorStrategy {
  const riskMap = checkDrawingsSummary.reduce<Record<string, CheckDrawingSummaryRow>>(
    (acc, row) => {
      const keys = [row.boothNo, row.boothId]
        .filter((v): v is string => Boolean(v))
        .map(normalizeKey);
      for (const key of keys) {
        acc[key] = row; // 后者覆盖前者 -> 保留最新记录
      }
      return acc;
    },
    {},
  );

  // 展位违规（未整改）列表 → 感叹号集合 / 风险等级（完全以本接口为准，不再用 checkDrawingsSummary 的 riskAssessment 判感叹号）
  //  - 标摊（excompanytype=1）→ 一律"一般风险"(low/蓝)配色，但**不显示感叹号**
  //  - 感叹号仅取决于 hasUnfinishedRectify === true（不分展位类型）
  const standardBoothNos = new Set<string>();
  const unfinishedRectifyNos = new Set<string>();
  for (const row of boothViolations) {
    const keys = [row.boothNo, row.boothId]
      .filter((v): v is string => Boolean(v))
      .map(normalizeKey);
    if (keys.length === 0) continue;
    for (const key of keys) {
      if (row.hasUnfinishedRectify === true) {
        unfinishedRectifyNos.add(key);
      }
      if (isStandardBooth(row.excompanytype)) {
        standardBoothNos.add(key);
      }
    }
  }

  // 感叹号集合 = 仅 hasUnfinishedRectify=true（标摊不显示感叹号）
  const riskBoothNos = new Set<string>();
  for (const no of unfinishedRectifyNos) {
    riskBoothNos.add(no);
  }

  // 未报图集合 = 特装展位（excompanytype=2）且无任何风险评级（未报图）
  // → 不展示色块，仅白色标边
  const unreportedBoothNos = new Set<string>();
  for (const row of boothViolations) {
    // 仅特装展位参与"未报图"判定
    if (isStandardBooth(row.excompanytype)) continue;
    const keys = [row.boothNo, row.boothId]
      .filter((v): v is string => Boolean(v))
      .map(normalizeKey);
    if (keys.length === 0) continue;
    // 无任何风险评级：既没有图纸核查的 riskAssessment，也没有未整改违规
    const hasAssessment = keys.some(
      (key) => Boolean(normalizeRiskLevel(riskMap[key]?.riskAssessment)),
    );
    const hasUnfinished = keys.some((key) => unfinishedRectifyNos.has(key));
    if (!hasAssessment && !hasUnfinished) {
      for (const key of keys) unreportedBoothNos.add(key);
    }
  }

  return {
    getColor: (booth) => {
      const boothKey = normalizeKey(booth.booth_no || booth.raw_texts?.[0]);
      // 标摊一律"一般风险"；其他展位沿用图纸核查的 riskAssessment（若有）
      const level = standardBoothNos.has(boothKey)
        ? 'low'
        : normalizeRiskLevel(riskMap[boothKey]?.riskAssessment);
      const color = level ? SAFETY_RISK_FILL[level] : DEFAULT_COLOR;
      return color;
    },
    riskBoothNos,
    unreportedBoothNos,
  };
}

function createStrategy(
  moduleMode: ModuleMode,
  boothRows: BoothRow[],
  safetyRows: SafetyRecordRow[],
  progressRows: ConstructProgressRow[],
  checkDrawingsSummary: CheckDrawingSummaryRow[] = [],
  boothViolations: BoothViolationRow[] = [],
): ColorStrategy {
  if (moduleMode === 'ExhibitionOverview') return createExhibitionOverviewStrategy(boothRows);
  if (moduleMode === 'ConstructOverview') return createConstructOverviewStrategy(progressRows);
  return createSafetyOverviewStrategy(safetyRows, checkDrawingsSummary, boothViolations);
}

export function useBoothColorStrategy({
  moduleMode,
  boothRows = [],
  safetyRows = [],
  progressRows = [],
  checkDrawingsSummary = [],
  boothViolations = [],
}: UseBoothColorStrategyOptions) {
  return useMemo(
    () =>
      createStrategy(
        moduleMode,
        boothRows,
        safetyRows,
        progressRows,
        checkDrawingsSummary,
        boothViolations,
      ),
    [boothRows, safetyRows, progressRows, checkDrawingsSummary, boothViolations, moduleMode],
  );
}
