import { useState, useRef, useEffect } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import type { ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { HallImage } from './HallImage';
import type { Booth, HallData } from './types';
import {
  MIN_ZOOM,
  MAX_ZOOM,
  ANIMATION_DURATION,
  BOOTH_STATUS_COLORS,
  BOOTH_HOVER_OPACITY,
} from './utils/constants';

type HallMapProps = {
  hallData: HallData;
  onBoothClick?: (booth: Booth) => void;
};

/**
 * 根据展位宽高计算合适的字体大小
 */
function getFontSize(w: number, h: number): number {
  const base = Math.min(h * 0.22, w * 0.13);
  return Math.max(10, Math.min(base, 18));
}

/**
 * 展馆地图容器
 * 整合背景图 + SVG 展位覆盖层 + 缩放拖动
 */
export default function HallMap({ hallData, onBoothClick }: HallMapProps) {
  const transformRef = useRef<ReactZoomPanPinchRef | null>(null);
  const [hoveredBoothId, setHoveredBoothId] = useState<string | null>(null);

  // 当展馆数据切换时重置缩放
  useEffect(() => {
    if (transformRef.current) {
      transformRef.current.resetTransform();
    }
  }, [hallData]);

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: 'rgba(8,22,44,0.9)' }}>
      <TransformWrapper
        ref={transformRef}
        initialScale={1}
        minScale={MIN_ZOOM}
        maxScale={MAX_ZOOM}
        wheel={{ step: 0.1 }}
        panning={{ disabled: false, velocityDisabled: true }}
        doubleClick={{ disabled: true }}
        limitToBounds={false}
        centerOnInit
        animationTime={ANIMATION_DURATION}
        disablePadding
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            {/* 缩放控制按钮 */}
            <div className="absolute bottom-4 right-4 z-30 flex gap-2">
              <button
                className="flex h-8 w-8 items-center justify-center rounded border border-[#2563EB]/40 bg-[rgba(8,22,44,0.8)] text-white text-lg leading-none hover:bg-[rgba(37,99,235,0.3)] transition-colors"
                onClick={() => zoomIn()}
                title="放大"
              >
                +
              </button>
              <button
                className="flex h-8 w-8 items-center justify-center rounded border border-[#2563EB]/40 bg-[rgba(8,22,44,0.8)] text-white text-lg leading-none hover:bg-[rgba(37,99,235,0.3)] transition-colors"
                onClick={() => zoomOut()}
                title="缩小"
              >
                −
              </button>
              <button
                className="flex h-8 w-8 items-center justify-center rounded border border-[#2563EB]/40 bg-[rgba(8,22,44,0.8)] text-white text-xs leading-none hover:bg-[rgba(37,99,235,0.3)] transition-colors"
                onClick={() => resetTransform()}
                title="重置"
              >
                ↺
              </button>
            </div>

            <TransformComponent
              wrapperStyle={{
                width: '100%',
                height: '100%',
              }}
              contentStyle={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                className="relative"
                style={{
                  width: `${hallData.width}px`,
                  height: `${hallData.height}px`,
                }}
              >
                {/* 背景图 */}
                <HallImage hallData={hallData} />

                {/* 展位覆盖层 */}
                <svg
                  viewBox={`0 0 ${hallData.width} ${hallData.height}`}
                  xmlns="http://www.w3.org/2000/svg"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                    overflow: 'visible',
                  }}
                >
                  {hallData.booths.map((booth) => {
                    const color = BOOTH_STATUS_COLORS[booth.status] || BOOTH_STATUS_COLORS.normal;
                    const isHovered = hoveredBoothId === booth.id;
                    const opacity = isHovered ? BOOTH_HOVER_OPACITY : 0.5;
                    const pointsStr = booth.polygon
                      .map((p) => `${p[0]},${p[1]}`)
                      .join(' ');

                    // 计算展位宽高用于字体
                    const xs = booth.polygon.map((p) => p[0]);
                    const ys = booth.polygon.map((p) => p[1]);
                    const w = Math.max(...xs) - Math.min(...xs);
                    const h = Math.max(...ys) - Math.min(...ys);
                    const cx = xs.reduce((a, b) => a + b, 0) / xs.length;
                    const cy = ys.reduce((a, b) => a + b, 0) / ys.length;
                    const fontSize = getFontSize(w, h);
                    const showText = w > 40 && h > 30;
                    const showCode = w > 25 && h > 18;

                    return (
                      <g key={booth.id}>
                        {/* 透明点击区域 */}
                        <polygon
                          points={pointsStr}
                          fill="transparent"
                          stroke="transparent"
                          strokeWidth="2"
                          style={{ pointerEvents: 'all', cursor: 'pointer' }}
                          onMouseEnter={() => setHoveredBoothId(booth.id)}
                          onMouseLeave={() => setHoveredBoothId(null)}
                          onClick={() => onBoothClick?.(booth)}
                        />
                        {/* 展位填充 */}
                        <polygon
                          points={pointsStr}
                          fill={color}
                          fillOpacity={opacity}
                          stroke={color}
                          strokeWidth={isHovered ? 2 : 1}
                          strokeOpacity={isHovered ? 0.9 : 0.5}
                          style={{
                            pointerEvents: 'none',
                            transition: `fill-opacity ${ANIMATION_DURATION}ms ease, stroke-width ${ANIMATION_DURATION}ms ease, stroke-opacity ${ANIMATION_DURATION}ms ease`,
                          }}
                        />
                        {/* 始终显示展位编号（小展位不显示） */}
                        {showCode && (
                          <text
                            x={cx}
                            y={showText ? cy - fontSize * 0.6 : cy}
                            fill="#fff"
                            fontSize={fontSize}
                            textAnchor="middle"
                            dominantBaseline={showText ? 'auto' : 'central'}
                            style={{ pointerEvents: 'none', fontWeight: 700, textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
                          >
                            {booth.boothNo || booth.id}
                          </text>
                        )}
                        {/* 展位名称（足够大时显示） */}
                        {showText && (
                          <text
                            x={cx}
                            y={cy + fontSize * 0.6}
                            fill="rgba(255,255,255,0.85)"
                            fontSize={fontSize * 0.75}
                            textAnchor="middle"
                            dominantBaseline="hanging"
                            style={{ pointerEvents: 'none', fontWeight: 500, textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
                          >
                            {booth.name
                              ? booth.name.length > 8
                                ? booth.name.slice(0, 7) + '…'
                                : booth.name
                              : ''}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
    </div>
  );
}
