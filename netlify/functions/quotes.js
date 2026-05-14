import { getDb } from './utils/db.js'
import { ok, created, err, preflight } from './utils/cors.js'

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight()

  try {
    const db = await getDb()
    const col = db.collection('quotes')
    const subcoId = event.queryStringParameters?.subcoId

    if (event.httpMethod === 'GET') {
      if (!subcoId) return err(400, 'Falta el parámetro subcoId')
      const quotes = await col.find({ subcoId }).sort({ createdAt: 1 }).toArray()
      return ok(quotes)
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}')
      if (!body.subcoId) return err(400, 'Falta el campo subcoId')
      const quote = { ...body, createdAt: new Date() }
      const result = await col.insertOne(quote)
      return created({ ...quote, _id: result.insertedId })
    }

    if (event.httpMethod === 'PUT') {
      const { id, ...fields } = JSON.parse(event.body || '{}')
      if (!id) return err(400, 'Falta el id del presupuesto')
      const filter = fields.subcoId ? { id, subcoId: fields.subcoId } : { id }
      await col.updateOne(filter, { $set: { ...fields, updatedAt: new Date() } })
      return ok({ updated: true })
    }

    if (event.httpMethod === 'DELETE') {
      const id = event.queryStringParameters?.id
      if (!id) return err(400, 'Falta el parámetro id')
      const filter = subcoId ? { id, subcoId } : { id }
      await col.deleteOne(filter)
      return ok({ deleted: true })
    }

    return err(405, 'Método no permitido')
  } catch (e) {
    console.error('[quotes]', e)
    return err(500, e.message)
  }
}
