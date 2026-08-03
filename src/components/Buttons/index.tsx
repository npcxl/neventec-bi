import React from 'react';
import './index.css';

type ButtonProps = {
  children: React.ReactNode;
  mode: string;
  active?: boolean;
  onModeChange?: (mode: string) => void;
};

const Button = ({ children, mode, active = false, onModeChange }: ButtonProps) => {
  const onClick = () => {
    onModeChange?.(mode);
  };

  return (
<button
 onClick={onClick}
 className={`map-mode-button shrink-0 ${active ? 'is-active' : ''} Xbutton`}
>
    {children}
    <div id="clip">
        <div id="leftTop" className="corner"></div>
        <div id="rightBottom" className="corner"></div>
        <div id="rightTop" className="corner"></div>
        <div id="leftBottom" className="corner"></div>
    </div>
    <span id="rightArrow" className="arrow"></span>
    <span id="leftArrow" className="arrow"></span>
</button>

  );
};

export default Button;
