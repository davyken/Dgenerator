export default function WhatsAppForm({ data, onChange }) {
  return (
    <div className="form-group">
      <div className="field">
        <label>Phone Number (with country code)</label>
        <input
          type="tel"
          placeholder="+237600000000"
          value={data.phone || ''}
          onChange={e => onChange({ ...data, phone: e.target.value })}
        />
      </div>
      <div className="field">
        <label>Pre-filled Message <span style={{fontWeight:400,textTransform:'none',fontSize:'0.72rem'}}>(optional)</span></label>
        <textarea
          placeholder="Hello! I found you via QR code..."
          value={data.message || ''}
          onChange={e => onChange({ ...data, message: e.target.value })}
          rows={3}
        />
      </div>
    </div>
  )
}
