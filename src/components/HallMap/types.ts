export type BoothStatus = 'completed' | 'normal' | 'slow' | 'delay';

export interface Booth {
  id: string;
  name: string;
  polygon: number[][];
  status: BoothStatus;
  /** 原始 booth_no，用于 API 查询 */
  boothNo?: string;
  /** 展位面积 */
  area?: string;
}

export interface HallData {
  hallName: string;
  /** 背景图 URL */
  background: string;
  /** 背景图原始宽度 */
  width: number;
  /** 背景图原始高度 */
  height: number;
  booths: Booth[];
}
