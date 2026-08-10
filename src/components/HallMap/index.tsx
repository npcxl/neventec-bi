import { useRef, useEffect, useCallback, useState } from 'react';
import type { Booth, HallData } from './types';
import { BOOTH_STATUS_COLORS, MIN_ZOOM, MAX_ZOOM } from './utils/constants';

type HallMapProps = {
  hallData: HallData;
  onBoothClick?: (booth: Booth) => void;
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

/** 计算字体大小（基于屏幕像素） */
function getFontSize(w: number, h: number): number {
  const base = Math.min(h * 0.22, w * 0.13);
  return Math.max(8, Math.min(base, 18));
}

// ===================== 组件 =====================

export default function HallMap({ hallData, onBoothClick }: HallMapProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const cameraRef = useRef<Camera>({ scale: 1, offsetX: 0, offsetY: 0 });
  const animationRef = useRef<number>(0);
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const [hoveredBoothId, setHoveredBoothId] = useState<string | null>(null);
  const [controlsCollapsed, setControlsCollapsed] = useState(false);
  const hallDataRef = useRef(hallData);
  hallDataRef.current = hallData;
  const onBoothClickRef = useRef(onBoothClick);
  onBoothClickRef.current = onBoothClick;

  // ========== 加载背景图 ==========
  useEffect(() => {
    let cancelled = false;
    bgImageRef.current = null;

    loadImage(hallData.background)
      .then((img) => {
        if (!cancelled) {
          bgImageRef.current = img;
          // 重置 camera 并居中
          fitToCenter();
          draw();
        }
      })
      .catch(() => {
        if (!cancelled) draw();
      });

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
    cameraRef.current = {
      scale: fitScale,
      offsetX: (cw - width * fitScale) / 2,
      offsetY: (ch - height * fitScale) / 2,
    };
  }, []);

  // ========== 绘制 ==========
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width: worldW, height: worldH, booths } = hallDataRef.current;
    const { scale, offsetX, offsetY } = cameraRef.current;
    const cw = canvas.width;
    const ch = canvas.height;

    // 清空
    ctx.clearRect(0, 0, cw, ch);

    // 背景
    ctx.fillStyle = 'rgba(8,22,44,1)';
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
    for (const booth of booths) {
      const color = BOOTH_STATUS_COLORS[booth.status] || BOOTH_STATUS_COLORS.normal;
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
      ctx.fillStyle = color;
      ctx.globalAlpha = isHovered ? 0.65 : 0.5;
      ctx.fill();
      ctx.globalAlpha = 1;

      // 绘制描边
      ctx.strokeStyle = color;
      ctx.lineWidth = isHovered ? 2 : 1;
      ctx.globalAlpha = isHovered ? 0.9 : 0.5;
      ctx.stroke();
      ctx.globalAlpha = 1;

      // 绘制文字（缩放后大小合适才显示）
      const xs = polygon.map((p) => p[0]);
      const ys = polygon.map((p) => p[1]);
      const bw = (Math.max(...xs) - Math.min(...xs)) * scale;
      const bh = (Math.max(...ys) - Math.min(...ys)) * scale;
      const cx = (xs.reduce((a, b) => a + b, 0) / xs.length) * scale + offsetX;
      const cy = (ys.reduce((a, b) => a + b, 0) / ys.length) * scale + offsetY;
      const fontSize = getFontSize(bw, bh);

      const showCode = bw > 25 && bh > 18;
      const showText = bw > 40 && bh > 30;

      if (showCode) {
        ctx.fillStyle = '#fff';
        ctx.font = `700 ${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = showText ? 'bottom' : 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 3;
        ctx.fillText(booth.boothNo || booth.id, cx, showText ? cy - 2 : cy);
        ctx.shadowBlur = 0;
      }

      if (showText && booth.name) {
        const name = booth.name.length > 8 ? booth.name.slice(0, 7) + '\u2026' : booth.name;
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.font = `500 ${fontSize * 0.75}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 2;
        ctx.fillText(name, cx, cy + 2);
        ctx.shadowBlur = 0;
      }
    }

    ctx.restore();
  }, [hoveredBoothId]);

  // 当 hallData 或 hoveredBoothId 变化时重绘
  useEffect(() => {
    draw();
  }, [draw]);

  // ========== Canvas 尺寸同步 ==========
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

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
      fitToCenter();
      draw();
    };

    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(container);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hallData]);

  // ========== 屏幕坐标 → 世界坐标 ==========
  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const { scale, offsetX, offsetY } = cameraRef.current;
    return {
      x: (screenX - rect.left - offsetX) / scale,
      y: (screenY - rect.top - offsetY) / scale,
    };
  }, []);

  // ========== 命中检测 ==========
  const hitTest = useCallback(
    (worldX: number, worldY: number): Booth | null => {
      const booths = hallDataRef.current.booths;
      // 从后往前遍历，优先命中上层展位
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
        const dx = e.clientX - lastMouseRef.current.x;
        const dy = e.clientY - lastMouseRef.current.y;
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
      // 拖动距离很小视为点击
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
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();

      // 鼠标在 canvas 上的屏幕坐标
      const mouseScreenX = e.clientX - rect.left;
      const mouseScreenY = e.clientY - rect.top;

      const { scale, offsetX, offsetY } = cameraRef.current;

      // 鼠标指向的世界坐标
      const worldX = (mouseScreenX - offsetX) / scale;
      const worldY = (mouseScreenY - offsetY) / scale;

      // 计算新的缩放
      const zoomFactor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      const newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, scale * zoomFactor));

      // 保持鼠标指向的世界坐标在屏幕上位置不变
      const newOffsetX = mouseScreenX - worldX * newScale;
      const newOffsetY = mouseScreenY - worldY * newScale;

      cameraRef.current = {
        scale: newScale,
        offsetX: newOffsetX,
        offsetY: newOffsetY,
      };
      draw();
    },
    [draw],
  );

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
    const newScale = Math.max(MIN_ZOOM, scale / 1.25);
    cameraRef.current = {
      scale: newScale,
      offsetX: cx - worldX * newScale,
      offsetY: cy - worldY * newScale,
    };
    draw();
  }, [draw]);

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
      style={{ background: 'rgba(8,22,44,0.9)', cursor: isDraggingRef.current ? 'grabbing' : 'grab' }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
      />

      {/* 缩放控制按钮组 */}
      <div className="absolute bottom-4 right-4 z-30 flex gap-2">
        {controlsCollapsed ? (
          <button
            className="flex h-8 w-8 items-center justify-center rounded border border-[#2563EB]/40 bg-[rgba(8,22,44,0.8)] text-white text-xs leading-none hover:bg-[rgba(37,99,235,0.3)] transition-colors"
            onClick={() => setControlsCollapsed(false)}
            title="展开控制"
          >
            ◀
          </button>
        ) : (
          <>
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
            <button
              className="flex h-8 w-8 items-center justify-center rounded border border-[#2563EB]/40 bg-[rgba(8,22,44,0.8)] text-white text-xs leading-none hover:bg-[rgba(37,99,235,0.3)] transition-colors"
              onClick={() => setControlsCollapsed(true)}
              title="收起控制"
            >
              ▶
            </button>
          </>
        )}
      </div>
    </div>
  );
}
