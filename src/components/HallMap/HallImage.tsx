import { memo } from 'react';
import type { HallData } from './types';

type HallImageProps = {
  hallData: HallData;
};

/**
 * 展馆背景图组件
 * 加载背景图并设置 SVG viewBox
 */
export const HallImage = memo(function HallImage({ hallData }: HallImageProps) {
  return (
    <svg
      viewBox={`0 0 ${hallData.width} ${hallData.height}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        pointerEvents: 'none',
      }}
    >
      <image
        href={hallData.background}
        width={hallData.width}
        height={hallData.height}
        preserveAspectRatio="xMidYMid meet"
        style={{ pointerEvents: 'none' }}
      />
    </svg>
  );
});
