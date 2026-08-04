export type DashboardOrientation =
  | "landscape"
  | "portrait";


/**
 * 仪表盘布局配置
 * @landscape 横屏(default)
 * @portrait 竖屏
 */
export const dashboardLayoutConfig: {
  orientation: DashboardOrientation;
} = {
  orientation: "landscape",
};
