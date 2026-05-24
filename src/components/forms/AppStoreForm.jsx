export default function AppStoreForm({ data, onChange }) {
  return (
    <div className="form-group">
      <div className="field">
        <label>Store</label>
        <select
          value={data.store || 'playstore'}
          onChange={e => onChange({ ...data, store: e.target.value })}
        >
          <option value="playstore">Google Play Store</option>
          <option value="appstore">Apple App Store</option>
        </select>
      </div>
      <div className="field">
        <label>App Store URL</label>
        <input
          type="url"
          placeholder="https://play.google.com/store/apps/details?id=..."
          value={data.url || ''}
          onChange={e => onChange({ ...data, url: e.target.value })}
        />
      </div>
    </div>
  )
}
