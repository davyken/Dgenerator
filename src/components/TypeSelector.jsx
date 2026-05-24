export const QR_TYPES = [
  { id: 'url',       label: 'Website URL',    icon: '🌐', desc: 'Any link' },
  { id: 'social',    label: 'Social Media',   icon: '📱', desc: 'Profiles' },
  { id: 'whatsapp',  label: 'WhatsApp',       icon: '💬', desc: 'Chat link' },
  { id: 'wifi',      label: 'WiFi',           icon: '📶', desc: 'Auto-connect' },
  { id: 'text',      label: 'Plain Text',     icon: '📝', desc: 'Any text' },
  { id: 'email',     label: 'Email',          icon: '✉️',  desc: 'Mail app' },
  { id: 'phone',     label: 'Phone',          icon: '📞', desc: 'Call link' },
  { id: 'sms',       label: 'SMS',            icon: '💭', desc: 'Text msg' },
  { id: 'vcard',     label: 'Contact Card',   icon: '👤', desc: 'Save contact' },
  { id: 'location',  label: 'Location',       icon: '📍', desc: 'GPS maps' },
  { id: 'file',      label: 'File / PDF',     icon: '📄', desc: 'Upload file' },
  { id: 'appstore',  label: 'App Store',      icon: '📲', desc: 'App link' },
  { id: 'zoom',      label: 'Zoom / Meet',    icon: '🎥', desc: 'Meeting' },
  { id: 'bitcoin',   label: 'Crypto',         icon: '₿',  desc: 'Payment' },
]

export default function TypeSelector({ selected, onSelect }) {
  return (
    <div className="type-scroll-wrap">
      <div className="type-grid">
        {QR_TYPES.map(t => (
          <button
            key={t.id}
            className={`type-btn${selected === t.id ? ' active' : ''}`}
            onClick={() => onSelect(t.id)}
            title={t.desc}
          >
            <span className="type-icon">{t.icon}</span>
            <span className="type-label">{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
