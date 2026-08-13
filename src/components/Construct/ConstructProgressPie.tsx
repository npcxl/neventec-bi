import { useEffect, useMemo, useRef } from 'react';
import Highcharts from 'highcharts/esm/highcharts.src.js';

type StatusEntry = { label: string; color: string; count: number };

type ConstructProgressPieProps = {
  entries: StatusEntry[];
};

export function ConstructProgressPie({ entries }: ConstructProgressPieProps) {
  const pieRef = useRef<HTMLDivElement | null>(null);
  const hcRef = useRef<Highcharts.Chart | null>(null);

  const hcOptions = useMemo(() => {
    // 用 keys + 数组数据方式，和官方示例一致
    // keys: ['name', 'y', 'selected', 'sliced']
    // 搭建完成 selected=true, sliced=true 突出显示
    const data = entries.map((entry) => [
      entry.label,
      entry.count > 0 ? entry.count : null,
      entry.label === '搭建完成',
      entry.label === '搭建完成',
    ]);

    return {
      chart: {
        type: 'pie' as const,
        backgroundColor: 'transparent',
        style: { fontFamily: 'inherit' },
        spacing: [0, 0, 0, 0],
      },
      title: { text: '' },
      credits: { enabled: false },
      tooltip: {
        headerFormat: '',
        pointFormat: '<span style="color:{point.color}">●</span> <b>{point.name}</b><br/>数量: <b>{point.y}</b>',
        style: { color: '#dbeeff' },
        backgroundColor: 'rgba(6,17,34,0.95)',
        borderColor: 'rgba(128,185,255,0.28)',
      },
      plotOptions: {
        pie: {
          size: '55%',
          allowPointSelect: true,
          cursor: 'pointer',
          borderColor: 'rgba(9,26,52,0.6)',
          borderWidth: 1.5,
          showInLegend: false,
          dataLabels: {
            enabled: true,
            distance: 20,
            connectorWidth: 1.5,
            connectorColor: 'rgba(128,185,255,0.45)',
            style: {
              color: '#dbeeff',
              fontSize: '12px',
              fontWeight: 'bold',
              textOutline: 'none',
            },
            format: '<b>{point.y}</b>',
          },
        },
      },
      series: [
        {
          type: 'pie' as const,
          name: '搭建进度',
          keys: ['name', 'y', 'selected', 'sliced'],
          data,
          colors: entries.map((e) => e.color),
        },
      ],
    } as Highcharts.Options;
  }, [entries.map((e) => `${e.label}:${e.count}`).join('|')]);

  useEffect(() => {
    const el = pieRef.current;
    if (!el) return;

    if (!hcRef.current) {
      hcRef.current = Highcharts.chart(el, hcOptions);
    } else {
      hcRef.current.update(hcOptions, true, true);
    }
  }, [hcOptions]);

  useEffect(() => {
    return () => {
      if (hcRef.current) {
        hcRef.current.destroy();
        hcRef.current = null;
      }
    };
  }, []);

  return <div ref={pieRef} className="h-full w-full min-h-0 min-w-0" />;
}
