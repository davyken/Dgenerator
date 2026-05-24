import { useState, useRef, useCallback } from 'react'
import { removeBackground } from '@imgly/background-removal'

const PRESET_COLORS = [
  '#ffffff', '#000000', '#1e1b4b', '#7c3aed',
  '#0ea5e9', '#10b981', '#f59e0b', '#ef4444',
  '#f0f2f9', '#1e293b',
]

const PRESET_GRADIENTS = [
  { label: 'Purple', css: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', start: '#667eea', end: '#764ba2' },
  { label: 'Pink',   css: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', start: '#f093fb', end: '#f5576c' },
  { label: 'Sky',    css: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', start: '#4facfe', end: '#00f2fe' },
  { label: 'Green',  css: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', start: '#43e97b', end: '#38f9d7' },
  { label: 'Sunset', css: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', start: '#fa709a', end: '#fee140' },
  { label: 'Ocean',  css: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)', start: '#30cfd0', end: '#330867' },
]

function drawGradient(ctx, w, h, grad) {
  const g = ctx.createLinearGradient(0, 0, w, h)
  g.addColorStop(0, grad.start)
  g.addColorStop(1, grad.end)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
}

function getPreviewBg(bgType, bgColor, bgGradient, bgCustomImage) {
  if (bgType === 'transparent') return null
  if (bgType === 'color') return bgColor
  if (bgType === 'gradient') return bgGradient.css
  if (bgType === 'custom' && bgCustomImage) return `url(${bgCustomImage}) center/cover`
  return null
}

export default function BgRemoverPage() {
  const [original, setOriginal] = useState(null)
  const [removed, setRemoved] = useState(null)
  const [loading, setLoading] = useState(false)
  const [progressLabel, setProgressLabel] = useState('')
  const [progressPct, setProgressPct] = useState(0)
  const [bgType, setBgType] = useState('transparent')
  const [bgColor, setBgColor] = useState('#7c3aed')
  const [bgGradient, setBgGradient] = useState(PRESET_GRADIENTS[0])
  const [bgCustomImage, setBgCustomImage] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState(null)

  const hiddenCanvas = useRef()
  const fileRef = useRef()
  const bgFileRef = useRef()

  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) {
      setError('Please upload an image file (JPG, PNG, WebP).')
      return
    }
    setError(null)
    setOriginal(URL.createObjectURL(file))
    setRemoved(null)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }, [handleFile])

  const handleRemove = async () => {
    if (!original) return
    setLoading(true)
    setProgressPct(0)
    setProgressLabel('Starting…')
    setError(null)

    try {
      const blob = await fetch(original).then(r => r.blob())
      const result = await removeBackground(blob, {
        progress: (key, current, total) => {
          if (key.startsWith('fetch:')) {
            // Model is downloading — total may be 0 if Content-Length is unknown
            const pct = total > 0 ? Math.round((current / total) * 100) : -1
            setProgressPct(pct)
            setProgressLabel(
              pct >= 0
                ? `Downloading AI model… ${pct}%`
                : `Downloading AI model (first use only, ~30 MB)…`
            )
          } else if (key === 'compute:inference') {
            const pct = total > 0 ? Math.round((current / total) * 100) : 50
            setProgressPct(pct)
            setProgressLabel(`Removing background… ${pct}%`)
          }
        },
      })
      setRemoved(URL.createObjectURL(result))
    } catch (err) {
      console.error('BG removal error:', err)
      setError('Background removal failed. Try a different image or check your internet connection.')
    } finally {
      setLoading(false)
      setProgressLabel('')
      setProgressPct(0)
    }
  }

  const handleDownload = async () => {
    if (!removed) return
    const canvas = hiddenCanvas.current
    const img = new Image()
    img.src = removed
    await new Promise(r => { img.onload = r })

    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (bgType === 'color') {
      ctx.fillStyle = bgColor
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    } else if (bgType === 'gradient') {
      drawGradient(ctx, canvas.width, canvas.height, bgGradient)
    } else if (bgType === 'custom' && bgCustomImage) {
      const bgImg = new Image()
      bgImg.src = bgCustomImage
      await new Promise(r => { bgImg.onload = r })
      ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height)
    }

    ctx.drawImage(img, 0, 0)
    canvas.toBlob(b => {
      const a = document.createElement('a')
      a.href = URL.createObjectURL(b)
      a.download = 'image-no-bg.png'
      a.click()
    }, 'image/png')
  }

  const previewBg = getPreviewBg(bgType, bgColor, bgGradient, bgCustomImage)

  return (
    <div className="tool-page">
      <div className="tool-two-col">

        {/* ── Left: upload + controls ── */}
        <div className="tool-left">
          <div className="tool-card">
            <div className="tool-card-header">
              <div className="tool-icon-wrap" style={{ background: 'linear-gradient(135deg,#fdf4ff,#fae8ff)' }}>✂️</div>
              <div>
                <h2>Background Remover</h2>
                <p>AI runs entirely in your browser — no uploads, no cost</p>
              </div>
            </div>

            <div
              className={`drop-zone${dragging ? ' drag-over' : ''}${original ? ' has-file' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={e => handleFile(e.target.files[0])}
              />
              {original ? (
                <img
                  src={original}
                  alt="Original"
                  style={{ maxHeight: 200, maxWidth: '100%', borderRadius: 8, objectFit: 'contain' }}
                />
              ) : (
                <>
                  <div className="drop-icon">🖼️</div>
                  <p><strong>Drop an image here</strong> or click to upload</p>
                  <p className="drop-hint">JPG, PNG, WebP · AI removes the background instantly</p>
                </>
              )}
            </div>

            {error && <p className="error" style={{ marginTop: 8 }}>{error}</p>}

            {original && (
              <button
                className="btn btn-primary"
                onClick={handleRemove}
                disabled={loading}
                style={{ width: '100%', marginTop: 12 }}
              >
                {loading ? progressLabel || 'Processing…' : '✂️ Remove Background'}
              </button>
            )}

            {loading && (
              <div className="progress-bar-wrap">
                {progressPct < 0
                  ? <div className="progress-bar progress-bar-indeterminate" />
                  : <div className="progress-bar" style={{ width: `${Math.max(progressPct, 4)}%` }} />
                }
              </div>
            )}

            {!loading && !original && (
              <p className="hint" style={{ marginTop: 10, textAlign: 'center' }}>
                First use downloads the AI model (~30 MB) — cached after that
              </p>
            )}
          </div>

          {/* Background options */}
          {removed && (
            <div className="tool-card" style={{ marginTop: 16 }}>
              <h3 className="tool-section-title">Choose Background</h3>

              <div className="bg-type-tabs">
                {[
                  { id: 'transparent', label: 'None' },
                  { id: 'color',       label: 'Color' },
                  { id: 'gradient',    label: 'Gradient' },
                  { id: 'custom',      label: 'Image' },
                ].map(t => (
                  <button
                    key={t.id}
                    className={`bg-type-tab${bgType === t.id ? ' active' : ''}`}
                    onClick={() => setBgType(t.id)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {bgType === 'color' && (
                <div className="bg-color-grid">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      title={c}
                      className={`bg-color-dot${bgColor === c ? ' selected' : ''}`}
                      style={{ background: c, boxShadow: c === '#ffffff' ? 'inset 0 0 0 1px #ddd' : undefined }}
                      onClick={() => setBgColor(c)}
                    />
                  ))}
                  <input
                    type="color"
                    value={bgColor}
                    onChange={e => setBgColor(e.target.value)}
                    className="bg-color-input"
                    title="Custom color"
                  />
                </div>
              )}

              {bgType === 'gradient' && (
                <div className="bg-gradient-grid">
                  {PRESET_GRADIENTS.map(g => (
                    <button
                      key={g.label}
                      className={`bg-gradient-dot${bgGradient.label === g.label ? ' selected' : ''}`}
                      style={{ background: g.css }}
                      onClick={() => setBgGradient(g)}
                      title={g.label}
                    />
                  ))}
                </div>
              )}

              {bgType === 'custom' && (
                <button className="logo-upload-btn" onClick={() => bgFileRef.current?.click()}>
                  <input
                    ref={bgFileRef}
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      const f = e.target.files[0]
                      if (f) setBgCustomImage(URL.createObjectURL(f))
                    }}
                  />
                  {bgCustomImage
                    ? '✓ Background image selected — click to change'
                    : '📁 Upload a background image from your gallery'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Right: result ── */}
        <div className="tool-right">
          {removed ? (
            <div className="tool-card result-card">
              <h3 className="tool-section-title">Result</h3>
              <div
                className="result-preview"
                style={previewBg
                  ? { background: previewBg }
                  : { backgroundImage: 'repeating-conic-gradient(#d1d5db 0% 25%, #f3f4f6 0% 50%)', backgroundSize: '20px 20px' }
                }
              >
                <img
                  src={removed}
                  alt="Removed background"
                  style={{ maxWidth: '100%', maxHeight: 340, objectFit: 'contain' }}
                />
              </div>
              <button className="btn btn-primary" onClick={handleDownload} style={{ width: '100%', marginTop: 12 }}>
                ⬇ Download PNG
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => { setOriginal(null); setRemoved(null) }}
                style={{ width: '100%', marginTop: 8 }}
              >
                Try another image
              </button>
            </div>
          ) : (
            <div className="tool-card empty-card">
              <div className="empty-icon">✂️</div>
              <p>Upload a photo and click<br /><strong>Remove Background</strong><br />to see the result here</p>
            </div>
          )}
          <canvas ref={hiddenCanvas} style={{ display: 'none' }} />
        </div>
      </div>
    </div>
  )
}
