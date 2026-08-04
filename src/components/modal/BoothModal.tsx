import { useRef, useEffect, useCallback } from "react";

/** 对齐 CenterMap.tsx 中的 BoothOrderInfo 类型 */
export type BoothOrderInfo = {
  goodsName?: string;
  specifications?: string;
  buyNum?: number;
  invoiceApply?: boolean;
  refundAmount?: boolean;
};

/** 对齐 CenterMap.tsx 中的 BoothDetail 类型 */
export type BoothDetailData = {
  expoName?: string;
  hallName?: string;
  exhibitor?: string;
  contactname?: string;
  phone?: string;
  contactWay?: string;
  constructionCompany?: string;
  remarks?: string;
  fullPaidFee?: boolean;
  orderInfos?: BoothOrderInfo[];
  boothNo?: string;
};

type BoothModalProps = {
  visible: boolean;
  onClose: () => void;
  data: BoothDetailData;
};

export function BoothModal({
  visible,
  onClose,
  data,
}: BoothModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (visible) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [visible, handleKeyDown]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  };

  if (!visible) return null;

  const expoName = data.expoName || "-";
  const hall = data.hallName || "-";
  const contact = data.contactname || data.contactWay || "-";
  const company = data.constructionCompany || "-";
  const remark = data.remarks || "-";
  const phone = data.phone || "-";
  const paidStatus = data.fullPaidFee ? "已全额支付" : "未全额支付";
  const orders = data.orderInfos ?? [];

  const muted = (v: string) => !v || v === "-";

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-[1000] flex items-center justify-center"
      style={{ background: "rgba(35, 35, 35, 0.6)" }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="booth-modal-title"
        className="relative flex w-[811px] max-h-[70vh] flex-col overflow-hidden rounded border-t-2 border-b-2 border-[#1e40af]"
        style={{
          background: "rgba(14, 23, 54, 0.8)",
          boxShadow: "0 0 24px rgba(37, 99, 235, 0.24)",
          backdropFilter: "blur(20px)",
        }}
      >
        {/* ========== Header ========== */}
        <header className="relative shrink-0 px-5 pt-[18px] pb-4">
          <h2
            id="booth-modal-title"
            className="mb-2 text-xl font-medium leading-7 text-white"
          >
            展位订单详情
          </h2>
          <div className="flex items-center justify-between text-sm font-medium leading-[22px]">
            <span className="pr-4 text-white/60">{expoName}</span>
            <span className="px-4" style={{ color: "#63f222" }}>
              {paidStatus}
            </span>
          </div>
          {/* divider */}
          <div
            className="absolute left-5 right-5 bottom-0 h-[2px]"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(37,99,235,0.6) 15%, rgba(125,227,247,0.6) 50%, rgba(37,99,235,0.6) 85%, transparent)",
            }}
          />
        </header>

        {/* ========== 展位信息 ========== */}
        <section className="relative shrink-0" aria-labelledby="booth-info-title">
          {/* heading */}
          <div className="flex items-center min-w-0 px-5 pt-4 pb-3">
            <i
              className="mr-3 h-[14px] w-1 shrink-0 rounded-[29px]"
              style={{ background: "#93c5fd", boxShadow: "0 0 2px #2563eb" }}
              aria-hidden="true"
            />
            <div id="booth-info-title" className="shrink-0 text-lg font-medium leading-7 text-white">
              展位信息
            </div>
          </div>

          {/* detail grid: 2列 */}
          <div className="relative px-9 pb-4">
            <div className="grid grid-cols-2 gap-x-[25px] gap-y-[8px] text-sm leading-[22px]">
              {/* 展馆 */}
              <div className="flex items-center whitespace-nowrap">
                <span className="flex w-14 justify-between text-white/60">
                  <span>展</span><span>馆</span>
                </span>
                <span className="ml-1 text-white/60">：</span>
                <span className="text-white">{hall}</span>
              </div>
                            <div className="flex items-center whitespace-nowrap">
                <span className="flex w-14 justify-between text-white/60">
                  <span>展</span>
                  <span>位</span>
                <span>号</span>
                </span>
                <span className="ml-1 text-white/60">：</span>
                <span className="text-white">{data.boothNo || "-"}</span>
              </div>
              {/* 联系方式 */}
              <div className="flex items-center whitespace-nowrap">
                <span className="w-14 text-white/60">联系方式</span>
                <span className="ml-1 text-white/60">：</span>
                <span className="text-white">{phone}</span>
              </div>

              {/* 联系人 */}
              <div className="flex items-center whitespace-nowrap">
                <span className="flex w-14 justify-between text-white/60">
                  <span>联</span><span>系</span><span>人</span>
                </span>
                <span className="ml-1 text-white/60">：</span>
                <span className={muted(contact) ? "text-white/60" : "text-white"}>
                  {contact}
                </span>
              </div>

              {/* 支付状态 */}
              <div className="flex items-center whitespace-nowrap">
                <span className="w-14 text-white/60">支付状态</span>
                <span className="ml-1 text-white/60">：</span>
                <span style={{ color: "#63f222" }}>{paidStatus}</span>
              </div>

              {/* 施工单位 */}
              <div className="col-span-2 flex items-center whitespace-nowrap">
                <span className="w-14 text-white/60">施工单位</span>
                <span className="ml-1 text-white/60">：</span>
                <span className="text-white">{company}</span>
              </div>
            </div>

            {/* divider */}
            <div
              className="absolute left-5 right-5 bottom-0 h-[2px]"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(37,99,235,0.6) 15%, rgba(125,227,247,0.6) 50%, rgba(37,99,235,0.6) 85%, transparent)",
              }}
            />
          </div>
        </section>

        {/* ========== 订单信息 ========== */}
        <section className="flex min-h-0 flex-1 flex-col" aria-labelledby="order-info-title">
          {/* heading */}
          <div className="flex shrink-0 items-center justify-between px-5 pt-4 pb-3">
            <div className="flex items-center min-w-0">
              <i
                className="mr-3 h-[14px] w-1 shrink-0 rounded-[29px]"
                style={{ background: "#93c5fd", boxShadow: "0 0 2px #2563eb" }}
                aria-hidden="true"
              />
              <div id="order-info-title" className="text-lg font-medium leading-7 text-white shrink-0">
                订单信息
              </div>
            </div>
            <span className="text-sm leading-[22px] text-white/60 shrink-0 ml-auto">
              共 <strong className="font-normal text-white">{orders.length}</strong> 项
            </span>
          </div>

          {/* table head */}
          <div
            className="grid shrink-0 items-center gap-x-2 px-9 text-sm leading-[22px] text-white/80"
            style={{
              gridTemplateColumns: "180px 120px 100px 148px 154px",
              height: 38,
              background:
                "linear-gradient(90deg, rgba(30,64,175,0), rgba(30,64,175,0.24) 49.519%, rgba(30,64,175,0))",
            }}
          >
            <span>项目名称</span>
            <span>规格</span>
            <span>数量</span>
            <span>开票状态</span>
            <span>退款状态</span>
          </div>

          {/* table body */}
          <div className="modal-scrollbar relative min-h-0 flex-1 overflow-y-auto text-sm leading-5">
            {orders.length > 0 ? (
              orders.map((row, idx) => {
                const spec = row.specifications || "-";
                return (
                  <div
                    key={idx}
                    className="grid items-center gap-x-2 border-b border-dashed border-[#334155] px-9 py-2 text-white"
                    style={{
                      gridTemplateColumns: "180px 120px 100px 148px 154px",
                    }}
                  >
                    <span>{row.goodsName || "-"}</span>
                    <span className={spec === "-" ? "text-white/60" : ""}>
                      {spec}
                    </span>
                    <span>x{row.buyNum ?? 1}</span>
                    <span style={{ color: "#fa8c16" }}>
                      {row.invoiceApply ? "已开票" : "未开票"}
                    </span>
                    <span style={{ color: "#fa8c16" }}>
                      {row.refundAmount ? "已退款" : "未退款"}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-white/40">
                暂无订单信息
              </div>
            )}
          </div>
        </section>

        {/* ========== Footer ========== */}
        <footer className="flex shrink-0 justify-end px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-[30px] w-[60px] rounded border border-[#13b8d6] text-sm leading-[22px] text-white transition-colors hover:bg-[rgba(37,99,235,0.42)]"
            style={{
              background: "rgba(37, 99, 235, 0.26)",
              boxShadow: "inset 0 -2px 4px rgba(37, 99, 235, 0.42)",
            }}
          >
            关闭
          </button>
        </footer>
      </section>
    </div>
  );
}
