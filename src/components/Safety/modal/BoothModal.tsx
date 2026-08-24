import { useRef, useEffect, useCallback } from "react";
import { Image } from "antd";
import { thumbUrl, fullUrl } from "../../../utils/image";
import "./index.css";

/* ============================================
   现场安全详情数据
   ============================================ */
export type SafetyDetailData = {
  boothNo?: string;
  company?: string;
  constructionCompany?: string;
  recordContent?: string;
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
    targetCheckTime?: string;
    boothNo?: string;
    safetyStatus?: string;
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

function rectifyLabel(status?: string) {
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
  // 中文兜底
  "待整改": "#FA8C16",
  "已作废": "#6B7C93",
  "整改不合格": "#F5222D",
  "整改合格": "#63F222",
  "拒不整改": "#F5222D",
};

const SAFETY_STATUS_LABELS: Record<string, string> = {
  WAIT_RECTIFY: "待整改",
  CANCEL: "已作废",
  NOT_RECTIFY: "整改不合格",
  RECTIFYED: "整改合格",
  REFUSE_RECTIFY: "拒不整改",
};

function safetyStatusColor(status?: string) {
  if (!status) return "rgba(255,255,255,0.6)";
  return SAFETY_STATUS_COLORS[status] || "rgba(255,255,255,0.6)";
}

function safetyStatusLabel(status?: string) {
  if (!status) return "-";
  return SAFETY_STATUS_LABELS[status] ?? status;
}

/* ============================================
   风险评估映射（riskAssessment）
   枚举：HIGHRISK(高风险) 等；同时兼容后端返回的中文（高/中/低、严重/较大/一般）
   ============================================ */
const RISK_COLORS: Record<string, string> = {
  // 枚举 code
  HIGHRISK: "#F5222D",
  MIDRISK: "#FA8C16",
  LOWRISK: "#63F222",
  // 与现场安全悬浮卡片（RISK_LEGEND）保持一致的三级风险文案
  "重大风险": "#F5222D",
  "较大风险": "#FA8C16",
  "一般风险": "#2563EB",
  // 其它兼容写法兜底
  "高风险": "#F5222D",
  "中风险": "#FA8C16",
  "低风险": "#63F222",
  "严重风险": "#F5222D",
  "高": "#F5222D",
  "中": "#FA8C16",
  "低": "#63F222",
};

const RISK_LABELS: Record<string, string> = {
  HIGHRISK: "高风险",
  MIDRISK: "中风险",
  LOWRISK: "一般风险",
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
    <div className="grid min-w-0 grid-cols-[72px_14px_minmax(0,1fr)] items-start leading-[22px] text-sm">
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

  const rColor = rectifyColor(data.rectifyCheckStatus);

  const fields: FieldDef[] = [
    { label: "展位号", value: data.boothNo || "-" },
    { label: "施工单位", value: data.company || data.constructionCompany || "-" },
    { label: "责任主体", value: dutyEntityLabel(data.dutyEntity) },
    { label: "风险评级", value: riskLabel(data.riskAssessment), valueStyle: { color: riskColor(data.riskAssessment) } },
    { label: "整改状态", value: rectifyLabel(data.rectifyCheckStatus), valueStyle: { color: rColor } },
    { label: "违规状态", value: safetyStatusLabel(data.safetyStatus), valueStyle: { color: safetyStatusColor(data.safetyStatus) } },
    { label: "检查时间", value: data.targetCheckTime || "-", nowrap: true, title: data.targetCheckTime || "-" },
    { label: "联系方式", value: data.contactWay || "-" },
    { label: "展位类型", value: data.excompanytype || "-" },
    { label: "违规邮件", value: data.sendViolationEmail || "-" },
    { label: "吊点", value: data.liftingPoint || "-" },
    { label: "结构类型", value: data.structureType || "-" },
    { label: "复杂工艺", value: data.complexEngineering || "-" },
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
          <div className="flex h-[22px] items-center justify-between text-sm font-medium leading-[22px]">
            <span className="pr-4 text-white/60">展位号：{data.boothNo || "-"}</span>
            <span className="px-4" style={{ color: rColor }}>{rectifyLabel(data.rectifyCheckStatus)}</span>
          </div>
          <div className="bg-[url('/img/divider_tmp.png')] bg-no-repeat bg-center bg-cover h-[2px] mt-4 w-full" />
        </header>

        {/* Scrollable Content */}
        <div className="construct-scroll-area min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          {loading && (
            <div className="flex h-32 items-center justify-center text-sm text-white/50">加载中...</div>
          )}
          {!loading && (<>

          {/* 违规信息 */}
          <section aria-labelledby="violation-info-title">
            <SectionHeading title="违规信息" />
            <div className="relative w-full px-9 pb-4">
              <div className="grid min-w-0 grid-cols-2 items-start gap-x-8 gap-y-2.5 pb-4">
                {fields.map((field, idx) => (
                  <FieldRow key={idx} field={field} />
                ))}
              </div>
              <div className="bg-[url('/img/divider_tmp.png')] bg-no-repeat bg-center bg-cover h-[2px] mt-4 w-full" />
            </div>
          </section>

          {/* 违规内容 */}
          {data.recordContent && (
            <section aria-labelledby="record-content-title">
              <SectionHeading title="违规内容" />
              <div className="px-9 pb-4">
                <p className="text-sm leading-6 text-white/80 whitespace-pre-wrap">{data.recordContent}</p>
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
                      className="flex min-w-0 items-start gap-3 rounded-lg border border-[rgba(128,185,255,0.14)] bg-[rgba(8,23,42,0.5)] px-3 py-2.5"
                    >
                      {/* 左侧图片 */}
                      <div className="shrink-0">
                        {firstImage ? (
                          <Image
                            src={thumbUrl(firstImage, 240, 180)}
                            alt={`巡检图片${idx + 1}`}
                            width={120}
                            height={90}
                            className="rounded border border-[rgba(96,165,250,0.28)] object-cover"
                            preview={{ src: fullUrl(firstImage) }}
                          />
                        ) : (
                          <div
                            className="flex h-[90px] w-[120px] items-center justify-center rounded border border-dashed border-[rgba(128,185,255,0.18)] bg-[rgba(6,17,34,0.4)] text-[11px] text-white/40"
                          >
                            无图片
                          </div>
                        )}
                      </div>
                      {/* 右侧内容 */}
                      <div className="min-w-0 flex-1">
                        {/* 顶部：整改状态 + 风险（幽灵样式） */}
                        <div className="flex flex-wrap items-center gap-2">
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
                        {/* 违规内容 */}
                        {info.recordContent && (
                          <div className="mt-2 text-[15px] leading-6 text-white/85 whitespace-pre-wrap">
                            {info.recordContent}
                          </div>
                        )}
                        {/* 创建人 / 整改时间 */}
                        <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px] text-white/55">
                          {info.createBy && <span>创建人：{info.createBy}</span>}
                          {info.targetCheckTime && <span>整改时间：{info.targetCheckTime}</span>}
                        </div>
                        {/* 多张图片（除主图外的其他图片） */}
                        {info.imageAddress && info.imageAddress.length > 1 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {info.imageAddress.map((img, i) => img.address && (
                              <Image
                                key={`${idx}-${i}-${img.address}`}
                                src={thumbUrl(img.address, 128, 96)}
                                alt={`巡检图片${i + 1}`}
                                width={64}
                                height={48}
                                className="shrink-0 rounded border border-[rgba(96,165,250,0.28)] object-cover"
                                preview={{ src: fullUrl(img.address) }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
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
