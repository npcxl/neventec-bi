import type { BoothStatus } from '../types';

/** 展位状态颜色映射 */
export const BOOTH_STATUS_COLORS: Record<BoothStatus, string> = {
  completed: '#2563EB',
  normal: '#63F222',
  slow: '#FA8C16',
  delay: '#F5222D',
};

/** 展位默认透明度 */
export const BOOTH_DEFAULT_OPACITY = 0.45;

/** 展位 hover 透明度 */
export const BOOTH_HOVER_OPACITY = 0.65;

/** 最小缩放 */
export const MIN_ZOOM = 0.2;

/** 最大缩放 */
export const MAX_ZOOM = 3;

/** 默认缩放步长 */
export const ZOOM_STEP = 0.3;

/** 动画时长 */
export const ANIMATION_DURATION = 300;

/** 默认展位状态 */
export const DEFAULT_BOOTH_STATUS: BoothStatus = 'normal';
