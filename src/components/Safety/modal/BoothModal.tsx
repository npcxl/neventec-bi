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
   收集所有图片地址
   ============================================ */
function collectImages(data: SafetyDetailData): string[] {
  const urls: string[] = [];
  data.safetyInfoList?.forEach((info) => {
    info.imageAddress?.forEach((img) => {
      if (img.address) urls.push(img.address);
    });
  });
  return [...new Set(urls)];
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
  const images = collectImages(data);

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
          <div className="construct-divider" />
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
              <div className="construct-divider" />
            </div>
          </section>

          {/* 违规内容 */}
          {data.recordContent && (
            <section aria-labelledby="record-content-title">
              <SectionHeading title="违规内容" />
              <div className="px-9 pb-4">
                <p className="text-sm leading-6 text-white/80 whitespace-pre-wrap">{data.recordContent}</p>
                <div className="construct-divider mt-4" />
              </div>
            </section>
          )}

          {/* 安全巡检记录 */}
          {data.safetyInfoList && data.safetyInfoList.length > 0 && (
            <section aria-labelledby="inspection-title">
              <SectionHeading
                title="安全巡检记录"
                right={
                  <span className="ml-auto text-sm leading-[22px] text-white/60">
                    共 <strong className="font-normal text-white">{data.safetyInfoList.length}</strong> 条
                  </span>
                }
              />
              <div className="construct-timeline-body">
                {data.safetyInfoList.map((info, idx) => (
                  <div className="construct-timeline-row" key={idx}>
                    <span className="construct-timeline-dot" />
                    <span>{info.recordContent || info.safetyStatus || "-"}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

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
                      alt={`安全图片${idx + 1}`}
                      width={168}
                      height={96}
                      className="shrink-0 rounded-md border border-[rgba(96,165,250,0.28)] object-cover"
                    />
                  ))}
                </div>
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
