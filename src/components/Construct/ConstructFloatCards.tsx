/* ============================================
   浮动玻璃感信息卡（施工进程 + 搭建进度图例）
   横版：地图右上角悬浮
   竖版：absolute 覆盖在地图底部，上下两行
   ============================================ */

import { Card, Steps, Flex, Typography } from 'antd';

const { Text } = Typography;

const PROCESS_STEPS = [
  { title: '办理进度手续' },
  { title: '展位进场状态' },
  { title: '尺寸开口确认' },
  { title: '主体结构搭建' },
];

const PROGRESS_LEGEND = [
  { color: '#2563EB', label: '搭建正常' },
  { color: '#FA8C16', label: '进度缓慢' },
  { color: '#F5222D', label: '严重滞后' },
  { color: '#63F222', label: '搭建完成' },
];

const glassCardStyle: React.CSSProperties = {
  width: 180,
  border: '1px solid #2563EB',
  background: 'linear-gradient(180deg, rgba(9,26,52,0.78), rgba(6,17,34,0.86))',
  backdropFilter: 'blur(8px)',
};

export function ConstructFloatCards({ variant }: { variant?: 'landscape' | 'portrait' }) {
  const isPortrait = variant === 'portrait';

  if (isPortrait) {
    return (
      <div className="absolute bottom-3 left-3 right-3 z-30 flex flex-col gap-2 pointer-events-none">
        {/* 第一行：施工进程 - 4个步骤横向 */}
        <Card
          size="small"
          style={{ ...glassCardStyle, width: 'auto', pointerEvents: 'auto' }}
          styles={{
            header: { display: 'none' },
            body: {
              padding: '8px 14px 10px',
              background: 'transparent',
            },
          }}
        >
          <Steps
            direction="horizontal"
            size="small"
            current={-1}
            items={PROCESS_STEPS.map((step) => ({
              title: <Text style={{ color: '#fff', fontSize: 11 }}>{step.title}</Text>,
            }))}
            styles={{
              itemIcon: {
                color: '#fff',
                borderColor: '#fff',
                background: 'rgba(255,255,255,0.12)',
              },
              itemContent: {
                color: '#fff',
              },
            }}
          />
        </Card>

        {/* 第二行：搭建进度图例 - 4个横向 */}
        <Card
          size="small"
          style={{ ...glassCardStyle, width: 'auto', pointerEvents: 'auto' }}
          styles={{
            header: { display: 'none' },
            body: {
              padding: '10px 14px',
              background: 'transparent',
              display: 'flex',
              justifyContent: 'center',
            },
          }}
        >
          <Flex gap={20} align="center" wrap>
            {PROGRESS_LEGEND.map((item) => (
              <Flex key={item.label} align="center" gap={8}>
                <span style={{
                  width: 10,
                  height: 10,
                  flexShrink: 0,
                  borderRadius: 2,
                  backgroundColor: item.color,
                }} />
                <Text style={{ color: '#fff', fontSize: 12 }}>{item.label}</Text>
              </Flex>
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
      gap: 10,
    }}>
      {/* 卡片 1：施工进程 */}
      <Card
        size="small"
        title={
          <Text strong style={{ color: '#7fc6ff', fontSize: 13 }}>
            施工进程
          </Text>
        }
        style={glassCardStyle}
        styles={{
          header: {
            borderBottom: '1px solid rgba(128,185,255,0.12)',
            minHeight: 36,
            padding: '8px 14px',
            background: 'transparent',
          },
          body: {
            padding: '10px 14px 14px',
            background: 'transparent',
          },
        }}
      >
        <Steps
          direction="vertical"
          size="small"
          current={-1}
          items={PROCESS_STEPS.map((step) => ({
            title: (
              <Flex justify="space-between" align="center">
                <Text style={{ color: '#fff', fontSize: 12 }}>{step.title}</Text>
              </Flex>
            ),
          }))}
          styles={{
            itemIcon: {
              color: '#fff',
              borderColor: '#fff',
              background: 'rgba(255,255,255,0.12)',
            },
            itemContent: {
              color: '#fff',
            },
          }}
          className="[&_.ant-steps-item-tail]:after:!border-l-[rgba(255,255,255,0.2)]"
        />
      </Card>

      {/* 卡片 2：搭建进度图例 */}
      <Card
        size="small"
        title={
          <Text strong style={{ color: '#7fc6ff', fontSize: 13 }}>
            搭建进度
          </Text>
        }
        style={glassCardStyle}
        styles={{
          header: {
            borderBottom: '1px solid rgba(128,185,255,0.12)',
            minHeight: 36,
            padding: '8px 14px',
            background: 'transparent',
          },
          body: {
            padding: '16px 14px',
            background: 'transparent',
            display: 'flex',
            justifyContent: 'center',
          },
        }}
      >
        <Flex vertical gap={12} align="center">
          {PROGRESS_LEGEND.map((item) => (
            <Flex key={item.label} align="center" gap={10}>
              <span style={{
                width: 10,
                height: 10,
                flexShrink: 0,
                borderRadius: 2,
                backgroundColor: item.color,
              }} />
              <Text style={{ color: '#fff', fontSize: 12 }}>{item.label}</Text>
            </Flex>
          ))}
        </Flex>
      </Card>
    </div>
  );
}
