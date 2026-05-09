import { useState } from 'react'

export default function StepItems({ items, setItems, onConfirm }) {
  const [editingId, setEditingId] = useState(null)
  const [editVal, setEditVal]     = useState('')

  const startEdit = (it) => { setEditingId(it.id); setEditVal(it.item) }
  const saveEdit  = (id) => {
    if (!editVal.trim()) return
    setItems((prev) => prev.map((it) => it.id === id ? { ...it, item: editVal.trim() } : it))
    setEditingId(null)
  }
  const deleteItem = (id) => setItems((prev) => prev.filter((it) => it.id !== id))
  const addItem = () => {
    const id = `item-${Date.now()}`
    setItems((prev) => [...prev, { id, item: '', contexto: '' }])
    setEditingId(id)
    setEditVal('')
  }

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="card-title">Ítems detectados</h3>
          <p className="card-sub">Revisá, editá o eliminá antes de continuar</p>
        </div>
        <div className="header-actions">
          <span className="badge badge-info">{items.length} ítems</span>
          <button className="btn btn-sm btn-secondary" onClick={addItem}>
            <i className="ti ti-plus" /> Agregar
          </button>
        </div>
      </div>

      {items.length === 0 && (
        <div className="empty-state">
          No hay ítems. Usá "Agregar" para añadir manualmente.
        </div>
      )}

      {items.map((it) => (
        <div key={it.id} className="item-row">
          <i className="ti ti-grip-vertical grip" />

          {editingId === it.id ? (
            <>
              <input
                autoFocus
                value={editVal}
                onChange={(e) => setEditVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter')  saveEdit(it.id)
                  if (e.key === 'Escape') setEditingId(null)
                }}
                placeholder="Nombre del ítem"
                style={{ flex: 1 }}
              />
              <button className="btn btn-sm btn-success" onClick={() => saveEdit(it.id)}>
                <i className="ti ti-check" /> Guardar
              </button>
              <button className="btn btn-sm btn-ghost" onClick={() => setEditingId(null)}>
                <i className="ti ti-x" />
              </button>
            </>
          ) : (
            <>
              <div className="item-info">
                <span className="item-name">
                  {it.item || <em className="muted">sin nombre</em>}
                </span>
                {it.contexto && (
                  <span className="item-context">
                    <i className="ti ti-map-pin" /> {it.contexto}
                  </span>
                )}
              </div>
              <button className="btn btn-sm btn-info" onClick={() => startEdit(it)}>
                <i className="ti ti-edit" /> Editar
              </button>
              <button className="btn btn-sm btn-danger" onClick={() => deleteItem(it.id)} aria-label="Eliminar">
                <i className="ti ti-trash" />
              </button>
            </>
          )}
        </div>
      ))}

      {items.length > 0 && (
        <button className="btn btn-primary btn-block mt-2" onClick={onConfirm}>
          <i className="ti ti-circle-check" /> Confirmar ítems y continuar
        </button>
      )}
    </div>
  )
}
