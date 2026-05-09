export function storageSave(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (_) {}
}

export function storageLoad(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch (_) {
    return null
  }
}

export function storageClear(...keys) {
  keys.forEach((k) => {
    try { localStorage.removeItem(k) } catch (_) {}
  })
}
