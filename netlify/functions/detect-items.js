exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'ANTHROPIC_API_KEY no configurada en Netlify.' }) }
  }

  let text
  try {
    ({ text } = JSON.parse(event.body))
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Body inválido.' }) }
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: `Sos un asistente que extrae ítems que requieren presupuesto de actas de reunión en español argentino.
Devolvé ÚNICAMENTE un array JSON con objetos: { "item": string, "contexto": string }.
"item": nombre concreto del material, producto o servicio a presupuestar.
"contexto": detalle relevante si existe (ej: "casa 11 y 12"), o string vacío.
Solo incluí ítems que necesiten cotización real. Ignorá tareas, personas y decisiones.
Sin markdown ni texto extra. Solo el JSON puro.`,
        messages: [
          { role: 'user', content: `Extraé los ítems que necesitan presupuesto:\n\n${text}` },
        ],
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.error?.message || `API error ${res.status}`)
    }

    const raw = data.content.map((c) => c.text || '').join('')
    const items = JSON.parse(raw.replace(/```json|```/g, '').trim())

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(items),
    }
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    }
  }
}
