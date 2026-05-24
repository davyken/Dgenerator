import { useState, useEffect, useMemo } from 'react'
import TypeSelector, { QR_TYPES } from '../components/TypeSelector'
import QRPreview from '../components/QRPreview'
import CustomizePanel from '../components/CustomizePanel'
import DownloadButtons from '../components/DownloadButtons'
import HistoryPanel from '../components/HistoryPanel'
import { buildQRString } from '../utils/encoders'

import UrlForm from '../components/forms/UrlForm'
import SocialForm from '../components/forms/SocialForm'
import WhatsAppForm from '../components/forms/WhatsAppForm'
import WifiForm from '../components/forms/WifiForm'
import TextForm from '../components/forms/TextForm'
import EmailForm from '../components/forms/EmailForm'
import PhoneForm from '../components/forms/PhoneForm'
import SmsForm from '../components/forms/SmsForm'
import VCardForm from '../components/forms/VCardForm'
import LocationForm from '../components/forms/LocationForm'
import FileForm from '../components/forms/FileForm'
import AppStoreForm from '../components/forms/AppStoreForm'
import ZoomForm from '../components/forms/ZoomForm'
import BitcoinForm from '../components/forms/BitcoinForm'

const FORM_MAP = {
  url: UrlForm, social: SocialForm, whatsapp: WhatsAppForm,
  wifi: WifiForm, text: TextForm, email: EmailForm,
  phone: PhoneForm, sms: SmsForm, vcard: VCardForm,
  location: LocationForm, file: FileForm,
  appstore: AppStoreForm, zoom: ZoomForm, bitcoin: BitcoinForm,
}

const HISTORY_KEY = 'qr_history'
const MAX_HISTORY = 10

const defaultSettings = {
  size: 256, fgColor: '#000000', bgColor: '#ffffff', errorLevel: 'M', logo: null, logoName: '',
}

export default function QRPage() {
  const [type, setType] = useState('url')
  const [formData, setFormData] = useState({})
  const [settings, setSettings] = useState(defaultSettings)
  const [qrTitle, setQrTitle] = useState('')
  const [qrDesc, setQrDesc] = useState('')
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [] } catch { return [] }
  })

  const qrValue = useMemo(() => buildQRString(type, formData), [type, formData])
  const typeInfo = QR_TYPES.find(t => t.id === type)

  useEffect(() => {
    if (!qrValue) return
    const entry = { type, formData, qrValue, ts: Date.now() }
    setHistory(prev => {
      const next = [entry, ...prev.filter(h => h.qrValue !== qrValue)].slice(0, MAX_HISTORY)
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
      return next
    })
  }, [qrValue])

  const handleTypeChange = (newType) => { setType(newType); setFormData({}); setQrTitle(''); setQrDesc('') }
  const handleLoadHistory = (item) => { setType(item.type); setFormData(item.formData) }
  const handleClearHistory = () => { setHistory([]); localStorage.removeItem(HISTORY_KEY) }
  const handleLocationDetected = ({ name, time }) => {
    setQrTitle(name)
    setQrDesc(time)
  }

  const FormComponent = FORM_MAP[type]

  return (
    <main className="app-main">
      <section className="left-panel">
        <TypeSelector selected={type} onSelect={handleTypeChange} />

        <div className="form-card">
          <div className="form-card-header">
            <div className="icon">{typeInfo?.icon}</div>
            <div>
              <h2>{typeInfo?.label}</h2>
              <p>{typeInfo?.desc}</p>
            </div>
          </div>
          <FormComponent
            data={formData}
            onChange={setFormData}
            onLocationDetected={type === 'location' ? handleLocationDetected : undefined}
          />

          <div className="qr-label-section">
            <div className="field">
              <label htmlFor="qr-title">Title</label>
              <input
                id="qr-title"
                type="text"
                placeholder="e.g. My Portfolio"
                value={qrTitle}
                onChange={e => setQrTitle(e.target.value)}
                maxLength={60}
              />
            </div>
            <div className="field">
              <label htmlFor="qr-desc">Description <span className="label-optional">(optional)</span></label>
              <input
                id="qr-desc"
                type="text"
                placeholder="e.g. Scan to visit my website"
                value={qrDesc}
                onChange={e => setQrDesc(e.target.value)}
                maxLength={100}
              />
            </div>
          </div>
        </div>

        <CustomizePanel settings={settings} onChange={setSettings} />
      </section>

      <section className="right-panel">
        <QRPreview
          value={qrValue}
          fgColor={settings.fgColor}
          bgColor={settings.bgColor}
          size={settings.size}
          errorLevel={settings.errorLevel}
          logo={settings.logo}
          type={type}
          title={qrTitle}
          description={qrDesc}
        />
        <DownloadButtons
          value={qrValue}
          fgColor={settings.fgColor}
          bgColor={settings.bgColor}
          size={settings.size}
          errorLevel={settings.errorLevel}
        />
        <HistoryPanel
          history={history}
          onLoad={handleLoadHistory}
          onClear={handleClearHistory}
        />
      </section>
    </main>
  )
}
