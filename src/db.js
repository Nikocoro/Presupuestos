// ── Capa de acceso a datos via Netlify Functions ──────────────────────────────
// Cada función llama a la DB y mantiene localStorage como cache local.

const scopedKey = (key, subcoId) => subcoId ? `${key}:${subcoId}` : key
const lsSave = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)) } catch (_) {} }
const lsLoad = (key) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null } catch (_) { return null } }

function withQuery(path, params = {}) {
  const qs = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') qs.set(key, value)
  })
  const query = qs.toString()
  return query ? `${path}?${query}` : path
}

async function apiFetch(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`)
  return data
}

// ── Subcomisiones ────────────────────────────────────────────────────────────
export async function loadSubcomisiones() {
  try {
    const subcos = await apiFetch('/.netlify/functions/subcomisiones')
    lsSave('cotizador:subcomisiones', subcos)
    return subcos
  } catch (e) {
    console.warn('DB no disponible, usando subcomisiones locales:', e.message)
    return lsLoad('cotizador:subcomisiones') || [
      { id: 'proyectos', nombre: 'Comisión de Proyectos' },
      { id: 'fiestas', nombre: 'Fiestas' },
    ]
  }
}

// ── Items ────────────────────────────────────────────────────────────────────
export async function loadItems(subcoId) {
  try {
    const items = await apiFetch(withQuery('/.netlify/functions/items', { subcoId }))
    lsSave(scopedKey('cotizador:items', subcoId), items)
    return items
  } catch (e) {
    console.warn('DB no disponible, usando caché local:', e.message)
    return lsLoad(scopedKey('cotizador:items', subcoId)) || []
  }
}

export async function addItem(item) {
  const saved = await apiFetch('/.netlify/functions/items', {
    method: 'POST',
    body: JSON.stringify(item),
  })
  return saved
}

export async function updateItem(item) {
  await apiFetch('/.netlify/functions/items', {
    method: 'PUT',
    body: JSON.stringify(item),
  })
  return item
}

export async function deleteItem(id, subcoId) {
  await apiFetch(withQuery('/.netlify/functions/items', { id, subcoId }), { method: 'DELETE' })
}

// ── Quotes ───────────────────────────────────────────────────────────────────
export async function loadQuotes(subcoId) {
  try {
    const quotes = await apiFetch(withQuery('/.netlify/functions/quotes', { subcoId }))
    lsSave(scopedKey('cotizador:quotes', subcoId), quotes)
    return quotes
  } catch (e) {
    console.warn('DB no disponible, usando caché local:', e.message)
    return lsLoad(scopedKey('cotizador:quotes', subcoId)) || []
  }
}

export async function addQuote(quote) {
  return await apiFetch('/.netlify/functions/quotes', {
    method: 'POST',
    body: JSON.stringify(quote),
  })
}

export async function updateQuote(quote) {
  await apiFetch('/.netlify/functions/quotes', {
    method: 'PUT',
    body: JSON.stringify(quote),
  })
  return quote
}

export async function deleteQuote(id, subcoId) {
  await apiFetch(withQuery('/.netlify/functions/quotes', { id, subcoId }), { method: 'DELETE' })
}

// ── Profesionales ─────────────────────────────────────────────────────────────
export async function loadProfesionales() {
  try {
    const profs = await apiFetch('/.netlify/functions/profesionales')
    lsSave('cotizador:profesionales', profs)
    return profs
  } catch (e) {
    console.warn('DB no disponible, usando caché local:', e.message)
    return lsLoad('cotizador:profesionales') || []
  }
}

export async function addProfesional(prof) {
  return await apiFetch('/.netlify/functions/profesionales', {
    method: 'POST',
    body: JSON.stringify(prof),
  })
}

export async function deleteProfesional(id) {
  await apiFetch(`/.netlify/functions/profesionales?id=${id}`, { method: 'DELETE' })
}
