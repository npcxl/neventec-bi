import type { HallData, Booth, BoothStatus } from '../types';

/**
 * Mock JSON 中的原始展位数据格式
 */
interface MockBooth {
  booth_no: string;
  exhibitor: string;
  bbox: [number, number, number, number];
  center: [number, number];
  width: number;
  height: number;
}

/**
 * Mock JSON 根结构
 */
interface MockHallData {
  image: string;
  image_size: { width: number; height: number };
  booth_count: number;
  with_booth_no: number;
  booths: MockBooth[];
}

/**
 * 将 bbox [x1, y1, x2, y2] 转换为 polygon [[x1,y1], [x2,y1], [x2,y2], [x1,y2]]
 */
function bboxToPolygon(bbox: [number, number, number, number]): number[][] {
  const [x1, y1, x2, y2] = bbox;
  return [
    [x1, y1],
    [x2, y1],
    [x2, y2],
    [x1, y2],
  ];
}

/**
 * 将 Mock 数据中的 booth 转换为统一的 Booth 类型
 */
function transformBooth(mockBooth: MockBooth, index: number): Booth {
  return {
    id: mockBooth.booth_no || `booth_${index}`,
    name: mockBooth.exhibitor || '',
    polygon: bboxToPolygon(mockBooth.bbox),
    status: 'normal' as BoothStatus,
    boothNo: mockBooth.booth_no,
    area: `${mockBooth.width} × ${mockBooth.height}`,
  };
}

/**
 * 将 Mock JSON 数据转换为 HallData
 * @param mockData - 原始 mock JSON 数据
 * @param hallName - 展馆名称
 * @param backgroundUrl - 背景图 URL（可选，默认使用 JSON 中的 image 字段拼接）
 */
export function transformMockToHallData(
  mockData: MockHallData,
  hallName: string,
  backgroundUrl?: string,
): HallData {
  const bgUrl =
    backgroundUrl ||
    (mockData.image ? `/mock/${mockData.image}` : '');

  return {
    hallName,
    background: bgUrl,
    width: mockData.image_size?.width ?? 1000,
    height: mockData.image_size?.height ?? 1000,
    booths: mockData.booths.map((b, i) => transformBooth(b, i)),
  };
}
