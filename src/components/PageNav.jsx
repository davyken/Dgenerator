const PAGES = [
  { id: 'qr',        icon: '◼',  label: 'QR Generator'  },
  { id: 'barcode',   icon: '📊', label: 'Barcode'        },
  { id: 'bg',        icon: '✂️',  label: 'BG Remover'    },
  { id: 'compress',  icon: '⚡',  label: 'Compressor'    },
  { id: 'pdf',       icon: '📄', label: 'PDF Converter'  },
]

export default function PageNav({ active, onChange }) {
  return (
    <nav className="page-nav">
      {PAGES.map(p => (
        <button
          key={p.id}
          className={`page-nav-btn${active === p.id ? ' active' : ''}`}
          onClick={() => onChange(p.id)}
        >
          <span className="page-nav-icon">{p.icon}</span>
          <span>{p.label}</span>
        </button>
      ))}
    </nav>
  )
}
