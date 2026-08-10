import { useEffect, useMemo, useRef } from 'react';
import Highcharts from 'highcharts/esm/highcharts.src.js';
import 'highcharts/esm/highcharts-3d.src.js';

/** 分片数据 */
type StatusEntry = { label: string; color: string; count: number };

export type ConstructOverviewChartProps = {
  entries: StatusEntry[];
  /** 深度范围 [最小, 最大]，默认 [18, 55] */
  depthRange?: [number, number];
  /**
   * 按标签指定固定深度，优先级高于 depthRange 的等比计算。
   * 示例：{ '搭建正常': 55, '严重滞后': 20 }
   * 未在此 map 中的 label 仍按 depthRange 等比计算。
   */
  depthByLabel?: Record<string, number>;
  /** 是否显示连接线 + 数值标签，默认 true */
  showDataLabels?: boolean;
  /** 环形内径百分比，默认 55 */
  innerSize?: string;
};

export function ConstructOverviewChart({
  entries,
  depthRange = [18, 55],
  depthByLabel,
  showDataLabels = true,
  innerSize = '80%',
}: ConstructOverviewChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<Highcharts.Chart | null>(null);

  const hasData = useMemo(() => entries.some((e) => e.count > 0), [entries]);

  const chartOptions = useMemo(() => {
    const [minDepth, maxDepth] = depthRange;
    const maxCount = Math.max(...entries.map((e) => e.count), 1);

    const data = entries.map((entry) => {
      let depth: number;
      if (depthByLabel && entry.label in depthByLabel) {
        depth = depthByLabel[entry.label];
      } else if (entry.count <= 0) {
        depth = minDepth;
      } else {
        depth = Math.round(minDepth + (entry.count / maxCount) * (maxDepth - minDepth));
      }

      return {
        name: entry.label,
        y: entry.count > 0 ? entry.count : null,
        color: entry.color,
        depth,
      };
    });

    return {
      chart: {
        type: 'pie' as const,
        options3d: {
          enabled: true,
          alpha: 45,
          beta: 0,
        },
        backgroundColor: 'transparent',
        style: {
          fontFamily: 'inherit',
        },
      },
      title: { text: '' },
      subtitle: { text: '' },
      tooltip: {
        enabled: true,
        pointFormat: '<b>{point.name}</b>: {point.y} 个',
        style: { color: '#dbeeff' },
        backgroundColor: 'rgba(6,17,34,0.95)',
        borderColor: 'rgba(128,185,255,0.28)',
      },
      credits: { enabled: false },
      legend: { enabled: false },
      plotOptions: {
        pie: {
          innerSize,
          depth: 55,
          allowPointSelect: false,
          cursor: 'pointer',
          borderColor: 'rgba(9,26,52,0.6)',
          borderWidth: 1.5,
          dataLabels: {
            enabled: showDataLabels,
            distance: 12,
            connectorWidth: 1.5,
            connectorColor: 'rgba(128,185,255,0.45)',
            connectorShape: 'straight',
            softConnector: true,
            style: {
              color: '#dbeeff',
              fontSize: '12px',
              fontWeight: 400,
              textOutline: 'none',
            },
            format: '<b style="color:#dbeeff;font-size:13px">{point.y}</b>',
          },
          states: {
            hover: {
              halo: {
                size: 8,
                opacity: 0.3,
              },
            },
          },
          showInLegend: false,
        },
      },
      series: [
        {
          type: 'pie' as const,
          name: '搭建总览',
          data,
        },
      ],
    } as Highcharts.Options;
  }, [entries, depthRange, depthByLabel, showDataLabels, innerSize]);

  // Initialize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let instance = chartRef.current;
    if (!instance) {
      instance = Highcharts.chart(container, chartOptions);
      chartRef.current = instance;
    } else {
      instance.update(chartOptions, true, true);
    }
  }, [chartOptions]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, []);

  if (!hasData) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-[#93aed0]">
        暂无数据
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-full w-full min-h-0 min-w-0" />
  );
}
