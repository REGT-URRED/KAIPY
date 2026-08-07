# Anti-abuso — kaipy

Guía del filtro de subidas mal intencionadas. Explica qué se protege,
qué está implementado hoy (capa cliente, best-effort), qué debe
revalidar el backend en FASE 2 y cómo encaja Authentik para los
moderadores.

## 1. Por qué existe este filtro

kaipy publica reportes ciudadanos anónimos. Un reporte falso (vandalismo
de contenido), una foto basura, votos inflados o una avalancha de
duplicados pueden matar la utilidad de la plataforma. El filtro busca
frenar eso **sin exigir identidad a los ciudadanos**: el anonimato es el
valor central del proyecto.

## 2. Modelo de amenazas

| Amenaza | Ejemplo | Freno en cliente (hoy) | Freno en servidor (FASE 2) |
|---|---|---|---|
| Flood de reportes | 500 reportes en 1 min | Rate-limit por dispositivo (3 / 10 min) | Rate-limit por IP + huella + CAPTCHA opcional |
| Duplicados deliberados | Mismo bache reportado 20 veces | Dedupe por dispositivo: misma categoría + radio 100 m + 30 min | Dedupe global por hash de foto + geohash |
| Votos inflados | Un bot "apoya" un reporte 500 veces | Un voto por dispositivo (persistente) | Revalidar por huella + IP en cada voto |
| Contenido basura | Título de 10.000 caracteres | `maxlength` HTML + saneo y recorte en JS | Validación estricta en el servidor (OWASP) |
| Foto maliciosa/ilegal | Archivo 200 MB, imagen corrupta, EXIF con GPS | Validación de tipo, tamaño (15 MB) y dimensiones; re-encode a JPEG que descarta EXIF | Re-encode y análisis en servidor; moderación humana |
| HTML/script injection | `<script>` en la descripción | `sanitizeText` (control chars, espacios, recorte) | Escapado/saneo del lado servidor, jamás confiar en el cliente |

## 3. Capa cliente implementada (FASE 1)

La capa cliente es **best-effort**: frena al vago y al casual, no al
determinado. Todo lo que hace el navegador puede ser simulado. Por eso
el servidor (FASE 2) debe revalidar **todo**. Los valores exactos de
ventanas y límites viven en `src/scripts/core/config.js` → `abuse`.

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

## 4. Contrato de servidor (FASE 2)

Cuando exista el backend, `storage.js` se reemplaza por la capa de
servicios (`src/scripts/modules/services/`) y el cliente envía cada
operación al endpoint de `config.apiBase`. El servidor debe:

1. **Revalidar todo** — el cliente no es confiable:
   - Reportes: rate-limit por IP + huella; dedupe global (hash de foto
     + geohash + ventana); validación estricta de campos; límite de
     tamaño de payload.
   - Votos: máximo 1 por huella + IP por reporte; correlación temporal
     para detectar ráfagas.
2. **Guardar la huella como campo de auditoría** — el visitorId viaja
   con el reporte (`report.deviceId`). No es un secreto: sirve para
   correlación y reporte de abusos, no como credencial.
3. **Moderación** — un reporte marcado por la comunidad o sospechoso
   entra a cola de moderación (estado `pending` en lugar de `open`).
4. **Authentik para moderadores** — ver sección 5.
5. **OWASP Top 10 como checklist** — inyección (SQL/HTML), validación de
   entrada, límite de tasa (rate limiting) y protección de datos
   personales primero.

## 5. Authentik — contrato de moderadores (FASE 2)

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
