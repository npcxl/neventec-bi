import { useRef, useEffect, useCallback, useState } from 'react';
import type { Booth, HallData } from './types';
import { BOOTH_STATUS_COLORS, MAX_ZOOM } from './utils/constants';

type HallMapProps = {
  hallData: HallData;
  /** 业务颜色策略，传入则优先使用；否则用 booth.status 取默认颜色 */
  getBoothColor?: (booth: Booth, index: number) => string;
  onBoothClick?: (booth: Booth) => void;
  /** 展位号 → 步骤序号(1-based)，在对应展位右上角绘制序号徽章 */
  boothBadges?: Record<string, number>;
  /** 展位号 → 关键工序图标路径数组（SVG 图片，绘制在展位上） */
  boothMarks?: Record<string, string[]>;
  /** 有安全风险的展位号 → 隐患图标路径（命中则在展位中心绘制） */
  riskMarks?: Record<string, string>;
  /** "未报图"展位号集合（特装且无风险评级）：命中则不填充色块，仅绘制白色标边 */
  unreportedBoothNos?: Set<string>;
};

type Camera = {
  scale: number;
  offsetX: number;
  offsetY: number;
};

// ===================== 辅助函数 =====================

/** 点在多边形内（射线法） */
function pointInPolygon(px: number, py: number, polygon: number[][]): boolean {
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** 加载图片 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * 文字自动换行，基于 ctx.measureText 精确计算宽度
 * @returns 换行后的字符串数组，超出行数时最后一行加省略号
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  if (!text || maxLines <= 0) return [];
  const chars = Array.from(text);
  const lines: string[] = [];
  let current = '';

  for (const char of chars) {
    const next = current + char;
    if (ctx.measureText(next).width <= maxWidth) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    current = char;
    if (lines.length === maxLines) break;
  }

  if (current && lines.length < maxLines) {
    lines.push(current);
  }

  // 文字被截断，最后一行加省略号
  const usedLength = lines.join('').length;
  if (usedLength < chars.length && lines.length > 0) {
    let lastLine = lines[lines.length - 1];
    while (lastLine && ctx.measureText(`${lastLine}…`).width > maxWidth) {
      lastLine = lastLine.slice(0, -1);
    }
    lines[lines.length - 1] = `${lastLine}…`;
  }

  return lines;
}

// ===================== 组件 =====================

export default function HallMap({ hallData, getBoothColor, onBoothClick, boothBadges, boothMarks, riskMarks, unreportedBoothNos }: HallMapProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const cameraRef = useRef<Camera>({ scale: 1, offsetX: 0, offsetY: 0 });
  const minScaleRef = useRef(0.2); // 动态最小缩放 = fitScale
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const [hoveredBoothId, setHoveredBoothId] = useState<string | null>(null);
  const hallDataRef = useRef(hallData);
  hallDataRef.current = hallData;
  const getBoothColorRef = useRef(getBoothColor);
  getBoothColorRef.current = getBoothColor;
  const onBoothClickRef = useRef(onBoothClick);
  onBoothClickRef.current = onBoothClick;
  const boothBadgesRef = useRef(boothBadges);
  boothBadgesRef.current = boothBadges;
  const boothMarksRef = useRef(boothMarks);
  boothMarksRef.current = boothMarks;
  const riskMarksRef = useRef(riskMarks);
  riskMarksRef.current = riskMarks;
  const unreportedBoothNosRef = useRef(unreportedBoothNos);
  unreportedBoothNosRef.current = unreportedBoothNos;

  // SVG 图标图片缓存（路径 → 已加载的 Image）
  const imagesCacheRef = useRef<Record<string, HTMLImageElement>>({});
  // 保存最新的 draw 函数，供图片加载完成后触发重绘（避免与 draw 形成循环依赖）
  const drawRef = useRef<() => void>(() => {});
  // 获取（按需加载）图标图片：未加载则创建 Image 并在加载完成后触发重绘
  const getMarkImage = useCallback((src: string): HTMLImageElement => {
    const cache = imagesCacheRef.current;
    const existing = cache[src];
    if (existing && existing.complete && existing.naturalWidth > 0) return existing;
    const img = existing ?? new Image();
    if (!img.src) img.src = src;
    img.onload = () => {
      cache[src] = img;
      drawRef.current();
    };
    cache[src] = img;
    return img;
  }, []);

  // ========== 加载背景图 ==========
  useEffect(() => {
    let cancelled = false;
    bgImageRef.current = null;

    loadImage(hallData.background)
      .then((img) => {
        if (!cancelled) {
          bgImageRef.current = img;
          fitToCenter();
          draw();
        }
      })
      .catch(() => {});

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hallData.background, hallData.width, hallData.height]);

  // ========== Camera 初始化居中 ==========
  const fitToCenter = useCallback(() => {
    const container = containerRef.current;
    const { width, height } = hallDataRef.current;
    if (!container) return;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const fitScale = Math.min(cw / width, ch / height, 1);
    // 保存动态最小缩放值，缩小不能小于 fitScale
    minScaleRef.current = fitScale;
    cameraRef.current = {
      scale: fitScale,
      offsetX: (cw - width * fitScale) / 2,
      offsetY: (ch - height * fitScale) / 2,
    };
  }, []);

  // ========== 绘制 ==========
  const draw = useCallback((time?: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const t = time ?? performance.now();
    // 隐患图标闪烁：慢脉冲（约 1.8s 周期），alpha 在 0.5~1.0 间变化
    const pulse = 0.5 + 0.5 * Math.sin((t / 1800) * Math.PI * 2);
    const riskAlpha = 0.5 + 0.5 * pulse;
    const riskGlow = 6 + 10 * pulse;

    const { width: worldW, height: worldH, booths } = hallDataRef.current;
    const { scale, offsetX, offsetY } = cameraRef.current;
    const cw = canvas.width;
    const ch = canvas.height;

    // 清空
    ctx.clearRect(0, 0, cw, ch);

    // 背景
    ctx.fillStyle = '#020A25';
    ctx.fillRect(0, 0, cw, ch);

    ctx.save();

    // 绘制背景图
    const bgImg = bgImageRef.current;
    if (bgImg) {
      ctx.drawImage(
        bgImg,
        0, 0, worldW, worldH,
        offsetX, offsetY, worldW * scale, worldH * scale,
      );
    }

    // 绘制展位
    for (let index = 0; index < booths.length; index++) {
      const booth = booths[index];
      const color =
        getBoothColorRef.current?.(booth, index) ??
        BOOTH_STATUS_COLORS[booth.status] ??
        BOOTH_STATUS_COLORS.normal;
      // 调试：打印地图每个展位最终上色（getBoothColor 内部也会打印更细流程）
      //console.log('[地图绘制] booth=%s | 使用业务颜色=%s | 最终颜色=%s', booth.boothNo || booth.id, Boolean(getBoothColorRef.current), color);
      const isHovered = hoveredBoothId === booth.id;

      const polygon = booth.polygon;
      if (polygon.length < 3) continue;

      // 绘制填充
      ctx.beginPath();
      ctx.moveTo(polygon[0][0] * scale + offsetX, polygon[0][1] * scale + offsetY);
      for (let i = 1; i < polygon.length; i++) {
        ctx.lineTo(polygon[i][0] * scale + offsetX, polygon[i][1] * scale + offsetY);
      }
      ctx.closePath();

      // 未报图展位（特装且无任何风险评级）：不填充色块、不描边（仅 hover 时极淡高亮，保留交互反馈）
      // key 需与 useBoothColorStrategy 的 normalizeKey（String().trim()）保持一致，不做大小写转换
      const boothKeyUnreported = String(booth.boothNo ?? booth.id).trim();
      const isUnreported = unreportedBoothNosRef.current?.has(boothKeyUnreported) ?? false;

      if (isUnreported) {
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.globalAlpha = isHovered ? 0.5 : 0;
        ctx.fill();
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = color;
        ctx.globalAlpha = isHovered ? 0.7 : 0.55;
        ctx.fill();
        ctx.globalAlpha = 1;

        // 绘制描边
        ctx.strokeStyle = color;
        ctx.lineWidth = isHovered ? 2 : 1;
        ctx.globalAlpha = isHovered ? 1 : 0.8;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // ===== 绘制文字（根据展位屏幕尺寸自适应排版） =====
      const xs = polygon.map((p) => p[0]);
      const ys = polygon.map((p) => p[1]);
      const bw = (Math.max(...xs) - Math.min(...xs)) * scale; // 屏幕像素宽
      const bh = (Math.max(...ys) - Math.min(...ys)) * scale; // 屏幕像素高
      const cx = (xs.reduce((a, b) => a + b, 0) / xs.length) * scale + offsetX;
      const cy = (ys.reduce((a, b) => a + b, 0) / ys.length) * scale + offsetY;

      // 内边距
      const padding = Math.max(2, Math.min(8, Math.min(bw, bh) * 0.08));
      const availableWidth = bw - padding * 2;

      // 左上角坐标（屏幕像素）
      const leftX = Math.min(...xs) * scale + offsetX + padding;
      const topY = Math.min(...ys) * scale + offsetY + padding;

      // 字号
      const codeFontSize = Math.max(8, Math.min(24, Math.min(bw * 0.16, bh * 0.28)));
      const nameFontSize = Math.max(7, Math.min(20, codeFontSize * 0.78));

      // 显示等级（底图不叠加任何文字：展位号与企业名称都不显示，仅保留色块与点击/hover 逻辑）
      const showCode = false;
      const showName = false;

      // 名称最大行数
      const maxNameLines = bh >= 100 ? 3 : bh >= 48 ? 2 : 1;

      // 裁剪到展位多边形内
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(polygon[0][0] * scale + offsetX, polygon[0][1] * scale + offsetY);
      for (let i = 1; i < polygon.length; i++) {
        ctx.lineTo(polygon[i][0] * scale + offsetX, polygon[i][1] * scale + offsetY);
      }
      ctx.closePath();
      ctx.clip();

      // 展位号 → 左上角
      if (showCode) {
        ctx.font = `700 ${codeFontSize}px sans-serif`;
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 0;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(booth.id, leftX, topY);
      }

      // 企业名称 → 居中
      if (showName && booth.name) {
        ctx.font = `500 ${nameFontSize}px sans-serif`;
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.shadowBlur = 0;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        const nameLines = wrapText(ctx, booth.name, availableWidth, maxNameLines);
        const nameBlockHeight = nameLines.length * nameFontSize * 1.25;

        // 名称高度不超过剩余空间
        if (nameBlockHeight <= bh - padding * 2 - (showCode ? codeFontSize + 3 : 0)) {
          let nameY = cy - nameBlockHeight / 2;
          // 避免和左上角展位号重叠
          if (showCode && nameY < topY + codeFontSize + 3) {
            nameY = topY + codeFontSize + 3;
          }
          for (const line of nameLines) {
            ctx.fillText(line, cx, nameY);
            nameY += nameFontSize * 1.25;
          }
        }
      }

      ctx.shadowBlur = 0;
      ctx.restore();

      // ===== 展位右上角 步骤序号徽章 =====
      const badge = boothBadgesRef.current?.[booth.boothNo ?? booth.id];
      if (badge != null) {
        // 展位右上角坐标（屏幕像素）
        const bx = Math.max(...xs) * scale + offsetX;
        const by = Math.min(...ys) * scale + offsetY;
        const size = Math.max(8, Math.min(15, Math.min(bw, bh) * 0.14));
        const badgeH = Math.round(size * 1.8);
        const padX = Math.round(size * 0.55);

        ctx.save();
        // 文字宽度自适应，宽高按内容而定
        ctx.font = `700 ${Math.round(size * 1.1)}px sans-serif`;
        const text = String(badge);
        const badgeW = Math.ceil(ctx.measureText(text).width) + padX * 2;
        const corner = Math.round(Math.max(2, size * 0.4));

        // 圆角矩形：左上、左下、右下圆角，右上直角贴合展位角
        const x0 = bx - badgeW;
        const y0 = by;
        ctx.beginPath();
        ctx.moveTo(x0 + corner, y0);
        ctx.lineTo(bx, y0);
        ctx.lineTo(bx, y0 + badgeH);
        ctx.lineTo(x0 + corner, y0 + badgeH);
        ctx.quadraticCurveTo(x0, y0 + badgeH, x0, y0 + badgeH - corner);
        ctx.lineTo(x0, y0 + corner);
        ctx.quadraticCurveTo(x0, y0, x0 + corner, y0);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fill();
        // 序号文字
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(text, x0 + badgeW / 2, y0 + badgeH / 2 + 1);
        ctx.restore();
      }

      // ===== 关键工序符号标记（无背景色，绘制在展位右上角） =====
      const marks = boothMarksRef.current?.[booth.boothNo ?? booth.id];
      if (Array.isArray(marks) && marks.length > 0) {
        const bx = Math.max(...xs) * scale + offsetX;
        const by = Math.min(...ys) * scale + offsetY;
        const fontSize = Math.max(8, Math.min(13, Math.min(bw, bh) * 0.15));
        const gap = fontSize * 1.5;
        let mx = bx - (marks.length * gap) + gap / 2;
        const my = by + fontSize * 0.7;

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (const icon of marks) {
          // SVG 图片图标（自带颜色，无需再着色）
          const img = getMarkImage(icon);
          if (img.complete && img.naturalWidth > 0) {
            const s = fontSize * 1.4;
            ctx.drawImage(img, mx - s / 2, my - s / 2, s, s);
          }
          mx += gap;
        }
        ctx.restore();
      }

      // ===== 安全隐患标记：绘制在展位左下角（仅一个图标），慢闪烁 + 光晕 =====
      const riskMap = riskMarksRef.current;
      if (riskMap) {
        const boothKey = String(booth.boothNo ?? booth.id).trim();
        const riskIcon = riskMap[boothKey];
        if (riskIcon) {
          const s = Math.max(16, Math.min(30, Math.min(bw, bh) * 0.4));
          const img = getMarkImage(riskIcon);
          if (img.complete && img.naturalWidth > 0) {
            // 左下角坐标：左边界 + 内边距，下边界 - 内边距（图标以中心点定位）
            const leftX = Math.min(...xs) * scale + offsetX;
            const bottomY = Math.max(...ys) * scale + offsetY;
            const pad = Math.max(2, s * 0.15);
            const iconX = leftX + s / 2 + pad;
            const iconY = bottomY - s / 2 - pad;

            ctx.save();
            // 光晕：用与图标同色描边 + shadowBlur 形成脉动光影
            ctx.globalAlpha = riskAlpha;
            ctx.shadowColor = 'rgba(250, 140, 22, 0.9)';
            ctx.shadowBlur = riskGlow;
            // 先以放大尺寸绘制一次作为光晕底
            ctx.drawImage(img, iconX - s / 2, iconY - s / 2, s, s);
            ctx.shadowBlur = 0;
            ctx.restore();
          }
        }
      }
    }

    ctx.restore();
  }, [hoveredBoothId]);
  drawRef.current = draw;

  // 当 hallData 或 hoveredBoothId 变化时重绘
  useEffect(() => {
    draw();
  }, [draw]);

  // ========== Canvas 尺寸同步 ==========
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let initial = true;
    let rafId = 0;

    const sync = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = container.clientWidth;
      const h = container.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (initial) {
        fitToCenter();
        initial = false;
      }
      // 用 rAF 合并同一帧内的多次重绘
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => { rafId = 0; draw(); });
    };

    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(container);
    return () => { ro.disconnect(); if (rafId) cancelAnimationFrame(rafId); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hallData, boothMarks, riskMarks, unreportedBoothNos]);

  // ========== 隐患图标闪烁动画循环（仅当有隐患标记时运行） ==========
  useEffect(() => {
    if (!riskMarks || Object.keys(riskMarks).length === 0) return;
    let raf = 0;
    const tick = () => {
      draw(performance.now());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [riskMarks, draw]);

  // ========== Canvas 坐标转换（适配全局 transform:scale） ==========
  // 全局 ScreenAdapter 的 scale 导致 getBoundingClientRect 返回缩放后的像素，
  // 需要转换为 Canvas 设计稿坐标
  function getCanvasPoint(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (canvas.clientWidth / rect.width),
      y: (clientY - rect.top) * (canvas.clientHeight / rect.height),
    };
  }

  /** 屏幕坐标 → 世界坐标 */
  const screenToWorld = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const pt = getCanvasPoint(canvas, clientX, clientY);
    const { scale, offsetX, offsetY } = cameraRef.current;
    return {
      x: (pt.x - offsetX) / scale,
      y: (pt.y - offsetY) / scale,
    };
  }, []);

  // ========== 命中检测 ==========
  const hitTest = useCallback(
    (worldX: number, worldY: number): Booth | null => {
      const booths = hallDataRef.current.booths;
      for (let i = booths.length - 1; i >= 0; i--) {
        if (pointInPolygon(worldX, worldY, booths[i].polygon)) {
          return booths[i];
        }
      }
      return null;
    },
    [],
  );

  // ========== 鼠标事件 ==========
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isDraggingRef.current = true;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDraggingRef.current) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const ratioX = canvas.clientWidth / rect.width;
        const ratioY = canvas.clientHeight / rect.height;
        const dx = (e.clientX - lastMouseRef.current.x) * ratioX;
        const dy = (e.clientY - lastMouseRef.current.y) * ratioY;
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
        cameraRef.current.offsetX += dx;
        cameraRef.current.offsetY += dy;
        draw();
        setHoveredBoothId(null);
      } else {
        const world = screenToWorld(e.clientX, e.clientY);
        const hit = hitTest(world.x, world.y);
        setHoveredBoothId(hit?.id ?? null);
      }
    },
    [draw, screenToWorld, hitTest],
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;

      const dx = Math.abs(e.clientX - lastMouseRef.current.x);
      const dy = Math.abs(e.clientY - lastMouseRef.current.y);
      if (dx < 3 && dy < 3) {
        const world = screenToWorld(e.clientX, e.clientY);
        const hit = hitTest(world.x, world.y);
        if (hit) {
          onBoothClickRef.current?.(hit);
        }
      }
    },
    [screenToWorld, hitTest],
  );

  // ========== 鼠标滚轮缩放 ==========
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const pt = getCanvasPoint(canvas, e.clientX, e.clientY);

      const { scale, offsetX, offsetY } = cameraRef.current;

      const worldX = (pt.x - offsetX) / scale;
      const worldY = (pt.y - offsetY) / scale;

      const zoomFactor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      const minScale = minScaleRef.current; // 动态最小缩放
      const newScale = Math.max(minScale, Math.min(MAX_ZOOM, scale * zoomFactor));

      // 达到最小缩放时直接恢复居中，避免位置偏移
      if (newScale <= minScale) {
        fitToCenter();
        draw();
        return;
      }

      const newOffsetX = pt.x - worldX * newScale;
      const newOffsetY = pt.y - worldY * newScale;

      cameraRef.current = { scale: newScale, offsetX: newOffsetX, offsetY: newOffsetY };
      draw();
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draw]);

  // ========== 按钮控制 ==========
  const handleZoomIn = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cw = canvas.style.width ? parseFloat(canvas.style.width) : canvas.width;
    const ch = canvas.style.height ? parseFloat(canvas.style.height) : canvas.height;
    const cx = cw / 2;
    const cy = ch / 2;
    const { scale, offsetX, offsetY } = cameraRef.current;
    const worldX = (cx - offsetX) / scale;
    const worldY = (cy - offsetY) / scale;
    const newScale = Math.min(MAX_ZOOM, scale * 1.25);
    cameraRef.current = {
      scale: newScale,
      offsetX: cx - worldX * newScale,
      offsetY: cy - worldY * newScale,
    };
    draw();
  }, [draw]);

  const handleZoomOut = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cw = canvas.style.width ? parseFloat(canvas.style.width) : canvas.width;
    const ch = canvas.style.height ? parseFloat(canvas.style.height) : canvas.height;
    const cx = cw / 2;
    const cy = ch / 2;
    const { scale, offsetX, offsetY } = cameraRef.current;
    const worldX = (cx - offsetX) / scale;
    const worldY = (cy - offsetY) / scale;
    const minScale = minScaleRef.current; // 动态最小缩放
    const newScale = Math.max(minScale, scale / 1.25);

    // 达到最小缩放时直接恢复居中
    if (newScale <= minScale) {
      fitToCenter();
      draw();
      return;
    }

    cameraRef.current = {
      scale: newScale,
      offsetX: cx - worldX * newScale,
      offsetY: cy - worldY * newScale,
    };
    draw();
  }, [draw, fitToCenter]);

  const handleReset = useCallback(() => {
    fitToCenter();
    draw();
  }, [fitToCenter, draw]);

  // ========== 全局鼠标释放 ==========
  useEffect(() => {
    const onUp = () => { isDraggingRef.current = false; };
    window.addEventListener('mouseup', onUp);
    return () => window.removeEventListener('mouseup', onUp);
  }, []);

  // ========== 阻止 context menu（避免右键菜单干扰） ==========
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden select-none"
      style={{ background: '#020A25', cursor: isDraggingRef.current ? 'grabbing' : 'grab' }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onContextMenu={handleContextMenu}
      />

      {/* 缩放控制按钮组 */}
      <div className="absolute bottom-4 right-16 z-30 flex gap-2">
        <button
          className="flex h-8 w-8 items-center justify-center rounded border border-[#2563EB]/40 bg-[rgba(8,22,44,0.8)] text-white text-lg leading-none hover:bg-[rgba(37,99,235,0.3)] transition-colors"
          onClick={handleZoomIn}
          title="放大"
        >
          +
        </button>
        <button
          className="flex h-8 w-8 items-center justify-center rounded border border-[#2563EB]/40 bg-[rgba(8,22,44,0.8)] text-white text-lg leading-none hover:bg-[rgba(37,99,235,0.3)] transition-colors"
          onClick={handleZoomOut}
          title="缩小"
        >
          −
        </button>
        <button
          className="flex h-8 w-8 items-center justify-center rounded border border-[#2563EB]/40 bg-[rgba(8,22,44,0.8)] text-white text-xs leading-none hover:bg-[rgba(37,99,235,0.3)] transition-colors"
          onClick={handleReset}
          title="重置"
        >
          ↺
        </button>
        
      </div>
    </div>
  );
}
