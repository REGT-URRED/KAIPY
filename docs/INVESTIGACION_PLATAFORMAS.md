# INVESTIGACION — Plataformas similares

Analisis de plataformas de quejas/reportes ciudadanos con foto y
geolocalizacion, hecho como referencia de diseno para kaipy.
**kaipy se construye desde cero**: se toman las lecciones, no el codigo.

## Referentes analizados

### FixMyStreet (Reino Unido, mySociety, 2007)
El estandar mundial. Open source (Perl + PostgreSQL + PostGIS).
Repo analizado: `github.com/mysociety/fixmystreet`.

- Flujo: mapa -> pin/geolocalizacion -> categoria -> titulo + detalle ->
  foto -> envio automatico a la autoridad local.
- Entidades del modelo de datos (leccion de diseno):
  - `problem`: titulo, detalle, categoria, lat, lon, geocode, estado,
    `interest_count` (votos de vecinos), campos extra JSON.
  - `users`: nombre, email/phone login, roles, area.
  - `alerts`: suscripciones de vecinos por zona (presion social).
  - `comments`: actualizaciones del reporte con cambio de estado.
  - `bodies` + `contacts`: autoridades y categorias por autoridad.
  - `moderation`: flags de abuso.
  - `report_extra_fields`: campos dinamicos por categoria.
  - full-text search sobre problems y users.
- Estados del reporte: abierto -> (investigando) -> resuelto/cerrado.

### SeeClickFix (EEUU, 2008, hoy CivicPlus)
Reportes no-emergencia con foto + GPS + votos comunitarios; integrado
con gobiernos locales. Mismo patron que FixMyStreet.

### Open311 (estandar)
API GeoReport: `POST service_requests` con lat/lon + foto + atributos,
estados y comentarios. Usado por SF, NYC y otras ciudades. El backend
de kaipy podria seguir este contrato.

### Otros
- FiksGataMi (Noruega), FixMyStreet Sudafrica — clones del framework.
- Love Clean Streets (Londres), Citizens Connect (Boston) — apps con
  foto + GPS.
- Latinoamerica: Reporta (Mexico, SocialTIC), Arregla Mi Calle (Chile),
  Cidade Democratica (Brasil); Peru: Reporta Ciudadano (PCM) y
  Denuncia Facil (Ministerio Publico).

## Proyectos mas avanzados (referencia profunda)

### Ushahidi (Kenya, open source)
El referente mas profundo para kaipy: plataforma de crowdsourcing que
**collata y mapea reportes generados por usuarios en tiempo real**.
- Reportes anonimos por movil o web con datos geograficos y de fecha.
- Usado para crisis, derechos humanos, monitoreo electoral.
- Leccion adaptada: el **mapa como vista central** con reportes que
  aparecen al instante + reportes sin identidad del autor.

### Waze (Google)
Navegacion comunitaria en tiempo real: cualquier usuario anonimo reporta
incidentes (accidente, bache, peligro) que **se ven al instante en el
mapa de todos** con GPS automatico.
- Leccion adaptada: **reportes de un toque con GPS del dispositivo**,
  visibles inmediatamente para la comunidad; el "yo tambien lo vi"
  funciona como confirmacion colectiva (equivalente a los reportes de
  otros conductores confirmando un incidente).

### SafeCity / HarassMap (reportes anonimos con mapa)
- SafeCity (MIT): reportes **anonimos** de acoso geolocalizados en mapa.
- HarassMap (Egipto): reportes anonimos de acoso + mapa + alertas.
- Leccion adaptada: el **anonimato como caracteristica central de
  diseno**: sin nombre, sin email, sin registro — reduce la barrera
  para reportar.

## Decisiones de adaptacion (kaipy)

1. **Mapa real: Leaflet + OpenStreetMap** — tecnologia estandar de
   mapas interactivos (la misma familia que usan muchas de estas
   plataformas), sin API key ni costo, adaptada con marcadores propios
   (pin naranja kaipy, punto azul de GPS con pulso). La experiencia
   "tipo Google Maps" (pins, popups, zoom, "ir a mi ubicacion") se
   logra sin depender de Google Maps API.
2. **GPS obligatorio al reportar**: la web pide acceso a la
   Geolocation API (permiso del navegador) y el pin queda en la
   ubicacion real; el usuario puede ajustar el punto tocando el mapa.
3. **Anonimato total**: no hay login, nombre ni email. El detalle
   muestra "Publicado de forma anonima".
4. **Apoyo colectivo**: boton "Yo tambien lo vi" (estilo Waze) en vez
   de "me gusta" — confirma que el reporte es real. Un voto por
   sesion en la demo; con backend pasara a verificacion real.
5. **Tiempo real (demo)**: evento `storage` del navegador — si otra
   pestana publica, el feed y el mapa se actualizan al instante. Con
   backend: WebSocket/SSE (patron Ushahidi).

## Lecciones aplicadas a kaipy

1. **Reporte = foto + ubicacion + categoria + descripcion** (flujo de
   reportar.html).
2. **Geolocalizacion en tiempo real** via Geolocation API del navegador
   (modulo `geolocation.js`); la foto puede sumar EXIF GPS despues.
3. **Votos de apoyo** (`votes` en cada reporte) — presion social sin
   login en la demo; con backend pasara a usuario real.
4. **Estados**: abierto / en revision / resuelto (badges).
5. **Feed como vista principal** + detalle por reporte.
6. **Moderacion anti-abuso**: pendiente; se agrega con backend.
7. **Envios a autoridad por categoria**: pendiente; decision de
   producto cuando exista backend.

## Decisiones conscientes

- Demo sin backend: `storage.js` persiste en localStorage y `demo-data.js`
  siembra reportes de ejemplo. La capa `storage` esta aislada
  (GRASP indirection) para reemplazarse por servicios HTTP sin tocar la UI.
- Mapa: placeholder visual (organismo `map.css`) hasta integrar
  Leaflet/MapLibre con el backend; la UI ya muestra lat/lon reales.
- Imagenes: se comprimen a 900px (canvas) para caber en localStorage;
  con backend se subiran a storage externo.
