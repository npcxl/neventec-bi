import { useMemo } from 'react';

export type ConstructProgressMeta = {
  label: string;
  color: string;
  icon: string;
};

export const CONSTRUCT_PROGRESS_META: Record<string, ConstructProgressMeta> = {
  '10': { label: '暂未入场(空地)', color: 'text-[#8fb4d8]', icon: 'mdi:map-marker-off-outline' },
  '11': { label: '搭建正常', color: 'text-[#2563EB]', icon: 'mdi:check-circle-outline' },
  '12': { label: '搭建缓慢', color: 'text-[#FA8C16]', icon: 'mdi:clock-alert-outline' },
  '13': { label: '严重滞后', color: 'text-[#F5222D]', icon: 'mdi:alert-octagon-outline' },
  '14': { label: '搭建完成', color: 'text-[#63F222]', icon: 'mdi:checkbox-marked-circle-outline' },
  '15': { label: '有搭建材料（未搭建）', color: 'text-[#8fb4d8]', icon: 'mdi:package-variant-closed' },
};

export const CONSTRUCT_PROGRESS_NAME_TO_CODE: Record<string, string> = {
  NOT_ADMISSIBLE_PROGRESS: '10',
  NORMAL_PROGRESS: '11',
  SLOW_PROGRESS: '12',
  DELAY_PROGRESS: '13',
  COMPLETED_PROGRESS: '14',
  BUILDING_MATERIALS_NOT_BUILT: '15',
};

export const CONSTRUCT_PROGRESS_ALIAS: Record<string, string> = {
  ...CONSTRUCT_PROGRESS_NAME_TO_CODE,
  暂未入场: '10',
  空地: '10',
  搭建正常: '11',
  进度缓慢: '12',
  严重滞后: '13',
  搭建完成: '14',
  '有搭建材料（未搭建）': '15',
};


type ConstructOverviewRow = {
  name?: string;
  enumName?: number | string;
  num?: number | string;
  ratio?: number | string;
  progressStatus?: number | string;
  completion?: number | string;
  commence?: number | string;
};

type ConstructProcessRow = {
  progressStatus?: number | string;
  status?: number | string;
  processStatus?: number | string;
  enumName?: number | string;
  completion?: number | string;
  commence?: number | string;
};

type ConstructOverviewContainer = Partial<{
  data: ConstructOverviewRow[];
  list: ConstructOverviewRow[];
  rows: ConstructOverviewRow[];
}>;

type ConstructProcessContainer = Partial<{
  data: ConstructProcessRow[];
  list: ConstructProcessRow[];
  rows: ConstructProcessRow[];
}>;

type ConstructProgressOptions = {
  overviewData?: ConstructOverviewRow[] | ConstructOverviewContainer;
  processData?: ConstructProcessRow[] | ConstructProcessContainer;
  hallId?: string;
  hallFilterEnabled?: boolean;
};

function toArray<T>(data?: T[] | Partial<{ data: T[]; list: T[]; rows: T[] }>): T[] {
  if (Array.isArray(data)) return data;
  if (!data) return [];
  return data.data ?? data.list ?? data.rows ?? [];
}

function normalizeProgressKey(value?: string | number) {
  const key = `${value ?? ''}`.trim();
  return CONSTRUCT_PROGRESS_ALIAS[key] ?? key;
}

function toStringValue(value?: string | number) {
  return `${value ?? ''}`.trim();
}

export function useConstructProgress({
  overviewData,
  processData,
  hallId = 'all',
  hallFilterEnabled = true,
}: ConstructProgressOptions) {
  return useMemo(() => {
    const overviewRows = toArray(overviewData);
    const processRows = toArray(processData);
    const shouldFilterByHall = hallFilterEnabled && hallId !== 'all';

    const visibleOverviewRows = shouldFilterByHall
      ? overviewRows.filter((row: ConstructOverviewRow) => toStringValue((row as any).hallId) === hallId)
      : overviewRows;
    const visibleProcessRows = shouldFilterByHall
      ? processRows.filter((row: ConstructProcessRow) => toStringValue((row as any).hallId) === hallId)
      : processRows;

    const progressSummary = visibleOverviewRows.reduce((acc: Record<string, number>, row: ConstructOverviewRow) => {
      const key = normalizeProgressKey(row.enumName ?? row.name ?? row.progressStatus ?? row.completion ?? row.commence ?? '未知');
      const count = Number(row.num ?? 0) || 0;
      acc[key] = (acc[key] || 0) + (count > 0 ? count : 1);
      return acc;
    }, {});

    const progressEntries = visibleOverviewRows.length > 0
      ? visibleOverviewRows.map((row: ConstructOverviewRow) => {
          const key = normalizeProgressKey(row.enumName ?? row.name ?? row.progressStatus ?? row.completion ?? row.commence ?? '未知');
          const meta = CONSTRUCT_PROGRESS_META[key] ?? { label: row.name || key || '-', color: 'text-[#8fb4d8]', icon: 'mdi:help-circle-outline' };
          return {
            code: key,
            label: row.name ?? meta.label,
            count: Number(row.num ?? 0) || 0,
            color: meta.color,
            icon: meta.icon,
          };
        })
      : Object.entries(CONSTRUCT_PROGRESS_META).map(([code, meta]) => ({
          code,
          label: meta.label,
          count: progressSummary[code] || 0,
          color: meta.color,
          icon: meta.icon,
        }));

    const processRowsNormalized = visibleProcessRows.map((row: any) => {
      const progressCode = row.progressStatus ?? row.status ?? row.processStatus ?? row.enumName ?? row.completion ?? row.commence ?? '-';
      const normalizedKey = normalizeProgressKey(progressCode);
      const progressMeta = CONSTRUCT_PROGRESS_META[normalizedKey] ?? {
        label: normalizedKey || '-',
        color: 'text-[#8fb4d8]',
        icon: 'mdi:help-circle-outline',
      };
      
      return {
        boothNumber: row.boothNumber ?? row.exNun ?? row.boothNo ?? row.boothId ?? row.name ?? '-',
        exNun: row.boothNumber ?? row.exNun ?? row.boothNo ?? row.boothId ?? row.name ?? '-',
        boothNo: row.boothNo ?? row.boothNumber ?? '-',
        exhibitor: row.exhibitor ?? row.progressValue ?? row.progressText ?? row.progressDesc ?? row.name ?? '-',
        progressStatus: normalizedKey,
        progressLabel: progressMeta.label,
        progressColor: progressMeta.color,
        progressIcon: progressMeta.icon,
        latestLine: row.lines?.[0]?.content ?? row.content ?? row.progressValue ?? '-',
        area: Number(row.area ?? row.squareMeter ?? row.sqm ?? 0),
      };
    });

    const processStats = processRowsNormalized.reduce((acc: Record<string, number>, row) => {
      acc[row.progressStatus] = (acc[row.progressStatus] || 0) + 1;
      return acc;
    }, {});

    const progressPieData = progressEntries.map((item) => ({
      name: item.label,
      value: item.count,
      code: item.code,
      color: item.color,
    }));

    return {
      totalRecords: visibleOverviewRows.length,
      visibleOverviewRows,
      visibleProcessRows,
      progressEntries,
      progressPieData,
      processRows: processRowsNormalized,
      processStats,
      getProgressMeta: (value?: string | number) => {
        const key = normalizeProgressKey(value);
        return CONSTRUCT_PROGRESS_META[key] ?? { label: key || '-', color: 'text-[#8fb4d8]', icon: 'mdi:help-circle-outline' };
      },
      normalizeProgressKey,
    };
  }, [overviewData, processData, hallFilterEnabled, hallId]);
}
