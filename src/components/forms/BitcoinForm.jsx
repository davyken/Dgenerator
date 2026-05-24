export default function BitcoinForm({ data, onChange }) {
  const set = key => e => onChange({ ...data, [key]: e.target.value })
  return (
    <div className="form-group">
      <div className="field">
        <label>Coin</label>
        <select value={data.coin || 'bitcoin'} onChange={set('coin')}>
          <option value="bitcoin">Bitcoin (BTC)</option>
          <option value="ethereum">Ethereum (ETH)</option>
          <option value="litecoin">Litecoin (LTC)</option>
        </select>
      </div>
      <div className="field">
        <label>Wallet Address *</label>
        <input type="text" placeholder="1A1zP1eP5QGefi2DMPTfTL5SLmv7..." value={data.address || ''} onChange={set('address')} />
      </div>
      <div className="field">
        <label>Amount <span style={{fontWeight:400,textTransform:'none',fontSize:'0.72rem'}}>(optional)</span></label>
        <input type="number" step="any" placeholder="0.001" value={data.amount || ''} onChange={set('amount')} />
      </div>
      <div className="field">
        <label>Label <span style={{fontWeight:400,textTransform:'none',fontSize:'0.72rem'}}>(optional)</span></label>
        <input type="text" placeholder="Payment for invoice #42" value={data.label || ''} onChange={set('label')} />
      </div>
    </div>
  )
}
