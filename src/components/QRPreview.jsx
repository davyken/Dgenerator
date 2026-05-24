import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { QR_TYPES } from './TypeSelector'

export default function QRPreview({ value, fgColor, bgColor, size, errorLevel, logo, type, title, description }) {
  const canvasRef = useRef(null)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)

  const typeInfo = QR_TYPES.find(t => t.id === type)

  useEffect(() => {
    if (!value) { setReady(false); return }
    setError('')
    QRCode.toCanvas(canvasRef.current, value, {
      width: Math.min(size, 280),
      color: { dark: fgColor, light: bgColor },
      errorCorrectionLevel: errorLevel,
      margin: 2,
    }, (err) => {
      if (err) { setError('QR data too large — try shorter content'); return }
      setReady(true)
    })
  }, [value, fgColor, bgColor, size, errorLevel])

  useEffect(() => {
    if (!logo || !canvasRef.current || !value || !ready) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.onload = () => {
      const s = canvas.width * 0.22
      const x = (canvas.width - s) / 2
      const y = (canvas.height - s) / 2
      ctx.fillStyle = bgColor
      ctx.fillRect(x - 4, y - 4, s + 8, s + 8)
      ctx.drawImage(img, x, y, s, s)
    }
    img.src = logo
  }, [logo, ready, bgColor])

  return (
    <div className="qr-card">
      <div className="qr-card-label">QR Preview</div>

      {!value ? (
        <div className="qr-placeholder">
          <div className="qr-placeholder-icon">⬛</div>
          <p>Fill in the form<br />to generate your QR code</p>
        </div>
      ) : (
        <div className="qr-canvas-wrap" key={value}>
          <canvas ref={canvasRef} />
        </div>
      )}

      {error && <p className="error" style={{color:'#fca5a5'}}>{error}</p>}

      {value && title && (
        <div className="qr-title-block">
          <p className="qr-title-text">{title}</p>
          {description && <p className="qr-desc-text">{description}</p>}
        </div>
      )}

      {value && typeInfo && (
        <div className="qr-type-tag">
          <span>{typeInfo.icon}</span>
          <span>{typeInfo.label}</span>
        </div>
      )}
    </div>
  )
}
