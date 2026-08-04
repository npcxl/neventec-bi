import { useRef, useEffect, useCallback } from "react";
import { Image } from "antd";
import "./index.css";

/* ============================================
   图片项（对齐 API 返回的 constructProgressImages 等）
   ============================================ */
export type ConstructImageItem = {
  id?: number;
  imageId?: string;
  name?: string;
  address?: string;
  filePath?: string;
  srcType?: string;
  storage?: string;
};

export type ConstructLineItem = {
  id?: number;
  content?: string;
  configHeaderId?: number;
  configLineId?: number;
};

/* ============================================
   搭建详情 — 对齐 API getConstructProcessByHallInfo 返回的单条数据
   ============================================ */
export type ConstructDetailData = {
  id?: number;
  boothId?: string;
  boothNumber?: string;
  exhibitor?: string;
  constructionCompany?: string;
  excompanytype?: string;
  complexEngineering?: string;
  liftingPoint?: string;
  mainStructureMaterial?: string;
  exhibitionPeriod?: string;
  area?: number;
  hallId?: string;
  exhibitionId?: string;
  recordBy?: string;
  recordDate?: string;
  content?: string;
  recordTimes?: number;
  progressStatus?: string;
  constructExampleImages?: ConstructImageItem[];
  recordImages?: ConstructImageItem[];
  constructProgressImages?: ConstructImageItem[];
  exhibitEntryImages?: ConstructImageItem[];
  imageList?: string[];
  lines?: ConstructLineItem[];
};

/* ============================================
   枚举映射
   ============================================ */

const PROGRESS_STATUS: Record<string, string> = {
  NOT_ADMISSIBLE_PROGRESS: "暂未入场(空地)",
  NORMAL_PROGRESS: "搭建正常",
  SLOW_PROGRESS: "进度缓慢",
  DELAY_PROGRESS: "严重滞后",
  COMPLETED_PROGRESS: "搭建完成",
  BUILDING_MATERIALS_NOT_BUILT: "有搭建材料（未搭建）",
};

const EXCOMPANY_TYPE: Record<string, string> = {
  "1": "标摊",
  "2": "特装",
};

const COMPLEX_ENG: Record<string, string> = {
  NO: "无",
  PREBUILD: "复杂工艺",
  HIDDENENGINEERING: "隐藏工艺",
};

const LIFT_POINT: Record<string, string> = {
  NO: "无",
  YES: "包含",
};

const MATERIAL: Record<string, string> = {
  WOODINESS: "木质",
  PROXIMATEMATTER: "型材",
  SPACERACK: "太空架",
  ORDINARYTRUSS: "普通桁架",
};

function label(map: Record<string, string>, v?: string) {
  return (v && map[v]) || v || "-";
}

function progressColor(status?: string) {
  switch (status) {
    case "COMPLETED_PROGRESS": return "#63f222";
    case "NORMAL_PROGRESS": return "#2563eb";
    case "SLOW_PROGRESS": return "#fa8c16";
    case "DELAY_PROGRESS": return "#f5222d";
    default: return "rgba(255,255,255,0.6)";
  }
}

/* ============================================
   收集所有图片地址
   ============================================ */
function collectImages(data: ConstructDetailData): string[] {
  const urls: string[] = [];
  const pushImages = (arr?: ConstructImageItem[]) => {
    arr?.forEach((img) => { if (img.address) urls.push(img.address); });
  };
  pushImages(data.constructExampleImages);
  pushImages(data.constructProgressImages);
  pushImages(data.recordImages);
  pushImages(data.exhibitEntryImages);
  if (Array.isArray(data.imageList)) {
    data.imageList.forEach((u) => { if (u) urls.push(u); });
  }
  return [...new Set(urls)];
}

/* ============================================
   字段定义（便于统一渲染）
   ============================================ */
type FieldDef = {
  label: string;
  value: string;
  nowrap?: boolean;
  title?: string;
  valueStyle?: React.CSSProperties;
};

function buildFields(data: ConstructDetailData, pLabel: string, pColor: string): FieldDef[] {
  return [
    { label: "展位号", value: data.boothNumber || "-" },
    { label: "参展商", value: data.exhibitor || "-" },
    { label: "施工单位", value: data.constructionCompany || "-" },
    { label: "展位面积", value: data.area != null ? `${data.area}㎡` : "-" },
    { label: "展位类型", value: label(EXCOMPANY_TYPE, data.excompanytype) },
    { label: "关键工序", value: label(COMPLEX_ENG, data.complexEngineering) },
    { label: "吊点", value: label(LIFT_POINT, data.liftingPoint) },
    { label: "主体材质", value: label(MATERIAL, data.mainStructureMaterial) },
    { label: "搭建进度", value: pLabel, valueStyle: { color: pColor } },
    { label: "记录时间", value: data.recordDate || "-", nowrap: true, title: data.recordDate || "-" },
    { label: "记录人", value: data.recordBy || "-" },
    { label: "巡检次数", value: data.recordTimes != null ? `${data.recordTimes} 次` : "-" },
  ];
}

/* ============================================
   字段行组件
   ============================================ */
function FieldRow({ field }: { field: FieldDef }) {
  return (
    <div className="grid min-w-0 grid-cols-[72px_14px_minmax(0,1fr)] items-start leading-[22px] text-sm">
      <span className="whitespace-nowrap text-white/60">{field.label}</span>
      <span className="whitespace-nowrap text-center text-white/60">：</span>
      {field.nowrap ? (
        <span
          className="min-w-0 truncate text-white"
          title={field.title}
          style={field.valueStyle}
        >
          {field.value}
        </span>
      ) : (
        <span
          className="min-w-0 max-w-full break-words text-white [overflow-wrap:anywhere]"
          style={field.valueStyle}
        >
          {field.value}
        </span>
      )}
    </div>
  );
}

/* ============================================
   分区标题组件
   ============================================ */
function SectionHeading({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="flex h-14 items-center min-w-0 px-5 pb-3 pt-4">
      <i className="construct-heading-mark" aria-hidden="true" />
      <h3 className="m-0 shrink-0 text-lg font-medium leading-7 text-white">{title}</h3>
      {right}
    </div>
  );
}

/* ============================================
   BoothModal
   ============================================ */

type BoothModalProps = {
  visible: boolean;
  onClose: () => void;
  data: ConstructDetailData;
};

export function BoothModal({ visible, onClose, data }: BoothModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); },
    [onClose],
  );

  useEffect(() => {
    if (visible) document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [visible, handleKeyDown]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  if (!visible) return null;

  const pLabel = label(PROGRESS_STATUS, data.progressStatus);
  const pColor = progressColor(data.progressStatus);
  const images = collectImages(data);
  const lines = data.lines ?? [];
  const fields = buildFields(data, pLabel, pColor);

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-[rgba(35,35,35,0.6)]"
      ref={overlayRef}
      onClick={handleOverlayClick}
    >
      <section
        className="relative flex max-h-[85vh] w-[860px] flex-col overflow-hidden rounded border-y-2 border-[#1e40af] bg-[rgba(14,23,54,0.8)] shadow-[0_0_24px_rgba(37,99,235,0.24)] backdrop-blur-[20px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="booth-modal-title"
      >
        {/* Header */}
        <header className="relative w-full px-5 pb-4 pt-[18px]">
          <h2 className="mb-2 h-7 text-xl font-medium leading-7 text-white" id="booth-modal-title">
            搭建信息详情
          </h2>
          <div className="flex h-[22px] items-center justify-between text-sm font-medium leading-[22px]">
            <span className="pr-4 text-white/60">{""}</span>
            <span className="px-4" style={{ color: pColor }}>{pLabel}</span>
          </div>
          <div className="construct-divider" />
        </header>

        {/* Scrollable Content */}
        <div className="construct-scroll-area min-h-0 flex-1 overflow-y-auto overflow-x-hidden">

          {/* 展位信息 */}
          <section aria-labelledby="booth-info-title">
            <SectionHeading title="展位信息" />
            <div className="relative w-full px-9 pb-4">
              <div className="grid min-w-0 grid-cols-2 items-start gap-x-8 gap-y-2.5 pb-4">
                {fields.map((field, idx) => (
                  <FieldRow key={idx} field={field} />
                ))}
              </div>
              <div className="construct-divider" />
            </div>
          </section>

          {/* 搭建进度时间线 */}
          <section aria-labelledby="timeline-title">
            <SectionHeading
              title="搭建进度时间线"
              right={
                <span className="ml-auto text-sm leading-[22px] text-white/60">
                  共 <strong className="font-normal text-white">{lines.length}</strong> 条
                </span>
              }
            />
            <div className="construct-timeline-body">
              {lines.length > 0 ? (
                lines.map((line, idx) => (
                  <div className="construct-timeline-row" key={line.id ?? idx}>
                    <span className="construct-timeline-dot" />
                    <span>{line.content || "-"}</span>
                  </div>
                ))
              ) : (
                <div className="flex h-20 items-center justify-center text-sm text-white/40">
                  暂无进度记录
                </div>
              )}
            </div>
          </section>

          {/* 现场图片 */}
          {images.length > 0 && (
            <section aria-labelledby="images-title">
              <SectionHeading
                title="现场图片"
                right={
                  <span className="ml-3 text-sm leading-[22px] text-white/60">
                    共 <strong className="font-normal text-white">{images.length}</strong> 张
                  </span>
                }
              />
              <div className="construct-image-scroll">
                <div className="inline-flex gap-2 pb-1">
                  {images.map((url, idx) => (
                    <Image
                      key={`${url}-${idx}`}
                      src={url}
                      alt={`搭建图片${idx + 1}`}
                      width={168}
                      height={96}
                      className="shrink-0 rounded-md border border-[rgba(96,165,250,0.28)] object-cover"
                    />
                  ))}
                </div>
              </div>
            </section>
          )}

        </div>

        {/* Footer — sticky */}
        <footer className="flex shrink-0 justify-end border-t border-[rgba(37,99,235,0.15)] bg-[rgba(14,23,54,0.95)] px-5 py-3">
          <button
            className="construct-close-btn"
            type="button"
            onClick={onClose}
          >
            关闭
          </button>
        </footer>

      </section>
    </div>
  );
}
