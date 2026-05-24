const PLATFORMS = [
  { value: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/yourhandle' },
  { value: 'tiktok',    label: 'TikTok',    placeholder: 'https://tiktok.com/@yourhandle' },
  { value: 'twitter',   label: 'X / Twitter', placeholder: 'https://x.com/yourhandle' },
  { value: 'linkedin',  label: 'LinkedIn',  placeholder: 'https://linkedin.com/in/yourhandle' },
  { value: 'facebook',  label: 'Facebook',  placeholder: 'https://facebook.com/yourpage' },
  { value: 'youtube',   label: 'YouTube',   placeholder: 'https://youtube.com/@yourchannel' },
]

export default function SocialForm({ data, onChange }) {
  const platform = PLATFORMS.find(p => p.value === data.platform) || PLATFORMS[0]
  return (
    <div className="form-group">
      <div className="field">
        <label>Platform</label>
        <select
          value={data.platform || 'instagram'}
          onChange={e => onChange({ ...data, platform: e.target.value })}
        >
          {PLATFORMS.map(p => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>Profile URL</label>
        <input
          type="url"
          placeholder={platform.placeholder}
          value={data.profileUrl || ''}
          onChange={e => onChange({ ...data, profileUrl: e.target.value })}
        />
      </div>
    </div>
  )
}
