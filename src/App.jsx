import { useState, useEffect, useRef, useCallback } from 'react'
import * as pdfjsLib from 'pdfjs-dist'

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

// ── Gemini via Netlify Function ──────────────────────────────────────────────
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

// ── localStorage ─────────────────────────────────────────────────────────────
const lsSave = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)) } catch (_) {} }
const lsLoad = (key) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null } catch (_) { return null } }

// ── Styles ───────────────────────────────────────────────────────────────────
const card = { background: 'var(--bg-primary)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: '16px' }
const lbl = { fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 4, display: 'block', marginTop: 12 }
const inputStyle = { width: '100%', marginTop: 0 }
const btnPrimary = (color) => ({ marginTop: 16, width: '100%', padding: 9, background: `var(--bg-${color})`, color: `var(--text-${color})`, border: `0.5px solid var(--border-${color})`, borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 })

const STEPS = [
  { id: 1, label: 'Analizar PDF', desc: 'Subí el PDF con los ítems' },
  { id: 2, label: 'Ítems a buscar', desc: 'Revisá y describí cada ítem' },
  { id: 3, label: 'Presupuestos', desc: 'Registrá los precios encontrados' },
]

// ── Step 1: PDF Upload ───────────────────────────────────────────────────────
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
    } catch (e) {
      console.error(e)
      setError(e.message || 'No se pudo analizar el PDF.')
    } finally { setLoading(false) }
  }, [onItemsDetected])

  return (
    <div style={card}>
      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>Subir PDF</div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>La IA detecta automáticamente los ítems a presupuestar</div>
      <input ref={fileRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files[0])} />
      <div
        onClick={() => !loading && fileRef.current.click()}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        style={{ border: `1.5px dashed ${dragOver ? 'var(--border-info)' : 'var(--border-md)'}`, background: dragOver ? 'var(--bg-info)' : 'transparent', borderRadius: 'var(--radius-lg)', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.15s' }}
      >
        {loading ? (
          <><i className="ti ti-loader-2 spinning" style={{ fontSize: 36, color: 'var(--text-info)' }} /><div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Analizando con IA...</div><div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{fileName}</div></>
        ) : (
          <><i className="ti ti-file-upload" style={{ fontSize: 36, color: 'var(--text-tertiary)' }} /><div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Arrastrá tu PDF acá o <span style={{ color: 'var(--text-info)', textDecoration: 'underline' }}>hacé click para elegir</span></div><div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Solo archivos PDF · máx 20 MB</div></>
        )}
      </div>
      {error && <div style={{ marginTop: 12, padding: '8px 12px', background: 'var(--bg-danger)', color: 'var(--text-danger)', borderRadius: 'var(--radius-md)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}><i className="ti ti-alert-circle" /> {error}</div>}
      <div style={{ marginTop: 12, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: 14, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-tertiary)', fontSize: 13 }}>
        <i className="ti ti-sparkles" style={{ fontSize: 16, flexShrink: 0 }} />
        Los ítems detectados aparecerán en el paso 2 para que los revises, edites y describas
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}.spinning{animation:spin 1s linear infinite}`}</style>
    </div>
  )
}

// ── Step 2: Items list with descriptions ─────────────────────────────────────
function StepItems({ items, setItems, onConfirm }) {
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ item: '', descripcion: '' })

  const startEdit = (it) => { setEditingId(it.id); setEditForm({ item: it.item, descripcion: it.descripcion || '' }) }
  const saveEdit = (id) => {
    if (!editForm.item.trim()) return
    setItems((prev) => prev.map((it) => it.id === id ? { ...it, item: editForm.item.trim(), descripcion: editForm.descripcion.trim() } : it))
    setEditingId(null)
  }
  const addItem = () => {
    const id = `item-${Date.now()}`
    setItems((prev) => [...prev, { id, item: '', contexto: '', descripcion: '' }])
    setEditingId(id); setEditForm({ item: '', descripcion: '' })
  }

  return (
    <div>
      {/* Summary header */}
      <div style={{ ...card, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Ítems a presupuestar</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>Podés editar el nombre, agregar una descripción con detalles y eliminar ítems</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 12, background: 'var(--bg-info)', color: 'var(--text-info)', padding: '3px 10px', borderRadius: 'var(--radius-md)' }}>{items.length} ítems</span>
          <button onClick={addItem} style={{ fontSize: 13, padding: '5px 12px', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '0.5px solid var(--border-md)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
            <i className="ti ti-plus" /> Agregar
          </button>
        </div>
      </div>

      {/* Items list */}
      {items.length === 0 && (
        <div style={{ ...card, padding: 32, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
          No hay ítems. Usá "Agregar" para añadir manualmente.
        </div>
      )}

      {items.map((it) => (
        <div key={it.id} style={{ ...card, padding: '12px 16px', marginBottom: 10 }}>
          {editingId === it.id ? (
            /* Edit mode */
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <i className="ti ti-pencil" style={{ fontSize: 16, color: 'var(--text-info)', marginTop: 10, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <label style={{ ...lbl, marginTop: 0 }}>Nombre del ítem</label>
                  <input
                    autoFocus
                    value={editForm.item}
                    onChange={(e) => setEditForm((f) => ({ ...f, item: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(it.id); if (e.key === 'Escape') setEditingId(null) }}
                    style={inputStyle}
                    placeholder="Ej: manguera de jardín"
                  />
                  <label style={lbl}>Descripción / Especificaciones <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>(opcional)</span></label>
                  <input
                    value={editForm.descripcion}
                    onChange={(e) => setEditForm((f) => ({ ...f, descripcion: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Escape') setEditingId(null) }}
                    style={inputStyle}
                    placeholder="Ej: 3/4 pulgada, 15 metros, con acople rápido"
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => setEditingId(null)} style={{ fontSize: 12, padding: '5px 12px', background: 'var(--bg-secondary)', color: 'var(--text-tertiary)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button onClick={() => saveEdit(it.id)} style={{ fontSize: 12, padding: '5px 12px', background: 'var(--bg-success)', color: 'var(--text-success)', border: '0.5px solid var(--border-success)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
                  <i className="ti ti-check" /> Guardar
                </button>
              </div>
            </div>
          ) : (
            /* View mode */
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <i className="ti ti-circle-dot" style={{ fontSize: 16, color: 'var(--text-info)', marginTop: 2, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{it.item || <em style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>sin nombre</em>}</div>
                {it.descripcion && (
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>
                    <i className="ti ti-notes" style={{ fontSize: 11 }} /> {it.descripcion}
                  </div>
                )}
                {it.contexto && !it.descripcion && (
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                    <i className="ti ti-map-pin" style={{ fontSize: 11 }} /> {it.contexto}
                  </div>
                )}
                {!it.descripcion && (
                  <button onClick={() => startEdit(it)} style={{ marginTop: 4, fontSize: 11, padding: '2px 8px', background: 'none', color: 'var(--text-tertiary)', border: '0.5px dashed var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
                    <i className="ti ti-plus" /> Agregar descripción
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button onClick={() => startEdit(it)} style={{ fontSize: 12, padding: '4px 10px', background: 'var(--bg-info)', color: 'var(--text-info)', border: '0.5px solid var(--border-info)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
                  <i className="ti ti-edit" /> Editar
                </button>
                <button onClick={() => setItems((prev) => prev.filter((x) => x.id !== it.id))} style={{ fontSize: 12, padding: '4px 8px', background: 'var(--bg-danger)', color: 'var(--text-danger)', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer' }} aria-label="Eliminar">
                  <i className="ti ti-trash" />
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {items.length > 0 && (
        <button onClick={onConfirm} style={{ ...btnPrimary('info'), marginTop: 8 }}>
          <i className="ti ti-circle-check" /> Confirmar ítems y cargar presupuestos
        </button>
      )}
    </div>
  )
}

// ── Step 3: Quotes (multiple per item) ───────────────────────────────────────
function StepQuotes({ items, quotes, setQuotes }) {
  const empty = { itemId: '', desc: '', price: '', source: '' }
  const [form, setForm] = useState(empty)
  const [formError, setFormError] = useState('')

  const getItemName = (id) => items.find((it) => it.id === id)?.item || id
  const getItemDesc = (id) => items.find((it) => it.id === id)?.descripcion || ''
  const quotesForItem = (id) => quotes.filter((q) => q.itemId === id)
  const itemsWithoutAny = items.filter((it) => quotesForItem(it.id).length === 0)

  useEffect(() => {
    if (!form.itemId && itemsWithoutAny.length > 0) setForm((f) => ({ ...f, itemId: itemsWithoutAny[0].id }))
  }, [itemsWithoutAny.length])

  const handleSubmit = () => {
    if (!form.itemId) { setFormError('Seleccioná un ítem.'); return }
    if (!form.price) { setFormError('Ingresá el precio.'); return }
    setFormError('')
    setQuotes((prev) => [...prev, { id: `q-${Date.now()}`, ...form }])
    setForm({ ...empty, itemId: form.itemId })
  }

  const itemsCotizados = items.filter((it) => quotesForItem(it.id).length > 0)
  const itemsSinCotizar = items.filter((it) => quotesForItem(it.id).length === 0)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 16 }}>
      {/* Form */}
      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>Cargar presupuesto</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>Podés agregar múltiples presupuestos para el mismo ítem</div>

        <label style={lbl}>Ítem</label>
        <select value={form.itemId} onChange={(e) => setForm((f) => ({ ...f, itemId: e.target.value }))} style={{ width: '100%' }}>
          <option value="">— Seleccioná un ítem —</option>
          {items.map((it) => {
            const count = quotesForItem(it.id).length
            return <option key={it.id} value={it.id}>{it.item}{count > 0 ? ` (${count} cargado${count > 1 ? 's' : ''})` : ''}</option>
          })}
        </select>

        {/* Show item description as hint */}
        {form.itemId && getItemDesc(form.itemId) && (
          <div style={{ marginTop: 6, padding: '6px 10px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', fontSize: 12, color: 'var(--text-secondary)' }}>
            <i className="ti ti-notes" style={{ fontSize: 11 }} /> {getItemDesc(form.itemId)}
          </div>
        )}

        <label style={lbl}>Descripción del producto / oferta</label>
        <input type="text" placeholder="Ej: cemento portland 50kg marca Loma Negra" value={form.desc} onChange={(e) => setForm((f) => ({ ...f, desc: e.target.value }))} style={inputStyle} />

        <label style={lbl}>Precio ($)</label>
        <input type="number" placeholder="0" min="0" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} style={inputStyle} />

        <label style={lbl}>Negocio o link de compra</label>
        <input type="text" placeholder="Ej: Ferretería El Sol o https://..." value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))} style={inputStyle} />

        {formError && <div style={{ marginTop: 10, fontSize: 13, padding: '6px 10px', background: 'var(--bg-danger)', color: 'var(--text-danger)', borderRadius: 'var(--radius-md)' }}>{formError}</div>}

        <button onClick={handleSubmit} style={btnPrimary('success')}>
          <i className="ti ti-device-floppy" /> Guardar presupuesto
        </button>
      </div>

      {/* Quotes grouped by item */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>Presupuestos cargados</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{itemsCotizados.length} de {items.length} ítems con presupuesto · {quotes.length} total</div>
          </div>
          {items.length > 0 && (
            <span style={{ fontSize: 12, background: 'var(--bg-success)', color: 'var(--text-success)', padding: '3px 10px', borderRadius: 'var(--radius-md)', flexShrink: 0 }}>
              {Math.round((itemsCotizados.length / items.length) * 100)}%
            </span>
          )}
        </div>

        {quotes.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
            <i className="ti ti-inbox" style={{ fontSize: 20, display: 'block', marginBottom: 6 }} />
            Todavía no hay presupuestos cargados
          </div>
        ) : (
          itemsCotizados.map((it) => (
            <div key={it.id} style={{ marginBottom: 12 }}>
              {/* Item header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <i className="ti ti-circle-dot" style={{ fontSize: 14, color: 'var(--text-info)' }} />
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{it.item}</span>
                {it.descripcion && <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>— {it.descripcion}</span>}
              </div>
              {/* Quotes for this item */}
              {quotesForItem(it.id).map((q, idx) => (
                <div key={q.id} style={{ padding: '8px 12px', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)', marginBottom: 4, marginLeft: 20, background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2 }}>Opción {idx + 1}</div>
                    {q.desc && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{q.desc}</div>}
                    {q.source && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><i className="ti ti-building-store" style={{ fontSize: 11 }} /> {q.source}</div>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-success)' }}>${Number(q.price).toLocaleString('es-AR')}</span>
                    <button onClick={() => setQuotes((prev) => prev.filter((x) => x.id !== q.id))} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '2px 4px', fontSize: 14 }} aria-label="Eliminar">
                      <i className="ti ti-x" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}

        {itemsSinCotizar.length > 0 && (
          <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--bg-warning)', borderRadius: 'var(--radius-md)', fontSize: 12, color: 'var(--text-warning)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="ti ti-clock" style={{ fontSize: 14 }} /> Sin presupuesto: {itemsSinCotizar.map(it => it.item).join(', ')}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Profesionales ────────────────────────────────────────────────────────────
const PROFESIONES_SUGERIDAS = ['Gasista', 'Plomero', 'Electricista', 'Albañil', 'Carpintero', 'Pintor', 'Cerrajero', 'Techista', 'Herrero', 'Jardinero', 'Otro']

function ViewProfesionales({ profesionales, setProfesionales }) {
  const emptyProf = { nombre: '', telefono: '', profesion: '', descripcion: '' }
  const [form, setForm] = useState(emptyProf)
  const [formError, setFormError] = useState('')
  const [filtro, setFiltro] = useState('Todos')
  const [custom, setCustom] = useState(false)

  const profesionesExistentes = ['Todos', ...new Set(profesionales.map((p) => p.profesion).filter(Boolean))]

  const handleSubmit = () => {
    if (!form.nombre.trim()) { setFormError('Ingresá el nombre.'); return }
    if (!form.profesion.trim()) { setFormError('Ingresá la profesión.'); return }
    setFormError('')
    setProfesionales((prev) => [...prev, { id: `prof-${Date.now()}`, ...form }])
    setForm(emptyProf)
  }

  const filtered = filtro === 'Todos' ? profesionales : profesionales.filter((p) => p.profesion === filtro)

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,340px) minmax(0,1fr)', gap: 16 }}>
        {/* Form */}
        <div style={card}>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>Agregar profesional</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>Registrá contactos para futuros trabajos</div>

          <label style={{ ...lbl, marginTop: 0 }}>Nombre completo</label>
          <input type="text" placeholder="Ej: Juan García" value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} style={inputStyle} />

          <label style={lbl}>Teléfono</label>
          <input type="tel" placeholder="Ej: 221 555-0000" value={form.telefono} onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))} style={inputStyle} />

          <label style={lbl}>Profesión</label>
          {custom ? (
            <div style={{ display: 'flex', gap: 6 }}>
              <input type="text" placeholder="Ingresá la profesión" value={form.profesion} onChange={(e) => setForm((f) => ({ ...f, profesion: e.target.value }))} style={{ flex: 1 }} />
              <button onClick={() => { setCustom(false); setForm((f) => ({ ...f, profesion: '' })) }} style={{ fontSize: 12, padding: '6px 8px', background: 'var(--bg-secondary)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--text-secondary)' }}>↩</button>
            </div>
          ) : (
            <select value={form.profesion} onChange={(e) => { if (e.target.value === '__custom__') { setCustom(true); setForm((f) => ({ ...f, profesion: '' })) } else { setForm((f) => ({ ...f, profesion: e.target.value })) } }} style={{ width: '100%' }}>
              <option value="">— Seleccioná —</option>
              {PROFESIONES_SUGERIDAS.map((p) => p === 'Otro' ? <option key={p} value="__custom__">Otra (escribir)</option> : <option key={p} value={p}>{p}</option>)}
            </select>
          )}

          <label style={lbl}>Descripción <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>(opcional)</span></label>
          <input type="text" placeholder="Ej: especialista en gas natural, muy recomendado" value={form.descripcion} onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))} style={inputStyle} />

          {formError && <div style={{ marginTop: 10, fontSize: 13, padding: '6px 10px', background: 'var(--bg-danger)', color: 'var(--text-danger)', borderRadius: 'var(--radius-md)' }}>{formError}</div>}

          <button onClick={handleSubmit} style={btnPrimary('success')}>
            <i className="ti ti-user-plus" /> Agregar profesional
          </button>
        </div>

        {/* List with filters */}
        <div>
          {/* Filter chips */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {profesionesExistentes.map((p) => (
              <button
                key={p}
                onClick={() => setFiltro(p)}
                style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, border: `0.5px solid ${filtro === p ? 'var(--border-info)' : 'var(--border)'}`, background: filtro === p ? 'var(--bg-info)' : 'var(--bg-primary)', color: filtro === p ? 'var(--text-info)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: filtro === p ? 500 : 400 }}
              >
                {p}
                {p !== 'Todos' && <span style={{ marginLeft: 4, opacity: 0.7 }}>({profesionales.filter((x) => x.profesion === p).length})</span>}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div style={{ ...card, padding: 32, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
              <i className="ti ti-users" style={{ fontSize: 24, display: 'block', marginBottom: 8 }} />
              {profesionales.length === 0 ? 'Todavía no hay profesionales registrados' : `No hay profesionales con el filtro "${filtro}"`}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
              {filtered.map((p) => (
                <div key={p.id} style={{ ...card, marginBottom: 0, position: 'relative' }}>
                  <button
                    onClick={() => setProfesionales((prev) => prev.filter((x) => x.id !== p.id))}
                    style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 14, padding: '2px 4px' }}
                    aria-label="Eliminar"
                  >
                    <i className="ti ti-x" />
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-info)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className="ti ti-user" style={{ fontSize: 18, color: 'var(--text-info)' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{p.nombre}</div>
                      <span style={{ fontSize: 11, background: 'var(--bg-secondary)', color: 'var(--text-secondary)', padding: '1px 7px', borderRadius: 10 }}>{p.profesion}</span>
                    </div>
                  </div>
                  {p.telefono && (
                    <a href={`tel:${p.telefono}`} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-info)', textDecoration: 'none', marginBottom: 4 }}>
                      <i className="ti ti-phone" style={{ fontSize: 13 }} /> {p.telefono}
                    </a>
                  )}
                  {p.descripcion && <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>{p.descripcion}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [step, setStep] = useState(1)
  const [view, setView] = useState('workflow') // 'workflow' | 'profesionales'
  const [items, setItems] = useState([])
  const [quotes, setQuotes] = useState([])
  const [profesionales, setProfesionales] = useState([])

  useEffect(() => {
    const si = lsLoad('cotizador:items')
    const sq = lsLoad('cotizador:quotes')
    const sp = lsLoad('cotizador:profesionales')
    if (si?.length) { setItems(si); setStep(2) }
    if (sq?.length) setQuotes(sq)
    if (sp?.length) setProfesionales(sp)
  }, [])

  useEffect(() => { if (items.length) lsSave('cotizador:items', items) }, [items])
  useEffect(() => { lsSave('cotizador:quotes', quotes) }, [quotes])
  useEffect(() => { lsSave('cotizador:profesionales', profesionales) }, [profesionales])

  const reset = () => {
    setItems([]); setQuotes([]); setStep(1); setView('workflow')
    lsSave('cotizador:items', []); lsSave('cotizador:quotes', [])
  }

  const stepStatus = (id) => (step === id ? 'active' : step > id ? 'done' : '')

  return (
    <div style={{ fontFamily: 'inherit', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: 'var(--bg-primary)', borderBottom: '0.5px solid var(--border)', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <i className="ti ti-receipt-2" style={{ fontSize: 22, color: 'var(--text-info)' }} />
        <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-primary)', cursor: 'pointer' }} onClick={() => setView('workflow')}>Cotizador</span>
        <span style={{ fontSize: 11, background: 'var(--bg-info)', color: 'var(--text-info)', padding: '2px 8px', borderRadius: 'var(--radius-md)' }}>Beta</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={() => setView(view === 'profesionales' ? 'workflow' : 'profesionales')}
            style={{ fontSize: 13, padding: '5px 14px', background: view === 'profesionales' ? 'var(--bg-info)' : 'var(--bg-secondary)', color: view === 'profesionales' ? 'var(--text-info)' : 'var(--text-secondary)', border: `0.5px solid ${view === 'profesionales' ? 'var(--border-info)' : 'var(--border)'}`, borderRadius: 'var(--radius-md)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <i className="ti ti-users" /> Profesionales
            {profesionales.length > 0 && <span style={{ fontSize: 11, background: 'var(--bg-secondary)', color: 'var(--text-tertiary)', padding: '0 5px', borderRadius: 10 }}>{profesionales.length}</span>}
          </button>
          {items.length > 0 && (
            <button onClick={reset} style={{ fontSize: 12, padding: '5px 10px', background: 'none', color: 'var(--text-tertiary)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
              <i className="ti ti-refresh" /> Nueva sesión
            </button>
          )}
        </div>
      </div>

      {/* Stepper (solo en workflow) */}
      {view === 'workflow' && (
        <div style={{ background: 'var(--bg-primary)', borderBottom: '0.5px solid var(--border)', display: 'flex' }}>
          {STEPS.map((s) => {
            const st = stepStatus(s.id)
            const canClick = items.length > 0 || s.id === 1
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

      {/* Page title for profesionales */}
      {view === 'profesionales' && (
        <div style={{ background: 'var(--bg-primary)', borderBottom: '0.5px solid var(--border)', padding: '13px 24px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="ti ti-users" style={{ fontSize: 18, color: 'var(--text-info)' }} />
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Directorio de profesionales</span>
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>— gasistas, plomeros, electricistas y más</span>
        </div>
      )}

      {/* Content */}
      <div style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>
        {view === 'workflow' && (
          <>
            {step === 1 && <StepUpload onItemsDetected={(d) => { setItems(d); setStep(2) }} />}
            {step === 2 && <StepItems items={items} setItems={setItems} onConfirm={() => setStep(3)} />}
            {step === 3 && <StepQuotes items={items} quotes={quotes} setQuotes={setQuotes} />}
          </>
        )}
        {view === 'profesionales' && <ViewProfesionales profesionales={profesionales} setProfesionales={setProfesionales} />}
      </div>
    </div>
  )
}
