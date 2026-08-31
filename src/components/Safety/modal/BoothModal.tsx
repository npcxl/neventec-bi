import { useRef, useEffect, useCallback } from "react";
import { Image } from "antd";
import { thumbUrl, fullUrl } from "../../../utils/image";
import "./index.css";

/* ============================================
   现场安全详情数据
   ============================================ */
export type SafetyDetailData = {
  boothNo?: string;
  exhibitor?: string;
  company?: string;
  constructionCompany?: string;
  actualConstruction?: string;
  recordContent?: string;
  /** 违规分组内容（如：施工状态） */
  recordGroupContent?: string;
  /** 违规标题内容（如：安全帽问题） */
  recordHeaderContent?: string;
  riskAssessment?: string;
  rectifyCheckStatus?: string;
  safetyStatus?: string;
  targetCheckTime?: string;
  hallId?: string;
  hallName?: string;
  dutyEntity?: string;
  contactWay?: string;
  excompanytype?: string;
  sendViolationEmail?: string;
  liftingPoint?: string;
  structureType?: string;
  complexEngineering?: string;
  safetyInfoList?: Array<{
    riskAssessment?: string;
    createBy?: string;
    createDate?: string;
    recordContent?: string;
    /** 违规分组内容（如：施工状态） */
    recordGroupContent?: string;
    /** 违规标题内容（如：安全帽问题） */
    recordHeaderContent?: string;
    targetCheckTime?: string;
    boothNo?: string;
    safetyStatus?: string;
    rectifyCheckStatus?: string;
    imageAddress?: Array<{ address?: string }>;
  }>;
};

/* ============================================
   整改状态颜色
   ============================================ */
const RECTIFY_COLORS: Record<string, string> = {
  // 枚举 code
  WAIT_RECTIFY: "#FA8C16",
  CANCEL: "#6B7C93",
  RECTIFYED: "#63F222",
  NOTONTIME: "#F5222D",
  RECTIFY_PART: "#2563EB",
  NOT_RECTIFY: "#FF7A45",
  REFUSE_RECTIFY: "#F5222D",
  // 中文文案（兜底）
  "待整改": "#FA8C16",
  "已作废": "#6B7C93",
  "作废": "#6B7C93",
  "已整改": "#63F222",
  "未按时完成": "#F5222D",
  "部分整改": "#2563EB",
  "未整改": "#FF7A45",
  "拒不整改": "#F5222D",
  "整改合格": "#63F222",
  "整改不合格": "#F5222D",
};

function rectifyColor(status?: string) {
  if (!status) return "rgba(255,255,255,0.6)";
  return RECTIFY_COLORS[status] || "rgba(255,255,255,0.6)";
}

/* 整改状态枚举 code -> 中文文案（后端返回英文 code 时翻译显示） */
const RECTIFY_LABELS: Record<string, string> = {
  WAIT_RECTIFY: "待整改",
  CANCEL: "已作废",
  RECTIFYED: "已整改",
  NOTONTIME: "未按时完成",
  RECTIFY_PART: "部分整改",
  NOT_RECTIFY: "未整改",
  REFUSE_RECTIFY: "拒不整改",
};

export function rectifyLabel(status?: string) {
  if (!status) return "-";
  return RECTIFY_LABELS[status] ?? status;
}

/* 责任主体枚举 code -> 中文文案 */
const DUTY_ENTITY_LABELS: Record<string, string> = {
  EXHIBIT: "搭建商",
  EXHIBITOR: "参展商",
};

function dutyEntityLabel(value?: string) {
  if (!value) return "-";
  return DUTY_ENTITY_LABELS[value] ?? value;
}

/* 展位类型 excompanytype -> 中文文案（1/标摊，2/特装） */
function excompanyTypeLabel(value?: string | number) {
  if (value === undefined || value === null || value === "") return "-";
  const v = String(value).trim();
  if (v === "1" || v.includes("标摊")) return "标摊";
  if (v === "2" || v.includes("特装")) return "特装";
  return v;
}

/* ============================================
   违规状态映射（safetyStatus）
   枚举：WAIT_RECTIFY(待整改) / CANCEL(已作废) / NOT_RECTIFY(整改不合格)
        / RECTIFYED(整改合格) / REFUSE_RECTIFY(拒不整改)
   ============================================ */
const SAFETY_STATUS_COLORS: Record<string, string> = {
  // code
  WAIT_RECTIFY: "#FA8C16",
  CANCEL: "#6B7C93",
  NOT_RECTIFY: "#F5222D",
  RECTIFYED: "#63F222",
  REFUSE_RECTIFY: "#F5222D",
  NOTONTIME: "#F5222D",
  RECTIFY_PART: "#FA8C16",
  //  中文兜底
  "待整改": "#FA8C16",
  "已作废": "#6B7C93",
  "整改不合格": "#F5222D",
  "整改合格": "#63F222",
  "未按时完成": "#F5222D",
  "部分整改": "#FA8C16",
};

const SAFETY_STATUS_LABELS: Record<string, string> = {
  WAIT_RECTIFY: "待整改",
  CANCEL: "已作废",
  NOT_RECTIFY: "整改不合格",
  RECTIFYED: "整改合格",
  REFUSE_RECTIFY: "拒不整改",
  NOTONTIME: "未按时完成",
  RECTIFY_PART: "部分整改",
};

function safetyStatusColor(status?: string) {
  if (!status) return "rgba(255,255,255,0.6)";
  return SAFETY_STATUS_COLORS[status] || "rgba(255,255,255,0.6)";
}

export function safetyStatusLabel(status?: string) {
  if (!status) return "-";
  return SAFETY_STATUS_LABELS[status] ?? status;
}

/* 违规内容合并：顺序为 recordGroupContent(分组) → recordHeaderContent(标题) → recordContent(内容)，
   用 " / " 连接，缺省项自动跳过 */
/* 违规种类：recordGroupContent(分组) → recordHeaderContent(标题)，用 " / " 连接 */
export function mergeRecordType(item?: {
  recordGroupContent?: string;
  recordHeaderContent?: string;
}) {
  if (!item) return '';
  return [item.recordGroupContent, item.recordHeaderContent]
    .filter((v) => v !== undefined && v !== null && String(v).trim() !== '')
    .map((v) => String(v).trim())
    .join(' / ');
}

export function mergeRecordContent(item?: {
  recordGroupContent?: string;
  recordHeaderContent?: string;
  recordContent?: string;
}) {
  if (!item) return '';
  return [item.recordGroupContent, item.recordHeaderContent, item.recordContent]
    .filter((v) => v !== undefined && v !== null && String(v).trim() !== '')
    .map((v) => String(v).trim())
    .join(' / ');
}

/* 整改状态颜色（入参为中文状态名，配合 rectifyLabel 使用） */
function rectifyCheckStatusColor(rectifyCheckStatus?: string) {
  if (rectifyCheckStatus == "整改合格") return "#63F222";
  if (rectifyCheckStatus == "待整改") return "#FA8C16";
  if (rectifyCheckStatus == "整改不合格") return "#F5222D";
  if (rectifyCheckStatus == "拒不整改") return "#2563EB";
  if (rectifyCheckStatus == "未整改") return "#FA8C16";
  if (rectifyCheckStatus == "已作废" || rectifyCheckStatus == "作废")
    return "#6B7C93";
  return "";
}

/* ============================================
   风险评估映射（riskAssessment）
   枚举：HIGHRISK(高风险) 等；同时兼容后端返回的中文（高/中/低、严重/较大/一般）
   ============================================ */
const RISK_COLORS: Record<string, string> = {
  // 枚举 code（与 RISK_LEGEND 三级风险保持一致：蓝 / 橙 / 红）
  HIGHRISK: "#F5222D",
  MIDRISK: "#FA8C16",
  MEDIUMRISK: "#FA8C16",
  LOWRISK: "#2563EB",
  // 三级风险文案
  "重大风险": "#F5222D",
  "较大风险": "#FA8C16",
  "一般风险": "#2563EB",
  // 其它兼容写法兜底（统一为蓝 / 橙 / 红）
  "高风险": "#F5222D",
  "中风险": "#FA8C16",
  "低风险": "#2563EB",
  "严重风险": "#F5222D",
  "高": "#F5222D",
  "中": "#FA8C16",
  "低": "#2563EB",
};

const RISK_LABELS: Record<string, string> = {
  // 枚举 code -> 第二个值（中文三级风险文案）
  HIGHRISK: "重大风险",
  MEDIUMRISK: "较大风险",
  MIDRISK: "较大风险",
  LOWRISK: "一般风险",
  // 兼容后端直接返回中文等级
  "高风险": "重大风险",
  "中风险": "较大风险",
  "低风险": "一般风险",
};

function riskColor(value?: string) {
  if (!value) return "rgba(255,255,255,0.6)";
  return RISK_COLORS[value] || "rgba(255,255,255,0.6)";
}

function riskLabel(value?: string) {
  if (!value) return "-";
  return RISK_LABELS[value] ?? value;
}

/* ============================================
   字段行组件（复用构建信息样式）
   ============================================ */
type FieldDef = {
  label: string;
  value: string;
  nowrap?: boolean;
  title?: string;
  valueStyle?: React.CSSProperties;
};

function FieldRow({ field }: { field: FieldDef }) {
  return (
    // 标签列用 auto 自适应内容宽度，避免长标签（如"审图风险评级"）挤压覆盖"："
    <div className="grid min-w-0 grid-cols-[auto_16px_minmax(0,1fr)] items-start leading-6 text-[15px]">
      <span className="whitespace-nowrap text-white/60">{field.label}</span>
      <span className="whitespace-nowrap text-center text-white/60">：</span>
      {field.nowrap ? (
        <span className="min-w-0 truncate text-white" title={field.title} style={field.valueStyle}>
          {field.value}
        </span>
      ) : (
        <span className="min-w-0 max-w-full break-words text-white [overflow-wrap:anywhere]" style={field.valueStyle}>
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
   SafetyBoothModal
   ============================================ */

type SafetyBoothModalProps = {
  visible: boolean;
  onClose: () => void;
  data: SafetyDetailData | null;
  loading?: boolean;
};

export function BoothModal({ visible, onClose, data, loading = false }: SafetyBoothModalProps) {
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

  if (!visible || !data) return null;

  // 是否为标摊展位（标摊一律按"一般风险"展示风险评级）
  const isStandardBoothType = excompanyTypeLabel(data.excompanytype) === "标摊";

  // 展位基础信息：展商名称、展位号、展位类型 + 原审图信息字段（吊点、复杂工艺、施工单位、风险评级、结构类型）
  const boothFields: FieldDef[] = [
    { label: "展商名称", value: data.exhibitor || "-" },
    { label: "展位号", value: data.boothNo || "-" },
    { label: "展位类型", value: excompanyTypeLabel(data.excompanytype) },
    { label: "吊点", value: data.liftingPoint || "-" },
    { label: "复杂工艺", value: data.complexEngineering || "-" },
    { label: "施工单位", value: data.actualConstruction || data.company || data.constructionCompany || "-" },
    {
      label: "审图风险评级",
      // 标摊展位一律按"一般风险"展示（与地图规则一致）
      value: isStandardBoothType ? riskLabel("LOWRISK") : riskLabel(data.riskAssessment),
      valueStyle: {
        color: isStandardBoothType ? riskColor("LOWRISK") : riskColor(data.riskAssessment),
      },
    },
    { label: "结构类型", value: data.structureType || "-" },
  ];


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
        aria-labelledby="safety-modal-title"
      >
        {/* Header */}
        <header className="relative w-full px-5 pb-4 pt-[18px]">
          <h2 className="mb-2 h-7 text-xl font-medium leading-7 text-white" id="safety-modal-title">
            安全违规详情
          </h2>
          <div className="bg-[url('/img/divider_tmp.png')] bg-no-repeat bg-center bg-cover h-[2px] mt-4 w-full" />
        </header>

        {/* Scrollable Content */}
        <div className="construct-scroll-area min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          {loading && (
            <div className="flex h-32 items-center justify-center text-sm text-white/50">加载中...</div>
          )}
          {!loading && (<>

          {/* 展位基础信息 */}
          <section aria-labelledby="booth-info-title">
            <SectionHeading title="展位基础信息" />
            <div className="relative w-full px-9 pb-4">
              <div className="grid min-w-0 grid-cols-2 items-start gap-x-8 gap-y-3.5 pb-4">
                {boothFields.map((field, idx) => (
                  <FieldRow key={idx} field={field} />
                ))}
              </div>
              <div className="bg-[url('/img/divider_tmp.png')] bg-no-repeat bg-center bg-cover h-[2px] mt-4 w-full" />
            </div>
          </section>

          {/* 违规内容（两行：违规种类 = 分组/标题，违规条目 = 内容） */}
          {(mergeRecordType(data) || data.recordContent) && (
            <section aria-labelledby="record-content-title">
              <SectionHeading title="违规内容" />
              <div className="px-9 pb-4">
                <div className="space-y-3 text-[16px] leading-7">
                  {mergeRecordType(data) && (
                    <p className="text-white/80 whitespace-pre-wrap">
                      违规种类：{mergeRecordType(data)}
                    </p>
                  )}
                  {data.recordContent && (
                    <p className="text-white/85 whitespace-pre-wrap">
                      违规条目：{data.recordContent}
                    </p>
                  )}
                </div>
                <div className="bg-[url('/img/divider_tmp.png')] bg-no-repeat bg-center bg-cover h-[2px] mt-4 w-full" />
              </div>
            </section>
          )}

          {/* 安全巡检记录 */}
          {data.safetyInfoList && data.safetyInfoList.length > 0 && (
            <section aria-labelledby="inspection-title">
              <SectionHeading
                title="违规记录"
                right={
                  <span className="ml-auto text-sm leading-[22px] text-white/60">
                    共 <strong className="font-normal text-white">{data.safetyInfoList.length}</strong> 条
                  </span>
                }
              />
              <div className="flex flex-col gap-2 px-6 pb-4">
                {data.safetyInfoList.map((info, idx) => {
                  const risk = info.riskAssessment || "";
                  const riskColorFn = riskColor(risk);
                  const firstImage = info.imageAddress?.find((img) => img.address)?.address;
                  return (
                    <div
                      key={idx}
                      className="flex min-w-0 flex-col gap-3 rounded-lg border border-[rgba(128,185,255,0.14)] bg-[rgba(8,23,42,0.5)] px-4 py-3"
                    >
                      {/* 第一行：左侧图片 + 右侧违规内容 */}
                      <div className="flex min-w-0 items-stretch gap-4">
                      {/* 左侧图片 */}
                      <div className="shrink-0">
                        {firstImage ? (
                          <div className="relative inline-block">
                            <Image
                              src={thumbUrl(firstImage, 280, 210)}
                              alt={`巡检图片${idx + 1}`}
                              width={140}
                              height={105}
                              className="rounded border border-[rgba(96,165,250,0.28)] object-cover"
                              preview={{ src: fullUrl(firstImage) }}
                            />
                            {/* 右下角放大提示图标（不拦截点击，仍可点击图片预览） */}
                            <span className="pointer-events-none absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded bg-black/50">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                                <circle cx="11" cy="11" r="7" />
                                <line x1="16" y1="16" x2="21" y2="21" />
                                <line x1="11" y1="8" x2="11" y2="14" />
                                <line x1="8" y1="11" x2="14" y2="11" />
                              </svg>
                            </span>
                          </div>
                        ) : (
                          <div
                            className="flex h-[105px] w-[140px] items-center justify-center rounded border border-dashed border-[rgba(128,185,255,0.18)] bg-[rgba(6,17,34,0.4)] text-[12px] text-white/40"
                          >
                            无图片
                          </div>
                        )}
                      </div>
                      {/* 右侧内容 */}
                      <div className="min-w-0 flex-1">
                        {/* 顶部：整改状态 + 风险（幽灵样式） */}
                        <div className="flex flex-wrap items-center gap-2">
                          {info.rectifyCheckStatus && (
                            <span
                              className="construct-ghost-tag font-medium"
                              style={{
                                color:
                                  rectifyCheckStatusColor(
                                    rectifyLabel(info.rectifyCheckStatus),
                                  ) || "#fff",
                              }}
                            >
                              {rectifyLabel(info.rectifyCheckStatus)}
                            </span>
                          )}
                          {info.safetyStatus && (
                            <span className="construct-ghost-tag font-medium" style={{ color: safetyStatusColor(info.safetyStatus) }}>
                              {safetyStatusLabel(info.safetyStatus)}
                            </span>
                          )}
                          {info.riskAssessment && (
                            <span className="construct-ghost-tag" style={{ color: riskColorFn }}>
                              {riskLabel(info.riskAssessment)}
                            </span>
                          )}
                        </div>
                        {/* 违规内容（两行：违规种类 = 分组/标题，违规条目 = 内容） */}
                        {(mergeRecordType(info) || info.recordContent) && (
                          <div className="mt-4 space-y-3 text-[16px] leading-7 whitespace-pre-wrap">
                            {mergeRecordType(info) && (
                              <div className="text-white/80">
                                违规种类：{mergeRecordType(info)}
                              </div>
                            )}
                            {info.recordContent && (
                              <div className="text-white/85">
                                违规条目：{info.recordContent}
                              </div>
                            )}
                          </div>
                        )}
                        {/* 多张图片（除主图外的其他图片） */}
                        {info.imageAddress && info.imageAddress.length > 1 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {info.imageAddress.map((img, i) => img.address && (
                              <div key={`${idx}-${i}-${img.address}`} className="relative inline-block">
                                <Image
                                  src={thumbUrl(img.address, 144, 108)}
                                  alt={`巡检图片${i + 1}`}
                                  width={72}
                                  height={54}
                                  className="shrink-0 rounded border border-[rgba(96,165,250,0.28)] object-cover"
                                  preview={{ src: fullUrl(img.address) }}
                                />
                                {/* 右下角放大提示图标（不拦截点击） */}
                                <span className="pointer-events-none absolute bottom-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded bg-black/50">
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                                    <circle cx="11" cy="11" r="7" />
                                    <line x1="16" y1="16" x2="21" y2="21" />
                                    <line x1="11" y1="8" x2="11" y2="14" />
                                    <line x1="8" y1="11" x2="14" y2="11" />
                                  </svg>
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      {/* 第一行（图片 + 违规内容）结束 */}
                      </div>

                      {/* 第二行：创建人 / 整改时间（位于图片下方，左右分布） */}
                      {(info.createBy || info.targetCheckTime) && (
                        <div className="flex flex-wrap items-center gap-x-6 text-[15px] leading-7 text-white/70">
                          <span>{info.createBy ? `创建人：${info.createBy}` : ""}</span>
                          <span>{info.targetCheckTime ? `整改时间：${info.targetCheckTime}` : ""}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}
          </>)}
        </div>

        {/* Footer — sticky */}
        <footer className="flex shrink-0 justify-end border-t border-[rgba(37,99,235,0.15)] bg-[rgba(14,23,54,0.95)] px-5 py-3">
          <button className="construct-close-btn" type="button" onClick={onClose}>
            关闭
          </button>
        </footer>

      </section>
    </div>
  );
}
