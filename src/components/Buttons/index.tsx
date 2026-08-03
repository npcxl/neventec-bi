import React from 'react';
import './index.css';

type ButtonProps = {
  children?: React.ReactNode;
  mode: string;
  active?: boolean;
  onModeChange?: (mode: string) => void;
};

const Button = ({ children, mode, active = false, onModeChange }: ButtonProps) => {
  const onClick = () => {
    onModeChange?.(mode);
  };

  const isAll = mode === "all";
  const defaultImg = isAll ? "/img/全部展馆.png" : "/img/按钮-展馆-默认.png";
  const activeImg = isAll ? "/img/全部展馆-选中.png" : "/img/按钮-展馆-选中.png";

  return (
    <button
      onClick={onClick}
      className={`hall-tab-btn ${active ? 'is-active' : ''}`}
      style={{
        backgroundImage: `url('${active ? activeImg : defaultImg}')`,
      }}
    >
      {!isAll && <span>{children}</span>}
    </button>
  );
};

export default Button;
