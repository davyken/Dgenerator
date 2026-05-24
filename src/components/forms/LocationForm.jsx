import { useState } from 'react'

export default function LocationForm({ data, onChange, onLocationDetected }) {
  const [loading, setLoading] = useState(false)
  const [locationInfo, setLocationInfo] = useState(null)
  const [error, setError] = useState(null)

  const handleDetect = () => {
    if (!navigator.geolocation) {
      setError('Your browser does not support geolocation.')
      return
    }
    setLoading(true)
    setError(null)

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        onChange({ ...data, lat: latitude.toFixed(6), lng: longitude.toFixed(6) })

        const now = new Date()
        const timeStr = now.toLocaleString(undefined, {
          weekday: 'short', year: 'numeric', month: 'short',
          day: 'numeric', hour: '2-digit', minute: '2-digit',
        })

        let locationName = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=16`,
            { headers: { 'Accept-Language': 'en' } }
          )
          const json = await res.json()
          const addr = json.address || {}
          const parts = [
            addr.quarter || addr.neighbourhood || addr.suburb || addr.hamlet,
            addr.city || addr.town || addr.village || addr.county,
            addr.country,
          ].filter(Boolean)
          if (parts.length) locationName = parts.join(', ')
        } catch { /* keep coordinate fallback */ }

        const info = { name: locationName, time: timeStr, lat: latitude.toFixed(6), lng: longitude.toFixed(6) }
        setLocationInfo(info)
        onLocationDetected?.(info)
        setLoading(false)
      },
      (err) => {
        setLoading(false)
        setError(
          err.code === 1 ? 'Location access denied — please allow location access in your browser.' :
          err.code === 2 ? 'Position unavailable — check your device location settings.' :
                           'Location request timed out.'
        )
      },
      { timeout: 12000, enableHighAccuracy: true }
    )
  }

  return (
    <div className="form-group">
      <button
        type="button"
        className="btn btn-primary"
        onClick={handleDetect}
        disabled={loading}
        style={{ width: '100%' }}
      >
        {loading ? '📍 Detecting your position…' : '📍 Use My Current Location'}
      </button>

      {locationInfo && (
        <div className="location-detected">
          <div className="location-detected-row">
            <span className="location-detected-icon">📍</span>
            <div className="location-detected-body">
              <span className="location-detected-name">{locationInfo.name}</span>
              <span className="location-detected-time">🕐 {locationInfo.time}</span>
              <span className="location-detected-coords">{locationInfo.lat}, {locationInfo.lng}</span>
            </div>
          </div>
        </div>
      )}

      {error && <p className="error">{error}</p>}

      <div className="field">
        <label>Latitude</label>
        <input
          type="number"
          step="any"
          placeholder="3.8480"
          value={data.lat || ''}
          onChange={e => onChange({ ...data, lat: e.target.value })}
        />
      </div>
      <div className="field">
        <label>Longitude</label>
        <input
          type="number"
          step="any"
          placeholder="11.5021"
          value={data.lng || ''}
          onChange={e => onChange({ ...data, lng: e.target.value })}
        />
      </div>

      {!locationInfo && (
        <p className="hint">
          Click the button to auto-detect your exact position, or enter coordinates manually.
        </p>
      )}
    </div>
  )
}
