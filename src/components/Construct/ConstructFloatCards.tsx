/* ============================================
   浮动玻璃感信息卡（施工进程 + 搭建进度图例）
   横版：地图右上角悬浮
   竖版：absolute 覆盖在地图底部，上下两行
   ============================================ */

import { useEffect, useRef } from 'react';
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

// currentStageSteps 已是 categoryList 数组，直接取；字段 name→title
function normalizeSteps(raw: unknown): ConstructProcessStep[] {
  if (!Array.isArray(raw)) return [];
  return raw
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

  // 施工进程列表自动滚动播放：内容超出可视区（多项）时启用，hover 时暂停。
  // 按容器实际滚动方向（横向/竖向）自动选择 scrollLeft / scrollTop。
  const portraitScrollRef = useRef<HTMLDivElement>(null);
  const landscapeScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const containers = [portraitScrollRef.current, landscapeScrollRef.current].filter(
      Boolean,
    ) as HTMLDivElement[];
    if (containers.length === 0) return;

    const cleanups = containers.map((container) => {
      const horizontal = container.scrollWidth > container.clientWidth + 1;
      const vertical = container.scrollHeight > container.clientHeight + 1;
      if (!horizontal && !vertical) return () => {};

      let paused = false;
      const onEnter = () => { paused = true; };
      const onLeave = () => { paused = false; };
      container.addEventListener('mouseenter', onEnter);
      container.addEventListener('mouseleave', onLeave);

      const SPEED = 0.5; // px per tick
      const timer = window.setInterval(() => {
        if (paused) return;
        if (horizontal) {
          if (container.scrollLeft + container.clientWidth >= container.scrollWidth - 1) {
            container.scrollLeft = 0;
          } else {
            container.scrollLeft += SPEED;
          }
        } else {
          if (container.scrollTop + container.clientHeight >= container.scrollHeight - 1) {
            container.scrollTop = 0;
          } else {
            container.scrollTop += SPEED;
          }
        }
      }, 30);

      return () => {
        window.clearInterval(timer);
        container.removeEventListener('mouseenter', onEnter);
        container.removeEventListener('mouseleave', onLeave);
      };
    });

    return () => cleanups.forEach((c) => c());
  }, [processSteps.length, isPortrait]);

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
          <div ref={portraitScrollRef} className="construct-steps-scroll" style={{ maxWidth: '100%', overflowX: 'auto', overflowY: 'hidden', flex: 1, minWidth: 0 }}>
            {processSteps.length === 0 ? (
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>暂无进程数据</span>
            ) : (
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
            )}
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
      top: 230,
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
        <div ref={landscapeScrollRef} className="construct-steps-scroll" style={{ maxHeight: 200, overflowY: 'auto', overflowX: 'hidden' }}>
          {processSteps.length === 0 ? (
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>暂无进程数据</span>
          ) : (
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
          )}
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
        <div className="grid grid-cols-2 gap-x-10 gap-y-4" style={{ width: '100%' }}>
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
        </div>
      </Card>
    </div>
  );
}
