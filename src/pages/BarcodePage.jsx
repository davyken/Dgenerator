import { useState, useEffect, useRef, useCallback } from 'react'
import JsBarcode from 'jsbarcode'

// ── Barcode format catalogue ─────────────────────────────────────────────────
const BARCODE_FORMATS = [
  {
    id: 'CODE128',
    label: 'Code 128',
    icon: '▌▏▌▌▏',
    desc: 'Alphanumeric, any length',
    placeholder: 'Hello-World-123',
    validate: v => v.length > 0,
    hint: 'Supports letters, numbers & symbols',
  },
  {
    id: 'CODE39',
    label: 'Code 39',
    icon: '▌▏▌▏▌',
    desc: 'Uppercase + digits + symbols',
    placeholder: 'HELLO123',
    validate: v => /^[A-Z0-9 \-.$\/+%]+$/.test(v),
    hint: 'A–Z, 0–9 and - . $ / + % space',
  },
  {
    id: 'EAN13',
    label: 'EAN-13',
    icon: '▌▌▏▌▏▌',
    desc: '13-digit product barcode',
    placeholder: '590123412345',
    validate: v => /^\d{12,13}$/.test(v),
    hint: 'Enter 12 digits (check digit auto-added) or all 13',
  },
  {
    id: 'EAN8',
    label: 'EAN-8',
    icon: '▌▏▌▌▏',
    desc: '8-digit short barcode',
    placeholder: '9638507',
    validate: v => /^\d{7,8}$/.test(v),
    hint: 'Enter 7 digits (check digit auto-added) or all 8',
  },
  {
    id: 'UPC',
    label: 'UPC-A',
    icon: '▌▌▏▌▌▏',
    desc: '12-digit US retail standard',
    placeholder: '03600024145',
    validate: v => /^\d{11,12}$/.test(v),
    hint: 'Enter 11 digits (check digit auto-added) or all 12',
  },
  {
    id: 'ITF14',
    label: 'ITF-14',
    icon: '▌▏▏▌▌▏',
    desc: '14-digit shipping/carton',
    placeholder: '10012345678902',
    validate: v => /^\d{14}$/.test(v),
    hint: 'Exactly 14 digits required',
  },
  {
    id: 'MSI',
    label: 'MSI / Plessey',
    icon: '▏▌▏▌▏▌',
    desc: 'Inventory & warehouse',
    placeholder: '1234567',
    validate: v => /^\d+$/.test(v) && v.length > 0,
    hint: 'Digits only',
  },
  {
    id: 'pharmacode',
    label: 'Pharmacode',
    icon: '▌▌▏▌▏',
    desc: 'Pharmaceutical packages',
    placeholder: '1234',
    validate: v => /^\d+$/.test(v) && parseInt(v) >= 3 && parseInt(v) <= 131070,
    hint: 'Number between 3 and 131,070',
  },
]

const DEFAULT_FORMAT = BARCODE_FORMATS[0]

const defaultOptions = {
  width: 2,
  height: 100,
  fgColor: '#000000',
  bgColor: '#ffffff',
  fontSize: 18,
  textMargin: 8,
  displayValue: true,
  lineColor: '#000000',
}

// ── Main component ───────────────────────────────────────────────────────────
export default function BarcodePage() {
  const [format, setFormat] = useState(DEFAULT_FORMAT)
  const [value, setValue] = useState(DEFAULT_FORMAT.placeholder)
  const [options, setOptions] = useState(defaultOptions)
  const [title, setTitle] = useState('')
  const [error, setError] = useState('')
  const [rendered, setRendered] = useState(false)

  const svgRef = useRef(null)

  // Re-render barcode whenever value / format / options change
  const renderBarcode = useCallback(() => {
    if (!svgRef.current) return
    const v = value.trim()
    if (!v) { setError(''); setRendered(false); return }

    if (!format.validate(v)) {
      setError(`Invalid value for ${format.label}. ${format.hint}`)
      setRendered(false)
      return
    }

    try {
      JsBarcode(svgRef.current, v, {
        format: format.id,
        width: options.width,
        height: options.height,
        displayValue: options.displayValue,
        fontOptions: '',
        font: 'Inter, sans-serif',
        textAlign: 'center',
        textPosition: 'bottom',
        textMargin: options.textMargin,
        fontSize: options.fontSize,
        background: options.bgColor,
        lineColor: options.fgColor,
        margin: 14,
        valid: ok => {
          if (!ok) { setError(`Value rejected by ${format.label} encoder`); setRendered(false) }
        },
      })
      setError('')
      setRendered(true)
    } catch (e) {
      setError(e.message || 'Could not generate barcode')
      setRendered(false)
    }
  }, [value, format, options])

  useEffect(() => { renderBarcode() }, [renderBarcode])

  // When switching formats, reset value to placeholder
  const handleFormatChange = (f) => {
    setFormat(f)
    setValue(f.placeholder)
    setError('')
  }

  const handleOpt = (key, val) => setOptions(prev => ({ ...prev, [key]: val }))

  // ── Download helpers ─────────────────────────────────────────────────────
  const downloadSVG = () => {
    if (!svgRef.current || !rendered) return
    const svg = svgRef.current.outerHTML
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `barcode-${format.id.toLowerCase()}.svg`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const downloadPNG = () => {
    if (!svgRef.current || !rendered) return
    const svg = svgRef.current
    const canvas = document.createElement('canvas')
    const bbox = svg.getBoundingClientRect()
    const scale = 2
    canvas.width = svg.scrollWidth * scale
    canvas.height = svg.scrollHeight * scale
    const ctx = canvas.getContext('2d')
    const img = new Image()
    const svgData = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    img.onload = () => {
      ctx.scale(scale, scale)
      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(url)
      const a = document.createElement('a')
      a.download = `barcode-${format.id.toLowerCase()}.png`
      a.href = canvas.toDataURL('image/png')
      a.click()
    }
    img.src = url
  }

  const copySVG = async () => {
    if (!svgRef.current || !rendered) return
    await navigator.clipboard.writeText(svgRef.current.outerHTML)
  }

  return (
    <div className="tool-page">
      <div className="tool-two-col">
        {/* ── Left panel ─────────────────────────────────────────────── */}
        <div className="tool-left" style={{ gap: 20 }}>

          {/* Format selector */}
          <div className="type-scroll-wrap">
            <div className="barcode-format-grid">
              {BARCODE_FORMATS.map(f => (
                <button
                  key={f.id}
                  className={`type-btn${format.id === f.id ? ' active' : ''}`}
                  onClick={() => handleFormatChange(f)}
                  title={f.desc}
                >
                  <span className="type-icon barcode-icon-text">{f.icon}</span>
                  <span className="type-label">{f.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Input card */}
          <div className="tool-card">
            <div className="tool-card-header">
              <div className="tool-icon-wrap" style={{ background: 'linear-gradient(135deg,#f5f3ff,#ede9fe)' }}>
                <span>📊</span>
              </div>
              <div>
                <h2>{format.label}</h2>
                <p>{format.desc}</p>
              </div>
            </div>

            <div className="field">
              <label htmlFor="bc-value">Barcode Value</label>
              <input
                id="bc-value"
                type="text"
                value={value}
                placeholder={format.placeholder}
                onChange={e => { setValue(e.target.value); setError('') }}
              />
              {error
                ? <span className="error">{error}</span>
                : <span className="hint">{format.hint}</span>
              }
            </div>

            {/* Title label */}
            <div className="qr-label-section">
              <div className="field">
                <label htmlFor="bc-title">Label / Title <span className="label-optional">(optional)</span></label>
                <input
                  id="bc-title"
                  type="text"
                  placeholder="e.g. Product SKU"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  maxLength={60}
                />
              </div>
            </div>
          </div>

          {/* Customize panel */}
          <BarcodeCustomize options={options} onChange={handleOpt} />
        </div>

        {/* ── Right panel ────────────────────────────────────────────── */}
        <div className="tool-right" style={{ gap: 20, position: 'sticky', top: 24 }}>

          {/* Preview card */}
          <div className="bc-card">
            <span className="qr-card-label">BARCODE PREVIEW</span>

            {rendered ? (
              <div className="bc-svg-wrap">
                {title && <p className="bc-preview-title">{title}</p>}
                <svg ref={svgRef} />
              </div>
            ) : (
              <>
                <svg ref={svgRef} style={{ display: 'none' }} />
                <div className="qr-placeholder">
                  <div className="qr-placeholder-icon">📊</div>
                  <p>
                    {error
                      ? <span style={{ color: '#f87171' }}>{error}</span>
                      : 'Enter a value to generate your barcode'
                    }
                  </p>
                </div>
              </>
            )}

            {rendered && (
              <div className="qr-type-tag">
                <span>📊</span>
                <span>{format.label}</span>
              </div>
            )}
          </div>

          {/* Download card */}
          <div className="download-card">
            <h3>Download</h3>
            <div className="download-bar">
              <button className="btn btn-primary" onClick={downloadPNG} disabled={!rendered}>
                ⬇ PNG
              </button>
              <button className="btn btn-secondary" onClick={downloadSVG} disabled={!rendered}>
                ⬇ SVG
              </button>
              <button className="btn btn-ghost" onClick={copySVG} disabled={!rendered}>
                ⎘ Copy SVG
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

// ── Customize panel sub-component ────────────────────────────────────────────
function BarcodeCustomize({ options, onChange }) {
  const [open, setOpen] = useState(true)

  return (
    <div className="customize-panel">
      <button className="customize-toggle" onClick={() => setOpen(o => !o)}>
        <div className="customize-toggle-left">
          <div className="icon">🎨</div>
          <div>
            <h3>Customize Barcode</h3>
          </div>
        </div>
        <span className={`chevron${open ? ' open' : ''}`}>▲</span>
      </button>

      {open && (
        <div className="customize-body">
          {/* Bar width */}
          <div className="customize-row">
            <div className="customize-label">
              Bar Width
              <span>{options.width}×</span>
            </div>
            <input
              type="range" min={1} max={4} step={0.5}
              value={options.width}
              onChange={e => onChange('width', parseFloat(e.target.value))}
            />
          </div>

          {/* Height */}
          <div className="customize-row">
            <div className="customize-label">
              Height
              <span>{options.height}px</span>
            </div>
            <input
              type="range" min={40} max={200} step={4}
              value={options.height}
              onChange={e => onChange('height', parseInt(e.target.value))}
            />
          </div>

          {/* Colors */}
          <div className="customize-row color-row">
            <div className="color-pick">
              <label>Bar Color</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="color"
                  value={options.fgColor}
                  onChange={e => onChange('fgColor', e.target.value)}
                  style={{ width: 36, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer', padding: 2 }}
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--muted)', fontFamily: 'Menlo, monospace' }}>
                  {options.fgColor}
                </span>
              </div>
            </div>
            <div className="color-pick">
              <label>Background</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="color"
                  value={options.bgColor}
                  onChange={e => onChange('bgColor', e.target.value)}
                  style={{ width: 36, height: 36, borderRadius: 8, border: '1.5px solid var(--border)', cursor: 'pointer', padding: 2 }}
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--muted)', fontFamily: 'Menlo, monospace' }}>
                  {options.bgColor}
                </span>
              </div>
            </div>
          </div>

          {/* Show text toggle */}
          <div className="customize-row" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="customize-label" style={{ margin: 0 }}>Show Text Below Bars</div>
            <button
              onClick={() => onChange('displayValue', !options.displayValue)}
              className={`bc-toggle${options.displayValue ? ' on' : ''}`}
              aria-label="Toggle text display"
            >
              <span className="bc-toggle-knob" />
            </button>
          </div>

          {/* Font size (only when text is shown) */}
          {options.displayValue && (
            <div className="customize-row">
              <div className="customize-label">
                Font Size
                <span>{options.fontSize}px</span>
              </div>
              <input
                type="range" min={10} max={32} step={1}
                value={options.fontSize}
                onChange={e => onChange('fontSize', parseInt(e.target.value))}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
