export default function PhoneForm({ data, onChange }) {
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
    </div>
  )
}
