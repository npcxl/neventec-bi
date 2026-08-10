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
 * API 返回的展位坐标数据格式
 */
export interface SafetyCoordItem {
  booth_no?: string | null;
  exhibitor?: string;
  area?: string | null;
  raw_texts?: string[];
  bbox?: [number, number, number, number];
  center?: [number, number];
  width?: number;
  height?: number;
  corners?: Array<[number, number]>;
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
 * 自动处理重复 booth_no（加后缀去重）
 */
export function transformMockToHallData(
  mockData: MockHallData,
  hallName: string,
  backgroundUrl?: string,
): HallData {
  const bgUrl =
    backgroundUrl ||
    (mockData.image ? `/mock/${mockData.image}` : '');

  const seenNos = new Map<string, number>();
  const booths: Booth[] = [];

  for (let i = 0; i < mockData.booths.length; i++) {
    const raw = mockData.booths[i];
    const baseNo = raw.booth_no || '';
    const count = seenNos.get(baseNo) ?? 0;
    seenNos.set(baseNo, count + 1);

    // 重复的 booth_no 加后缀区分
    const uniqueNo = count > 0 ? `${baseNo}_${count + 1}` : baseNo;

    booths.push({
      id: uniqueNo || `booth_${i}`,
      name: raw.exhibitor || '',
      polygon: bboxToPolygon(raw.bbox),
      status: 'normal' as BoothStatus,
      boothNo: raw.booth_no, // 保留原始 booth_no 用于 API 查询
      area: `${raw.width} × ${raw.height}`,
    });
  }

  return {
    hallName,
    background: bgUrl,
    width: mockData.image_size?.width ?? 1000,
    height: mockData.image_size?.height ?? 1000,
    booths,
  };
}

/**
 * 将 API 返回的展位坐标数据转换为 HallData
 * @param booths API 返回的展位列表
 * @param hallName 展馆名称
 * @param imageWidth 背景图宽度
 * @param imageHeight 背景图高度
 * @param backgroundUrl 背景图 URL
 */
export function transformApiToHallData(
  booths: SafetyCoordItem[],
  hallName: string,
  imageWidth: number,
  imageHeight: number,
  backgroundUrl: string,
): HallData {
  const validBooths: Booth[] = [];

  for (let i = 0; i < booths.length; i++) {
    const item = booths[i];
    const code = item.raw_texts?.[0] || item.booth_no || '';
    const name = item.raw_texts?.[1] || item.exhibitor || '';
    const area = item.area || '';

    // 优先使用 corners（多边形），否则用 bbox 转 polygon
    let polygon: number[][];
    if (Array.isArray(item.corners) && item.corners.length >= 3) {
      polygon = item.corners;
    } else if (Array.isArray(item.bbox) && item.bbox.length >= 4) {
      polygon = bboxToPolygon(item.bbox);
    } else {
      continue;
    }

    validBooths.push({
      id: code || `booth_${i}`,
      name,
      polygon,
      status: 'normal',
      boothNo: code,
      area,
    });
  }

  return {
    hallName,
    background: backgroundUrl,
    width: imageWidth,
    height: imageHeight,
    booths: validBooths,
  };
}
