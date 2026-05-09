exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) }
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.error('[analyze] GEMINI_API_KEY no está configurada en las variables de entorno de Netlify.')
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'GEMINI_API_KEY no configurada. Agregala en Netlify → Site settings → Environment variables.' }),
    }
  }

  let text
  try {
    const body = JSON.parse(event.body)
    text = body.text
    if (!text) throw new Error('El campo "text" está vacío.')
  } catch (e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: `Body inválido: ${e.message}` }) }
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`

  let geminiRes
  try {
    geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{
            text: `Sos un asistente que extrae ítems que requieren presupuesto de actas de reunión en español argentino.
Devolvé ÚNICAMENTE un array JSON con objetos: { "item": string, "contexto": string }.
"item": nombre concreto del material, producto o servicio a presupuestar.
"contexto": detalle relevante (ej: "casa 11 y 12") o string vacío si no hay.
Solo incluí ítems que necesiten cotización real. Ignorá tareas, personas y decisiones.
Sin markdown ni texto extra. Solo el JSON puro.`
          }]
        },
        contents: [{
          role: 'user',
          parts: [{ text: `Extraé los ítems que necesitan presupuesto:\n\n${text}` }]
        }],
        generationConfig: { maxOutputTokens: 1000, temperature: 0.1 }
      }),
    })
  } catch (e) {
    console.error('[analyze] Error al llamar a Gemini:', e.message)
    return { statusCode: 502, headers, body: JSON.stringify({ error: `No se pudo contactar a Gemini: ${e.message}` }) }
  }

  const geminiBody = await geminiRes.text()

  if (!geminiRes.ok) {
    console.error(`[analyze] Gemini respondió ${geminiRes.status}:`, geminiBody)
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({ error: `Gemini API error ${geminiRes.status}: ${geminiBody}` }),
    }
  }

  try {
    const data = JSON.parse(geminiBody)
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]'
    const items = JSON.parse(raw.replace(/```json|```/g, '').trim())
    return { statusCode: 200, headers, body: JSON.stringify({ items }) }
  } catch (e) {
    console.error('[analyze] Error al parsear respuesta de Gemini:', geminiBody)
    return { statusCode: 500, headers, body: JSON.stringify({ error: `Error al interpretar la respuesta de Gemini: ${e.message}` }) }
  }
}
