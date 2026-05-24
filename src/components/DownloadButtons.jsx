import QRCode from 'qrcode'
import { saveAs } from 'file-saver'

export default function DownloadButtons({ value, fgColor, bgColor, size, errorLevel }) {
  if (!value) return null

  const opts = {
    width: size,
    color: { dark: fgColor, light: bgColor },
    errorCorrectionLevel: errorLevel,
    margin: 2,
  }

  const downloadPNG = () => {
    QRCode.toDataURL(value, opts, (err, url) => {
      if (!err) saveAs(url, 'qrcode.png')
    })
  }

  const downloadSVG = () => {
    QRCode.toString(value, { ...opts, type: 'svg' }, (err, svg) => {
      if (!err) saveAs(new Blob([svg], { type: 'image/svg+xml' }), 'qrcode.svg')
    })
  }

  const copyToClipboard = async () => {
    try {
      const url = await QRCode.toDataURL(value, opts)
      const blob = await (await fetch(url)).blob()
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      alert('Copied to clipboard!')
    } catch {
      alert('Copy not supported in this browser')
    }
  }

  return (
    <div className="download-card">
      <h3>Download</h3>
      <div className="download-bar">
        <button className="btn btn-primary" onClick={downloadPNG}>⬇ PNG</button>
        <button className="btn btn-secondary" onClick={downloadSVG}>⬇ SVG</button>
        <button className="btn btn-ghost" onClick={copyToClipboard}>📋 Copy</button>
      </div>
    </div>
  )
}
