export default function TextForm({ data, onChange }) {
  return (
    <div className="form-group">
      <div className="field">
        <label>Plain Text</label>
        <textarea
          placeholder="Enter any text here..."
          value={data.text || ''}
          onChange={e => onChange({ ...data, text: e.target.value })}
          rows={5}
        />
      </div>
    </div>
  )
}
