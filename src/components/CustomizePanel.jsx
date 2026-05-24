import { HexColorPicker } from 'react-colorful'
import { useState, useRef } from 'react'

export default function CustomizePanel({ settings, onChange }) {
  const [open, setOpen] = useState(false)
  const [showFg, setShowFg] = useState(false)
  const [showBg, setShowBg] = useState(false)
  const logoInputRef = useRef()

  const handleLogo = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => onChange({ ...settings, logo: ev.target.result, logoName: file.name })
    reader.readAsDataURL(file)
  }

  const closePickers = () => { setShowFg(false); setShowBg(false) }

  return (
    <div className="customize-panel">
      <button className="customize-toggle" onClick={() => { setOpen(o => !o); closePickers() }}>
        <div className="customize-toggle-left">
          <div className="icon">🎨</div>
          <div>
            <h3>Customize</h3>
          </div>
        </div>
        <span className={`chevron${open ? ' open' : ''}`}>▼</span>
      </button>

      {open && (
        <div className="customize-body">
          <div className="customize-row">
            <div className="customize-label">
              Size <span>{settings.size}px</span>
            </div>
            <input
              type="range"
              min="128"
              max="512"
              step="16"
              value={settings.size}
              onChange={e => onChange({ ...settings, size: Number(e.target.value) })}
            />
          </div>

          <div className="customize-row">
            <div className="customize-label">Error Correction</div>
            <select
              value={settings.errorLevel}
              onChange={e => onChange({ ...settings, errorLevel: e.target.value })}
            >
              <option value="L">L — Low (7%) — smallest QR</option>
              <option value="M">M — Medium (15%) — recommended</option>
              <option value="Q">Q — Quartile (25%) — use with logo</option>
              <option value="H">H — High (30%) — most robust</option>
            </select>
          </div>

          <div className="customize-row color-row">
            <div className="color-pick">
              <label>Foreground</label>
              <button
                className="color-swatch-btn"
                onClick={() => { setShowFg(!showFg); setShowBg(false) }}
              >
                <div className="color-dot" style={{ background: settings.fgColor }} />
                <span>{settings.fgColor}</span>
              </button>
              {showFg && (
                <div className="color-popover">
                  <HexColorPicker
                    color={settings.fgColor}
                    onChange={c => onChange({ ...settings, fgColor: c })}
                  />
                  <input
                    type="text"
                    value={settings.fgColor}
                    onChange={e => onChange({ ...settings, fgColor: e.target.value })}
                  />
                </div>
              )}
            </div>

            <div className="color-pick">
              <label>Background</label>
              <button
                className="color-swatch-btn"
                onClick={() => { setShowBg(!showBg); setShowFg(false) }}
              >
                <div className="color-dot" style={{ background: settings.bgColor, border: '1px solid #d1d5db' }} />
                <span>{settings.bgColor}</span>
              </button>
              {showBg && (
                <div className="color-popover">
                  <HexColorPicker
                    color={settings.bgColor}
                    onChange={c => onChange({ ...settings, bgColor: c })}
                  />
                  <input
                    type="text"
                    value={settings.bgColor}
                    onChange={e => onChange({ ...settings, bgColor: e.target.value })}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="customize-row">
            <div className="customize-label">Logo / Center Icon</div>
            {settings.logo ? (
              <div className="logo-preview">
                <img src={settings.logo} alt="logo" />
                <span>{settings.logoName || 'logo'}</span>
                <button onClick={() => onChange({ ...settings, logo: null, logoName: '' })}>✕</button>
              </div>
            ) : (
              <label className="logo-upload-btn">
                <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogo} />
                <span>📎</span>
                <span>Upload logo image</span>
              </label>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
