import { useMemo } from 'react';

type HallItem = {
  hallId: string;
  hallName: string;
};

type HallSortKey =
  | { type: 'number'; value: number }
  | { type: 'alpha'; value: string };

const hallSuffix = '(馆|展馆|展厅|厅)';

function chineseToNumber(text: string): number | null {
  const map: Record<string, number> = {
    零: 0,
    一: 1,
    二: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
  };

  if (!text) return null;

  // 一、二、三、九
  if (text.length === 1 && map[text] != null) {
    return map[text];
  }

  // 十
  if (text === '十') {
    return 10;
  }

  // 十一、十二
  if (text.startsWith('十')) {
    const unit = text.slice(1);
    return 10 + (map[unit] ?? 0);
  }

  // 二十、二十一、三十五
  if (text.includes('十')) {
    const [tenText, unitText] = text.split('十');
    const ten = map[tenText];
    const unit = unitText ? map[unitText] : 0;

    if (ten == null || unit == null) return null;

    return ten * 10 + unit;
  }

  return null;
}

function parseHallSortKey(hallName: string): HallSortKey | null {
  const name = hallName.trim();

  // 数字：1号馆、1馆、1号展厅、1展厅、1号厅
  const numberMatch = name.match(
    new RegExp(`^(\\d+)\\s*号?\\s*${hallSuffix}$`),
  );

  if (numberMatch) {
    return {
      type: 'number',
      value: Number(numberMatch[1]),
    };
  }

  // 中文数字：一号馆、二号展厅、十号厅、十一号馆
  const chineseMatch = name.match(
    new RegExp(`^([零一二三四五六七八九十]+)\\s*号?\\s*${hallSuffix}$`),
  );

  if (chineseMatch) {
    const value = chineseToNumber(chineseMatch[1]);

    if (value != null) {
      return {
        type: 'number',
        value,
      };
    }
  }

  // 字母：A馆、B馆、A展厅、B展厅
  const alphaMatch = name.match(
    new RegExp(`^([A-Za-z]+)\\s*${hallSuffix}$`),
  );

  if (alphaMatch) {
    return {
      type: 'alpha',
      value: alphaMatch[1].toUpperCase(),
    };
  }

  return null;
}

function alphaToNum(text: string) {
  return text.split('').reduce((sum, ch, index) => {
    return sum + (ch.charCodeAt(0) - 64) * 26 ** (text.length - index - 1);
  }, 0);
}

function sortHallList(halls: HallItem[]) {
  const list = halls.map((hall, index) => ({
    hall,
    index,
    sortKey: parseHallSortKey(hall.hallName),
  }));

  const sortable = list.filter((item) => item.sortKey);
  const nonSortable = list.filter((item) => !item.sortKey);

  sortable.sort((a, b) => {
    const ak = a.sortKey!;
    const bk = b.sortKey!;

    // 数字类排前面，字母类排后面
    if (ak.type !== bk.type) {
      return ak.type === 'number' ? -1 : 1;
    }

    // 数字排序：5号展厅、6号展厅、7号展厅、8号展厅
    if (ak.type === 'number' && bk.type === 'number') {
      return ak.value - bk.value;
    }

    // 字母排序：A馆、B馆、C馆、AA馆
    if (ak.type === 'alpha' && bk.type === 'alpha') {
      return alphaToNum(ak.value) - alphaToNum(bk.value);
    }

    return a.index - b.index;
  });

  return [...sortable, ...nonSortable].map((item) => item.hall);
}

export function useHallSorter(halls: HallItem[]) {
  return useMemo(() => sortHallList(halls), [halls]);
}