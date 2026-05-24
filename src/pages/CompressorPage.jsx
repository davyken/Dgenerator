import { useState, useRef, useCallback } from 'react'
import imageCompression from 'browser-image-compression'
import JSZip from 'jszip'
import { PDFDocument } from 'pdf-lib'
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs'
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { saveAs } from 'file-saver'
import { formatBytes } from '../utils/format'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl

const IMAGE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'])
const IMAGE_EXTS  = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif'])
const isPDF = f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
const isZip = f => f.type === 'application/zip' || f.name.toLowerCase().endsWith('.zip')
const isImgExt = name => IMAGE_EXTS.has(name.split('.').pop().toLowerCase())

/* ── Image compression ── */
async function compressImage(fileOrBlob, name, maxSizeMB, quality) {
  const file = fileOrBlob instanceof File ? fileOrBlob : new File([fileOrBlob], name)
  return imageCompression(file, { maxSizeMB, maxWidthOrHeight: 4096, useWebWorker: true, initialQuality: quality })
}

/* ── PDF compression via canvas re-render ── */
async function compressPDF(file, quality, scale, onProgress) {
  const arrayBuffer = await file.arrayBuffer()
  const srcPdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const newPdf = await PDFDocument.create()

  for (let i = 1; i <= srcPdf.numPages; i++) {
    onProgress(i, srcPdf.numPages)
    const page = await srcPdf.getPage(i)
    const vp = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width  = Math.round(vp.width)
    canvas.height = Math.round(vp.height)
    await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise

    const jpegBytes = await new Promise(res =>
      canvas.toBlob(async b => res(new Uint8Array(await b.arrayBuffer())), 'image/jpeg', quality)
    )
    const jpgImg  = await newPdf.embedJpg(jpegBytes)
    const newPage = newPdf.addPage([canvas.width, canvas.height])
    newPage.drawImage(jpgImg, { x: 0, y: 0, width: canvas.width, height: canvas.height })
  }

  const bytes = await newPdf.save()
  return new Blob([bytes], { type: 'application/pdf' })
}

const SIZE_PRESETS = [
  { label: '5 MB',  value: 5 },
  { label: '2 MB',  value: 2 },
  { label: '1 MB',  value: 1 },
  { label: '500 KB', value: 0.5 },
  { label: '250 KB', value: 0.25 },
  { label: '100 KB', value: 0.1 },
  { label: '50 KB',  value: 0.05 },
  { label: '20 KB',  value: 0.02 },
  { label: '10 KB (maximum)', value: 0.01 },
]

export default function CompressorPage() {
  const [mode, setMode]         = useState('compress') // 'compress' | 'extract'
  const [files, setFiles]       = useState([])
  const [maxSizeMB, setMaxSizeMB] = useState(0.1)
  const [customKB, setCustomKB] = useState('')
  const [useCustom, setUseCustom] = useState(false)
  const [quality, setQuality]   = useState(0.7)
  const [pdfScale, setPdfScale] = useState(1.5)
  const [processing, setProcessing] = useState(false)
  const [progressLabel, setProgressLabel] = useState('')
  const [results, setResults]   = useState([])
  const [dragging, setDragging] = useState(false)

  // Extract mode state
  const [zipFile, setZipFile]       = useState(null)
  const [zipContents, setZipContents] = useState([])
  const [extracting, setExtracting] = useState(false)
  const [extractDragging, setExtractDragging] = useState(false)

  const fileRef    = useRef()
  const zipFileRef = useRef()

  /* ──────────────── COMPRESS MODE ──────────────── */
  const handleFiles = useCallback((incoming) => {
    setFiles(Array.from(incoming))
    setResults([])
  }, [])

  const effectiveMB = useCustom && customKB
    ? Math.max(0.005, +customKB / 1024)
    : maxSizeMB

  const handleCompress = async () => {
    if (!files.length) return
    setProcessing(true)
    setResults([])
    const out = []

    for (const file of files) {
      setProgressLabel(`Processing ${file.name}…`)

      if (IMAGE_TYPES.has(file.type)) {
        // ── Single image → compress directly ──
        try {
          const compressed = await compressImage(file, file.name, effectiveMB, quality)
          out.push({ name: file.name, originalSize: file.size, compressedSize: compressed.size, blob: compressed, type: 'image' })
        } catch {
          out.push({ name: file.name, originalSize: file.size, error: true })
        }

      } else if (isPDF(file)) {
        // ── PDF → compress → download as PDF (not ZIP) ──
        try {
          const blob = await compressPDF(file, quality, pdfScale, (cur, tot) =>
            setProgressLabel(`Compressing PDF page ${cur}/${tot}…`)
          )
          out.push({ name: file.name, originalSize: file.size, compressedSize: blob.size, blob, type: 'pdf', note: 'Pages rasterized — text may not be selectable in compressed PDF' })
        } catch {
          out.push({ name: file.name, originalSize: file.size, error: true })
        }

      } else if (isZip(file)) {
        // ── ZIP → compress images inside, repackage ──
        try {
          const srcZip = await JSZip.loadAsync(file)
          const newZip = new JSZip()
          let imgCount = 0

          for (const [entryName, entry] of Object.entries(srcZip.files)) {
            if (entry.dir) continue
            const blob = await entry.async('blob')
            if (isImgExt(entryName)) {
              try {
                const c = await compressImage(blob, entryName, effectiveMB, quality)
                imgCount++
                newZip.file(entryName, c)
              } catch { newZip.file(entryName, blob) }
            } else {
              newZip.file(entryName, blob)
            }
          }

          const result = await newZip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 9 } })
          out.push({
            name: file.name,
            originalSize: file.size,
            compressedSize: result.size,
            blob: result,
            type: 'zip',
            note: imgCount > 0 ? `${imgCount} image${imgCount > 1 ? 's' : ''} compressed inside` : 'Repackaged ZIP',
          })
        } catch {
          out.push({ name: file.name, originalSize: file.size, error: true })
        }

      } else {
        // ── Any other file → wrap in ZIP ──
        const zip = new JSZip()
        zip.file(file.name, file)
        const content = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 9 } })
        out.push({ name: file.name + '.zip', originalSize: file.size, compressedSize: content.size, blob: content, type: 'zip', note: 'Compressed to ZIP' })
      }
    }

    setResults(out)
    setProcessing(false)
    setProgressLabel('')
  }

  const downloadOne = (r) => {
    const stem = r.name.replace(/\.[^.]+$/, '')
    const ext  = r.type === 'image' ? (r.name.match(/\.[^.]+$/)?.[0] || '.jpg')
               : r.type === 'pdf'   ? '.pdf'
               : '.zip'
    saveAs(r.blob, stem + '-compressed' + ext)
  }

  const downloadAll = async () => {
    const valid = results.filter(r => !r.error)
    if (valid.length === 1) { downloadOne(valid[0]); return }
    const zip = new JSZip()
    for (const r of valid) zip.file(r.name, r.blob)
    saveAs(await zip.generateAsync({ type: 'blob' }), 'compressed-files.zip')
  }

  const totals = results.reduce(
    (a, r) => r.error ? a : { orig: a.orig + r.originalSize, comp: a.comp + r.compressedSize },
    { orig: 0, comp: 0 }
  )
  const hasPDF    = files.some(isPDF)
  const hasImages = files.some(f => IMAGE_TYPES.has(f.type) || isZip(f))

  /* ──────────────── EXTRACT MODE ──────────────── */
  const handleZipUpload = useCallback(async (file) => {
    if (!file || !isZip(file)) return
    setZipFile(file)
    setZipContents([])
    setExtracting(true)
    try {
      const zip = await JSZip.loadAsync(file)
      const entries = []
      for (const [name, entry] of Object.entries(zip.files)) {
        if (!entry.dir) {
          const blob = await entry.async('blob')
          entries.push({ name, blob, size: blob.size })
        }
      }
      setZipContents(entries)
    } catch {
      alert('Could not read this ZIP file.')
    }
    setExtracting(false)
  }, [])

  const downloadExtracted = (entry) => saveAs(entry.blob, entry.name.split('/').pop())

  const downloadAllExtracted = async () => {
    if (zipContents.length === 1) { downloadExtracted(zipContents[0]); return }
    const zip = new JSZip()
    for (const e of zipContents) zip.file(e.name, e.blob)
    saveAs(await zip.generateAsync({ type: 'blob' }), 'extracted-files.zip')
  }

  /* ──────────────── RENDER ──────────────── */
  return (
    <div className="tool-page">

      {/* ── Mode tabs ── */}
      <div className="compress-mode-tabs">
        <button className={`compress-mode-tab${mode === 'compress' ? ' active' : ''}`} onClick={() => setMode('compress')}>
          ⚡ Compress Files
        </button>
        <button className={`compress-mode-tab${mode === 'extract' ? ' active' : ''}`} onClick={() => setMode('extract')}>
          📦 Extract ZIP
        </button>
      </div>

      {/* ══════════ COMPRESS MODE ══════════ */}
      {mode === 'compress' && (
        <div className="tool-two-col">
          <div className="tool-left">
            <div className="tool-card">
              <div className="tool-card-header">
                <div className="tool-icon-wrap" style={{ background: 'linear-gradient(135deg,#fef3c7,#fde68a)' }}>⚡</div>
                <div>
                  <h2>Compress Files</h2>
                  <p>Images · PDFs · ZIP (recompresses images inside) · Any file</p>
                </div>
              </div>

              <div
                className={`drop-zone${dragging ? ' drag-over' : ''}${files.length ? ' has-file' : ''}`}
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
                onClick={() => fileRef.current?.click()}
              >
                <input ref={fileRef} type="file" multiple style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
                {files.length ? (
                  <div className="compress-file-list" onClick={e => e.stopPropagation()}>
                    {files.map((f, i) => (
                      <div key={i} className="compress-file-item">
                        <span>{IMAGE_TYPES.has(f.type) ? '🖼️' : isPDF(f) ? '📄' : isZip(f) ? '🗜️' : '📁'}</span>
                        <span className="compress-file-name">{f.name}</span>
                        <span className="compress-file-size">{formatBytes(f.size)}</span>
                      </div>
                    ))}
                    <p className="drop-hint" style={{ marginTop: 8, textAlign: 'center' }}>Click to change files</p>
                  </div>
                ) : (
                  <>
                    <div className="drop-icon">📁</div>
                    <p><strong>Drop files here</strong> or click to upload</p>
                    <p className="drop-hint">Images · PDFs · ZIP files · Any file · Multiple at once</p>
                  </>
                )}
              </div>

              {/* Options */}
              {(hasImages || hasPDF) && (
                <div className="compress-options-panel">
                  {hasImages && (
                    <>
                      <div className="compress-options-row">
                        <label className="compress-option-label">Target image size</label>
                        <div className="compress-size-row">
                          <select
                            value={useCustom ? 'custom' : String(maxSizeMB)}
                            onChange={e => {
                              if (e.target.value === 'custom') setUseCustom(true)
                              else { setUseCustom(false); setMaxSizeMB(+e.target.value) }
                            }}
                          >
                            {SIZE_PRESETS.map(p => (
                              <option key={p.value} value={p.value}>{p.label}</option>
                            ))}
                            <option value="custom">Custom…</option>
                          </select>
                          {useCustom && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <input
                                type="number" min={5} max={10000} placeholder="e.g. 20"
                                value={customKB} onChange={e => setCustomKB(e.target.value)}
                                className="compress-custom-kb"
                              />
                              <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>KB</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="compress-options-row">
                        <label className="compress-option-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                          Quality <span style={{ color: 'var(--p1)', fontWeight: 700 }}>{Math.round(quality * 100)}%</span>
                        </label>
                        <input type="range" min={0.05} max={1} step={0.05} value={quality} onChange={e => setQuality(+e.target.value)}
                          style={{ width: '100%', height: 5, accentColor: 'var(--p1)', cursor: 'pointer' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>Smallest file</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>Best quality</span>
                        </div>
                      </div>
                    </>
                  )}

                  {hasPDF && (
                    <div className="compress-options-row">
                      <label className="compress-option-label">PDF resolution</label>
                      <select value={pdfScale} onChange={e => setPdfScale(+e.target.value)} className="compress-size-row-select">
                        <option value={2}>High — 200 DPI (larger file)</option>
                        <option value={1.5}>Standard — 150 DPI (recommended)</option>
                        <option value={1}>Low — 72 DPI (smallest file)</option>
                      </select>
                      <p className="hint">PDF pages are rasterized — text may not be selectable after compression</p>
                    </div>
                  )}
                </div>
              )}

              <button className="btn btn-primary" onClick={handleCompress} disabled={!files.length || processing} style={{ width: '100%', marginTop: 16 }}>
                {processing ? (progressLabel || 'Compressing…') : `⚡ Compress ${files.length > 1 ? `${files.length} Files` : 'File'}`}
              </button>
            </div>
          </div>

          <div className="tool-right">
            {results.length ? (
              <div className="tool-card">
                {totals.orig > 0 && (
                  <div className="compress-summary">
                    <div className="compress-stat"><span>{formatBytes(totals.orig)}</span><label>Original</label></div>
                    <div className="compress-arrow">→</div>
                    <div className="compress-stat highlight"><span>{formatBytes(totals.comp)}</span><label>Compressed</label></div>
                    <div className="compress-stat savings"><span>-{Math.round((1 - totals.comp / totals.orig) * 100)}%</span><label>Saved</label></div>
                  </div>
                )}

                <div className="compress-results">
                  {results.map((r, i) => (
                    <div key={i} className={`compress-result-item${r.error ? ' error' : ''}`}>
                      <div className="compress-result-info">
                        <span className="compress-result-name">{r.name}</span>
                        {!r.error ? (
                          <>
                            <span className="compress-result-size">
                              {formatBytes(r.originalSize)} → {formatBytes(r.compressedSize)}{' '}
                              <strong style={{ color: '#16a34a' }}>-{Math.round((1 - r.compressedSize / r.originalSize) * 100)}%</strong>
                            </span>
                            {r.note && <span style={{ fontSize: '0.7rem', color: 'var(--muted)', display: 'block', marginTop: 2 }}>{r.note}</span>}
                          </>
                        ) : (
                          <span style={{ color: '#dc2626', fontSize: '0.75rem' }}>Compression failed</span>
                        )}
                      </div>
                      {!r.error && (
                        <button className="btn btn-ghost" onClick={() => downloadOne(r)} style={{ padding: '6px 12px', fontSize: '0.8rem', flexShrink: 0 }}>⬇</button>
                      )}
                    </div>
                  ))}
                </div>

                <button className="btn btn-primary" onClick={downloadAll} style={{ width: '100%', marginTop: 12 }}>
                  ⬇ Download {results.length > 1 ? 'All as ZIP' : 'Compressed File'}
                </button>
                <button className="btn btn-ghost" onClick={() => { setFiles([]); setResults([]) }} style={{ width: '100%', marginTop: 8 }}>
                  Compress more files
                </button>
              </div>
            ) : (
              <div className="tool-card empty-card">
                <div className="empty-icon">⚡</div>
                <p>
                  <span style={{ fontSize: '0.82rem', lineHeight: 2 }}>
                    🖼️ <strong>Image</strong> → compressed image (direct download)<br />
                    📄 <strong>PDF</strong> → smaller PDF (direct download)<br />
                    🗜️ <strong>ZIP</strong> → images inside compressed<br />
                    📁 <strong>Any file</strong> → packaged as ZIP
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════ EXTRACT MODE ══════════ */}
      {mode === 'extract' && (
        <div className="tool-two-col">
          <div className="tool-left">
            <div className="tool-card">
              <div className="tool-card-header">
                <div className="tool-icon-wrap" style={{ background: 'linear-gradient(135deg,#ecfdf5,#a7f3d0)' }}>📦</div>
                <div>
                  <h2>Extract ZIP</h2>
                  <p>Open any ZIP file and download the files inside individually</p>
                </div>
              </div>

              <div
                className={`drop-zone${extractDragging ? ' drag-over' : ''}${zipFile ? ' has-file' : ''}`}
                onDragOver={e => { e.preventDefault(); setExtractDragging(true) }}
                onDragLeave={() => setExtractDragging(false)}
                onDrop={e => { e.preventDefault(); setExtractDragging(false); handleZipUpload(e.dataTransfer.files[0]) }}
                onClick={() => zipFileRef.current?.click()}
              >
                <input ref={zipFileRef} type="file" accept=".zip,application/zip" style={{ display: 'none' }} onChange={e => handleZipUpload(e.target.files[0])} />
                {zipFile ? (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🗜️</div>
                    <p><strong>{zipFile.name}</strong></p>
                    <p className="drop-hint">{formatBytes(zipFile.size)} · Click to change</p>
                  </div>
                ) : (
                  <>
                    <div className="drop-icon">🗜️</div>
                    <p><strong>Drop a ZIP file here</strong> or click to upload</p>
                    <p className="drop-hint">All files inside will be listed for download</p>
                  </>
                )}
              </div>

              {extracting && <p className="hint" style={{ marginTop: 10, textAlign: 'center' }}>Reading ZIP contents…</p>}
            </div>
          </div>

          <div className="tool-right">
            {zipContents.length > 0 ? (
              <div className="tool-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <h3 className="tool-section-title" style={{ margin: 0 }}>
                    {zipContents.length} file{zipContents.length > 1 ? 's' : ''} inside
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                    Total: {formatBytes(zipContents.reduce((a, e) => a + e.size, 0))}
                  </span>
                </div>

                <div className="compress-results" style={{ maxHeight: 360, overflowY: 'auto' }}>
                  {zipContents.map((e, i) => (
                    <div key={i} className="compress-result-item">
                      <div className="compress-result-info">
                        <span className="compress-result-name">{e.name.split('/').pop()}</span>
                        <span className="compress-result-size">{formatBytes(e.size)}</span>
                      </div>
                      <button className="btn btn-ghost" onClick={() => downloadExtracted(e)} style={{ padding: '6px 12px', fontSize: '0.8rem', flexShrink: 0 }}>⬇</button>
                    </div>
                  ))}
                </div>

                <button className="btn btn-primary" onClick={downloadAllExtracted} style={{ width: '100%', marginTop: 12 }}>
                  ⬇ Download All {zipContents.length > 1 ? `(${zipContents.length} files as ZIP)` : ''}
                </button>
                <button className="btn btn-ghost" onClick={() => { setZipFile(null); setZipContents([]) }} style={{ width: '100%', marginTop: 8 }}>
                  Open another ZIP
                </button>
              </div>
            ) : (
              <div className="tool-card empty-card">
                <div className="empty-icon">📦</div>
                <p>Upload a ZIP file to see<br />all its contents here<br />and download them individually</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
