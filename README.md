# CSS Obras — Coordinación de Seguridad y Salud

App para generar actas de seguridad y salud en fase de ejecución de obras,
usando IA (Claude) para redactar el contenido según normativa española
(RD 1627/1997, RD 171/2004, LPRL 31/1995, RD 1215/1997).

## Estructura del proyecto

```
css-obras-react/
├── api/
│   └── claude.js        ← función serverless: proxy seguro a la API de Anthropic
├── public/
│   ├── manifest.json     ← manifest PWA (icono, nombre, colores)
│   └── sw.js              ← service worker (funcionamiento offline)
├── src/
│   ├── App.jsx             ← componente principal con toda la lógica
│   ├── Icons.jsx            ← iconos SVG
│   ├── usePersistentState.js ← hook de guardado en localStorage
│   ├── main.jsx               ← punto de entrada de React
│   └── index.css               ← estilos globales
├── index.html
├── package.json
├── vite.config.js
└── vercel.json
```

## Desplegar en Vercel

### 1. Subir a GitHub
Crea un repositorio nuevo y sube **todo el contenido de esta carpeta** (no la carpeta en sí).

### 2. Importar en Vercel
1. Ve a vercel.com → "Add New Project"
2. Selecciona el repositorio
3. Vercel detecta automáticamente que es un proyecto Vite — no cambies nada
4. Pulsa "Deploy"

### 3. Añadir la API Key (obligatorio)
1. En el proyecto de Vercel: **Settings → Environment Variables**
2. Añade:
   - Name: `ANTHROPIC_API_KEY`
   - Value: tu clave `sk-ant-...` (consíguela en console.anthropic.com → API Keys)
3. Guarda y haz **Redeploy** (Deployments → ⋯ → Redeploy)

### 4. Instalar en el móvil
1. Abre la URL de Vercel en Chrome (Android) o Safari (iOS)
2. Añade a pantalla de inicio desde el menú del navegador

## Desarrollo local

```bash
npm install
npm run dev
```

Para probar la función `/api/claude.js` en local necesitas la CLI de Vercel:
```bash
npm i -g vercel
vercel dev
```

## Notas

- Los datos (obras, actas, perfil) se guardan en `localStorage` del navegador/dispositivo.
- La función `api/claude.js` mantiene la API Key segura en el servidor; nunca se expone en el código del cliente.
- El Service Worker permite que la interfaz cargue sin conexión, pero la generación de actas con IA requiere internet.
