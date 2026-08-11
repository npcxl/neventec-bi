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
  const defaultImg = isAll ? "/img/all-halls.png" : "/img/btn-hall-default.png";
  const activeImg = isAll ? "/img/all-halls-active.png" : "/img/btn-hall-active.png";

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
