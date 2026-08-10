import type { BoothStatus } from '../types';

/** 展位状态颜色映射（与 useBoothColorStrategy 保持一致） */
export const BOOTH_STATUS_COLORS: Record<BoothStatus, string> = {
  normal: '#2563EB',    // 正常 = 蓝色
  completed: '#63F222',  // 完成 = 绿色
  slow: '#FA8C16',       // 缓慢 = 橙色
  delay: '#F5222D',      // 延迟 = 红色
};

/** 最小缩放 */
export const MIN_ZOOM = 0.2;

/** 最大缩放 */
export const MAX_ZOOM = 3;
