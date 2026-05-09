exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'GEMINI_API_KEY no configurada en Netlify.' }),
    }
  }

  try {
    const { text } = JSON.parse(event.body)

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`

    const response = await fetch(url, {
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
        generationConfig: {
          maxOutputTokens: 1000,
          temperature: 0.1,
        }
      }),
    })

    if (!response.ok) {
      const errBody = await response.text()
      throw new Error(`Gemini API error ${response.status}: ${errBody}`)
    }

    const data = await response.json()

    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]'
    const clean = raw.replace(/```json|```/g, '').trim()
    const items = JSON.parse(clean)

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ items }),
    }
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message }),
    }
  }
}
