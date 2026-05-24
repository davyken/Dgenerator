export default function EmailForm({ data, onChange }) {
  return (
    <div className="form-group">
      <div className="field">
        <label>Email Address</label>
        <input
          type="email"
          placeholder="recipient@example.com"
          value={data.email || ''}
          onChange={e => onChange({ ...data, email: e.target.value })}
        />
      </div>
      <div className="field">
        <label>Subject <span style={{fontWeight:400,textTransform:'none',fontSize:'0.72rem'}}>(optional)</span></label>
        <input
          type="text"
          placeholder="Hello!"
          value={data.subject || ''}
          onChange={e => onChange({ ...data, subject: e.target.value })}
        />
      </div>
      <div className="field">
        <label>Body <span style={{fontWeight:400,textTransform:'none',fontSize:'0.72rem'}}>(optional)</span></label>
        <textarea
          placeholder="Your message..."
          value={data.body || ''}
          onChange={e => onChange({ ...data, body: e.target.value })}
          rows={4}
        />
      </div>
    </div>
  )
}
