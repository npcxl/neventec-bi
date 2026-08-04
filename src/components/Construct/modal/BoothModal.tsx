import { useRef, useEffect, useCallback } from "react";
import { Image } from "antd";
import "./BoothModal.css";

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
  // 去重
  return [...new Set(urls)];
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

  return (
    <div className="booth-modal-layer" ref={overlayRef} onClick={handleOverlayClick}>
      <section className="booth-modal" role="dialog" aria-modal="true" aria-labelledby="booth-modal-title">

        {/* Header */}
        <header className="booth-modal__header">
          <h2 className="booth-modal__title" id="booth-modal-title">搭建信息详情</h2>
          <div className="booth-modal__summary">
            <span className="booth-modal__event">
              { ""}
            </span>
            <span className="booth-modal__paid" style={{ color: pColor }}>
              {pLabel}
            </span>
          </div>
          <div className="booth-modal__divider" />
        </header>

        {/* Scrollable Content */}
        <div className="booth-modal__scroll-area">

          {/* 展位信息 */}
          <section className="booth-modal__section booth-modal__section--booth" aria-labelledby="booth-info-title">
            <div className="booth-modal__section-heading">
              <i className="booth-modal__heading-mark" aria-hidden="true" />
              <h3 className="booth-modal__heading-text" id="booth-info-title">展位信息</h3>
            </div>
            <div className="booth-modal__booth-content">
              <div className="booth-modal__details">
                <div className="booth-modal__detail">
                  <span className="booth-modal__label">展位号</span>
                  <span className="booth-modal__colon">：</span>
                  <span className="booth-modal__value">{data.boothNumber || "-"}</span>
                </div>
                <div className="booth-modal__detail">
                  <span className="booth-modal__label">参展商</span>
                  <span className="booth-modal__colon">：</span>
                  <span className="booth-modal__value">{data.exhibitor || "-"}</span>
                </div>
                <div className="booth-modal__detail">
                  <span className="booth-modal__label">施工单位</span>
                  <span className="booth-modal__colon">：</span>
                  <span className="booth-modal__value">{data.constructionCompany || "-"}</span>
                </div>
                <div className="booth-modal__detail">
                  <span className="booth-modal__label">展位面积</span>
                  <span className="booth-modal__colon">：</span>
                  <span className="booth-modal__value">
                    {data.area != null ? `${data.area}㎡` : "-"}
                  </span>
                </div>
                <div className="booth-modal__detail">
                  <span className="booth-modal__label">展位类型</span>
                  <span className="booth-modal__colon">：</span>
                  <span className="booth-modal__value">
                    {label(EXCOMPANY_TYPE, data.excompanytype)}
                  </span>
                </div>
                <div className="booth-modal__detail">
                  <span className="booth-modal__label">关键工序</span>
                  <span className="booth-modal__colon">：</span>
                  <span className="booth-modal__value">
                    {label(COMPLEX_ENG, data.complexEngineering)}
                  </span>
                </div>
                <div className="booth-modal__detail">
                  <span className="booth-modal__label">吊点</span>
                  <span className="booth-modal__colon">：</span>
                  <span className="booth-modal__value">
                    {label(LIFT_POINT, data.liftingPoint)}
                  </span>
                </div>
                <div className="booth-modal__detail">
                  <span className="booth-modal__label">主体材质</span>
                  <span className="booth-modal__colon">：</span>
                  <span className="booth-modal__value">
                    {label(MATERIAL, data.mainStructureMaterial)}
                  </span>
                </div>
                <div className="booth-modal__detail">
                  <span className="booth-modal__label">搭建进度</span>
                  <span className="booth-modal__colon">：</span>
                  <span className="booth-modal__value" style={{ color: pColor }}>
                    {pLabel}
                  </span>
                </div>
                <div className="booth-modal__detail">
                  <span className="booth-modal__label">记录时间</span>
                  <span className="booth-modal__colon">：</span>
                  <span className="booth-modal__value">{data.recordDate || "-"}</span>
                </div>
                <div className="booth-modal__detail">
                  <span className="booth-modal__label">记录人</span>
                  <span className="booth-modal__colon">：</span>
                  <span className="booth-modal__value">{data.recordBy || "-"}</span>
                </div>
                <div className="booth-modal__detail">
                  <span className="booth-modal__label">巡检次数</span>
                  <span className="booth-modal__colon">：</span>
                  <span className="booth-modal__value">
                    {data.recordTimes != null ? `${data.recordTimes} 次` : "-"}
                  </span>
                </div>
              </div>
              <div className="booth-modal__divider" />
            </div>
          </section>

          {/* 搭建进度时间线 */}
          <section className="booth-modal__section booth-modal__section--order" aria-labelledby="timeline-title">
            <div className="booth-modal__section-heading booth-modal__order-heading">
              <div className="booth-modal__heading-group">
                <i className="booth-modal__heading-mark" aria-hidden="true" />
                <h3 className="booth-modal__heading-text" id="timeline-title">搭建进度时间线</h3>
              </div>
              <span className="booth-modal__count">
                共 <strong>{lines.length}</strong> 条
              </span>
            </div>
            <div className="booth-modal__table-body">
              {lines.length > 0 ? (
                lines.map((line, idx) => (
                  <div className="booth-modal__row" key={line.id ?? idx}>
                    <span className="booth-modal__timeline-dot" />
                    <span>{line.content || "-"}</span>
                  </div>
                ))
              ) : (
                <div className="booth-modal__empty">暂无进度记录</div>
              )}
            </div>
          </section>

          {/* 现场图片 */}
          {images.length > 0 && (
            <section className="booth-modal__section booth-modal__section--images" aria-labelledby="images-title">
              <div className="booth-modal__section-heading">
                <i className="booth-modal__heading-mark" aria-hidden="true" />
                <h3 className="booth-modal__heading-text" id="images-title">现场图片</h3>
                <span className="booth-modal__count" style={{ marginLeft: 12 }}>
                  共 <strong>{images.length}</strong> 张
                </span>
              </div>
              <div className="booth-modal__image-scroll">
                <div className="booth-modal__image-list">
                  {images.map((url, idx) => (
                    <Image
                      key={`${url}-${idx}`}
                      src={url}
                      alt={`搭建图片${idx + 1}`}
                      width={168}
                      height={96}
                      style={{
                        objectFit: "cover",
                        borderRadius: "6px",
                        border: "1px solid rgba(96,165,250,0.28)",
                        flexShrink: 0,
                      }}
                    />
                  ))}
                </div>
              </div>
            </section>
          )}

        </div>

        {/* Footer — sticky */}
        <footer className="booth-modal__footer">
          <button className="booth-modal__close" type="button" onClick={onClose}>
            关闭
          </button>
        </footer>

      </section>
    </div>
  );
}
