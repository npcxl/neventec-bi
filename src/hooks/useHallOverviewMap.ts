import { useMemo } from 'react';
import { useHallSorter } from './useHallSorter';

type HallItem = {
  hallId: string;
  hallName: string;
};

type GalleryRow = {
  boothNum?: number;
  specialArea?: number;
  standArea?: number;
  specialAreaNum?: number;
  standardAreaNum?: number;
  hallId?: string;
  hallName?: string;
};

type HallOverviewItem = {
  hallId: string;
  hallName: string;
  boothCount: number;
  specialAreaCount: number;
  standardAreaCount: number;
  areaScore: number;
};

function normalizeNumber(value?: number) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

export function useHallOverviewMap(halls: HallItem[], galleryRows: GalleryRow[] = []) {
  const sortedHalls = useHallSorter(halls);

  return useMemo<HallOverviewItem[]>(() => {
    const hallStats = galleryRows.reduce<Record<string, Omit<HallOverviewItem, 'hallId' | 'hallName'>>>((acc, row) => {
      const hallId = String(row.hallId ?? '').trim();
      if (!hallId) return acc;
      if (!acc[hallId]) {
        acc[hallId] = { boothCount: 0, specialAreaCount: 0, standardAreaCount: 0, areaScore: 0 };
      }
      acc[hallId].boothCount += normalizeNumber(row.boothNum);
      acc[hallId].specialAreaCount += normalizeNumber(row.specialAreaNum ?? row.specialArea);
      acc[hallId].standardAreaCount += normalizeNumber(row.standardAreaNum ?? row.standArea);
      acc[hallId].areaScore += normalizeNumber(row.specialAreaNum ?? row.specialArea) * 1.4 + normalizeNumber(row.standardAreaNum ?? row.standArea);
      return acc;
    }, {});

    return sortedHalls.map((hall, index) => {
      const stat = hallStats[hall.hallId] ?? { boothCount: 0, specialAreaCount: 0, standardAreaCount: 0, areaScore: 0 };
      return {
        hallId: hall.hallId,
        hallName: hall.hallName,
        boothCount: stat.boothCount,
        specialAreaCount: stat.specialAreaCount,
        standardAreaCount: stat.standardAreaCount,
        areaScore: stat.areaScore || (index + 1) * 10,
      };
    });
  }, [galleryRows, sortedHalls]);
}
