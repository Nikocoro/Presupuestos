import { getDb } from './utils/db.js'
import { ok, created, err, preflight } from './utils/cors.js'

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight()

  try {
    const db = await getDb()
    const col = db.collection('items')

    if (event.httpMethod === 'GET') {
      const items = await col.find({}).sort({ createdAt: 1 }).toArray()
      return ok(items)
    }

    if (event.httpMethod === 'POST') {
      const item = { ...JSON.parse(event.body), createdAt: new Date() }
      const result = await col.insertOne(item)
      return created({ ...item, _id: result.insertedId })
    }

    if (event.httpMethod === 'PUT') {
      const { id, ...fields } = JSON.parse(event.body)
      if (!id) return err(400, 'Falta el campo id')
      await col.updateOne({ id }, { $set: fields })
      return ok({ updated: true })
    }

    if (event.httpMethod === 'DELETE') {
      const id = event.queryStringParameters?.id
      if (!id) return err(400, 'Falta el parámetro id')
      await col.deleteOne({ id })
      return ok({ deleted: true })
    }

    return err(405, 'Método no permitido')
  } catch (e) {
    console.error('[items]', e)
    return err(500, e.message)
  }
}
