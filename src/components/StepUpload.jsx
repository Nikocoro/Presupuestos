import { useState, useRef, useCallback } from 'react'
import { extractTextFromPdf } from '../utils/pdfExtract'

export default function StepUpload({ onItemsDetected }) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [fileName, setFileName] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef()

  const handleFile = useCallback(async (file) => {
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Por favor subí un archivo PDF.')
      return
    }
    setFileName(file.name)
    setError('')
    setLoading(true)
    try {
      const text = await extractTextFromPdf(file)

      const res = await fetch('/api/detect-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) throw new Error(`Error del servidor: ${res.status}`)
      const detected = await res.json()
      if (detected.error) throw new Error(detected.error)

      onItemsDetected(
        detected.map((d, i) => ({
          id: `item-${Date.now()}-${i}`,
          item: d.item,
          contexto: d.contexto || '',
        }))
      )
    } catch (e) {
      console.error(e)
      setError(`No se pudo analizar el PDF: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }, [onItemsDetected])

  const onDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    handleFile(e.dataTransfer.files[0])
  }

  return (
    <div className="card">
      <h3 className="card-title">Subir PDF</h3>
      <p className="card-sub">
        La IA detecta automáticamente los ítems a presupuestar en el documento
      </p>

      <input
        ref={fileRef}
        type="file"
        accept=".pdf"
        style={{ display: 'none' }}
        onChange={(e) => handleFile(e.target.files[0])}
      />

      <div
        className={`upload-zone${dragOver ? ' drag-over' : ''}`}
        onClick={() => !loading && fileRef.current.click()}
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
      >
        {loading ? (
          <>
            <i className="ti ti-loader-2 spin" />
            <span className="upload-text">Analizando con IA...</span>
            <span className="upload-hint">{fileName}</span>
          </>
        ) : (
          <>
            <i className="ti ti-file-upload" />
            <span className="upload-text">
              Arrastrá tu PDF acá o <u>hacé click para elegir</u>
            </span>
            <span className="upload-hint">Solo archivos PDF · máx 20 MB</span>
          </>
        )}
      </div>

      {error && (
        <div className="alert alert-danger">
          <i className="ti ti-alert-circle" /> {error}
        </div>
      )}

      <div className="hint-box">
        <i className="ti ti-sparkles" />
        Los ítems detectados aparecerán en el paso 2 para que los revises y edites
      </div>
    </div>
  )
}
