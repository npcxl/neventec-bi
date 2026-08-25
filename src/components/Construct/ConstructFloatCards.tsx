/* ============================================
   浮动玻璃感信息卡（施工进程 + 搭建进度图例）
   横版：地图右上角悬浮
   竖版：absolute 覆盖在地图底部，上下两行
   ============================================ */

import { Card, Steps, Flex, Typography } from 'antd';

const { Text } = Typography;

export type ConstructProcessStep = {
  title: string;
};



const PROGRESS_LEGEND = [
  { color: '#2563EB', label: '搭建正常' },
  { color: '#FA8C16', label: '进度缓慢' },
  { color: '#F5222D', label: '严重滞后' },
  { color: '#63F222', label: '搭建完成' },
  { color: '#ccc', label: '未进场' },
];

const glassCardStyle: React.CSSProperties = {
  width: 180,
  border: '1px solid #2563EB',
  background: 'linear-gradient(180deg, rgba(9,26,52,0.78), rgba(6,17,34,0.86))',
  backdropFilter: 'blur(8px)',
};

// 兼容接口返回结构：可能直接是数组，或 {data: [...]} / {rows: [...]} / {list: [...]}
function normalizeSteps(raw: unknown): ConstructProcessStep[] {
  if (!raw) return [];
  const arr = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as any).data)
      ? (raw as any).data
      : Array.isArray((raw as any).categoryList)
        ? (raw as any).categoryList
        : Array.isArray((raw as any).rows)
          ? (raw as any).rows
          : Array.isArray((raw as any).list)
            ? (raw as any).list
            : [];
  return arr
    .map((item: any) => {
      if (typeof item === 'string') return { title: item };
      return {
        title: item?.title ?? item?.name ?? item?.stepName ?? String(item ?? ''),
      };
    })
    .filter((s: ConstructProcessStep) => s.title);
}

export function ConstructFloatCards({
  variant,
  steps,
}: {
  variant?: 'landscape' | 'portrait';
  steps?: unknown;
}) {
  const isPortrait = variant === 'portrait';

  const processSteps = normalizeSteps(steps);

  if (isPortrait) {
    return (
      <div className="absolute bottom-0 left-3 right-3 z-30 flex flex-row items-start gap-2 pointer-events-none">
        {/* 第一行：施工进程 - 横向步骤，超出左右滚动 */}
        <Card
        size="small"
        style={{
          ...glassCardStyle,
          width: 'auto',
          height: 64,
          flex: 1,
          minWidth: 0,
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
        <Flex align="center" gap={12} style={{ minWidth: 0 }}>
          <Text style={{ color: '#7fc6ff', fontSize: 12, fontWeight: 500, flexShrink: 0 }}>搭建进程：</Text>
          <div className="construct-steps-scroll" style={{ maxWidth: '100%', overflowX: 'auto', overflowY: 'hidden', flex: 1, minWidth: 0 }}>
            <Steps
              direction="horizontal"
              size="small"
              current={-1}
              className="!w-max"
              items={processSteps.map((step) => ({
                title: (
                  <span
                    style={{
                      color: '#fff',
                      fontSize: 11,
                      whiteSpace: 'nowrap', 
                      display: 'inline-block',
                      lineHeight: 1.4,
                    }}
                  >
                    {step.title}
                  </span>
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
                  minWidth: 'max-content',
                },
              }}
            />
          </div>
        </Flex>
        </Card>

        {/* 第二行：搭建进度图例 - 4个横向 */}
        <Card
          size="small"
          style={{
            ...glassCardStyle,
            width: 'calc(50% - 4px)',
            height: 64,
            pointerEvents: 'auto',
          }}
          styles={{
            header: { display: 'none' },
            body: {
              height: '100%',
              boxSizing: 'border-box',
              padding: '10px 14px',
              background: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              overflow: 'hidden',
            },
          }}
        >
          <Flex align="center" wrap style={{ width: '100%' }}>
            <Text style={{ color: '#7fc6ff', fontSize: 12, fontWeight: 500, flexShrink: 0 }}>施工进度：</Text>
            <Flex justify="space-between" style={{ flex: 1, minWidth: 0 }}>
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
          </Flex>
        </Card>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      right: 60,
      top: 320,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      {/* 卡片 1：施工进程 - 竖向步骤，超出上下滚动 */}
      <Card
        size="small"
        title={
          <Text strong style={{ color: '#7fc6ff', fontSize: 13 }}>
            施工进程
          </Text>
        }
        style={{ ...glassCardStyle, width: 220 }}
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
        <div className="construct-steps-scroll" style={{ maxHeight: 260, overflowY: 'auto', overflowX: 'hidden' }}>
          <Steps
            direction="vertical"
            size="small"
            current={-1}
            items={processSteps.map((step) => ({
              title: (
                <span
                  style={{
                    color: '#fff',
                    fontSize: 12,
                    whiteSpace: 'nowrap',
                    display: 'inline-block',
                    lineHeight: 1.4,
                  }}
                >
                  {step.title}
                </span>
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
                minWidth: 'max-content',
              },
            }}
            className="[&_.ant-steps-item-tail]:after:!border-l-[rgba(255,255,255,0.2)]"
          />
        </div>
      </Card>

      {/* 卡片 2：搭建进度图例 */}
      <Card
        size="small"
        title={
          <Text strong style={{ color: '#7fc6ff', fontSize: 13 }}>
            搭建进度
          </Text>
        }
        style={{ ...glassCardStyle, width: 220 }}
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
