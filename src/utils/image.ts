/**
 * 生成 OSS resize 处理参数。
 * @param width 缩略图宽度，默认 200
 * @param height 缩略图高度，默认 200
 */
export function ossThumbSuffix(width = 200, height = 200): string {
  return `x-oss-process=image/resize,m_fill,w_${width},h_${height}`;
}

/**
 * 生成缩略图 URL：给原图地址追加 OSS resize 参数。
 * 已带 x-oss-process 的地址保持原样，避免重复拼接。
 * @param url 原图地址
 * @param width 缩略图宽度，默认 200
 * @param height 缩略图高度，默认 200
 */
export function thumbUrl(url?: string, width = 200, height = 200): string {
  if (!url) return "";
  if (url.includes("x-oss-process=")) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}${ossThumbSuffix(width, height)}`;
}

/**
 * 取原图 URL：去掉 OSS 处理参数，用于点击放大时加载完整图片。
 */
export function fullUrl(url?: string): string {
  if (!url) return "";
  return url.replace(/[?&]x-oss-process=[^&]*/, "");
}