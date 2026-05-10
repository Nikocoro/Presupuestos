const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json',
}

function ok(body) { return { statusCode: 200, headers: HEADERS, body: JSON.stringify(body) } }
function created(body) { return { statusCode: 201, headers: HEADERS, body: JSON.stringify(body) } }
function err(code, msg) { return { statusCode: code, headers: HEADERS, body: JSON.stringify({ error: msg }) } }
function preflight() { return { statusCode: 200, headers: HEADERS, body: '' } }

module.exports = { ok, created, err, preflight }
