export default function UrlForm({ data, onChange }) {
  return (
    <div className="form-group">
      <div className="field">
        <label>Website URL</label>
        <input
          type="url"
          placeholder="https://example.com"
          value={data.url || ''}
          onChange={e => onChange({ ...data, url: e.target.value })}
        />
      </div>
    </div>
  )
}
