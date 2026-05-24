export default function SmsForm({ data, onChange }) {
  return (
    <div className="form-group">
      <div className="field">
        <label>Phone Number</label>
        <input
          type="tel"
          placeholder="+237600000000"
          value={data.phone || ''}
          onChange={e => onChange({ ...data, phone: e.target.value })}
        />
      </div>
      <div className="field">
        <label>Message</label>
        <textarea
          placeholder="Your SMS message..."
          value={data.message || ''}
          onChange={e => onChange({ ...data, message: e.target.value })}
          rows={4}
        />
      </div>
    </div>
  )
}
