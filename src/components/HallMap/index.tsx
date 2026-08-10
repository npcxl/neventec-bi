import { useState, useCallback, useRef, useEffect } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import type { ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { HallImage } from './HallImage';
import { BoothLayer } from './BoothLayer';
import type { Booth, HallData } from './types';
import {
  MIN_ZOOM,
  MAX_ZOOM,
  ZOOM_STEP,
  ANIMATION_DURATION,
  BOOTH_STATUS_COLORS,
  BOOTH_HOVER_OPACITY,
} from './utils/constants';

type HallMapProps = {
  hallData: HallData;
  onBoothClick?: (booth: Booth) => void;
};

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

  const handleBoothHover = useCallback((booth: Booth | null) => {
    setHoveredBoothId(booth?.id ?? null);
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: 'rgba(8,22,44,0.9)' }}>
      <TransformWrapper
        ref={transformRef}
        initialScale={1}
        minScale={MIN_ZOOM}
        maxScale={MAX_ZOOM}
        wheel={{ step: ZOOM_STEP }}
        panning={{ disabled: false }}
        doubleClick={{ disabled: true }}
        limitToBounds={false}
        centerOnInit
        animationTime={ANIMATION_DURATION}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            {/* 缩放控制按钮 */}
            <div className="absolute bottom-4 right-4 z-30 flex gap-2">
              <button
                className="flex h-8 w-8 items-center justify-center rounded border border-[#2563EB]/40 bg-[rgba(8,22,44,0.8)] text-white text-lg leading-none hover:bg-[rgba(37,99,235,0.3)] transition-colors"
                onClick={() => zoomIn(ZOOM_STEP)}
                title="放大"
              >
                +
              </button>
              <button
                className="flex h-8 w-8 items-center justify-center rounded border border-[#2563EB]/40 bg-[rgba(8,22,44,0.8)] text-white text-lg leading-none hover:bg-[rgba(37,99,235,0.3)] transition-colors"
                onClick={() => zoomOut(ZOOM_STEP)}
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
                width: '100%',
                height: '100%',
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
                  minWidth: `${hallData.width}px`,
                  minHeight: `${hallData.height}px`,
                }}
              >
                {/* 背景图 */}
                <HallImage hallData={hallData} />

                {/* 展位覆盖层 - 与背景图使用相同的 viewBox */}
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
                    const opacity = isHovered ? BOOTH_HOVER_OPACITY : 0.45;
                    const pointsStr = booth.polygon
                      .map((p) => `${p[0]},${p[1]}`)
                      .join(' ');

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
                          strokeOpacity={isHovered ? 0.8 : 0.3}
                          style={{
                            pointerEvents: 'none',
                            transition: `fill-opacity ${ANIMATION_DURATION}ms ease, stroke-width ${ANIMATION_DURATION}ms ease, stroke-opacity ${ANIMATION_DURATION}ms ease`,
                          }}
                        />
                        {/* hover 时显示展位编号 */}
                        {isHovered && (
                          <text
                            x={
                              booth.polygon.reduce((s, p) => s + p[0], 0) /
                              booth.polygon.length
                            }
                            y={
                              booth.polygon.reduce((s, p) => s + p[1], 0) /
                              booth.polygon.length
                            }
                            fill="#fff"
                            fontSize="12"
                            textAnchor="middle"
                            dominantBaseline="central"
                            style={{ pointerEvents: 'none', fontWeight: 600 }}
                          >
                            {booth.boothNo || booth.id}
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
