import React from "react";

interface EmptyStateProps {
  /** public/img/empty 下的文件名，例如 "搭建进度明细.png" */
  img: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * 统一空状态占位：根据业务模块展示对应的空状态插画（图自带文案），
 * 图片整体在该区域内水平+垂直居中，按比例自适应宽度。
 */
const EmptyState: React.FC<EmptyStateProps> = ({ img, className = "", style }) => {
  return (
    <div
      className={`flex w-full flex-col items-center justify-center ${className}`}
      style={{ flex: 1, minHeight: 0, ...style }}
    >
      <img
        src={`/img/empty/${img}`}
        alt="暂无数据"
        style={{
          maxWidth: "100%",
          maxHeight: "100%",
          width: "auto",
          height: "auto",
          objectFit: "contain",
        }}
      />
    </div>
  );
};

export default EmptyState;
