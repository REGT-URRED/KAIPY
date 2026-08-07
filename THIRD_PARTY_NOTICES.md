# Terceras partes — kaipy

kaipy usa componentes de terceros con sus propias licencias. Este
archivo documenta cada uno, su versión y su licencia (obligatorio
para publicación en GitHub).

## Vendored en el frontend (local, sin CDN)

| Componente | Ruta | Versión | Licencia |
|---|---|---|---|
| Leaflet | `src/assets/vendor/leaflet/` | 1.x | BSD-2-Clause |
| FingerprintJS | `src/assets/vendor/fingerprintjs/fp.min.js` | v5.2.0 | MIT |

## Dependencias del API (npm, ver `api/package-lock.json`)

| Paquete | Licencia | Uso |
|---|---|---|
| express | MIT | Servidor HTTP |
| cors | MIT | CORS |
| @huggingface/transformers | Apache-2.0 | Clasificador NSFW (ONNX/WASM) |
| sharp (transitiva de transformers) | Apache-2.0 | Re-encode de fotos (JPEG, sin EXIF) |
| onnxruntime-web (transitiva) | MIT | Inferencia WASM del modelo |

## Modelo de ML (se descarga en el primer arranque)

| Modelo | Origen | Licencia |
|---|---|---|
| `AdamCodd/vit-base-nsfw-detector` | Hugging Face | Apache-2.0 (base: `google/vit-base-patch16-384`) |

## Datos del mapa

| Fuente | Licencia |
|---|---|
| OpenStreetMap tiles (`https://{s}.tile.openstreetmap.org`) | OpenStreetMap / ODbL — atribución mostrada en el mapa por Leaflet |
