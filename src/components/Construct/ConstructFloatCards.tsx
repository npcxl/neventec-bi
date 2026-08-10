/* ============================================
   浮动玻璃感信息卡（施工进程 + 搭建进度图例）
   地图右上角悬浮，搭建信息 + 已选展馆时显示
   ============================================ */

const PROCESS_STEPS = [
  { label: '办理进度手续', number: '1号' },
  { label: '展位进场状态', number: '2号' },
  { label: '尺寸开口确认', number: '3号' },
  { label: '主体结构搭建', number: '4号' },
];

const PROGRESS_LEGEND = [
  { color: '#2563EB', label: '搭建正常' },
  { color: '#FA8C16', label: '进度缓慢' },
  { color: '#F5222D', label: '严重滞后' },
  { color: '#63F222', label: '搭建完成' },
];

const cardStyle: React.CSSProperties = {
  width: 170,
  height: 205,
  padding: '14px 14px',
  borderRadius: 16,
  border: '1px solid rgba(128,185,255,0.28)',
  background: 'linear-gradient(180deg, rgba(9,26,52,0.78), rgba(6,17,34,0.86))',
  boxShadow: '0 0 24px rgba(80,157,255,0.10), inset 0 0 24px rgba(80,157,255,0.06)',
  backdropFilter: 'blur(8px)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
};

const titleStyle: React.CSSProperties = {
  fontSize: 13, fontWeight: 500, color: '#7fc6ff',
  textAlign: 'center', flexShrink: 0,
};

export function ConstructFloatCards() {
  return (
    <div style={{
      position: 'fixed',
      right: 60,
      top: 240,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      {/* 卡片 1：施工进程 */}
      <div style={cardStyle}>
        <div style={titleStyle}>施工进程：</div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', width: '100%' }}>
          {PROCESS_STEPS.map((step, idx) => (
            <div key={step.label}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#9bb8d8' }}>{step.label}：</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: '#fff' }}>{step.number}</span>
              </div>
              {idx < PROCESS_STEPS.length - 1 && (
                <div style={{ textAlign: 'center', fontSize: 10, color: '#6f8eb5', lineHeight: '12px' }}>
                  ↓
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 卡片 2：搭建进度图例 */}
      <div style={cardStyle}>
        <div style={titleStyle}>搭建进度：</div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', alignItems: 'center' }}>
          {PROGRESS_LEGEND.map((item) => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
              <span style={{
                width: 8, height: 8, flexShrink: 0, borderRadius: 2,
                backgroundColor: item.color,
              }} />
              <span style={{ color: '#dbeeff' }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}