import { useState, useEffect, useRef, useCallback } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import {
  loadItems, addItem, updateItem, deleteItem,
  loadQuotes, addQuote, deleteQuote,
  loadProfesionales, addProfesional, deleteProfesional,
} from './db.js'

pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'

// ── PDF ──────────────────────────────────────────────────────────────────────
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

async function detectBudgetItems(text) {
  const res = await fetch('/.netlify/functions/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error || `Error ${res.status}`)
  return data.items
}

// ── Styles ───────────────────────────────────────────────────────────────────
const card = { background: 'var(--bg-primary)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: '16px' }
const lbl = { fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 4, display: 'block', marginTop: 12 }
const inputStyle = { width: '100%' }
const btnSolid = (color) => ({ padding: '8px 16px', background: `var(--bg-${color})`, color: `var(--text-${color})`, border: `0.5px solid var(--border-${color})`, borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 })

const STEPS = [
  { id: 1, label: 'Analizar PDF', desc: 'Subí el PDF con los ítems' },
  { id: 2, label: 'Ítems a buscar', desc: 'Revisá y describí cada ítem' },
  { id: 3, label: 'Presupuestos', desc: 'Registrá los precios encontrados' },
]
const PROFESIONES_LISTA = ['Gasista', 'Plomero', 'Electricista', 'Albañil', 'Carpintero', 'Pintor', 'Cerrajero', 'Techista', 'Herrero', 'Jardinero']

// ── Loading overlay ──────────────────────────────────────────────────────────
function Spinner({ text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-tertiary)' }}>
      <i className="ti ti-loader-2 spinning" style={{ fontSize: 16 }} /> {text}
    </div>
  )
}

// ── Step 1 ───────────────────────────────────────────────────────────────────
function StepUpload({ onItemsDetected }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef()

  const handleFile = useCallback(async (file) => {
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) { setError('Por favor subí un archivo PDF.'); return }
    setFileName(file.name); setError(''); setLoading(true)
    try {
      const text = await extractTextFromPdf(file)
      const detected = await detectBudgetItems(text)
      onItemsDetected(detected.map((d, i) => ({ id: `item-${Date.now()}-${i}`, item: d.item, contexto: d.contexto || '', descripcion: '' })))
    } catch (e) { console.error(e); setError(e.message || 'No se pudo analizar el PDF.') }
    finally { setLoading(false) }
  }, [onItemsDetected])

  return (
    <div style={card}>
      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>Subir PDF</div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>La IA detecta automáticamente los ítems a presupuestar</div>
      <input ref={fileRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files[0])} />
      <div onClick={() => !loading && fileRef.current.click()} onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }} onDragOver={(e) => { e.preventDefault(); setDragOver(true) }} onDragLeave={() => setDragOver(false)}
        style={{ border: `1.5px dashed ${dragOver ? 'var(--border-info)' : 'var(--border-md)'}`, background: dragOver ? 'var(--bg-info)' : 'transparent', borderRadius: 'var(--radius-lg)', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.15s' }}>
        {loading ? <><i className="ti ti-loader-2 spinning" style={{ fontSize: 36, color: 'var(--text-info)' }} /><div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Analizando con IA...</div><div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{fileName}</div></>
          : <><i className="ti ti-file-upload" style={{ fontSize: 36, color: 'var(--text-tertiary)' }} /><div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Arrastrá tu PDF acá o <span style={{ color: 'var(--text-info)', textDecoration: 'underline' }}>hacé click para elegir</span></div><div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Solo archivos PDF · máx 20 MB</div></>}
      </div>
      {error && <div style={{ marginTop: 12, padding: '8px 12px', background: 'var(--bg-danger)', color: 'var(--text-danger)', borderRadius: 'var(--radius-md)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}><i className="ti ti-alert-circle" /> {error}</div>}
      <div style={{ marginTop: 12, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: 14, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-tertiary)', fontSize: 13 }}>
        <i className="ti ti-sparkles" style={{ fontSize: 16, flexShrink: 0 }} /> Los ítems detectados aparecerán en el paso 2 para revisarlos y agregar detalles
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}.spinning{animation:spin 1s linear infinite}`}</style>
    </div>
  )
}

// ── Step 2 ───────────────────────────────────────────────────────────────────
function StepItems({ items, setItems, onConfirm }) {
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ item: '', descripcion: '' })
  const [saving, setSaving] = useState(false)

  const startEdit = (it) => { setEditingId(it.id); setEditForm({ item: it.item, descripcion: it.descripcion || '' }) }

  const saveEdit = async (id) => {
    if (!editForm.item.trim()) return
    setSaving(true)
    try {
      const updated = { id, item: editForm.item.trim(), descripcion: editForm.descripcion.trim() }
      await updateItem(updated)
      setItems((prev) => prev.map((it) => it.id === id ? { ...it, ...updated } : it))
      setEditingId(null)
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  const handleAdd = async () => {
    const newItem = { id: `item-${Date.now()}`, item: '', contexto: '', descripcion: '' }
    setSaving(true)
    try {
      const saved = await addItem(newItem)
      setItems((prev) => [...prev, saved])
      setEditingId(saved.id); setEditForm({ item: '', descripcion: '' })
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    try {
      await deleteItem(id)
      setItems((prev) => prev.filter((it) => it.id !== id))
    } catch (e) { console.error(e) }
  }

  return (
    <div>
      <div style={{ ...card, padding: '14px 20px', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Ítems a presupuestar</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>Editá el nombre, agregá especificaciones y eliminá lo que no corresponda</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 12, background: 'var(--bg-info)', color: 'var(--text-info)', padding: '3px 10px', borderRadius: 'var(--radius-md)' }}>{items.length} ítems</span>
          <button onClick={handleAdd} disabled={saving} style={{ fontSize: 13, padding: '5px 12px', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '0.5px solid var(--border-md)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
            {saving ? <Spinner text="Guardando..." /> : <><i className="ti ti-plus" /> Agregar</>}
          </button>
        </div>
      </div>

      {items.length === 0 && <div style={{ ...card, padding: 32, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>No hay ítems. Usá "Agregar" para añadir manualmente.</div>}

      {items.map((it) => (
        <div key={it.id} style={{ ...card, padding: '12px 16px', marginBottom: 10 }}>
          {editingId === it.id ? (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <i className="ti ti-pencil" style={{ fontSize: 15, color: 'var(--text-info)', marginTop: 28, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <label style={{ ...lbl, marginTop: 0 }}>Nombre del ítem</label>
                  <input autoFocus value={editForm.item} onChange={(e) => setEditForm((f) => ({ ...f, item: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(it.id); if (e.key === 'Escape') setEditingId(null) }} style={inputStyle} placeholder="Ej: manguera de jardín" />
                  <label style={lbl}>Descripción / Especificaciones <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>(opcional)</span></label>
                  <input value={editForm.descripcion} onChange={(e) => setEditForm((f) => ({ ...f, descripcion: e.target.value }))} style={inputStyle} placeholder="Ej: 3/4 pulgada, 15 metros" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => setEditingId(null)} style={{ fontSize: 12, padding: '5px 12px', background: 'var(--bg-secondary)', color: 'var(--text-tertiary)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>Cancelar</button>
                <button onClick={() => saveEdit(it.id)} disabled={saving} style={{ fontSize: 12, padding: '5px 12px', background: 'var(--bg-success)', color: 'var(--text-success)', border: '0.5px solid var(--border-success)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
                  {saving ? 'Guardando...' : <><i className="ti ti-check" /> Guardar</>}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <i className="ti ti-circle-dot" style={{ fontSize: 16, color: 'var(--text-info)', marginTop: 2, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{it.item || <em style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>sin nombre</em>}</div>
                {it.descripcion ? <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}><i className="ti ti-notes" style={{ fontSize: 11 }} /> {it.descripcion}</div>
                  : <button onClick={() => startEdit(it)} style={{ marginTop: 4, fontSize: 11, padding: '2px 8px', background: 'none', color: 'var(--text-tertiary)', border: '0.5px dashed var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}><i className="ti ti-plus" /> Agregar descripción</button>}
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button onClick={() => startEdit(it)} style={{ fontSize: 12, padding: '4px 10px', background: 'var(--bg-info)', color: 'var(--text-info)', border: '0.5px solid var(--border-info)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}><i className="ti ti-edit" /> Editar</button>
                <button onClick={() => handleDelete(it.id)} style={{ fontSize: 12, padding: '4px 8px', background: 'var(--bg-danger)', color: 'var(--text-danger)', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}><i className="ti ti-trash" /></button>
              </div>
            </div>
          )}
        </div>
      ))}
      {items.length > 0 && <button onClick={onConfirm} style={{ ...btnSolid('info'), width: '100%', justifyContent: 'center', marginTop: 8, padding: 10 }}><i className="ti ti-circle-check" /> Confirmar ítems y cargar presupuestos</button>}
    </div>
  )
}

// ── Step 3 ───────────────────────────────────────────────────────────────────
function StepQuotes({ items, quotes, setQuotes }) {
  const empty = { itemId: '', desc: '', price: '', source: '' }
  const [form, setForm] = useState(empty)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const getItem = (id) => items.find((it) => it.id === id)
  const quotesForItem = (id) => quotes.filter((q) => q.itemId === id)
  const itemsSinCotizar = items.filter((it) => quotesForItem(it.id).length === 0)
  const itemsCotizados = items.filter((it) => quotesForItem(it.id).length > 0)

  useEffect(() => { if (!form.itemId && itemsSinCotizar.length > 0) setForm((f) => ({ ...f, itemId: itemsSinCotizar[0].id })) }, [itemsSinCotizar.length])

  const handleSubmit = async () => {
    if (!form.itemId) { setFormError('Seleccioná un ítem.'); return }
    if (!form.price) { setFormError('Ingresá el precio.'); return }
    setFormError(''); setSaving(true)
    try {
      const quote = { id: `q-${Date.now()}`, ...form }
      const saved = await addQuote(quote)
      setQuotes((prev) => [...prev, saved])
      setForm({ ...empty, itemId: form.itemId })
    } catch (e) { setFormError(e.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    try { await deleteQuote(id); setQuotes((prev) => prev.filter((x) => x.id !== id)) } catch (e) { console.error(e) }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 16 }}>
      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>Cargar presupuesto</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>Podés agregar múltiples presupuestos por ítem</div>
        <label style={lbl}>Ítem</label>
        <select value={form.itemId} onChange={(e) => setForm((f) => ({ ...f, itemId: e.target.value }))} style={{ width: '100%' }}>
          <option value="">— Seleccioná un ítem —</option>
          {items.map((it) => { const c = quotesForItem(it.id).length; return <option key={it.id} value={it.id}>{it.item}{c > 0 ? ` (${c} cargado${c > 1 ? 's' : ''})` : ''}</option> })}
        </select>
        {form.itemId && getItem(form.itemId)?.descripcion && <div style={{ marginTop: 6, padding: '6px 10px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', fontSize: 12, color: 'var(--text-secondary)' }}><i className="ti ti-notes" style={{ fontSize: 11 }} /> {getItem(form.itemId).descripcion}</div>}
        <label style={lbl}>Descripción del producto / oferta</label>
        <input type="text" placeholder="Ej: cemento portland 50kg marca Loma Negra" value={form.desc} onChange={(e) => setForm((f) => ({ ...f, desc: e.target.value }))} style={inputStyle} />
        <label style={lbl}>Precio ($)</label>
        <input type="number" placeholder="0" min="0" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} style={inputStyle} />
        <label style={lbl}>Negocio o link de compra</label>
        <input type="text" placeholder="Ej: Ferretería El Sol o https://..." value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))} style={inputStyle} />
        {formError && <div style={{ marginTop: 10, fontSize: 13, padding: '6px 10px', background: 'var(--bg-danger)', color: 'var(--text-danger)', borderRadius: 'var(--radius-md)' }}>{formError}</div>}
        <button onClick={handleSubmit} disabled={saving} style={{ ...btnSolid('success'), width: '100%', justifyContent: 'center', marginTop: 16 }}>
          {saving ? <Spinner text="Guardando..." /> : <><i className="ti ti-device-floppy" /> Guardar presupuesto</>}
        </button>
      </div>
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div><div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>Presupuestos cargados</div><div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{itemsCotizados.length} de {items.length} ítems · {quotes.length} total</div></div>
          {items.length > 0 && <span style={{ fontSize: 12, background: 'var(--bg-success)', color: 'var(--text-success)', padding: '3px 10px', borderRadius: 'var(--radius-md)' }}>{Math.round((itemsCotizados.length / items.length) * 100)}%</span>}
        </div>
        {quotes.length === 0 ? <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}><i className="ti ti-inbox" style={{ fontSize: 20, display: 'block', marginBottom: 6 }} />Todavía no hay presupuestos cargados</div>
          : itemsCotizados.map((it) => (
            <div key={it.id} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}><i className="ti ti-circle-dot" style={{ fontSize: 14, color: 'var(--text-info)' }} /><span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{it.item}</span>{it.descripcion && <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>— {it.descripcion}</span>}</div>
              {quotesForItem(it.id).map((q, idx) => (
                <div key={q.id} style={{ padding: '8px 12px', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)', marginBottom: 4, marginLeft: 20, background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2 }}>Opción {idx + 1}</div>
                    {q.desc && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{q.desc}</div>}
                    {q.source && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><i className="ti ti-building-store" style={{ fontSize: 11 }} /> {q.source}</div>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-success)' }}>${Number(q.price).toLocaleString('es-AR')}</span>
                    <button onClick={() => handleDelete(q.id)} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '2px 4px', fontSize: 14 }}><i className="ti ti-x" /></button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        {itemsSinCotizar.length > 0 && <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--bg-warning)', borderRadius: 'var(--radius-md)', fontSize: 12, color: 'var(--text-warning)', display: 'flex', alignItems: 'center', gap: 6 }}><i className="ti ti-clock" style={{ fontSize: 14 }} /> Sin presupuesto: {itemsSinCotizar.map((it) => it.item).join(', ')}</div>}
      </div>
    </div>
  )
}

// ── Vista General ─────────────────────────────────────────────────────────────
function ViewResumen({ items, quotes, setQuotes, onGoToStep }) {
  const [filterItemId, setFilterItemId] = useState('todos')
  const [sortDir, setSortDir] = useState('asc')

  const getItem = (id) => items.find((it) => it.id === id)
  const itemsWithQuotes = items.filter((it) => quotes.some((q) => q.itemId === it.id))
  const itemsSinQuotes = items.filter((it) => !quotes.some((q) => q.itemId === it.id))

  const filteredQuotes = quotes
    .filter((q) => filterItemId === 'todos' || q.itemId === filterItemId)
    .sort((a, b) => sortDir === 'asc' ? Number(a.price) - Number(b.price) : Number(b.price) - Number(a.price))

  const handleDeleteQuote = async (id) => {
    try { await deleteQuote(id); setQuotes((prev) => prev.filter((x) => x.id !== id)) } catch (e) { console.error(e) }
  }

  return (
    <div>
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div><div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Ítems a presupuestar</div><div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{items.length} ítems · {itemsWithQuotes.length} con presupuesto · {itemsSinQuotes.length} pendientes</div></div>
          <button onClick={() => onGoToStep(2)} style={{ fontSize: 12, padding: '5px 12px', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}><i className="ti ti-edit" /> Editar ítems</button>
        </div>
        {items.length === 0
          ? <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>No hay ítems cargados aún. <span style={{ color: 'var(--text-info)', cursor: 'pointer' }} onClick={() => onGoToStep(1)}>Subí un PDF</span> para empezar.</div>
          : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
            {items.map((it) => { const qty = quotes.filter((q) => q.itemId === it.id).length; return (
              <div key={it.id} onClick={() => setFilterItemId(it.id)} style={{ padding: '10px 12px', border: `0.5px solid ${filterItemId === it.id ? 'var(--border-info)' : 'var(--border)'}`, borderRadius: 'var(--radius-md)', cursor: 'pointer', background: filterItemId === it.id ? 'var(--bg-info)' : 'var(--bg-secondary)' }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: filterItemId === it.id ? 'var(--text-info)' : 'var(--text-primary)', marginBottom: 3 }}>{it.item}</div>
                {it.descripcion && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 3 }}>{it.descripcion}</div>}
                <div style={{ fontSize: 11, color: qty > 0 ? 'var(--text-success)' : 'var(--text-warning)' }}>{qty > 0 ? <><i className="ti ti-check" /> {qty} presupuesto{qty > 1 ? 's' : ''}</> : <><i className="ti ti-clock" /> Pendiente</>}</div>
              </div>
            )})}
          </div>}
      </div>
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          <div><div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Todos los presupuestos</div><div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{filteredQuotes.length} resultado{filteredQuotes.length !== 1 ? 's' : ''}{filterItemId !== 'todos' ? ` para "${getItem(filterItemId)?.item}"` : ''}</div></div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select value={filterItemId} onChange={(e) => setFilterItemId(e.target.value)} style={{ fontSize: 13, padding: '6px 10px', borderRadius: 'var(--radius-md)', border: '0.5px solid var(--border-md)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
              <option value="todos">Todos los ítems</option>
              {items.map((it) => <option key={it.id} value={it.id}>{it.item}</option>)}
            </select>
            <button onClick={() => setSortDir((d) => d === 'asc' ? 'desc' : 'asc')} style={{ fontSize: 13, padding: '6px 12px', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className={`ti ti-sort-${sortDir === 'asc' ? 'ascending' : 'descending'}-numbers`} /> {sortDir === 'asc' ? '↑ Menor a mayor' : '↓ Mayor a menor'}
            </button>
            {filterItemId !== 'todos' && <button onClick={() => setFilterItemId('todos')} style={{ fontSize: 12, padding: '6px 8px', background: 'none', color: 'var(--text-tertiary)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}><i className="ti ti-x" /></button>}
          </div>
        </div>
        {filteredQuotes.length === 0
          ? <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}><i className="ti ti-inbox" style={{ fontSize: 24, display: 'block', marginBottom: 8 }} />{quotes.length === 0 ? <><span>No hay presupuestos cargados. </span><span style={{ color: 'var(--text-info)', cursor: 'pointer' }} onClick={() => onGoToStep(3)}>Ir a cargar presupuestos →</span></> : 'No hay resultados para este filtro.'}</div>
          : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
            {filteredQuotes.map((q) => {
              const it = getItem(q.itemId)
              const allForItem = quotes.filter((x) => x.itemId === q.itemId).sort((a, b) => Number(a.price) - Number(b.price))
              const isCheapest = allForItem[0]?.id === q.id && allForItem.length > 1
              return (
                <div key={q.id} style={{ padding: '12px 14px', border: `0.5px solid ${isCheapest ? 'var(--border-success)' : 'var(--border)'}`, borderRadius: 'var(--radius-md)', background: isCheapest ? 'var(--bg-success)' : 'var(--bg-primary)', position: 'relative' }}>
                  {isCheapest && <span style={{ position: 'absolute', top: -1, right: 10, fontSize: 10, background: 'var(--text-success)', color: 'white', padding: '1px 6px', borderRadius: '0 0 6px 6px', fontWeight: 500 }}>MÁS BARATO</span>}
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>{it?.item}{it?.descripcion ? ` · ${it.descripcion}` : ''}</div>
                  <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-success)', marginBottom: 4 }}>${Number(q.price).toLocaleString('es-AR')}</div>
                  {q.desc && <div style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 4 }}>{q.desc}</div>}
                  {q.source && <div style={{ fontSize: 12, color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><i className="ti ti-building-store" style={{ fontSize: 11 }} /> {q.source}</div>}
                  <button onClick={() => handleDeleteQuote(q.id)} style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 13 }}><i className="ti ti-x" /></button>
                </div>
              )
            })}
          </div>}
      </div>
    </div>
  )
}

// ── Profesionales ────────────────────────────────────────────────────────────
function ViewProfesionales({ profesionales, setProfesionales }) {
  const emptyProf = { nombre: '', telefono: '', profesiones: [], descripcion: '' }
  const [form, setForm] = useState(emptyProf)
  const [customProf, setCustomProf] = useState('')
  const [formError, setFormError] = useState('')
  const [filtro, setFiltro] = useState('Todos')
  const [saving, setSaving] = useState(false)

  const toggleProfesion = (p) => setForm((f) => ({ ...f, profesiones: f.profesiones.includes(p) ? f.profesiones.filter((x) => x !== p) : [...f.profesiones, p] }))
  const addCustom = () => { const t = customProf.trim(); if (!t || form.profesiones.includes(t)) return; setForm((f) => ({ ...f, profesiones: [...f.profesiones, t] })); setCustomProf('') }

  const handleSubmit = async () => {
    if (!form.nombre.trim()) { setFormError('Ingresá el nombre.'); return }
    if (form.profesiones.length === 0) { setFormError('Seleccioná al menos una profesión.'); return }
    setFormError(''); setSaving(true)
    try {
      const prof = { id: `prof-${Date.now()}`, ...form }
      const saved = await addProfesional(prof)
      setProfesionales((prev) => [...prev, saved])
      setForm(emptyProf); setCustomProf('')
    } catch (e) { setFormError(e.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    try { await deleteProfesional(id); setProfesionales((prev) => prev.filter((x) => x.id !== id)) } catch (e) { console.error(e) }
  }

  const todasProfesiones = ['Todos', ...new Set(profesionales.flatMap((p) => p.profesiones || (p.profesion ? [p.profesion] : [])))]
  const filtered = filtro === 'Todos' ? profesionales : profesionales.filter((p) => (p.profesiones || (p.profesion ? [p.profesion] : [])).includes(filtro))

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,340px) minmax(0,1fr)', gap: 16 }}>
      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>Agregar profesional</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>Registrá contactos para futuros trabajos</div>
        <label style={{ ...lbl, marginTop: 0 }}>Nombre completo</label>
        <input type="text" placeholder="Ej: Juan García" value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} style={inputStyle} />
        <label style={lbl}>Teléfono</label>
        <input type="tel" placeholder="Ej: 221 555-0000" value={form.telefono} onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))} style={inputStyle} />
        <label style={lbl}>Profesiones <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>(una o más)</span></label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {PROFESIONES_LISTA.map((p) => (
            <button key={p} onClick={() => toggleProfesion(p)} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 20, border: `0.5px solid ${form.profesiones.includes(p) ? 'var(--border-info)' : 'var(--border)'}`, background: form.profesiones.includes(p) ? 'var(--bg-info)' : 'var(--bg-secondary)', color: form.profesiones.includes(p) ? 'var(--text-info)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: form.profesiones.includes(p) ? 500 : 400 }}>
              {form.profesiones.includes(p) && <i className="ti ti-check" style={{ fontSize: 11, marginRight: 3 }} />}{p}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input type="text" placeholder="Otra profesión..." value={customProf} onChange={(e) => setCustomProf(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addCustom() }} style={{ flex: 1 }} />
          <button onClick={addCustom} style={{ fontSize: 12, padding: '6px 10px', background: 'var(--bg-secondary)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--text-secondary)' }}>+ Agregar</button>
        </div>
        {form.profesiones.filter((p) => !PROFESIONES_LISTA.includes(p)).length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            {form.profesiones.filter((p) => !PROFESIONES_LISTA.includes(p)).map((p) => (
              <span key={p} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: 'var(--bg-info)', color: 'var(--text-info)', display: 'flex', alignItems: 'center', gap: 4 }}>
                {p} <button onClick={() => toggleProfesion(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-info)', fontSize: 12, padding: 0 }}>×</button>
              </span>
            ))}
          </div>
        )}
        <label style={lbl}>Descripción <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>(opcional)</span></label>
        <input type="text" placeholder="Ej: especialista en gas natural, muy recomendado" value={form.descripcion} onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))} style={inputStyle} />
        {formError && <div style={{ marginTop: 10, fontSize: 13, padding: '6px 10px', background: 'var(--bg-danger)', color: 'var(--text-danger)', borderRadius: 'var(--radius-md)' }}>{formError}</div>}
        <button onClick={handleSubmit} disabled={saving} style={{ ...btnSolid('success'), width: '100%', justifyContent: 'center', marginTop: 16 }}>
          {saving ? <Spinner text="Guardando..." /> : <><i className="ti ti-user-plus" /> Agregar profesional</>}
        </button>
      </div>
      <div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {todasProfesiones.map((p) => { const count = p === 'Todos' ? profesionales.length : profesionales.filter((x) => (x.profesiones || (x.profesion ? [x.profesion] : [])).includes(p)).length; return (
            <button key={p} onClick={() => setFiltro(p)} style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, border: `0.5px solid ${filtro === p ? 'var(--border-info)' : 'var(--border)'}`, background: filtro === p ? 'var(--bg-info)' : 'var(--bg-primary)', color: filtro === p ? 'var(--text-info)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: filtro === p ? 500 : 400 }}>
              {p} <span style={{ opacity: 0.7 }}>({count})</span>
            </button>
          )})}
        </div>
        {filtered.length === 0
          ? <div style={{ ...card, padding: 32, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}><i className="ti ti-users" style={{ fontSize: 24, display: 'block', marginBottom: 8 }} />{profesionales.length === 0 ? 'Todavía no hay profesionales registrados' : `No hay resultados para "${filtro}"`}</div>
          : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
            {filtered.map((p) => { const profs = p.profesiones || (p.profesion ? [p.profesion] : []); return (
              <div key={p.id} style={{ ...card, marginBottom: 0, position: 'relative' }}>
                <button onClick={() => handleDelete(p.id)} style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 14, padding: '2px 4px' }}><i className="ti ti-x" /></button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-info)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><i className="ti ti-user" style={{ fontSize: 18, color: 'var(--text-info)' }} /></div>
                  <div style={{ minWidth: 0 }}><div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 3 }}>{p.nombre}</div><div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>{profs.map((pr) => <span key={pr} style={{ fontSize: 10, background: 'var(--bg-secondary)', color: 'var(--text-secondary)', padding: '1px 7px', borderRadius: 10 }}>{pr}</span>)}</div></div>
                </div>
                {p.telefono && <a href={`tel:${p.telefono}`} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-info)', textDecoration: 'none', marginBottom: 4 }}><i className="ti ti-phone" style={{ fontSize: 13 }} /> {p.telefono}</a>}
                {p.descripcion && <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>{p.descripcion}</div>}
              </div>
            )})}
          </div>}
      </div>
    </div>
  )
}

// ── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState('workflow')
  const [step, setStep] = useState(1)
  const [items, setItems] = useState([])
  const [quotes, setQuotes] = useState([])
  const [profesionales, setProfesionales] = useState([])
  const [initializing, setInitializing] = useState(true)
  const [dbError, setDbError] = useState('')

  useEffect(() => {
    ;(async () => {
      try {
        const [i, q, p] = await Promise.all([loadItems(), loadQuotes(), loadProfesionales()])
        setItems(i); setQuotes(q); setProfesionales(p)
        if (i.length > 0) setStep(2)
      } catch (e) {
        setDbError('No se pudo conectar a la base de datos. Usando datos locales.')
        console.error(e)
      } finally {
        setInitializing(false)
      }
    })()
  }, [])

  const goToStep = (s) => { setView('workflow'); setStep(s) }

  const navBtn = (targetView, icon, label, count) => {
    const active = view === targetView
    return (
      <button onClick={() => setView(targetView)} style={{ fontSize: 13, padding: '5px 14px', background: active ? 'var(--bg-info)' : 'var(--bg-secondary)', color: active ? 'var(--text-info)' : 'var(--text-secondary)', border: `0.5px solid ${active ? 'var(--border-info)' : 'var(--border)'}`, borderRadius: 'var(--radius-md)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
        <i className={`ti ${icon}`} /> {label}
        {count > 0 && <span style={{ fontSize: 11, background: active ? 'rgba(0,0,0,0.1)' : 'var(--bg-primary)', color: active ? 'var(--text-info)' : 'var(--text-tertiary)', padding: '0 5px', borderRadius: 10, minWidth: 18, textAlign: 'center' }}>{count}</span>}
      </button>
    )
  }

  const stepStatus = (id) => (step === id ? 'active' : step > id ? 'done' : '')

  if (initializing) return (
    <div style={{ fontFamily: 'inherit', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'var(--text-secondary)' }}>
      <i className="ti ti-loader-2 spinning" style={{ fontSize: 32, color: 'var(--text-info)' }} />
      <div style={{ fontSize: 14 }}>Conectando con la base de datos...</div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}.spinning{animation:spin 1s linear infinite}`}</style>
    </div>
  )

  return (
    <div style={{ fontFamily: 'inherit', minHeight: '100vh' }}>
      <div style={{ background: 'var(--bg-primary)', borderBottom: '0.5px solid var(--border)', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <i className="ti ti-receipt-2" style={{ fontSize: 22, color: 'var(--text-info)' }} />
        <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-primary)', cursor: 'pointer' }} onClick={() => setView('workflow')}>Cotizador</span>
        <span style={{ fontSize: 11, background: 'var(--bg-info)', color: 'var(--text-info)', padding: '2px 8px', borderRadius: 'var(--radius-md)' }}>Beta</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {navBtn('resumen', 'ti-layout-grid', 'Presupuestos', quotes.length)}
          {navBtn('profesionales', 'ti-users', 'Profesionales', profesionales.length)}
        </div>
      </div>

      {dbError && (
        <div style={{ background: 'var(--bg-warning)', color: 'var(--text-warning)', padding: '8px 24px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="ti ti-alert-triangle" /> {dbError}
        </div>
      )}

      {view === 'workflow' && (
        <div style={{ background: 'var(--bg-primary)', borderBottom: '0.5px solid var(--border)', display: 'flex' }}>
          {STEPS.map((s) => {
            const st = stepStatus(s.id); const canClick = items.length > 0 || s.id === 1
            return (
              <button key={s.id} onClick={() => canClick && setStep(s.id)} style={{ flex: 1, padding: '13px 12px', display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', borderBottom: `2px solid ${st === 'active' ? '#378ADD' : st === 'done' ? '#1D9E75' : 'transparent'}`, cursor: canClick ? 'pointer' : 'default' }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 500, flexShrink: 0, background: st === 'active' ? 'var(--bg-info)' : st === 'done' ? 'var(--bg-success)' : 'var(--bg-secondary)', color: st === 'active' ? 'var(--text-info)' : st === 'done' ? 'var(--text-success)' : 'var(--text-tertiary)' }}>
                  {st === 'done' ? <i className="ti ti-check" style={{ fontSize: 13 }} /> : s.id}
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: st === 'active' ? 'var(--text-info)' : st === 'done' ? 'var(--text-success)' : 'var(--text-secondary)' }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{s.desc}</div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {view !== 'workflow' && (
        <div style={{ background: 'var(--bg-primary)', borderBottom: '0.5px solid var(--border)', padding: '13px 24px', display: 'flex', alignItems: 'center', gap: 8 }}>
          {view === 'resumen' && <><i className="ti ti-layout-grid" style={{ fontSize: 18, color: 'var(--text-info)' }} /><span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Vista general de presupuestos</span></>}
          {view === 'profesionales' && <><i className="ti ti-users" style={{ fontSize: 18, color: 'var(--text-info)' }} /><span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Directorio de profesionales</span></>}
        </div>
      )}

      <div style={{ padding: 24, maxWidth: 1080, margin: '0 auto' }}>
        {view === 'workflow' && (
          <>
            {step === 1 && <StepUpload onItemsDetected={async (detected) => {
              try {
                const saved = await Promise.all(detected.map((it) => addItem(it)))
                setItems(saved); setStep(2)
              } catch (e) { setItems(detected); setStep(2) }
            }} />}
            {step === 2 && <StepItems items={items} setItems={setItems} onConfirm={() => setStep(3)} />}
            {step === 3 && <StepQuotes items={items} quotes={quotes} setQuotes={setQuotes} />}
          </>
        )}
        {view === 'resumen' && <ViewResumen items={items} quotes={quotes} setQuotes={setQuotes} onGoToStep={goToStep} />}
        {view === 'profesionales' && <ViewProfesionales profesionales={profesionales} setProfesionales={setProfesionales} />}
      </div>
    </div>
  )
}
