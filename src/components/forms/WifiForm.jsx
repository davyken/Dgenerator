export default function WifiForm({ data, onChange }) {
  return (
    <div className="form-group">
      <div className="field">
        <label>Network Name (SSID) <span style={{fontWeight:400,textTransform:'none',fontSize:'0.72rem'}}>(optional)</span></label>
        <input
          type="text"
          placeholder="MyWiFiNetwork"
          value={data.ssid || ''}
          onChange={e => onChange({ ...data, ssid: e.target.value })}
        />
      </div>
      <div className="field">
        <label>Password</label>
        <input
          type="text"
          placeholder="mypassword123"
          value={data.password || ''}
          onChange={e => onChange({ ...data, password: e.target.value })}
        />
      </div>
      <div className="field">
        <label>Security</label>
        <select
          value={data.security || 'WPA'}
          onChange={e => onChange({ ...data, security: e.target.value })}
        >
          <option value="WPA">WPA / WPA2</option>
          <option value="WEP">WEP</option>
          <option value="nopass">None (Open network)</option>
        </select>
      </div>
    </div>
  )
}
