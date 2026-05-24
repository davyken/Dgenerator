export default function VCardForm({ data, onChange }) {
  const set = key => e => onChange({ ...data, [key]: e.target.value })
  return (
    <div className="form-group">
      <div className="field">
        <label>Full Name *</label>
        <input type="text" placeholder="John Doe" value={data.name || ''} onChange={set('name')} />
      </div>
      <div className="field">
        <label>Phone</label>
        <input type="tel" placeholder="+237600000000" value={data.phone || ''} onChange={set('phone')} />
      </div>
      <div className="field">
        <label>Email</label>
        <input type="email" placeholder="john@example.com" value={data.email || ''} onChange={set('email')} />
      </div>
      <div className="field">
        <label>Organization</label>
        <input type="text" placeholder="Acme Corp" value={data.org || ''} onChange={set('org')} />
      </div>
      <div className="field">
        <label>Job Title</label>
        <input type="text" placeholder="CEO" value={data.title || ''} onChange={set('title')} />
      </div>
      <div className="field">
        <label>Website</label>
        <input type="url" placeholder="https://johndoe.com" value={data.website || ''} onChange={set('website')} />
      </div>
      <div className="field">
        <label>Address</label>
        <input type="text" placeholder="123 Main St, City, Country" value={data.address || ''} onChange={set('address')} />
      </div>
    </div>
  )
}
