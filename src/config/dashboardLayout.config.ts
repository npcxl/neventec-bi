export type DashboardOrientation =
  | "landscape"
  | "portrait";

const STORAGE_KEY = "neventec-bi:layout-orientation";

function readOrientation(): DashboardOrientation {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "landscape" || raw === "portrait") return raw;
  } catch {}
  return "landscape";
}

/**
 * 仪表盘布局配置（响应式，从 localStorage 读取）
 */
export const dashboardLayoutConfig: {
  orientation: DashboardOrientation;
} = {
  orientation: readOrientation(),
};

/** 切换布局方向并持久化 */
export function setOrientation(value: DashboardOrientation) {
  dashboardLayoutConfig.orientation = value;
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {}
}
