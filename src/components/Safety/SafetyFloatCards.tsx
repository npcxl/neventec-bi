/* ============================================
   浮动玻璃感信息卡（安全风险预警 + 关键工序）
   横版：地图右上角悬浮
   竖版：absolute 覆盖在地图底部，上下两行
   ============================================ */

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

function LegendItem({ label, icon }: { label: string; icon?: string }) {
  return (
    <Flex align="center" gap={8} style={{ flexShrink: 0, paddingRight: 20 }}>
      {icon ? (
        <img src={icon} alt={label} style={{ width: 16, height: 16, flexShrink: 0, objectFit: 'contain' }} />
      ) : null}
      <Text style={{ color: '#fff', fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap' }}>{label}</Text>
    </Flex>
  );
}

export function SafetyFloatCards({ variant }: { variant?: 'landscape' | 'portrait' }) {
  const isPortrait = variant === 'portrait';

  if (isPortrait) {
    return (
      <div className="absolute bottom-0 left-3 right-3 z-30 flex flex-row gap-3 pointer-events-none">
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
            <Text style={{ color: '#7fc6ff', fontSize: 13, fontWeight: 500, flexShrink: 0, marginRight: 20 }}>安全风险预警：</Text>
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
          <div className="construct-steps-scroll" style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', overflowY: 'hidden', width: '100%' }}>
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
          <span style={cardTitleStyle}>安全风险预警：</span>
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
        <Flex align="center" gap={12} wrap>
          {PROCESS_LEGEND.map((item) => (
            <LegendItem key={item.label} {...item} />
          ))}
        </Flex>
      </Card>
    </div>
  );
}