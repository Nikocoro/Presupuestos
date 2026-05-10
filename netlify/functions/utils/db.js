import { MongoClient } from 'mongodb'

let cachedClient = null

export async function getDb() {
  const uri = process.env.MONGODB_URI?.trim()
  const dbName = process.env.MONGODB_DB?.trim() || 'cotizador'

  if (!uri) {
    throw new Error('MONGODB_URI no configurada en Netlify.')
  }

  if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
    throw new Error(`MONGODB_URI inválida. Empieza con: ${uri.slice(0, 20)}`)
  }

  if (!cachedClient) {
    cachedClient = new MongoClient(uri)
    await cachedClient.connect()
  }

  return cachedClient.db(dbName)
}
