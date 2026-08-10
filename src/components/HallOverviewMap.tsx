import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

gsap.registerPlugin(useGSAP);

type HallOverviewItem = {
  hallId: string;
  hallName: string;
  boothCount: number;
  specialAreaCount: number;
  standardAreaCount: number;
  areaScore: number;
};

type HallOverviewMapProps = {
  halls: HallOverviewItem[];
  activeHallId?: string;
  onHallSelect?: (hallId: string) => void;
};

const CARD_WIDTH = 220;
const GAP = 20;

const HallOverviewMap = memo(function HallOverviewMap({ halls, activeHallId, onHallSelect }: HallOverviewMapProps) {
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const selectTimerRef = useRef<number | null>(null);
  const [pendingHallId, setPendingHallId] = useState<string | null>(null);
  const hallNodes = useMemo(() => halls, [halls]);

  const getGridColumns = useCallback(() => {
    if (typeof window === 'undefined') return 1;
    const width = scrollContainerRef.current?.clientWidth ?? window.innerWidth;
    const cols = Math.floor((width + GAP) / (CARD_WIDTH + GAP));
    return Math.max(1, cols);
  }, []);

  const jumpToHallRow = useCallback((hallId: string) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const index = hallNodes.findIndex((hall) => hall.hallId === hallId);
    if (index < 0) return;

    const gridColumns = getGridColumns();
    const rowStartIndex = Math.floor(index / gridColumns) * gridColumns;
    const rowHall = hallNodes[rowStartIndex];
    const anchor = rowHall ? itemRefs.current[rowHall.hallId] : null;
    if (!anchor) return;

    const targetTop = Math.max(0, anchor.offsetTop - 16);
    container.scrollTo({ top: targetTop, behavior: 'smooth' });
  }, [getGridColumns, hallNodes]);

  const handleHallSelect = useCallback((hallId: string) => {
    if (selectTimerRef.current) {
      window.clearTimeout(selectTimerRef.current);
    }
    setPendingHallId(hallId);
    jumpToHallRow(hallId);
    selectTimerRef.current = window.setTimeout(() => {
      onHallSelect?.(hallId);
      selectTimerRef.current = null;
    }, 120);
  }, [jumpToHallRow, onHallSelect]);

  useGSAP(() => {
    const cards = scrollContainerRef.current?.querySelectorAll('[data-hall-card]');
    if (!cards?.length) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(cards, { opacity: 0, y: 16, scale: 0.98 }, { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: 'power2.out', stagger: 0.04 });
    }, scrollContainerRef);
    return () => ctx.revert();
  }, { scope: scrollContainerRef, dependencies: [halls.length], revertOnUpdate: true });

  useEffect(() => {
    return () => {
      if (selectTimerRef.current) {
        window.clearTimeout(selectTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!activeHallId || activeHallId === 'all') {
      if (pendingHallId) setPendingHallId(null);
      return;
    }
    const timer = window.setTimeout(() => {
      onHallSelect?.(activeHallId);
      setPendingHallId(null);
    }, 120);
    return () => window.clearTimeout(timer);
  }, [activeHallId, onHallSelect, pendingHallId]);

  return (
    <div ref={scrollContainerRef} className="map-overview-scrollbar flex h-full min-h-0 w-full justify-center overflow-y-auto px-5 py-4">
      <div className="flex w-full flex-wrap justify-center gap-5 self-start pb-4">
        {hallNodes.length ? hallNodes.map((hall) => (
          <button
            data-hall-card
            ref={(el) => { itemRefs.current[hall.hallId] = el; }}
            key={hall.hallId}
            type="button"
            onClick={() => handleHallSelect(hall.hallId)}
            className={`group relative overflow-hidden rounded-2xl border bg-[url('/img/底框背景.png')] bg-[length:100%_100%] bg-center bg-no-repeat text-left transition-transform duration-200 hover:-translate-y-1 hover:shadow-[0_0_24px_rgba(56,189,248,0.25)] ${activeHallId === hall.hallId ? 'border-cyan-300/60 shadow-[0_0_20px_rgba(56,189,248,0.2)]' : 'border-transparent shadow-[0_0_12px_rgba(0,229,255,0.06)]'} ${pendingHallId === hall.hallId ? 'scale-[0.99]' : ''}`}
            style={{ width: CARD_WIDTH, minHeight: 160 }}
          >
            <div className="relative flex h-full flex-col justify-between p-4">
              <div className="line-clamp-2 text-lg font-semibold text-slate-50">{hall.hallName}</div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-slate-200/80">
                <div className="rounded-xl bg-white/5 px-2.5 py-2">
                  <div className="text-cyan-100/60">展位</div>
                  <div className="mt-0.5 text-base font-semibold text-slate-50">{hall.boothCount}</div>
                </div>
                <div className="rounded-xl bg-white/5 px-2.5 py-2">
                  <div className="text-cyan-100/60">特装</div>
                  <div className="mt-0.5 text-base font-semibold text-slate-50">{hall.specialAreaCount}</div>
                </div>
                <div className="rounded-xl bg-white/5 px-2.5 py-2">
                  <div className="text-cyan-100/60">标展</div>
                  <div className="mt-0.5 text-base font-semibold text-slate-50">{hall.standardAreaCount}</div>
                </div>
              </div>
            </div>
          </button>
        )) : (
          <div className="flex w-full min-h-[280px] items-center justify-center rounded-2xl bg-white/5 text-slate-200/70">
            暂无馆级总览数据
          </div>
        )}
      </div>
    </div>
  );
});

export default HallOverviewMap;
