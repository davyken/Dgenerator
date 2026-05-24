export const buildQRString = (type, data) => {
  switch (type) {
    case 'url':
      return data.url || ''
    case 'social':
      return data.profileUrl || ''
    case 'whatsapp': {
      const phone = (data.phone || '').replace(/\D/g, '')
      const msg = encodeURIComponent(data.message || '')
      return msg ? `https://wa.me/${phone}?text=${msg}` : `https://wa.me/${phone}`
    }
    case 'wifi':
      return `WIFI:T:${data.security || 'WPA'};S:${data.ssid || ''};P:${data.password || ''};;`
    case 'text':
      return data.text || ''
    case 'email': {
      const params = []
      if (data.subject) params.push(`subject=${encodeURIComponent(data.subject)}`)
      if (data.body) params.push(`body=${encodeURIComponent(data.body)}`)
      return `mailto:${data.email || ''}${params.length ? '?' + params.join('&') : ''}`
    }
    case 'phone':
      return `tel:${data.phone || ''}`
    case 'sms':
      return `smsto:${data.phone || ''}:${data.message || ''}`
    case 'vcard':
      return [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `FN:${data.name || ''}`,
        `N:${(data.name || '').split(' ').reverse().join(';')}`,
        data.phone ? `TEL:${data.phone}` : '',
        data.email ? `EMAIL:${data.email}` : '',
        data.org ? `ORG:${data.org}` : '',
        data.title ? `TITLE:${data.title}` : '',
        data.website ? `URL:${data.website}` : '',
        data.address ? `ADR:;;${data.address};;;;` : '',
        'END:VCARD',
      ].filter(Boolean).join('\n')
    case 'location':
      return `geo:${data.lat || '0'},${data.lng || '0'}`
    case 'youtube':
      return data.url || ''
    case 'file':
      return data.uploadedUrl || ''
    case 'appstore':
      return data.url || ''
    case 'zoom':
      return data.url || ''
    case 'bitcoin': {
      const params = []
      if (data.amount) params.push(`amount=${data.amount}`)
      if (data.label) params.push(`label=${encodeURIComponent(data.label)}`)
      return `${data.coin || 'bitcoin'}:${data.address || ''}${params.length ? '?' + params.join('&') : ''}`
    }
    default:
      return ''
  }
}
