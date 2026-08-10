import type { BoothStatus } from '../types';

/** 展位状态颜色映射 */
export const BOOTH_STATUS_COLORS: Record<BoothStatus, string> = {
  completed: '#2563EB',
  normal: '#63F222',
  slow: '#FA8C16',
  delay: '#F5222D',
};

/** 最小缩放 */
export const MIN_ZOOM = 0.2;

/** 最大缩放 */
export const MAX_ZOOM = 3;
