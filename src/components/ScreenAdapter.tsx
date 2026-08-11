import { useEffect, useRef, useState, type ReactNode } from 'react';

const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;

type ScreenAdapterProps = {
  children: ReactNode;
};

/**
 * 全局等比缩放适配器
 * 以 1920×1080 为设计基准，保持 16:9 比例
 * 适配范围：1280×720 ~ 3840×2160
 */
export default function ScreenAdapter({ children }: ScreenAdapterProps) {
  const [transform, setTransform] = useState('');
  const rafRef = useRef(0);

  useEffect(() => {
    const update = () => {
      const scale = Math.min(
        window.innerWidth / DESIGN_WIDTH,
        window.innerHeight / DESIGN_HEIGHT,
      );
      const left = (window.innerWidth - DESIGN_WIDTH * scale) / 2;
      const top = (window.innerHeight - DESIGN_HEIGHT * scale) / 2;
      setTransform(`translate(${left}px, ${top}px) scale(${scale})`);
    };

    update();
    const onResize = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(update);
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <>
      {/* 外层固定视口，黑色背景 */}
      <div
        className="screen-viewport"
        style={{
          position: 'fixed',
          inset: 0,
          overflow: 'hidden',
          background: '#020A25',
        }}
      />
      {/* 内层缩放画布 */}
      <div
        className="screen-canvas"
        style={{
          position: 'fixed',
          width: DESIGN_WIDTH,
          height: DESIGN_HEIGHT,
          transform,
          transformOrigin: 'left top',
          overflow: 'hidden',
          inset: 0,
        }}
      >
        {children}
      </div>
    </>
  );
}
