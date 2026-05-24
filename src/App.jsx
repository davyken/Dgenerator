import { useState } from 'react'
import PageNav from './components/PageNav'
import QRPage from './pages/QRPage'
import BarcodePage from './pages/BarcodePage'
import BgRemoverPage from './pages/BgRemoverPage'
import CompressorPage from './pages/CompressorPage'
import PDFConverterPage from './pages/PDFConverterPage'

export default function App() {
  const [page, setPage] = useState('qr')

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-badge">✦ Free &amp; No signup required</div>
        <img src="/logo.svg" alt="DGenerator" className="header-logo" />
        <p>QR codes · Barcodes · Background removal · Image compression · PDF conversion</p>
      </header>

      <PageNav active={page} onChange={setPage} />

      {page === 'qr'       && <QRPage />}
      {page === 'barcode'  && <BarcodePage />}
      {page === 'bg'       && <BgRemoverPage />}
      {page === 'compress' && <CompressorPage />}
      {page === 'pdf'      && <PDFConverterPage />}
    </div>
  )
}
