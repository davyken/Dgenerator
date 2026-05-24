import { useState } from 'react'
import { uploadToCloudinary } from '../../utils/fileUpload'

export default function FileForm({ data, onChange }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setError('')
    setUploading(true)
    try {
      const url = await uploadToCloudinary(file)
      onChange({ ...data, uploadedUrl: url, fileName: file.name })
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="form-group">
      <div className="field">
        <label>Upload File (PDF, Image, Video)</label>
        <input type="file" accept="*/*" onChange={handleFile} />
      </div>
      {uploading && <p className="hint">⏳ Uploading to Cloudinary...</p>}
      {error && <p className="error">⚠ {error}</p>}
      {data.uploadedUrl && (
        <p className="hint success">
          ✓ Uploaded: <a href={data.uploadedUrl} target="_blank" rel="noreferrer">{data.fileName}</a>
        </p>
      )}
      <p className="hint">
        Requires a free Cloudinary account. Add <code>VITE_CLOUDINARY_CLOUD_NAME</code> and{' '}
        <code>VITE_CLOUDINARY_UPLOAD_PRESET</code> to your <code>.env</code> file.
      </p>
    </div>
  )
}
