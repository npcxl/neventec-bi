
/**
 * - landscape：横屏布局
 * - portrait：竖屏布局
 */
export const dashboardLayoutConfig = {
  orientation: "landscape",
} as const;

export type DashboardOrientation =
  typeof dashboardLayoutConfig.orientation;
