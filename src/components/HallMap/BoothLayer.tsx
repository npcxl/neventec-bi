import { memo, useCallback } from 'react';
import type { Booth } from './types';
import { BOOTH_STATUS_COLORS, BOOTH_DEFAULT_OPACITY, BOOTH_HOVER_OPACITY } from './utils/constants';

type BoothLayerProps = {
  booths: Booth[];
  onBoothClick?: (booth: Booth) => void;
  onBoothHover?: (booth: Booth | null) => void;
};

/**
 * SVG 展位覆盖层
 * 根据 polygon 绘制 SVG polygon，根据 status 显示颜色
 * 使用 memo 避免重复渲染
 */
export const BoothLayer = memo(function BoothLayer({
  booths,
  onBoothClick,
  onBoothHover,
}: BoothLayerProps) {
  const handleMouseEnter = useCallback(
    (booth: Booth) => {
      onBoothHover?.(booth);
    },
    [onBoothHover],
  );

  const handleMouseLeave = useCallback(() => {
    onBoothHover?.(null);
  }, [onBoothHover]);

  const handleClick = useCallback(
    (booth: Booth) => {
      onBoothClick?.(booth);
    },
    [onBoothClick],
  );

  return (
    <svg
      viewBox={`0 0 ${100} ${100}`}
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
      {booths.map((booth) => {
        const color = BOOTH_STATUS_COLORS[booth.status] || BOOTH_STATUS_COLORS.normal;
        const pointsStr = booth.polygon
          .map((p) => `${p[0]},${p[1]}`)
          .join(' ');

        return (
          <g key={booth.id}>
            {/* 透明点击区域 - 用于接收鼠标事件 */}
            <polygon
              points={pointsStr}
              fill="transparent"
              stroke="transparent"
              strokeWidth="2"
              style={{ pointerEvents: 'all', cursor: 'pointer' }}
              onMouseEnter={() => handleMouseEnter(booth)}
              onMouseLeave={handleMouseLeave}
              onClick={() => handleClick(booth)}
            />
            {/* 展位填充 */}
            <polygon
              points={pointsStr}
              fill={color}
              fillOpacity={BOOTH_DEFAULT_OPACITY}
              stroke={color}
              strokeWidth="1"
              strokeOpacity={0.3}
              style={{ pointerEvents: 'none' }}
              className={`booth-polygon booth-${booth.id}`}
            />
          </g>
        );
      })}
    </svg>
  );
});
