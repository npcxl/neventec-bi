import { useRef, useEffect, useCallback } from "react";
import { Image } from "antd";
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
  "整改合格": "#63F222",
  "待整改": "#FA8C16",
  "整改不合格": "#F5222D",
  "拒不整改": "#2563EB",
  "已作废": "#6B7C93",
  "作废": "#6B7C93",
};

function rectifyColor(status?: string) {
  if (!status) return "rgba(255,255,255,0.6)";
  return RECTIFY_COLORS[status] || "rgba(255,255,255,0.6)";
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
    { label: "责任主体", value: data.dutyEntity || "-" },
    { label: "风险评估", value: data.riskAssessment || "-", valueStyle: { color: rectifyColor(data.riskAssessment) } },
    { label: "整改状态", value: data.rectifyCheckStatus || "-", valueStyle: { color: rColor } },
    { label: "整改措施", value: data.safetyStatus || "-" },
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
            <span className="px-4" style={{ color: rColor }}>{data.rectifyCheckStatus || "-"}</span>
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
                  const riskColor = risk.includes("严重")
                    ? "#F5222D"
                    : risk.includes("较大") || risk.includes("重大")
                      ? "#FA8C16"
                      : "#2563EB";
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
                            src={firstImage}
                            alt={`巡检图片${idx + 1}`}
                            width={120}
                            height={90}
                            className="rounded border border-[rgba(96,165,250,0.28)] object-cover"
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
                            <span className="construct-ghost-tag font-medium" style={{ color: "#60A5FA" }}>
                              {info.safetyStatus}
                            </span>
                          )}
                          {info.riskAssessment && (
                            <span className="construct-ghost-tag" style={{ color: riskColor }}>
                              {info.riskAssessment}
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
                                src={img.address}
                                alt={`巡检图片${i + 1}`}
                                width={64}
                                height={48}
                                className="shrink-0 rounded border border-[rgba(96,165,250,0.28)] object-cover"
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
