// ── Capa de acceso a datos via Netlify Functions ──────────────────────────────
// Cada función llama a la DB y mantiene localStorage como cache local.

const lsSave = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)) } catch (_) {} }
const lsLoad = (key) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null } catch (_) { return null } }

async function apiFetch(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`)
  return data
}

// ── Items ────────────────────────────────────────────────────────────────────
export async function loadItems() {
  try {
    const items = await apiFetch('/.netlify/functions/items')
    lsSave('cotizador:items', items)
    return items
  } catch (e) {
    console.warn('DB no disponible, usando caché local:', e.message)
    return lsLoad('cotizador:items') || []
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

export async function deleteItem(id) {
  await apiFetch(`/.netlify/functions/items?id=${id}`, { method: 'DELETE' })
}

// ── Quotes ───────────────────────────────────────────────────────────────────
export async function loadQuotes() {
  try {
    const quotes = await apiFetch('/.netlify/functions/quotes')
    lsSave('cotizador:quotes', quotes)
    return quotes
  } catch (e) {
    console.warn('DB no disponible, usando caché local:', e.message)
    return lsLoad('cotizador:quotes') || []
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

export async function deleteQuote(id) {
  await apiFetch(`/.netlify/functions/quotes?id=${id}`, { method: 'DELETE' })
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
