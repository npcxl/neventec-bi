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

const HallOverviewMap = memo(function HallOverviewMap({ halls, activeHallId, onHallSelect }: HallOverviewMapProps) {
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const selectTimerRef = useRef<number | null>(null);
  const [pendingHallId, setPendingHallId] = useState<string | null>(null);
  const hallNodes = useMemo(() => halls, [halls]);

  const hallGridStyle = useMemo(() => {
    return {
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    };
  }, []);

  const hallGridWrapperStyle = useMemo(() => {
    const cardWidth = 220;
    const gap = 20;
    const maxColumns = Math.max(1, Math.min(hallNodes.length || 1, 4));
    const maxWidth = maxColumns * cardWidth + Math.max(0, maxColumns - 1) * gap;
    return {
      maxWidth: `${maxWidth}px`,
    };
  }, [hallNodes.length]);

  const getGridColumns = useCallback(() => {
    if (typeof window === 'undefined') return 1;
    const width = scrollContainerRef.current?.clientWidth ?? window.innerWidth;
    return Math.max(1, Math.floor((width - 40) / 220));
  }, []);

  const jumpToHallRow = useCallback((hallId: string) => {
    const container = scrollContainerRef.current;
    if (!container) {
      
      return;
    }

    const index = hallNodes.findIndex((hall) => hall.hallId === hallId);
    if (index < 0) {
      
      return;
    }

    const gridColumns = getGridColumns();
    const rowIndex = Math.floor(index / gridColumns);
    const rowStartIndex = rowIndex * gridColumns;
    const rowHall = hallNodes[rowStartIndex];
    const rowButton = rowHall ? itemRefs.current[rowHall.hallId] : null;
    const anchor = rowButton ?? itemRefs.current[hallId];
    if (!anchor) {
    
      return;
    }

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
  }, [activeHallId, jumpToHallRow, onHallSelect]);

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
      if (pendingHallId) {
      
        setPendingHallId(null);
      }
      return;
    }
    const timer = window.setTimeout(() => {
     
      onHallSelect?.(activeHallId);
      setPendingHallId(null);
    }, 120);
    return () => window.clearTimeout(timer);
  }, [activeHallId, onHallSelect, pendingHallId]);

  return (
    <div ref={scrollContainerRef} className="map-overview-scrollbar flex h-full min-h-0 w-full items-start justify-start overflow-y-auto px-5 py-4">
      <div className="grid w-full self-start gap-5 pb-4" style={{ ...hallGridStyle, ...hallGridWrapperStyle, marginRight: 'auto', height: 'fit-content' }}>
        {hallNodes.length ? hallNodes.map((hall) => (
          <button
            data-hall-card
            ref={(el) => { itemRefs.current[hall.hallId] = el; }}
            key={hall.hallId}
            type="button"
            onClick={() => {
              handleHallSelect(hall.hallId);
            }}
            className={`group relative overflow-hidden rounded-3xl border bg-[linear-gradient(180deg,rgba(11,28,52,0.92),rgba(7,17,32,0.96))] text-left shadow-[0_0_24px_rgba(0,229,255,0.08)] transition-transform duration-200 hover:-translate-y-1 hover:border-cyan-300/50 hover:shadow-[0_0_30px_rgba(56,189,248,0.18)] ${activeHallId === hall.hallId ? 'border-cyan-300/70 ring-1 ring-cyan-300/35' : 'border-cyan-400/20'} ${pendingHallId === hall.hallId ? 'scale-[0.99] ring-2 ring-cyan-300/45' : ''}`}
            style={{ minHeight: 160 }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.12),transparent_40%)]" />
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent" />
            <div className="relative flex h-full flex-col justify-between p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="mt-1 line-clamp-2 text-lg font-semibold text-slate-50">{hall.hallName}</div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-slate-200/80">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                  <div className="text-cyan-100/60">展位</div>
                  <div className="mt-1 text-base font-semibold text-slate-50">{hall.boothCount}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                  <div className="text-cyan-100/60">特装</div>
                  <div className="mt-1 text-base font-semibold text-slate-50">{hall.specialAreaCount}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                  <div className="text-cyan-100/60">标展</div>
                  <div className="mt-1 text-base font-semibold text-slate-50">{hall.standardAreaCount}</div>
                </div>
              </div>
            </div>
          </button>
        )) : (
          <div className="col-span-full flex min-h-[280px] items-center justify-center rounded-3xl border border-dashed border-white/15 bg-white/5 px-6 text-center text-slate-200/70">
            暂无馆级总览数据
          </div>
        )}
      </div>
    </div>
  );
});

export default HallOverviewMap;
