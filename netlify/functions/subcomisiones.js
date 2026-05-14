import { getDb } from './utils/db.js'
import { ok, err, preflight } from './utils/cors.js'

const DEFAULT_SUBCOMISIONES = [
  { id: 'proyectos', nombre: 'Comisión de Proyectos' },
  { id: 'fiestas', nombre: 'Fiestas' },
]

const normalize = (subco) => ({
  id: String(subco.id || subco.slug || subco._id),
  nombre: subco.nombre || subco.name || subco.titulo || 'Subcomisión sin nombre',
})

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight()

  try {
    if (event.httpMethod !== 'GET') return err(405, 'Método no permitido')

    const db = await getDb()
    const col = db.collection('subcomisiones')
    const subcos = await col.find({}).sort({ nombre: 1 }).toArray()

    return ok(subcos.length > 0 ? subcos.map(normalize) : DEFAULT_SUBCOMISIONES)
  } catch (e) {
    console.error('[subcomisiones]', e)
    return ok(DEFAULT_SUBCOMISIONES)
  }
}
