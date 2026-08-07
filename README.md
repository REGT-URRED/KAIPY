# kaipy

Web app de reportes ciudadanos **anónimos**, pensada principalmente para
teléfonos (responsive mobile-first): las personas suben una foto con la
ubicación en tiempo real del problema (baches, alumbrado, basura,
seguridad, etc.) y otros confirman con "yo también lo vi".

Frontend estático vanilla organizado con **Atomic Design** + principios
**GRASP**, con backend **Node/Express** activo (API REST estilo Open311
+ SSE en tiempo real) y filtro **NSFW** server-side como protección
principal contra contenido inapropiado.

> Documento rector: `docs/PLAN_BASE.md`. Análisis de plataformas
> similares: `docs/INVESTIGACION_PLATAFORMAS.md`. Anti-abuso y
> filtros: `docs/ANTIABUSO.md`.

## Páginas

- `index.html` — home: mapa + tarjetas estilo Tinder (móvil) o mapa
  grande + panel de filtros y grilla (desktop)
- `reportar.html` — reporte anónimo en 3 pasos (foto, categoría, GPS)
- `reporte.html?id=...` — detalle con mapa y "Yo también lo vi"
- `stats.html` — estadísticas (por categoría y estados)

## Estado actual

- **Backend activo** (`api/`): Express, persistencia JSON (atómica),
  SSE con heartbeat, headers de seguridad, `trust proxy`, rate-limit
  por IP + `X-Device-Id`, paginación.
- **Filtro principal — contenido explícito (NSFW):** clasificador ViT
  (`AdamCodd/vit-base-nsfw-detector`, Apache-2.0) con
  `@huggingface/transformers` (ONNX/WASM, sin binarios nativos). Foto
  con puntaje ≥ umbral → `422`, no se publica. + bloqueo por palabras
  clave + dedupe global (hash de foto / grilla de ~110 m) + re-encode
  de fotos que descarta EXIF/GPS.
- **Frontend API-first con fallback offline:** si el API responde, los
  reportes reales reemplazan al demo local y el feed se actualiza en
  vivo (SSE); si no responde, la app cae a `localStorage` (demo).
- **Seguridad web:** CSP (sin scripts inline), `no-referrer`, render
  escapado (`escapeHtml`/`safePhoto`), foto validada en origen y en
  render.
- Reportes **anónimos**: sin registro, sin cookies; la huella de
  dispositivo (FingerprintJS local) solo correlaciona y limita
  suavemente — nunca bloquea al usuario legítimo.

### Imágenes (pipeline preparado para fotos reales)

- Compresión en el cliente (canvas): lado mayor a 1280px, JPEG, con
  calidad adaptativa que baja hasta caber en el límite del backend
  (3 MB) — nunca se entrega una foto que el servidor rechace.
- Orientación EXIF de iOS normalizada por el navegador; transparencia
  (capturas PNG) rellenada de blanco; EXIF/GPS descartado también en
  servidor (re-encode).
- Límites centralizados en `config.image` (frontend) como espejo de
  `LIMITS` (backend): si cambia uno, cambia el otro.
- Render diferido (`loading="lazy" decoding="async"`) en deck, grilla,
  popups y detalle; thumbnail en los popups del mapa. Hoy el feed usa
  SVGs de demo (`src/assets/img/`).

### Responsive móvil (iPhone incluido)

- **Safe-area:** el topbar respeta el notch / Dynamic Island y el
  bottom-nav el home indicator (`env(safe-area-inset-*)`).
- **`color-scheme`** por tema: selects y scrollbars nativos de iOS
  correctos en modo oscuro.
- **`touch-action: manipulation`** en botones y nav (sin doble-tap
  zoom) y tap targets ≥ 44px (HIG de Apple).
- **Desktop con `(min-width: 900px) and (pointer: fine)`**: un teléfono
  en landscape (~932px) NO recibe la vista desktop; el deck se mantiene.
- **Tablet (640–900px):** deck y mapa ampliados. **Hover solo con
  puntero real** (`@media (hover: hover)`): sin hover pegajoso al tocar.
- **PWA mínima:** `manifest.json`, iconos y `apple-touch-icon` — el
  sitio se puede "Agregar a pantalla de inicio" en iPhone.

## Requisitos

Ver `requirements.txt`. Node.js ≥ 18 (npm) para el API; Python 3.10+
opcional solo para servir los estáticos en demo.

## Cómo correr

```bash
# 1) Backend (primera vez: npm install descarga deps; el primer
#    arranque descarga el modelo NSFW ~84 MB a api/data/models/hf)
cd api
npm install
npm start            # http://localhost:3000

# 2) Frontend estático (otra terminal, desde la raíz)
python -m http.server 8099    # o cualquier servidor estático
# abrir http://localhost:8099
```

El frontend usa `http://localhost:3000` como API por defecto
(`src/scripts/core/config.js` → `config.apiBase`). Variables de
entorno del API: `.env.example`.

## Estructura

```
kaipy/
├── index.html, reportar.html, reporte.html, stats.html  # páginas
├── src/                          # código fuente del frontend
│   ├── styles/                   # CSS atómico (base/atoms/molecules/
│   │   │                         #  organisms/templates/pages)
│   ├── scripts/
│   │   ├── core/                 # config.js, utils.js
│   │   └── modules/              # services (HTTP+SSE), storage
│   │                             #  (fallback), feed, home, form,
│   │                             #  detail, stats, map, fingerprint...
│   ├── components/               # parciales HTML de referencia
│   └── assets/
│       ├── img/                  # imágenes (SVG demo, iconos PWA)
│       └── vendor/               # librerías locales (leaflet,
│                                 #  fingerprintjs — sin CDN)
├── api/                          # backend Node/Express — ver api/README.md
│   └── src/
│       ├── filters/              # nsfw.js, keywords.js, image.js
│       ├── routes/               # reports, stats, events (SSE)
│       └── middleware.js         # rate-limit, validación OWASP
├── db/                           # (FUTURO) base de datos — ver db/README.md
├── docs/                         # documentación
├── LICENSE                       # MIT
├── THIRD_PARTY_NOTICES.md        # licencias de componentes usados
└── README.md
```

## Regla de oro

- **Atoms** no conocen a nadie. **Molecules** componen átomos.
  **Organisms** componen moléculas. **Templates** ordenan organismos.
  **Pages** son instancias con contenido real.
- Los estilos de un nivel SOLO importan niveles inferiores, nunca superiores.
- Toda configuración vive en `src/scripts/core/config.js` (indirection).
- Cada módulo hace una sola cosa (high cohesion) y no depende de otros
  (low coupling).
- Sin CSS muerto: cada archivo en `src/styles/` debe estar referenciado.

## Deploy (futuro)

El proyecto está empaquetado para GitHub, no para deploy. Cuando llegue
el momento: servir `api/` y los estáticos detrás de un reverse proxy con
TLS (`TRUST_PROXY=1`, `CORS_ORIGIN=<dominio>`), HSTS en el proxy, y el
modelo NSFW se descarga solo en el primer arranque del servidor.
