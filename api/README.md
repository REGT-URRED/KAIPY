# API (backend) — kaipy

Backend demo de kaipy en **Node/Express** (sin dependencias de base de
datos: persistencia en `api/data/db.json` con escritura atomica).
Contrato REST estilo Open311 (GeoReport), descrito en
`docs/INVESTIGACION_PLATAFORMAS.md`.

## Endpoints

| Metodo | Ruta | Descripcion |
|---|---|---|
| GET | `/api/health` | Estado del servicio |
| GET | `/api/reports` | Listado paginado (`offset`, `limit`, `total`, `reports`) con filtros `category`, `state`, `q`. Incluye la foto re-encodeada (JPEG <=900 px, sin EXIF); oculta `voters`/`photoHash`/`gridKey` |
| GET | `/api/reports/:id` | Detalle completo (incluye foto; oculta `voters` por privacidad) |
| POST | `/api/reports` | Crear reporte anonimo (rate-limit + validacion OWASP) |
| POST | `/api/reports/:id/vote` | "Yo tambien lo vi" — 1 voto por `deviceId` + reporte; devuelve `{ votes, already }` |
| GET | `/api/stats` | Agregados (por categoria y estados) |
| GET | `/api/events` | SSE tiempo real (`report:new`, `report:vote`) con heartbeat |

## Anti-abuso (la frontera real)

El cliente es best-effort; el servidor **nunca confia en el navegador**:

- **Rate-limit** por IP + `X-Device-Id` (reportes 10/min, votos 30/min)
  con poda del Map de intentos (sin DoS de memoria).
- **Guard de Content-Type:** las mutaciones solo aceptan
  `application/json` (415 en caso contrario).
- **Validacion OWASP:** longitud validada ANTES de truncar, caracteres
  de control eliminados (`cleanText`), lat/lon en rangos reales,
  categoria en whitelist.
- **Foto:** MIME estricto (`data:image/jpeg|png|webp;base64,` — rechaza
  `svg+xml` y `javascript:`), base64 verificado, tope de bytes
  decodificados (`maxPhotoBytes`, 3 MB) y **re-encode a JPEG 900 px /
  q0.8 con sharp** (descarta EXIF/GPS del telefono).
- **Filtro NSFW (filtro principal):** clasificador ViT
  (`AdamCodd/vit-base-nsfw-detector`, Apache-2.0) via
  `@huggingface/transformers` (ONNX/WASM, sin binarios nativos). Foto
  con puntaje >= `NSFW_THRESHOLD` (0.5) -> `422` y no se publica. El
  modelo (~84 MB) se descarga solo al primer arranque
  (`data/models/hf`, gitignored). Si el modelo no carga, degrada a
  permitir con auditoria (`moderation.nsfwScore`). Tambien hay
  **bloqueo por texto** (`filters/keywords.js`): terminos explicitos en
  titulo/descripcion -> `422`.
- **Dedupe global:** misma foto (hash sha256 del ORIGINAL) o misma
  celda de grilla (~110 m) + categoria, dentro de 7 dias -> `409`.
- **Votos:** un voto por `deviceId` + reporte (`voters[]` en db.js,
  acotado a 2000 entradas) ademas del rate-limit por IP.
- **Headers de seguridad** (X-Content-Type-Options, X-Frame-Options,
  Referrer-Policy, sin X-Powered-By) y `trust proxy` configurable
  (`TRUST_PROXY=1` detras de nginx/caddy para ver la IP real).
- **Errores:** 404 y 500 JSON sin filtrar detalles internos.

El detalle completo esta en `docs/ANTIABUSO.md`.

## Como correr

```bash
cd api
npm install
npm start          # http://localhost:3000
```

La primera ejecucion crea `data/db.json` con seed de ejemplo y
**descarga el modelo NSFW** (~84 MB, una sola vez, a `data/models/hf`).
`package.json` — revisar scripts disponibles (`npm run`).

## Configuracion (variables de entorno)

Ver `.env.example` en la raiz del repo:

- `PORT` — puerto (default `3000`)
- `CORS_ORIGIN` — origen del frontend (default `*`; en produccion el
  dominio real)
- `TRUST_PROXY` — `1` detras de nginx/caddy (default `0`)
- `NSFW_ENABLED` / `NSFW_THRESHOLD` / `NSFW_MODEL` / `NSFW_DTYPE` —
  filtro de contenido explicito (default: activo, umbral 0.5)
- `LIMITS` / `DEDUPE` — en `src/config.js` (rate-limits, tamanos,
  paginacion, ventana de dedupe)

## Pendiente

- Moderacion humana (cola de reportes marcados).
- Autenticacion de moderadores con **Authentik** (OIDC + PKCE; el
  `client_secret` vive en este servidor, nunca en el frontend). El
  anonimato ciudadano es innegociable.
- Deploy (frontend estatico + API detras de proxy con TLS).
