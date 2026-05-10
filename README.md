# Cotizador

App web para detectar ítems a presupuestar desde PDFs y registrar los presupuestos de cada proveedor.

## Stack

- **Frontend**: React + Vite
- **PDF**: pdfjs-dist
- **IA**: gemini-2.5-flash-lite (vía Netlify Function)
- **Deploy**: Netlify

## Setup local

```bash
npm install
npm run dev
```

Para desarrollo local necesitás Netlify CLI:
```bash
npm install -g netlify-cli
netlify dev
```

## Deploy en Netlify

### 1. Subir el proyecto

Opción A — desde la web de Netlify:
- Ir a https://app.netlify.com
- "Add new site" → "Import an existing project" → conectar tu repo de GitHub/GitLab
- O "Deploy manually" y arrastrar la carpeta del proyecto

Opción B — con CLI:
```bash
netlify login
netlify init
netlify deploy --prod
```

### 2. Configurar la API key

En el dashboard de Netlify:
- Site settings → Environment variables
- Agregar: `GEMINI_API_KEY` = tu clave de Google AI Studio

### 3. Build settings (se configura automáticamente con netlify.toml)

- Build command: `npm run build`
- Publish directory: `dist`
- Functions directory: `netlify/functions`

## Estructura

```
cotizador/
├── src/
│   ├── App.jsx          # Componente principal
│   ├── main.jsx         # Entry point
│   └── index.css        # Estilos globales + CSS vars (light/dark)
├── netlify/
│   └── functions/
│       └── analyze.js   # Proxy seguro a la API de Gemini
├── index.html
├── vite.config.js
├── netlify.toml
└── package.json
```

## Cómo funciona

1. El usuario sube un PDF
2. pdfjs-dist extrae el texto en el browser
3. El texto se envía a `/.netlify/functions/analyze`
4. La Function llama a Gemini con la API key segura (variable de entorno)
5. Gemini devuelve un JSON con los ítems detectados
6. El usuario revisa, edita y confirma los ítems
7. Carga los presupuestos con descripción, precio y proveedor
8. Todo se persiste en localStorage