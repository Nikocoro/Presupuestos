import { getDb } from './utils/db.js'
import { ok, created, err, preflight } from './utils/cors.js'

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight()

  try {
    const db = await getDb()
    const col = db.collection('profesionales')

    if (event.httpMethod === 'GET') {
      const profs = await col.find({}).sort({ nombre: 1 }).toArray()
      return ok(profs)
    }

    if (event.httpMethod === 'POST') {
      const prof = { ...JSON.parse(event.body), createdAt: new Date() }
      const result = await col.insertOne(prof)
      return created({ ...prof, _id: result.insertedId })
    }

    if (event.httpMethod === 'DELETE') {
      const id = event.queryStringParameters?.id
      if (!id) return err(400, 'Falta el parámetro id')
      await col.deleteOne({ id })
      return ok({ deleted: true })
    }

    return err(405, 'Método no permitido')
  } catch (e) {
    console.error('[profesionales]', e)
    return err(500, e.message)
  }
}
