export default function ZoomForm({ data, onChange }) {
  return (
    <div className="form-group">
      <div className="field">
        <label>Meeting Link</label>
        <input
          type="url"
          placeholder="https://zoom.us/j/... or https://meet.google.com/..."
          value={data.url || ''}
          onChange={e => onChange({ ...data, url: e.target.value })}
        />
      </div>
    </div>
  )
}
