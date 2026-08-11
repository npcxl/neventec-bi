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
  { color: '#F5222D', label: '严重风险' },
  { color: '#FA8C16', label: '隐患待整改', icon: '⚠' },
];

const PROCESS_LEGEND = [
  { color: '#63F222', label: '搭建正常', icon: '▲' },
  { color: '#FA8C16', label: '进度缓慢', icon: '⊙' },
  { color: '#F5222D', label: '严重滞后', icon: '▲' },
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

function LegendItem({ color, label, icon }: { color: string; label: string; icon?: string }) {
  return (
    <Flex align="center" gap={10}>
      {icon ? (
        <span style={{ color, fontSize: 14, width: 14, textAlign: 'center' }}>{icon}</span>
      ) : (
        <span
          style={{
            width: 8,
            height: 8,
            flexShrink: 0,
            borderRadius: 1,
            backgroundColor: color,
          }}
        />
      )}
      <Text style={{ color: '#fff', fontSize: 14, fontWeight: 500 }}>{label}</Text>
    </Flex>
  );
}

export function SafetyFloatCards({ variant }: { variant?: 'landscape' | 'portrait' }) {
  const isPortrait = variant === 'portrait';

  if (isPortrait) {
    return (
      <div className="absolute bottom-3 left-3 right-3 z-30 flex flex-col gap-2 pointer-events-none">
        {/* 第一行：安全风险预警 - 4个横向 */}
        <Card
          size="small"
          style={{ ...glassCardStyle, width: 'auto', pointerEvents: 'auto' }}
          styles={{
            header: { display: 'none' },
            body: bodyStyle,
          }}
        >
          <Flex gap={20} align="center" wrap>
            {RISK_LEGEND.map((item) => (
              <LegendItem key={item.label} {...item} />
            ))}
          </Flex>
        </Card>

        {/* 第二行：关键工序 - 3个横向 */}
        <Card
          size="small"
          style={{ ...glassCardStyle, width: 'auto', pointerEvents: 'auto' }}
          styles={{
            header: { display: 'none' },
            body: bodyStyle,
          }}
        >
          <Flex gap={20} align="center" wrap>
            {PROCESS_LEGEND.map((item) => (
              <LegendItem key={item.label} {...item} />
            ))}
          </Flex>
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
      gap: 12,
    }}>
      {/* 卡片 1：安全风险预警 */}
      <Card
        size="small"
        title={
          <span style={cardTitleStyle}>安全风险预警：</span>
        }
        style={glassCardStyle}
        styles={{
          header: headerStyle,
          body: bodyStyle,
        }}
      >
        <Flex vertical gap={14} align="center">
          {RISK_LEGEND.map((item) => (
            <LegendItem key={item.label} {...item} />
          ))}
        </Flex>
      </Card>

      {/* 卡片 2：关键工序 */}
      <Card
        size="small"
        title={
          <span style={cardTitleStyle}>关键工序：</span>
        }
        style={glassCardStyle}
        styles={{
          header: headerStyle,
          body: bodyStyle,
        }}
      >
        <Flex vertical gap={14} align="center">
          {PROCESS_LEGEND.map((item) => (
            <LegendItem key={item.label} {...item} />
          ))}
        </Flex>
      </Card>
    </div>
  );
}