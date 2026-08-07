# Anti-abuso — kaipy

Guía del filtro de subidas mal intencionadas. Explica qué se protege,
qué está implementado hoy (capa cliente + capa servidor, FASE 2 ya
cubierta en `api/`), qué sigue pendiente y cómo encaja Authentik para
los moderadores.

## 1. Por qué existe este filtro

kaipy publica reportes ciudadanos anónimos. Un reporte falso (vandalismo
de contenido), una foto basura, votos inflados o una avalancha de
duplicados pueden matar la utilidad de la plataforma. El filtro busca
frenar eso **sin exigir identidad a los ciudadanos**: el anonimato es el
valor central del proyecto.

## 2. Modelo de amenazas

| Amenaza | Ejemplo | Freno en cliente | Freno en servidor (api/) |
|---|---|---|---|
| Flood de reportes | 500 reportes en 1 min | Rate-limit por dispositivo (3 / 10 min) | Rate-limit por IP + `X-Device-Id` (10/min) con poda del Map; guard `Content-Type: application/json` |
| Duplicados deliberados | Mismo bache reportado 20 veces | Dedupe por dispositivo: misma categoría + radio 100 m + 30 min | **Dedupe global implementado**: hash sha256 de la foto + celda de grilla ~110 m + misma categoría, ventana 7 días (`DEDUPE` en `config.js`) |
| Votos inflados | Un bot "apoya" un reporte 500 veces | Un voto por dispositivo (persistente) | Dedupe real: 1 voto por `deviceId` + reporte (`voters[]` en `db.js`) + rate-limit por IP (30/min) |
| Contenido basura | Título de 10.000 caracteres | `maxlength` HTML + saneo y recorte en JS | Validación estricta + saneo en servidor (longitud antes de truncar, caracteres de control) |
| Foto maliciosa/ilegal | Archivo 200 MB, imagen corrupta, EXIF con GPS | Validación de tipo, tamaño (15 MB) y dimensiones; re-encode a JPEG que descarta EXIF | MIME estricto (`data:image/jpeg\|png\|webp;base64,` — rechaza `svg+xml`), base64 verificado, tope de bytes **+ clasificador NSFW en servidor (filtro principal, sección 4bis)**. Pendiente: re-encode en servidor y moderación humana |
| HTML/script injection | `<script>` en la descripción | `sanitizeText` + `escapeHtml`/`textContent` en render | Saneo de control chars en servidor + `safePhoto` en el render (solo jpeg/png/webp o ruta local) |

## 3. Capa cliente implementada (FASE 1)

La capa cliente es **best-effort**: frena al vago y al casual, no al
determinado. Todo lo que hace el navegador puede ser simulado. Por eso
el servidor (`api/`) revalida **todo** (ver sección 4). Los valores
exactos de ventanas y límites viven en `src/scripts/core/config.js` →
`abuse`.

### 3.1 Identidad de dispositivo — `src/scripts/modules/fingerprint.js`

- Envuelve **FingerprintJS v5** (vendored en
  `src/assets/vendor/fingerprintjs/fp.min.js`, patrón leaflet: local,
  sin CDN, para no romper con ad blockers).
- Expone `window.KAIPY.fingerprint.getId()` → `Promise<string>`
  (visitorId estable y anónimo).
- Si la huella falla o está deshabilitada (`abuse.fingerprintEnabled`),
  cae a un ID de respaldo persistente en localStorage (`kaipy.device`).
- **Nunca rompe la app**: sin FingerprintJS, con ad blocker o con
  localStorage bloqueado, la app sigue funcionando con el respaldo.
- La huella es una **señal suave**, no una frontera de seguridad: un
  atacante puede borrarla (modo incógnito, otra máquina) o falsearla.
  Su fuerza real aparece cuando el backend correlaciona huella + IP +
  comportamiento.

### 3.2 Rate-limit de reportes — `src/scripts/modules/storage.js`

- `submitAllowed(deviceId)`: máx. `rateLimitMax` (3) reportes por
  `rateLimitWindowMs` (10 min) por dispositivo.
- `recordSubmission(deviceId)`: registra el timestamp y poda la ventana.
- Marcas guardadas en localStorage (`kaipy.abuse.submissions`).

### 3.3 Duplicados del mismo dispositivo

- `findDuplicate(candidate)`: rechaza un reporte si el mismo dispositivo
  ya publicó **la misma categoría** dentro de `duplicateWindowMs`
  (30 min) y `duplicateRadiusM` (100 m) del nuevo punto.

### 3.4 Voto "Yo también lo vi" — `src/scripts/modules/report-detail.js`

- Cada voto lleva el `deviceId`; `storage.vote(id, deviceId)` cuenta un
  solo apoyo por dispositivo (`voters[]`).
- El gate `utils.hasVoted/markVoted` pasó de sessionStorage a
  **localStorage** para persistir entre reinicios del navegador.

### 3.5 Validación de fotos — `src/scripts/modules/image.js`

- Límites (`image.limits`): 15 MB máx. de archivo, 10.000 px máx. por
  lado, 48 px mín. por lado.
- Rechaza MIME que no sea imagen y archivos no decodificables.
- Re-encode a **JPEG 900 px / 0.8** vía canvas: normaliza formato,
  reduce peso para localStorage y **descarta metadatos EXIF** (incluido
  el GPS que el teléfono incrusta en la foto).

### 3.6 Saneo de texto — `src/scripts/core/utils.js`

- `sanitizeText(value, max)`: elimina caracteres de control, colapsa
  espacios y recorta a 120 (título) / 1000 (descripción).
- Espejo del `maxlength` del HTML: defensa en dos capas.

## 4. Contrato de servidor (implementado en `api/`)

El backend ya revalida todo lo crítico — el cliente no es confiable:

1. **Revalidación total**:
   - Reportes: rate-limit por IP + `X-Device-Id` (clave combinada: no
     bloquea a una NAT completa ni se evade solo borrando la huella);
     validación estricta de campos (longitud antes de truncar,
     categoría whitelist, lat/lon en rango); MIME de foto estricto
     (solo jpeg/png/webp, base64 verificado, tope de bytes); límite de
     payload por `express.json({ limit: "3mb" })` + guard de
     `Content-Type: application/json`.
   - Votos: máximo 1 por dispositivo + reporte (`voters[]` en `db.js`,
     acotado a 2000 entradas); rate-limit por IP como red de seguridad.
2. **La huella viaja como auditoría** — el `deviceId` (vía header
   `X-Device-Id` o campo `deviceId` del voto) no es una credencial:
   sirve para correlación y reporte de abusos, nunca para bloquear al
   anónimo legítimo.
3. **Endurecimiento web (sin exigir identidad)**:
   - Headers de seguridad en toda respuesta: `X-Content-Type-Options:
     nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy:
     no-referrer` (no filtrar GPS a terceros), `X-Powered-By` vacío.
   - `app.set("trust proxy", TRUST_PROXY)`: con `TRUST_PROXY=1` detrás
     de nginx/caddy el rate-limit usa la IP real del cliente en vez de
     la del proxy (evita bloqueos masivos injustos).
   - Listado paginado (`?limit&offset`, máx. 100) y **sin fotos** en el
     listado: el detalle es el único endpoint que trae el base64
     (evita respuestas gigantes / DoS de memoria / móviles lentos).
   - SSE con heartbeat (25 s) y eviction de clientes muertos.
   - CSP + `no-referrer` en las 4 páginas estáticas (meta tag):
     `script-src 'self'` (cero scripts inline), `img-src` limita a
     tiles de OpenStreetMap, `connect-src` al API.
   - `safePhoto` en el render del frontend: solo dataURL jpeg/png/webp
     o ruta local — defensa en profundidad contra stored XSS.
4. **Pendiente (próximas fases)**: re-encode de imagen en servidor;
   moderación humana; Authentik para moderadores (sección 5).
5. **OWASP Top 10 como checklist** — inyección (HTML), validación de
   entrada, rate limiting y protección de datos personales primero.

### 4bis. Filtro principal: contenido explícito (NSFW/pornografía)

El bloqueo de pornografía y contenido inapropiado en las fotos es el
filtro central del proyecto. Implementado en el servidor con
clasificación de imágenes, en tres capas:

1. **MIME estricto** (`middleware.js`): solo `data:image/jpeg|png|webp;base64,`
   con base64 verificado y tope de bytes. Un `data:image/svg+xml,<script>`
   jamás llega al clasificador ni al navegador.
2. **Clasificador NSFW** (`api/src/filters/nsfw.js`): ViT
   `AdamCodd/vit-base-nsfw-detector` (Apache-2.0, accuracy 96.5 %,
   AUC 0.9948) ejecutado con **transformers.js** — ONNX int8 sobre
   WASM, **sin binarios nativos** (funciona en Windows/Linux sin
   compilar; por eso se descartó tfjs-node, que exige build nativo).
   El modelo se descarga de HuggingFace al primer arranque y queda en
   `data/models/hf` (gitignored). Umbral configurable
   (`NSFW_THRESHOLD`, default 0.5 sobre el puntaje `nsfw`).
3. **Filtro por texto** (`api/src/filters/keywords.js`): términos
   explícitos/ilegales en título y descripción (`porno`, `pornografia`,
   `hentai`, `onlyfans`, `pedofil`, ...) → 422 sin gastar inferencia.

**Reglas de operación**:

- Foto con puntaje ≥ umbral → `422 Contenido inapropiado`, el reporte
  **no se publica**.
- Cada foto permitida guarda su puntaje como auditoría
  (`report.moderation.nsfwScore`) — es una señal de correlación, no un
  dato personal.
- **Degradación controlada**: si el modelo no puede descargarse/cargarse
  (sin internet, disco lleno), el filtro responde `unavailable` y la
  foto pasa — el usuario anónimo legítimo nunca queda bloqueado por un
  fallo del filtro. El log avisa `NSFW: no se pudo cargar el modelo`.
- `NSFW_ENABLED=0` desactiva el filtro explícitamente (útil para
  entornos de prueba).

### Despliegue (producción)

- Servir el frontend estático y el API **detrás de un reverse proxy con
  TLS** (nginx/caddy): el proxy añade HSTS, HTTP→HTTPS y `read_timeout`
  alto para el SSE (el heartbeat del API ya previene cierres por
  inactividad).
- `TRUST_PROXY=1` en el API si el proxy termina TLS.
- `CORS_ORIGIN=<dominio real>` en vez de `*`.
- El usuario anónimo **no necesita nada de esto**: sin registro, sin
  cookies, sin TLS en el navegador más allá del que ya da el proxy.

## 5. Authentik — contrato de moderadores (pendiente)

Authentik es un IdP auto-alojado (Docker Compose + PostgreSQL + Redis).
**Hoy no aporta nada** (no hay backend ni usuarios); se integra en
FASE 2 **exclusivamente para moderadores/administradores**, nunca para
los ciudadanos que reportan (el anonimato ciudadano es innegociable).

- **Flujo**: OIDC *Authorization Code + PKCE* — el frontend pide un
  code con verifier PKCE y lo canjea en el backend (el `client_secret`
  vive en el servidor, jamás en el frontend).
- **Roles**: `kaipy.moderator` (revisa cola, cambia estado de
  reportes), `kaipy.admin` (gestión de moderadores, logs de abuso).
- **Separación**: el panel de moderación es un área distinta; los
  endpoints públicos de reporte no exigen sesión.
- **Ventajas frente a auth propia**: no hay que construir login,
  MFA/TOTP y gestión de usuarios desde cero; es OSS MIT y se puede
  sustituir por cualquier IdP OIDC compatible.

## 6. Privacidad (Ley 29733, Perú)

El ID de dispositivo (huella) y la ubicación GPS son datos personales
según la Ley 29733. La app hace lo mínimo para cumplir en la demo:

- El formulario de reporte lo dice explícitamente: *"Tu dispositivo
  genera un ID anónimo (huella) para frenar duplicados y abusos; no se
  guarda tu identidad"*, con enlace a este documento.
- La foto se re-encodea descartando EXIF/GPS.
- El visitorId es pseudónimo: no permite, por sí solo, identificar a la
  persona. Para FASE 2: política de retención (destruir huellas viejas),
  derecho de olvido y, si crece, un aviso legal dedicado.

## 7. Límites honestos

- **La huella se puede borrar o falsear** (modo incógnito, otra
  máquina, extensiones). No es un bloqueo: es un disuasivo y una señal
  de correlación.
- **localStorage es local a un navegador** — el rate-limit no cruza
  navegadores ni equipos. Solo el backend con IP + huella lo cierra.
- **El voto único por dispositivo** no impide abrir la app en 10
  equipos. Es una elevación del costo del abuso, no su eliminación.

## 8. Resumen de archivos

| Archivo | Rol |
|---|---|
| `src/assets/vendor/fingerprintjs/fp.min.js` | FingerprintJS v5 local (MIT) |
| `src/scripts/modules/fingerprint.js` | GRASP indirection: `getId()` + respaldo |
| `src/scripts/core/config.js` | `abuse`: ventanas, límites, llaves |
| `src/scripts/core/utils.js` | `sanitizeText`, `hasVoted/markVoted` persistente |
| `src/scripts/modules/storage.js` | rate-limit, dedupe, voto por dispositivo |
| `src/scripts/modules/image.js` | validación + re-encode (sin EXIF) |
| `src/scripts/modules/report-form.js` | gate de subida (huella → rate-limit → dedupe) |
| `src/scripts/modules/report-detail.js` | voto con deviceId |
| `reportar.html` / `reporte.html` | carga de vendor + módulo, aviso de privacidad |
