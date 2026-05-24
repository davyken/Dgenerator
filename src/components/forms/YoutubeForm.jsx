export default function YoutubeForm({ data, onChange }) {
  return (
    <div className="form-group">
      <div className="field">
        <label>YouTube Video or Channel URL</label>
        <input
          type="url"
          placeholder="https://youtube.com/watch?v=..."
          value={data.url || ''}
          onChange={e => onChange({ ...data, url: e.target.value })}
        />
      </div>
    </div>
  )
}
