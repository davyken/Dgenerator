import { QR_TYPES } from './TypeSelector'

export default function HistoryPanel({ history, onLoad, onClear }) {
  if (!history.length) return null

  return (
    <div className="history-card">
      <div className="history-header">
        <h3>Recent QR Codes</h3>
        <button className="history-clear" onClick={onClear}>Clear all</button>
      </div>
      <div className="history-list">
        {history.map((item, i) => {
          const t = QR_TYPES.find(x => x.id === item.type)
          return (
            <button key={i} className="history-item" onClick={() => onLoad(item)}>
              <div className="history-item-icon">{t?.icon}</div>
              <div className="history-item-text">
                <div className="history-item-label">{t?.label}</div>
                <div className="history-item-value">{item.qrValue}</div>
              </div>
              <span className="history-arrow">›</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
