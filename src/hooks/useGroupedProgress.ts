import { useMemo } from 'react';

type ProgressRecord = {
  name?: string;
  completion?: number;
  commence?: number;
  hallId?: string;
  hallName?: string;
  expoid?: string;
  expoName?: string;
};

type ProgressContainer = Partial<{
  data: ProgressRecord[];
  list: ProgressRecord[];
  rows: ProgressRecord[];
}>;

type GroupedProgressItem = {
  name: string;
  completion: number;
  commence: number;
  total: number;
  rate: number;
  hallIds: string[];
  hallNames: string[];
  expoIds: string[];
  expoNames: string[];
};

type GroupedProgressSummary = {
  totalNames: number;
  completion: number;
  commence: number;
  total: number;
  rate: number;
};

type UseGroupedProgressOptions = {
  data?: ProgressRecord[] | ProgressContainer;
  hallId?: string;
  hallFilterEnabled?: boolean;
};

type GroupedProgressState = {
  name: string;
  completion: number;
  commence: number;
  total: number;
  hallIds: Set<string>;
  hallNames: Set<string>;
  expoIds: Set<string>;
  expoNames: Set<string>;
};

function isProgressContainer(value: ProgressRecord[] | ProgressContainer | undefined): value is ProgressContainer {
  return Boolean(value) && !Array.isArray(value);
}

function toArray(data: ProgressRecord[] | ProgressContainer | undefined): ProgressRecord[] {
  if (Array.isArray(data)) return data;
  if (isProgressContainer(data)) {
    return data.data ?? data.list ?? data.rows ?? [];
  }
  return [];
}

function toNumber(value: number | undefined): number {
  return Number.isFinite(value ?? NaN) ? Number(value) : 0;
}

function toStringValue(value: string | undefined, fallback = ''): string {
  const str = `${value ?? ''}`.trim();
  return str || fallback;
}

export function useGroupedProgress({ data, hallId = 'all', hallFilterEnabled = true }: UseGroupedProgressOptions) {
  return useMemo(() => {
    const rows = toArray(data);
    const visibleRows = hallFilterEnabled && hallId !== 'all'
      ? rows.filter((row) => toStringValue(row.hallId) === hallId)
      : rows;

    const grouped = visibleRows.reduce<Map<string, GroupedProgressState>>((acc, row) => {
      const name = toStringValue(row.name, '未命名');
      const completion = toNumber(row.completion);
      const commence = toNumber(row.commence);
      const current = acc.get(name) ?? {
        name,
        completion: 0,
        commence: 0,
        total: 0,
        hallIds: new Set<string>(),
        hallNames: new Set<string>(),
        expoIds: new Set<string>(),
        expoNames: new Set<string>(),
      };

      current.completion += completion;
      current.commence += commence;
      current.total += completion + commence;
      if (row.hallId) current.hallIds.add(row.hallId);
      if (row.hallName) current.hallNames.add(row.hallName);
      if (row.expoid) current.expoIds.add(row.expoid);
      if (row.expoName) current.expoNames.add(row.expoName);

      acc.set(name, current);
      return acc;
    }, new Map<string, GroupedProgressState>());

    const list: GroupedProgressItem[] = Array.from(grouped.values())
      .map((item) => ({
        name: item.name,
        completion: item.completion,
        commence: item.commence,
        total: item.total,
        rate: item.total > 0 ? item.completion / item.total : 0,
        hallIds: Array.from(item.hallIds),
        hallNames: Array.from(item.hallNames),
        expoIds: Array.from(item.expoIds),
        expoNames: Array.from(item.expoNames),
      }))
      .sort((a, b) => b.total - a.total || b.completion - a.completion);

    const summaryBase = list.reduce(
      (acc, item) => ({
        totalNames: acc.totalNames + 1,
        completion: acc.completion + item.completion,
        commence: acc.commence + item.commence,
        total: acc.total + item.total,
      }),
      { totalNames: 0, completion: 0, commence: 0, total: 0 },
    );

    const summary: GroupedProgressSummary = {
      ...summaryBase,
      rate: summaryBase.total > 0 ? summaryBase.completion / summaryBase.total : 0,
    };

    return {
      rows: visibleRows,
      grouped: list,
      summary: {
        ...summary,
        rate: summary.total > 0 ? summary.completion / summary.total : 0,
      },
    };
  }, [data, hallFilterEnabled, hallId]);
}

export type { GroupedProgressItem, GroupedProgressSummary, ProgressRecord };
