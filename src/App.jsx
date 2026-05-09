import { useState, useEffect, useRef, useCallback } from 'react'
import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).href

// ── PDF text extraction ──────────────────────────────────────────────────────
async function extractTextFromPdf(file) {
  const buf = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise
  let text = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    text += content.items.map((it) => it.str).join(' ') + '\n'
  }
  return text
}

// ── Gemini API via Netlify Function ─────────────────────────────────────────
async function detectBudgetItems(text) {
  const res = await fetch('/.netlify/functions/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  if (!res.ok) throw new Error(`Error del servidor: ${res.status}`)
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data.items
}

// ── localStorage persistence ─────────────────────────────────────────────────
function lsSave(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch (_) {}
}
function lsLoad(key) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null }
  catch (_) { return null }
}

// ── Shared styles ────────────────────────────────────────────────────────────
const card = {
  background: 'var(--bg-primary)',
  border: '0.5px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  padding: '20px',
  marginBottom: '16px',
}

const STEPS = [
  { id: 1, label: 'Analizar PDF', desc: 'Subí el PDF con los ítems' },
  { id: 2, label: 'Confirmar ítems', desc: 'Revisá lo encontrado' },
  { id: 3, label: 'Cargar presupuestos', desc: 'Precios y proveedores' },
]

// ── Step 1: PDF Upload ───────────────────────────────────────────────────────
function StepUpload({ onItemsDetected }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef()

  const handleFile = useCallback(
    async (file) => {
      if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
        setError('Por favor subí un archivo PDF.')
        return
      }
      setFileName(file.name)
      setError('')
      setLoading(true)
      try {
        const text = await extractTextFromPdf(file)
        const detected = await detectBudgetItems(text)
        onItemsDetected(
          detected.map((d, i) => ({
            id: `item-${Date.now()}-${i}`,
            item: d.item,
            contexto: d.contexto || '',
          }))
        )
      } catch (e) {
        console.error(e)
        setError('No se pudo analizar el PDF. Revisá la consola para más detalles.')
      } finally {
        setLoading(false)
      }
    },
    [onItemsDetected]
  )

  const onDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    handleFile(e.dataTransfer.files[0])
  }

  return (
    <div style={card}>
      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>
        Subir PDF
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
        La IA detecta automáticamente los ítems a presupuestar en el documento
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".pdf"
        style={{ display: 'none' }}
        onChange={(e) => handleFile(e.target.files[0])}
      />

      <div
        onClick={() => !loading && fileRef.current.click()}
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        style={{
          border: `1.5px dashed ${dragOver ? 'var(--border-info)' : 'var(--border-md)'}`,
          background: dragOver ? 'var(--bg-info)' : 'transparent',
          borderRadius: 'var(--radius-lg)',
          padding: '40px 20px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'background 0.15s',
        }}
      >
        {loading ? (
          <>
            <i className="ti ti-loader-2 spinning" style={{ fontSize: 36, color: 'var(--text-info)' }} />
            <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Analizando con IA...</div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{fileName}</div>
          </>
        ) : (
          <>
            <i className="ti ti-file-upload" style={{ fontSize: 36, color: 'var(--text-tertiary)' }} />
            <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
              Arrastrá tu PDF acá o{' '}
              <span style={{ color: 'var(--text-info)', textDecoration: 'underline' }}>
                hacé click para elegir
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Solo archivos PDF · máx 20 MB</div>
          </>
        )}
      </div>

      {error && (
        <div style={{ marginTop: 12, padding: '8px 12px', background: 'var(--bg-danger)', color: 'var(--text-danger)', borderRadius: 'var(--radius-md)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="ti ti-alert-circle" /> {error}
        </div>
      )}

      <div style={{ marginTop: 12, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: 14, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-tertiary)', fontSize: 13 }}>
        <i className="ti ti-sparkles" style={{ fontSize: 16, flexShrink: 0 }} />
        Los ítems detectados aparecerán en el paso 2 para que los revises y edites
      </div>
    </div>
  )
}

// ── Step 2: Confirm items ────────────────────────────────────────────────────
function StepItems({ items, setItems, onConfirm }) {
  const [editingId, setEditingId] = useState(null)
  const [editVal, setEditVal] = useState('')

  const startEdit = (it) => { setEditingId(it.id); setEditVal(it.item) }
  const saveEdit = (id) => {
    if (!editVal.trim()) return
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, item: editVal.trim() } : it)))
    setEditingId(null)
  }
  const deleteItem = (id) => setItems((prev) => prev.filter((it) => it.id !== id))
  const addItem = () => {
    const id = `item-${Date.now()}`
    setItems((prev) => [...prev, { id, item: '', contexto: '' }])
    setEditingId(id)
    setEditVal('')
  }

  const btnBase = { fontSize: 12, borderRadius: 'var(--radius-md)', cursor: 'pointer', border: 'none' }

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>
            Ítems detectados
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Revisá, editá o eliminá antes de continuar
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, background: 'var(--bg-info)', color: 'var(--text-info)', padding: '3px 10px', borderRadius: 'var(--radius-md)' }}>
            {items.length} ítems
          </span>
          <button onClick={addItem} style={{ ...btnBase, padding: '4px 12px', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '0.5px solid var(--border-md)' }}>
            <i className="ti ti-plus" /> Agregar
          </button>
        </div>
      </div>

      {items.length === 0 && (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
          No hay ítems. Usá "Agregar" para añadir manualmente.
        </div>
      )}

      {items.map((it) => (
        <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)', marginBottom: 8, background: 'var(--bg-primary)' }}>
          <i className="ti ti-grip-vertical" style={{ fontSize: 16, color: 'var(--text-tertiary)', flexShrink: 0 }} />
          {editingId === it.id ? (
            <>
              <input
                autoFocus
                value={editVal}
                onChange={(e) => setEditVal(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(it.id); if (e.key === 'Escape') setEditingId(null) }}
                style={{ flex: 1 }}
                placeholder="Nombre del ítem"
              />
              <button onClick={() => saveEdit(it.id)} style={{ ...btnBase, padding: '4px 10px', background: 'var(--bg-success)', color: 'var(--text-success)' }}>
                <i className="ti ti-check" /> Guardar
              </button>
              <button onClick={() => setEditingId(null)} style={{ ...btnBase, padding: '4px 8px', background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}>
                <i className="ti ti-x" />
              </button>
            </>
          ) : (
            <>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>
                  {it.item || <em style={{ color: 'var(--text-tertiary)' }}>sin nombre</em>}
                </div>
                {it.contexto && (
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                    <i className="ti ti-map-pin" style={{ fontSize: 11 }} /> {it.contexto}
                  </div>
                )}
              </div>
              <button onClick={() => startEdit(it)} style={{ ...btnBase, padding: '4px 10px', background: 'var(--bg-info)', color: 'var(--text-info)' }}>
                <i className="ti ti-edit" /> Editar
              </button>
              <button onClick={() => deleteItem(it.id)} style={{ ...btnBase, padding: '4px 8px', background: 'var(--bg-danger)', color: 'var(--text-danger)' }} aria-label="Eliminar">
                <i className="ti ti-trash" />
              </button>
            </>
          )}
        </div>
      ))}

      {items.length > 0 && (
        <button
          onClick={onConfirm}
          style={{ marginTop: 8, width: '100%', padding: 10, background: 'var(--bg-info)', color: 'var(--text-info)', border: '0.5px solid var(--border-info)', borderRadius: 'var(--radius-md)', fontSize: 14, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          <i className="ti ti-circle-check" /> Confirmar ítems y continuar
        </button>
      )}
    </div>
  )
}

// ── Step 3: Load quotes ──────────────────────────────────────────────────────
function StepQuotes({ items, quotes, setQuotes }) {
  const empty = { itemId: '', desc: '', price: '', source: '' }
  const [form, setForm] = useState(empty)
  const [formError, setFormError] = useState('')

  const pendingItems = items.filter((it) => !quotes.some((q) => q.itemId === it.id))
  const getItemName = (id) => items.find((it) => it.id === id)?.item || id

  useEffect(() => {
    if (!form.itemId && pendingItems.length > 0) {
      setForm((f) => ({ ...f, itemId: pendingItems[0].id }))
    }
  }, [pendingItems.length])

  const handleSubmit = () => {
    if (!form.itemId) { setFormError('Seleccioná un ítem.'); return }
    if (!form.price) { setFormError('Ingresá el precio.'); return }
    setFormError('')
    setQuotes((prev) => [...prev, { id: `q-${Date.now()}`, ...form }])
    const next = pendingItems.find((it) => it.id !== form.itemId)
    setForm({ ...empty, itemId: next?.id || '' })
  }

  const lbl = { fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 4, display: 'block', marginTop: 12 }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 16 }}>
      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>Cargar presupuesto</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>Completá los datos de cada proveedor</div>

        <label style={lbl}>Ítem</label>
        <select value={form.itemId} onChange={(e) => setForm((f) => ({ ...f, itemId: e.target.value }))} style={{ width: '100%' }}>
          <option value="">— Seleccioná un ítem —</option>
          {items.map((it) => (
            <option key={it.id} value={it.id}>
              {it.item}{quotes.some((q) => q.itemId === it.id) ? ' ✓' : ''}
            </option>
          ))}
        </select>

        <label style={lbl}>Descripción del producto</label>
        <input type="text" placeholder="Ej: cemento portland 50kg marca Loma Negra" value={form.desc} onChange={(e) => setForm((f) => ({ ...f, desc: e.target.value }))} style={{ width: '100%' }} />

        <label style={lbl}>Precio ($)</label>
        <input type="number" placeholder="0" min="0" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} style={{ width: '100%' }} />

        <label style={lbl}>Negocio o link de compra</label>
        <input type="text" placeholder="Ej: Ferretería El Sol o https://..." value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))} style={{ width: '100%' }} />

        {formError && (
          <div style={{ marginTop: 10, fontSize: 13, padding: '6px 10px', background: 'var(--bg-danger)', color: 'var(--text-danger)', borderRadius: 'var(--radius-md)' }}>
            {formError}
          </div>
        )}

        <button
          onClick={handleSubmit}
          style={{ marginTop: 16, width: '100%', padding: 9, background: 'var(--bg-success)', color: 'var(--text-success)', border: '0.5px solid var(--border-success)', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          <i className="ti ti-device-floppy" /> Guardar presupuesto
        </button>
      </div>

      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>Presupuestos cargados</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{quotes.length} de {items.length} ítems cotizados</div>
          </div>
          {items.length > 0 && (
            <span style={{ fontSize: 12, background: 'var(--bg-success)', color: 'var(--text-success)', padding: '3px 10px', borderRadius: 'var(--radius-md)' }}>
              {Math.round((quotes.length / items.length) * 100)}%
            </span>
          )}
        </div>

        {quotes.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
            <i className="ti ti-inbox" style={{ fontSize: 20, display: 'block', marginBottom: 6 }} />
            Todavía no hay presupuestos cargados
          </div>
        ) : (
          quotes.map((q) => (
            <div key={q.id} style={{ padding: '10px 12px', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)', marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>{getItemName(q.itemId)}</div>
                  {q.desc && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{q.desc}</div>}
                  {q.source && (
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <i className="ti ti-building-store" style={{ fontSize: 11 }} /> {q.source}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8, flexShrink: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-success)' }}>
                    ${Number(q.price).toLocaleString('es-AR')}
                  </span>
                  <button onClick={() => setQuotes((prev) => prev.filter((x) => x.id !== q.id))} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '2px 4px', fontSize: 14 }} aria-label="Eliminar">
                    <i className="ti ti-x" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}

        {pendingItems.length > 0 && (
          <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--bg-warning)', borderRadius: 'var(--radius-md)', fontSize: 12, color: 'var(--text-warning)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="ti ti-clock" style={{ fontSize: 14 }} /> Faltan {pendingItems.length} ítem{pendingItems.length !== 1 ? 's' : ''} por cotizar
          </div>
        )}
      </div>
    </div>
  )
}

// ── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [step, setStep] = useState(1)
  const [items, setItems] = useState([])
  const [quotes, setQuotes] = useState([])

  useEffect(() => {
    const si = lsLoad('cotizador:items')
    const sq = lsLoad('cotizador:quotes')
    if (si?.length) { setItems(si); setStep(2) }
    if (sq?.length) setQuotes(sq)
  }, [])

  useEffect(() => { if (items.length) lsSave('cotizador:items', items) }, [items])
  useEffect(() => { lsSave('cotizador:quotes', quotes) }, [quotes])

  const handleItemsDetected = (detected) => { setItems(detected); setStep(2) }
  const reset = () => {
    setItems([]); setQuotes([]); setStep(1)
    lsSave('cotizador:items', []); lsSave('cotizador:quotes', [])
  }

  const stepStatus = (id) => (step === id ? 'active' : step > id ? 'done' : '')

  return (
    <div style={{ fontFamily: 'inherit', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: 'var(--bg-primary)', borderBottom: '0.5px solid var(--border)', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <i className="ti ti-receipt-2" style={{ fontSize: 22, color: 'var(--text-info)' }} />
        <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-primary)' }}>Cotizador</span>
        <span style={{ fontSize: 11, background: 'var(--bg-info)', color: 'var(--text-info)', padding: '2px 8px', borderRadius: 'var(--radius-md)' }}>Beta</span>
        {items.length > 0 && (
          <button onClick={reset} style={{ marginLeft: 'auto', fontSize: 12, padding: '4px 10px', background: 'none', color: 'var(--text-tertiary)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
            <i className="ti ti-refresh" /> Nueva sesión
          </button>
        )}
      </div>

      {/* Stepper */}
      <div style={{ background: 'var(--bg-primary)', borderBottom: '0.5px solid var(--border)', display: 'flex' }}>
        {STEPS.map((s) => {
          const st = stepStatus(s.id)
          const canClick = items.length > 0 || s.id === 1
          return (
            <button key={s.id} onClick={() => canClick && setStep(s.id)} style={{ flex: 1, padding: '14px 12px', display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', borderBottom: `2px solid ${st === 'active' ? '#378ADD' : st === 'done' ? '#1D9E75' : 'transparent'}`, cursor: canClick ? 'pointer' : 'default' }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 500, flexShrink: 0, background: st === 'active' ? 'var(--bg-info)' : st === 'done' ? 'var(--bg-success)' : 'var(--bg-secondary)', color: st === 'active' ? 'var(--text-info)' : st === 'done' ? 'var(--text-success)' : 'var(--text-tertiary)' }}>
                {st === 'done' ? <i className="ti ti-check" style={{ fontSize: 13 }} /> : s.id}
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: st === 'active' ? 'var(--text-info)' : st === 'done' ? 'var(--text-success)' : 'var(--text-secondary)' }}>
                  {s.label}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{s.desc}</div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
        {step === 1 && <StepUpload onItemsDetected={handleItemsDetected} />}
        {step === 2 && <StepItems items={items} setItems={setItems} onConfirm={() => setStep(3)} />}
        {step === 3 && <StepQuotes items={items} quotes={quotes} setQuotes={setQuotes} />}
      </div>
    </div>
  )
}
