import { useRef, useEffect, useCallback } from "react";
import { Image } from "antd";
import { thumbUrl, fullUrl } from "../../../utils/image";
import "./index.css";

/* ============================================
   展期枚举映射
   ============================================ */
const EXHIBITION_PERIOD_MAP: Record<string, string> = {
  BEGINSHOW: "开展期",
  PREPARESHOW: "布展期",
  ENDSHOW: "撤展期",
};

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

/** 历史进程（时间线）单项 */
export type ConstructHistoryProcess = {
  recordId?: number;
  recordDate?: string;
  progressStatus?: string;
  progressPercentage?: number;
  boothAdmission?: string;
  exhibitsAdmission?: string;
  constructionStatus?: string;
  phaseTimeName?: string;
  roleName?: string;
  imageUrl?: string;
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
  exhibitsAdmission?: string;
  exhibitionPeriod?: string;
  area?: number;
  hallId?: string;
  exhibitionId?: string;
  recordBy?: string;
  recordDate?: string;
  content?: string;
  recordTimes?: number;
  progressStatus?: string;
  progressPercentage?: number;
  constructExampleImages?: ConstructImageItem[];
  recordImages?: ConstructImageItem[];
  constructProgressImages?: ConstructImageItem[];
  exhibitEntryImages?: ConstructImageItem[];
  imageList?: string[];
  lines?: ConstructLineItem[];
  historyProcess?: ConstructHistoryProcess[];
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

const EXHIBITS_ADMISSION: Record<string, string> = {
  EXHIBITS_ENTERED: "展品已入场",
  EXHIBITS_NOT_ADMITTED: "展品未入场",
};

function label(map: Record<string, string>, v?: string) {
  return (v && map[v]) || v || "-";
}

/**
 * 取搭建进程（content）中"序号最大的一条"并清洗：
 * - 仅从形如 "8.内容" 的带序号行中，取序号数值最大的那行
 * - 去掉开头的序号前缀后显示该条内容（不再做写死的文案改写，兼容后续新增的序号 9、10…）
 */
function cleanProcessContent(content?: string): string {
  if (!content) return "-";
  const numbered = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => /^\d+[.、]/.test(l));
  if (numbered.length === 0) return "-";
  const last = numbered
    .map((line) => {
      const m = line.match(/^(\d+)[.、]\s*(.*)$/);
      return { seq: Number(m?.[1] ?? 0), text: m?.[2] ?? line };
    })
    .sort((a, b) => a.seq - b.seq)
    .pop()!;
  return last.text;
}

/** 历史进程日期格式化："2026-08-12 16:17:25" → "08-12 16:17:25" */
function formatHistoryDate(date?: string): string {
  if (!date) return "-";
  // 取 MM-DD HH:mm:ss
  const m = date.match(/^\d{4}-(\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/);
  return m ? m[1] : date;
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
   字段定义（便于统一渲染）
   ============================================ */
type FieldDef = {
  label: string;
  value: string;
  nowrap?: boolean;
  title?: string;
  valueStyle?: React.CSSProperties;
};

function buildFields(data: ConstructDetailData, pLabel: string, pColor: string): {
  left: FieldDef[];
  right: FieldDef[];
} {
  return {
    left: [
      { label: "参展商", value: data.exhibitor || "-" },
      { label: "展位类型", value: label(EXCOMPANY_TYPE, data.excompanytype) },
      { label: "关键工序", value: label(COMPLEX_ENG, data.complexEngineering) },
      { label: "主体结构材质", value: label(MATERIAL, data.mainStructureMaterial) },
      { label: "记录时间", value: data.recordDate || "-", nowrap: true, title: data.recordDate || "-" },
    ],
    right: [
      { label: "施工单位", value: data.constructionCompany || "-" },
      { label: "商品是否入场", value: label(EXHIBITS_ADMISSION, data.exhibitsAdmission) },
      { label: "是否包含吊点", value: label(LIFT_POINT, data.liftingPoint) },
      {
        label: "搭建进度",
        value: pLabel + (data.progressPercentage != null ? ` 进度${data.progressPercentage}%` : ""),
        valueStyle: { color: pColor },
      },
      {
        label: "搭建进程",
        value: cleanProcessContent(data.content),
      },
    ],
  };
}

/* ============================================ss
   字段行组件
   ============================================ */
function FieldRow({ field }: { field: FieldDef }) {
  return (
    <div className="grid min-w-0 grid-cols-[96px_14px_minmax(0,1fr)] items-start leading-[22px] text-sm">
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
  const fields = buildFields(data, pLabel, pColor);
  // 历史进程：按 recordDate 时间正序展示，第1次巡查在最左
  const history = (data.historyProcess ?? [])
    .slice()
    .sort((a, b) => {
      const ta = a.recordDate ? new Date(a.recordDate).getTime() : 0;
      const tb = b.recordDate ? new Date(b.recordDate).getTime() : 0;
      return ta - tb;
    });
  // 展位巡查记录 - 图片列表（取 data.imageList）
  const inspectionImages = Array.isArray(data.imageList) ? data.imageList : [];

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
        <header className="relative z-10 w-full shrink-0 px-5 pb-4 pt-[18px] bg-[rgba(14,23,54,0.9)]">
          <div className="flex items-center justify-between">
            <div className="h-7 text-xl font-medium leading-7 text-white" id="booth-modal-title">
              展位搭建信息详情
            </div>
            <div>
             阶段： {data?.exhibitionPeriod ? EXHIBITION_PERIOD_MAP[data.exhibitionPeriod] ?? data.exhibitionPeriod : ""}
            </div>
          </div>
          <div className="bg-[url('/img/divider_tmp.png')] bg-no-repeat bg-center bg-cover h-[2px] mt-4 w-full" />
        </header>

        {/* Scrollable Content */}
        <div className="construct-scroll-area min-h-0 flex-1 overflow-y-auto overflow-x-hidden">

          {/* 展位巡查记录 */}
          <section aria-labelledby="booth-info-title">
            <SectionHeading
              title="展位巡查记录"
              right={
                <span className="ml-auto text-sm leading-[22px] text-white/60">
                  共 <strong className="font-normal text-white">{inspectionImages.length}</strong> 张图片
                </span>
              }
            />
            <div className="relative w-full px-9 pb-4">
              {/* 顶部信息：左 第X次巡查：进度名，右 百分比 */}
              {history.length > 0 && (
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-white">
                    第{history.length}次巡查：
                    <span style={{ color: progressColor(history[0].progressStatus) }}>
                      {label(PROGRESS_STATUS, history[0].progressStatus)}
                    </span>
                  </span>
                  {history[0].progressPercentage != null && (
                    <span className="text-white text-[13px]">{history[0].progressPercentage}%</span>
                  )}
                </div>
              )}
              {/* 进度条单独占一行，整行显示 */}
              {history.length > 0 && history[0].progressPercentage != null && (
                <div className="mb-5 h-2 w-full overflow-hidden rounded-full bg-[rgba(255,255,255,0.12)]">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#2563EB,#7DE3F7)] transition-all duration-500"
                    style={{ width: `${history[0].progressPercentage}%` }}
                  />
                </div>
              )}
              {/* 一行横向滚动图片 */}
              {inspectionImages.length > 0 && (
                <div className="construct-history-scroll mb-4 overflow-x-auto pb-2">
                  <div className="inline-flex gap-2">
                    <Image.PreviewGroup>
                      {inspectionImages.map((url, idx) => (
                        <Image
                          key={`${url}-${idx}`}
                          src={thumbUrl(url, 300, 220)}
                          alt={`巡查图片${idx + 1}`}
                          width={150}
                          height={110}
                          loading="lazy"
                          className="h-[110px] w-[150px] shrink-0 rounded-md border border-[rgba(96,165,250,0.28)] object-cover"
                          preview={{ src: fullUrl(url), zIndex: 2000 }}
                        />
                      ))}
                    </Image.PreviewGroup>
                  </div>
                </div>
              )}
              {/* 字段信息：左列 + 右列 固定两列 */}
              <div className="grid min-w-0 grid-cols-2 gap-x-8 gap-y-2.5 pb-4">
                <div className="flex flex-col gap-y-2.5">
                  {fields.left.map((field, idx) => (
                    <FieldRow key={idx} field={field} />
                  ))}
                </div>
                <div className="flex flex-col gap-y-2.5">
                  {fields.right.map((field, idx) => (
                    <FieldRow key={idx} field={field} />
                  ))}
                </div>
              </div>
              <div className="bg-[url('/img/divider_tmp.png')] bg-no-repeat bg-center bg-cover h-[2px] mt-4 w-full" />
            </div>
          </section>

          {/* 历史进程（横向时间线，第1次在最左） */}
          <section aria-labelledby="timeline-title">
            <SectionHeading
              title="历史进程"
              right={
                <span className="ml-auto text-sm leading-[22px] text-white/60">
                  共 <strong className="font-normal text-white">{history.length}</strong> 条
                </span>
              }
            />
            <div className="px-9 pb-6">
              {history.length > 0 ? (
                <div className="construct-history-scroll overflow-x-auto pb-2">
                  <div className="inline-flex items-stretch">
                    {history.map((h, idx) => {
                      const nth = idx + 1;
                      const isLast = idx === history.length - 1;
                      return (
                        <div key={h.recordId ?? idx} className="flex shrink-0 items-stretch">
                          {/* 单条历史进程：日期 → 圆点 → 图片 → 第X次巡查：进度名 */}
                          <div className="flex flex-col items-center">
                            {/* 上方：日期 */}
                            <div className="text-[15px] leading-5 text-white">
                              {formatHistoryDate(h.recordDate)}
                            </div>
                            {/* 圆点 + 右侧连接线（除最后一个） */}
                            <div className="mt-2 flex items-center">
                              <span className="h-2 w-2 rounded-full bg-white/70" />
                              {!isLast && <span className="h-px w-[166px] bg-white/20" />}
                            </div>
                            {/* 图片 */}
                            {h.imageUrl && (
                              <Image.PreviewGroup>
                                <Image
                                  src={thumbUrl(h.imageUrl, 300, 220)}
                                  alt={`第${nth}次巡查图片`}
                                  loading="lazy"
                                  width={150}
                                  height={110}
                                  className="mt-2 h-[110px] w-[150px] rounded-md border border-[rgba(96,165,250,0.28)] object-cover"
                                  preview={{ src: fullUrl(h.imageUrl), zIndex: 2000 }}
                                />
                              </Image.PreviewGroup>
                            )}
                            {/* 下方：第X次巡查：进度名 */}
                            <div className="mt-2 text-[15px] leading-5 text-center text-white">
                              <span>第{nth}次巡查：</span>
                              <span>{label(PROGRESS_STATUS, h.progressStatus)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex h-20 items-center justify-center text-sm text-white/40">
                  暂无历史进程
                </div>
              )}
            </div>
          </section>

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
