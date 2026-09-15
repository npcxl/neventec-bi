import { useMemo } from 'react';

type HallItem = {
  hallId: string;
  hallName: string;
};

// mixed：数字+字母（6A馆、6B馆、10A馆），排在同主号的纯数字之后
type HallSortKey =
  | { type: 'number'; value: number; floor?: number }
  | { type: 'mixed'; value: number; suffix: string }
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

  // 带楼层的：2-1F号馆、4-2F号馆、2-2F号馆（主馆号-楼层F）
  const floorMatch = name.match(
    new RegExp(`^(\\d+)\\s*-\\s*(\\d+)\\s*F\\s*号?\\s*${hallSuffix}$`),
  );

  if (floorMatch) {
    return {
      type: 'number',
      value: Number(floorMatch[1]),
      floor: Number(floorMatch[2]),
    };
  }

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

  // 数字+字母：6A馆、6B馆、6A展厅、10B展厅
  // 排序时视为「主号 + 后缀」，跟在同主号的纯数字馆之后（6号馆 → 6A馆 → 6B馆 → 7号馆）
  const mixedMatch = name.match(
    new RegExp(`^(\\d+)\\s*([A-Za-z])\\s*号?\\s*${hallSuffix}$`),
  );

  if (mixedMatch) {
    return {
      type: 'mixed',
      value: Number(mixedMatch[1]),
      suffix: mixedMatch[2].toUpperCase(),
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

    // 纯字母类（A馆、B馆）整体排在数字类之后
    if (ak.type === 'alpha' || bk.type === 'alpha') {
      if (ak.type !== bk.type) {
        return ak.type === 'alpha' ? 1 : -1;
      }
      // 字母排序：A馆、B馆、C馆、AA馆
      return alphaToNum(String(ak.value)) - alphaToNum(String(bk.value));
    }

    // 数字 / 数字+字母：先按主号（5 → 6 → 6A → 6B → 7）
    if (ak.value !== bk.value) {
      return ak.value - bk.value;
    }

    // 同主号：纯数字馆排前面（无楼层优先，再按楼层升序）
    if (ak.type === 'number' && bk.type === 'number') {
      const af = ak.floor ?? 0;
      const bf = bk.floor ?? 0;
      return af - bf;
    }

    if (ak.type === 'mixed' && bk.type === 'mixed') {
      return ak.suffix.localeCompare(bk.suffix);
    }

    // 同主号下：数字馆 6号馆 在 6A馆 之前
    if (ak.type !== bk.type) {
      return ak.type === 'number' ? -1 : 1;
    }

    return a.index - b.index;
  });

  return [...sortable, ...nonSortable].map((item) => item.hall);
}

export function useHallSorter(halls: HallItem[]) {
  return useMemo(() => sortHallList(halls), [halls]);
}