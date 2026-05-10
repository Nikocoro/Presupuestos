const getDb = require('./utils/db')
const { ok, created, err, preflight } = require('./utils/cors')

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight()
  try {
    const db = await getDb()
    const col = db.collection('quotes')

    if (event.httpMethod === 'GET') {
      const quotes = await col.find({}).sort({ createdAt: 1 }).toArray()
      return ok(quotes)
    }

    if (event.httpMethod === 'POST') {
      const quote = { ...JSON.parse(event.body), createdAt: new Date() }
      const result = await col.insertOne(quote)
      return created({ ...quote, _id: result.insertedId })
    }

    if (event.httpMethod === 'DELETE') {
      const id = event.queryStringParameters?.id
      if (!id) return err(400, 'Falta el parámetro id')
      await col.deleteOne({ id })
      return ok({ deleted: true })
    }

    return err(405, 'Método no permitido')
  } catch (e) {
    console.error('[quotes]', e.message)
    return err(500, e.message)
  }
}
