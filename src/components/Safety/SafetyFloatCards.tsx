/* ============================================
   浮动玻璃感信息卡（安全风险预警 + 关键工序）
   横版：地图右上角悬浮
   竖版：absolute 覆盖在地图底部，上下两行
   ============================================ */

import { useEffect, useRef } from 'react';
import { Card, Flex, Typography } from 'antd';

const { Text } = Typography;

const RISK_LEGEND = [
  { color: '#2563EB', label: '一般风险' },
  { color: '#FA8C16', label: '较大风险' },
  { color: '#F5222D', label: '重大风险' },

];

const PROCESS_LEGEND = [
  { label: '隐藏工艺', icon: '/img/隐藏工艺.svg' },
  { label: '复杂工艺', icon: '/img/复杂工艺.svg' },
  { label: '双层', icon: '/img/双层.svg' },
  { label: '吊点', icon: '/img/吊点.svg' },
  { label: '隐患待整改', icon: '/img/隐患待整改.svg' },
];

const glassCardStyle: React.CSSProperties = {
  width: 180,
  border: '1px solid #2563EB',
  background: 'transparent',
  boxShadow: '0 0 12px rgba(37,99,235,0.18)',
  backdropFilter: 'blur(8px)',
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  color: '#7fc6ff',
  lineHeight: '20px',
};

const headerStyle: React.CSSProperties = {
  borderBottom: '1px solid rgba(128,185,255,0.12)',
  minHeight: 30,
  padding: '6px 14px',
  background: 'transparent',
};

const bodyStyle: React.CSSProperties = {
  padding: '14px 14px',
  background: 'transparent',
  display: 'flex',
  justifyContent: 'center',
};

function LegendItem({ label, icon, color }: { label: string; icon?: string; color?: string }) {
  return (
    <Flex align="center" gap={8} style={{ flexShrink: 0, paddingRight: 20 }}>
      {color ? (
        <span
          style={{
            width: 12,
            height: 12,
            borderRadius: 2,
            background: color,
            flexShrink: 0,
            boxShadow: `0 0 6px ${color}66`,
          }}
        />
      ) : icon ? (
        <img src={icon} alt={label} style={{ width: 16, height: 16, flexShrink: 0, objectFit: 'contain' }} />
      ) : null}
      <Text style={{ color: '#fff', fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap' }}>{label}</Text>
    </Flex>
  );
}

export function SafetyFloatCards({ variant }: { variant?: 'landscape' | 'portrait' }) {
  const isPortrait = variant === 'portrait';

  // 关键工序列表自动横向滚动播放：内容超出可视区时启用，hover 时暂停
  const portraitProcessRef = useRef<HTMLDivElement>(null);
  const landscapeProcessRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const containers = [portraitProcessRef.current, landscapeProcessRef.current].filter(
      Boolean,
    ) as HTMLDivElement[];
    if (containers.length === 0) return;

    const cleanups = containers.map((container) => {
      if (container.scrollWidth <= container.clientWidth + 1) return () => {};

      let paused = false;
      const onEnter = () => { paused = true; };
      const onLeave = () => { paused = false; };
      container.addEventListener('mouseenter', onEnter);
      container.addEventListener('mouseleave', onLeave);

      const SPEED = 0.5;
      const timer = window.setInterval(() => {
        if (paused) return;
        if (container.scrollLeft + container.clientWidth >= container.scrollWidth - 1) {
          container.scrollLeft = 0;
        } else {
          container.scrollLeft += SPEED;
        }
      }, 30);

      return () => {
        window.clearInterval(timer);
        container.removeEventListener('mouseenter', onEnter);
        container.removeEventListener('mouseleave', onLeave);
      };
    });

    return () => cleanups.forEach((c) => c());
  }, [isPortrait]);

  if (isPortrait) {
    return (
      <div className="absolute bottom-1 left-3 right-3 z-30 flex flex-row gap-3 pointer-events-none">
        {/* 卡片 1：安全风险预警 */}
        <Card
          size="small"
          style={{
            ...glassCardStyle,
            flex: 1,
            minWidth: 0,
            height: 64,
            pointerEvents: 'auto',
          }}
          styles={{
            header: { display: 'none' },
            body: {
              height: '100%',
              boxSizing: 'border-box',
              padding: '8px 14px 10px',
              background: 'transparent',
              display: 'flex',
              alignItems: 'center',
              overflow: 'hidden',
            },
          }}
        >
          <Flex align="center" gap={0} wrap={false} style={{ minWidth: 0, width: '100%' }}>
            <Text style={{ color: '#7fc6ff', fontSize: 13, fontWeight: 500, flexShrink: 0, marginRight: 20 }}>审图风险评级：</Text>
            {RISK_LEGEND.map((item) => (
              <LegendItem key={item.label} {...item} />
            ))}
          </Flex>
        </Card>

        {/* 卡片 2：关键工序 */}
        <Card
          size="small"
          style={{
            ...glassCardStyle,
            flex: 1,
            minWidth: 0,
            height: 64,
            pointerEvents: 'auto',
          }}
          styles={{
            header: { display: 'none' },
            body: {
              height: '100%',
              boxSizing: 'border-box',
              padding: '8px 14px 10px',
              background: 'transparent',
              display: 'flex',
              alignItems: 'center',
              overflow: 'hidden',
            },
          }}
        >
          <div ref={portraitProcessRef} className="construct-steps-scroll" style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', overflowY: 'hidden', width: '100%' }}>
            <Text style={{ color: '#7fc6ff', fontSize: 13, fontWeight: 500, flexShrink: 0, marginRight: 20 }}>关键工序：</Text>
            {PROCESS_LEGEND.map((item) => (
              <LegendItem key={item.label} {...item} />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      right: 60,
      top: 240,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      {/* 卡片 1：安全风险预警 - 横向单行 */}
      <Card
        size="small"
        title={
          <span style={cardTitleStyle}>审图风险评级：</span>
        }
        style={{ ...glassCardStyle, width: 260 }}
        styles={{
          header: headerStyle,
          body: {
            ...bodyStyle,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            flexWrap: 'wrap',
            padding: '8px 14px 10px',
          },
        }}
      >
        <Flex align="center" gap={12} wrap>
          {RISK_LEGEND.map((item) => (
            <LegendItem key={item.label} {...item} />
          ))}
        </Flex>
      </Card>

      {/* 卡片 2：关键工序 - 横向单行 */}
      <Card
        size="small"
        title={
          <span style={cardTitleStyle}>关键工序：</span>
        }
        style={{ ...glassCardStyle, width: 260 }}
        styles={{
          header: headerStyle,
          body: {
            ...bodyStyle,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            flexWrap: 'wrap',
            padding: '8px 14px 10px',
          },
        }}
      >
        <div ref={landscapeProcessRef} className="construct-steps-scroll" style={{ display: 'flex', alignItems: 'center', gap: 12, overflowX: 'auto', overflowY: 'hidden', width: '100%' }}>
          {PROCESS_LEGEND.map((item) => (
            <LegendItem key={item.label} {...item} />
          ))}
        </div>
      </Card>
    </div>
  );
}