# kaipy

Web app de reportes ciudadanos **anonimos**, pensada principalmente para
telefonos (responsive mobile-first): las personas suben una foto con la
ubicacion en tiempo real del problema (baches, alumbrado, basura,
seguridad, etc.) y otros confirman con "yo tambien lo vi".

Frontend estatico vanilla organizado con **Atomic Design** + principios
**GRASP**, con arquitectura preparada para backend y base de datos.

> Documento rector: `docs/PLAN_BASE.md`. Analisis de plataformas
> similares: `docs/INVESTIGACION_PLATAFORMAS.md`.

## Paginas

- `index.html` — home app: metricas, filtros, feed y mapa (tabs)
- `reportar.html` — reporte anonimo en 3 pasos (foto, categoria, GPS)
- `reporte.html?id=...` — detalle con mapa y "Yo tambien lo vi"
- `stats.html` — estadisticas (por categoria y estados)

## Estado actual

Demo funcional sin backend: reportes **anonimos** (sin nombre ni
registro) con foto comprimida, **ubicacion GPS real** (permiso del
navegador solo al reportar o tocar "Ver cercanos"), **mapa Leaflet +
OpenStreetMap** con pins y popups, boton "Yo tambien lo vi" con toast,
**tiempo real entre pestanas** (evento storage) y pagina de estadisticas.

**Doble vista responsive:**
- Telefono (principal): mapa + tarjetas estilo Tinder (swipe), FAB para
  reportar, bottom-nav (Ver / + / Estadísticas).
- Computadora (>=900px): vista amplia de exploracion — mapa grande
  sticky + panel con busqueda, filtros por categoria y estado, boton
  cercanos y grilla de tarjetas; reportar sigue accesible.

**Tema claro/oscuro:** toggle en el topbar (persistencia localStorage,
respeta la preferencia del sistema). Marca: "kaip**y**" — la Y latina
en carmesi sobre texto oscuro.

Persistencia en `localStorage`; el feed se siembra con datos de ejemplo
(SVG). La capa `src/scripts/modules/storage.js` esta aislada para
reemplazarse por servicios HTTP cuando exista backend.

## Estructura

```
kaipy/
├── index.html, reportar.html, reporte.html, stats.html  # paginas servidas
├── src/                          # codigo fuente de la aplicacion
│   ├── styles/                   # CSS atomico (base/atoms/molecules/
│   │   │                         #  organisms/templates/pages)
│   ├── scripts/
│   │   ├── core/                 # config.js, utils.js
│   │   └── modules/              # storage, feed, home, report-form,
│   │                             #  report-detail, stats, map, geolocation...
│   ├── components/               # parciales HTML de referencia
│   └── assets/
│       ├── img/                  # imagenes (SVG demo, fotos futuras)
│       └── vendor/               # librerias locales (leaflet)
├── api/                          # (FUTURO) backend — ver api/README.md
├── db/                           # (FUTURO) base de datos — ver db/README.md
├── docs/                         # documentacion
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

## Cómo correr

Abrir `index.html` en el navegador directamente, o servir con:

```bash
python3 -m http.server 8000
```

## Backend (pendiente)

Cuando se definan las necesidades: `config.apiBase` apuntara al endpoint,
`storage.js` se reemplaza por la capa de servicios HTTP
(`src/scripts/modules/services/`), y se decide el modelo de datos
(relacional vs grafo — ver `docs/GRAPH_ENGINEER.md`).
