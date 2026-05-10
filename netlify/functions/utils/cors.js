const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json',
}

export function ok(body) {
  return {
    statusCode: 200,
    headers: HEADERS,
    body: JSON.stringify(body),
  }
}

export function created(body) {
  return {
    statusCode: 201,
    headers: HEADERS,
    body: JSON.stringify(body),
  }
}

export function err(code, msg) {
  return {
    statusCode: code,
    headers: HEADERS,
    body: JSON.stringify({ error: msg }),
  }
}

export function preflight() {
  return {
    statusCode: 200,
    headers: HEADERS,
    body: '',
  }
}
