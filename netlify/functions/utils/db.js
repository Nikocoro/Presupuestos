import { MongoClient } from 'mongodb'

let cachedClient = null

export async function getDb() {
  if (!cachedClient) {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI no configurada en Netlify.')
    }

    cachedClient = new MongoClient(process.env.MONGODB_URI)
    await cachedClient.connect()
  }

  return cachedClient.db(process.env.MONGODB_DB || 'cotizador')
}
