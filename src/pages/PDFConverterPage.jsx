import { useState, useRef, useCallback } from 'react'
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs'
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { Document, Paragraph, TextRun, Packer } from 'docx'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { formatBytes } from '../utils/format'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl

const FORMATS = [
  { id: 'txt',      icon: '📝', label: 'Plain Text',     ext: '.txt',  desc: 'Extract all readable text', free: true },
  { id: 'docx',     icon: '📘', label: 'Word (.docx)',   ext: '.docx', desc: 'Editable Word document', free: true },
  { id: 'html',     icon: '🌐', label: 'HTML Webpage',   ext: '.html', desc: 'Styled HTML file', free: true },
  { id: 'md',       icon: '📋', label: 'Markdown (.md)', ext: '.md',   desc: 'Formatted markdown text', free: true },
  { id: 'png',      icon: '🖼️', label: 'Images PNG',     ext: '.zip',  desc: 'Each page as PNG (ZIP)', free: true },
  { id: 'jpg',      icon: '🖼️', label: 'Images JPG',     ext: '.zip',  desc: 'Each page as JPG (ZIP)', free: true },
  { id: 'xlsx',     icon: '📊', label: 'Excel (.xlsx)',  ext: '.xlsx', desc: 'Spreadsheet (needs Adobe key)', free: false },
  { id: 'pptx',     icon: '📑', label: 'PowerPoint',    ext: '.pptx', desc: 'Presentation (needs Adobe key)', free: false },
]

/* ── Text extraction helpers ── */
async function getPageLines(page) {
  const content = await page.getTextContent()
  const lineMap = new Map()
  for (const item of content.items) {
    if (!item.str.trim()) continue
    const y = Math.round(item.transform[5] / 4) * 4
    lineMap.set(y, (lineMap.get(y) || '') + item.str + ' ')
  }
  return [...lineMap.entries()]
    .sort(([a], [b]) => b - a)
    .map(([, t]) => t.trim())
    .filter(Boolean)
}

async function pdfToText(pdf) {
  const parts = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const lines = await getPageLines(await pdf.getPage(i))
    if (i > 1) parts.push('\n\n─────────────────────\n\n')
    parts.push(lines.join('\n'))
  }
  return parts.join('')
}

async function pdfToDocx(pdf) {
  const paragraphs = []
  for (let i = 1; i <= pdf.numPages; i++) {
    if (i > 1) {
      paragraphs.push(new Paragraph({ text: '' }))
      paragraphs.push(new Paragraph({ children: [new TextRun({ text: `— Page ${i} —`, bold: true, color: '7c3aed' })] }))
      paragraphs.push(new Paragraph({ text: '' }))
    }
    const lines = await getPageLines(await pdf.getPage(i))
    for (const line of lines) paragraphs.push(new Paragraph({ children: [new TextRun(line)] }))
  }
  const doc = new Document({ sections: [{ children: paragraphs }] })
  return Packer.toBlob(doc)
}

async function pdfToHTML(pdf, filename) {
  const pageBlocks = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const lines = await getPageLines(await pdf.getPage(i))
    const paras = lines.map(l => `  <p>${l.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`).join('\n')
    pageBlocks.push(`<section class="page">\n  <div class="page-num">Page ${i}</div>\n${paras}\n</section>`)
  }
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${filename}</title>
  <style>
    body { font-family: Georgia, serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1e293b; line-height: 1.7; }
    h1 { font-size: 1.4rem; color: #7c3aed; border-bottom: 2px solid #ede9fe; padding-bottom: 10px; }
    .page { margin-bottom: 40px; padding-bottom: 20px; border-bottom: 1px dashed #e2e8f0; }
    .page-num { font-size: 0.75rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #94a3b8; margin-bottom: 12px; }
    p { margin: 0 0 8px; }
  </style>
</head>
<body>
  <h1>${filename}</h1>
${pageBlocks.join('\n')}
</body>
</html>`
}

async function pdfToMarkdown(pdf, filename) {
  const parts = [`# ${filename}\n`]
  for (let i = 1; i <= pdf.numPages; i++) {
    if (i > 1) parts.push(`\n---\n\n## Page ${i}\n`)
    const lines = await getPageLines(await pdf.getPage(i))
    parts.push(lines.join('\n\n'))
  }
  return parts.join('\n')
}

async function pdfToImages(pdf, fmt, onProgress) {
  const zip = new JSZip()
  for (let i = 1; i <= pdf.numPages; i++) {
    onProgress(i, pdf.numPages)
    const page = await pdf.getPage(i)
    const vp = page.getViewport({ scale: 2 })
    const canvas = document.createElement('canvas')
    canvas.width = vp.width; canvas.height = vp.height
    await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise
    const mimeType = fmt === 'jpg' ? 'image/jpeg' : 'image/png'
    const blob = await new Promise(res => canvas.toBlob(res, mimeType, 0.92))
    zip.file(`page-${String(i).padStart(3, '0')}.${fmt}`, await blob.arrayBuffer())
  }
  return zip.generateAsync({ type: 'blob' })
}

/* ── Adobe PDF Services (needs VITE_ADOBE_CLIENT_ID + VITE_ADOBE_CLIENT_SECRET) ── */
const ADOBE_ID     = import.meta.env.VITE_ADOBE_CLIENT_ID
const ADOBE_SECRET = import.meta.env.VITE_ADOBE_CLIENT_SECRET
const adobeReady   = !!(ADOBE_ID && ADOBE_SECRET)

async function convertWithAdobe(file, targetFormat, onStatus) {
  onStatus('Getting access token…')
  const tokenRes = await fetch('/adobe-api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `client_id=${ADOBE_ID}&client_secret=${ADOBE_SECRET}&grant_type=client_credentials`,
  })
  if (!tokenRes.ok) throw new Error('Adobe auth failed — check your API credentials')
  const { access_token } = await tokenRes.json()

  onStatus('Uploading PDF to Adobe…')
  const assetRes = await fetch('/adobe-api/assets', {
    method: 'POST',
    headers: { Authorization: `Bearer ${access_token}`, 'x-api-key': ADOBE_ID, 'Content-Type': 'application/json' },
    body: JSON.stringify({ mediaType: 'application/pdf' }),
  })
  if (!assetRes.ok) throw new Error('Adobe asset creation failed')
  const { assetID, uploadUri } = await assetRes.json()

  await fetch(uploadUri, { method: 'PUT', headers: { 'Content-Type': 'application/pdf' }, body: file })

  onStatus('Converting…')
  const jobRes = await fetch('/adobe-api/operation/exportpdf', {
    method: 'POST',
    headers: { Authorization: `Bearer ${access_token}`, 'x-api-key': ADOBE_ID, 'Content-Type': 'application/json' },
    body: JSON.stringify({ assetID, targetFormat }),
  })
  if (!jobRes.ok) throw new Error('Adobe conversion job failed')
  const jobLocation = jobRes.headers.get('Location')

  onStatus('Waiting for conversion…')
  for (let attempt = 0; attempt < 30; attempt++) {
    await new Promise(r => setTimeout(r, 2000))
    const pollRes = await fetch(jobLocation, {
      headers: { Authorization: `Bearer ${access_token}`, 'x-api-key': ADOBE_ID },
    })
    const pollData = await pollRes.json()
    if (pollData.status === 'done') {
      const dlRes = await fetch(pollData.asset.downloadUri)
      return await dlRes.blob()
    }
    if (pollData.status === 'failed') throw new Error('Adobe conversion failed')
  }
  throw new Error('Adobe conversion timed out')
}

export default function PDFConverterPage() {
  const [file, setFile]         = useState(null)
  const [format, setFormat]     = useState('txt')
  const [converting, setConverting] = useState(false)
  const [progress, setProgress] = useState(null)
  const [error, setError]       = useState(null)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef()

  const handleFile = useCallback((f) => {
    if (!f || f.type !== 'application/pdf') { setError('Please upload a PDF file.'); return }
    setFile(f); setError(null)
  }, [])

  const handleConvert = async () => {
    if (!file) return
    setConverting(true); setProgress(null); setError(null)
    const base = file.name.replace(/\.pdf$/i, '')

    try {
      const chosen = FORMATS.find(f => f.id === format)

      if (!chosen.free) {
        // Adobe API path
        if (!adobeReady) throw new Error('Add VITE_ADOBE_CLIENT_ID and VITE_ADOBE_CLIENT_SECRET to your .env file to use this format.')
        const blob = await convertWithAdobe(file, format, label => setProgress({ label, pct: 50 }))
        saveAs(blob, base + chosen.ext)
        return
      }

      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

      if (format === 'txt') {
        saveAs(new Blob([await pdfToText(pdf)], { type: 'text/plain;charset=utf-8' }), base + '.txt')
      } else if (format === 'docx') {
        setProgress({ label: 'Building Word document…', pct: 50 })
        saveAs(await pdfToDocx(pdf), base + '.docx')
      } else if (format === 'html') {
        setProgress({ label: 'Building HTML page…', pct: 50 })
        saveAs(new Blob([await pdfToHTML(pdf, base)], { type: 'text/html;charset=utf-8' }), base + '.html')
      } else if (format === 'md') {
        setProgress({ label: 'Building Markdown…', pct: 50 })
        saveAs(new Blob([await pdfToMarkdown(pdf, base)], { type: 'text/markdown;charset=utf-8' }), base + '.md')
      } else if (format === 'png' || format === 'jpg') {
        saveAs(
          await pdfToImages(pdf, format, (cur, tot) => setProgress({ label: `Rendering page ${cur}/${tot}…`, pct: Math.round(cur / tot * 100) })),
          `${base}-pages.zip`
        )
      }
    } catch (err) {
      console.error(err)
      setError(err.message || 'Conversion failed. Make sure the PDF is not password-protected.')
    } finally {
      setConverting(false); setProgress(null)
    }
  }

  const chosen = FORMATS.find(f => f.id === format)
  const needsAdobe = chosen && !chosen.free

  return (
    <div className="tool-page">
      <div className="tool-two-col">
        <div className="tool-left">
          <div className="tool-card">
            <div className="tool-card-header">
              <div className="tool-icon-wrap" style={{ background: 'linear-gradient(135deg,#fef2f2,#fecaca)' }}>📄</div>
              <div>
                <h2>PDF Converter</h2>
                <p>Convert PDFs to text, Word, HTML, Markdown, images, and more</p>
              </div>
            </div>

            <div
              className={`drop-zone${dragging ? ' drag-over' : ''}${file ? ' has-file' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }}
              onClick={() => fileRef.current?.click()}
            >
              <input ref={fileRef} type="file" accept=".pdf,application/pdf" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
              {file ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>📄</div>
                  <p><strong>{file.name}</strong></p>
                  <p className="drop-hint">{formatBytes(file.size)} · Click to change</p>
                </div>
              ) : (
                <>
                  <div className="drop-icon">📄</div>
                  <p><strong>Drop a PDF here</strong> or click to upload</p>
                  <p className="drop-hint">PDF files only · No password-protected PDFs</p>
                </>
              )}
            </div>
            {error && <p className="error" style={{ marginTop: 8 }}>{error}</p>}
          </div>

          <div className="tool-card" style={{ marginTop: 16 }}>
            <h3 className="tool-section-title">Convert to</h3>
            <div className="pdf-format-grid">
              {FORMATS.map(f => (
                <button
                  key={f.id}
                  className={`pdf-format-btn${format === f.id ? ' active' : ''}${!f.free ? ' needs-key' : ''}`}
                  onClick={() => setFormat(f.id)}
                >
                  <span className="pdf-format-icon">{f.icon}</span>
                  <span className="pdf-format-label">{f.label}</span>
                  <span className="pdf-format-desc">{f.desc}</span>
                </button>
              ))}
            </div>

            {needsAdobe && (
              <div className={`pdf-note${adobeReady ? ' success' : ''}`} style={{ marginTop: 12 }}>
                {adobeReady ? (
                  <>
                    <strong>✓ Adobe API key configured</strong>
                    <p>High-quality {format.toUpperCase()} conversion with formatting preserved.</p>
                  </>
                ) : (
                  <>
                    <strong>Adobe API key required for {format.toUpperCase()}</strong>
                    <p>
                      Add <code>VITE_ADOBE_CLIENT_ID</code> and <code>VITE_ADOBE_CLIENT_SECRET</code> to your <code>.env</code> file.{' '}
                      <a href="https://developer.adobe.com/document-services/apis/pdf-services/" target="_blank" rel="noopener noreferrer">
                        Get 500 free/month →
                      </a>
                    </p>
                  </>
                )}
              </div>
            )}

            <button
              className="btn btn-primary"
              onClick={handleConvert}
              disabled={!file || converting || (needsAdobe && !adobeReady)}
              style={{ width: '100%', marginTop: 14 }}
            >
              {converting ? (progress?.label || 'Converting…') : `Convert to ${chosen?.label}`}
            </button>

            {converting && progress && (
              <div className="progress-bar-wrap">
                <div className="progress-bar" style={{ width: `${Math.max(progress.pct, 4)}%` }} />
              </div>
            )}
          </div>
        </div>

        <div className="tool-right">
          <div className="tool-card">
            <h3 className="tool-section-title">About these formats</h3>
            <div className="pdf-format-info">
              {[
                { icon: '📝', name: 'Plain Text', desc: 'Fast extraction. Best for simple documents.' },
                { icon: '📘', name: 'Word DOCX',  desc: 'Editable document. Text is preserved; complex layout may differ.' },
                { icon: '🌐', name: 'HTML',       desc: 'Styled web page. Open in any browser, shareable.' },
                { icon: '📋', name: 'Markdown',   desc: 'Clean text format. Great for notes apps and GitHub.' },
                { icon: '🖼️', name: 'Images',     desc: 'Each page as a high-res image. Perfect layout preservation.' },
                { icon: '📊', name: 'Excel / PPT', desc: 'Perfect formatting preserved. Requires Adobe API key (free tier available).' },
              ].map(f => (
                <div className="pdf-info-item" key={f.name}>
                  <span>{f.icon}</span>
                  <div><strong>{f.name}</strong><p>{f.desc}</p></div>
                </div>
              ))}
            </div>
          </div>
          {file && (
            <div className="tool-card" style={{ marginTop: 16 }}>
              <h3 className="tool-section-title">File info</h3>
              <div className="pdf-info-item">
                <span>📄</span>
                <div><strong>{file.name}</strong><p>{formatBytes(file.size)}</p></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
