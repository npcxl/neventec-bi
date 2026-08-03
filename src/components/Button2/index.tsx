import './index.css';

type Button2Props = {
  children: React.ReactNode;
  mode: string;
  active?: boolean;
  onModeChange?: (mode: string) => void;
};

const Button2 = ({ children, mode, active = false, onModeChange }: Button2Props) => {
  const handleClick = () => {
    onModeChange?.(mode);
  };

  return (
    <button
      type="button"
      className={`btn-menu ${active ? 'is-active' : ''}`}
      onClick={handleClick}
      aria-pressed={active}
    >
      <span>{children}</span>
    </button>
  );
};

export default Button2;
