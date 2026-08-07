# PLAN BASE — kaipy

Guía rectora del proyecto: qué armar, qué cumplir y cómo decidir.
Este documento es la regla base. Cualquier cambio estructural grande se
documenta aquí antes de ejecutarse.

## 1. Visión

kaipy es una web app que arranca como frontend estático (HTML/CSS/JS
vanilla) y crecerá con backend según las necesidades que se definan.
Los datos podrían modelarse como grafo (ver `docs/GRAPH_ENGINEER.md`),
pero esa decisión se toma cuando exista el backend, no antes.

## 2. Principios rectores (reglas innegociables)

### 2.1 Atomic Design (Brad Frost)
Jerarquía de 5 niveles: **atoms → molecules → organisms → templates →
pages**. Regla estructural: cada nivel SOLO importa niveles inferiores,
nunca superiores. Un cambio en un átomo debe propagar sin romper nada.

### 2.2 GRASP (asignación de responsabilidades)
- **High cohesion**: cada archivo hace una sola cosa.
- **Low coupling**: los módulos no se conocen entre sí; se comunican por
  convención (`window.KAIPY`, clases BEM).
- **Controller**: eventos orquestados en `js/modules/`, no en el HTML.
- **Indirection**: la UI nunca habla con backend/grafo directo; pasa por
  la capa de servicios.
- **Protected variations**: tokens (`variables.css`) y config
  (`config.js`) aíslan cambios de marca y entorno.
- **Information expert**: cada módulo maneja solo su información.

### 2.3 BEM (naming)
`bloque__elemento--modificador`. Ejemplo: `header__inner`, `btn--primary`.
Prohibido IDs para estilos; IDs solo para anclas y JS puntual.

### 2.4 Frontend limpio (vanilla primero)
- Sin frameworks hasta que el proyecto lo exija de verdad (YAGNI).
- Progressive enhancement: la página funciona sin JS; JS la mejora.
- Semántica HTML correcta (`header`, `nav`, `main`, `section`, `footer`).

### 2.5 Accesibilidad (a11y)
- Contraste AA mínimo (4.5:1 texto normal).
- `aria-label` en controles sin texto visible; foco visible siempre.
- Navegación con teclado funcional al 100%.

### 2.6 Responsive / mobile-first
- Diseñar primero para móvil, escalar con media queries.
- Tokens de espaciado y tipografía en `variables.css`; sin valores
  mágicos sueltos en los componentes.

### 2.7 Rendimiento
- CSS/JS en orden por nivel; sin duplicar reglas entre niveles.
- Imágenes en `assets/img/` optimizadas (WebP/AVIF cuando aplique).
- Sin librerías externas innecesarias (budget de peso: < 200 KB total).

### 2.8 Seguridad (cuando exista backend)
- OWASP Top 10 como checklist obligatoria antes de cada release.
- Nunca credenciales en el frontend; todo via `config.js` → env.
- Validación de entrada en el servidor SIEMPRE (el cliente no confía).

## 3. Estructura de carpetas (estado actual + reglas de crecimiento)

```
kaipy/
├── index.html, reportar.html, reporte.html, stats.html  # páginas
├── README.md                   # Entrada rápida
├── docs/
│   ├── ANTIABUSO.md            # Filtro anti-abuso (cliente + contrato FASE 2)
│   ├── ARQUITECTURA.md         # Reglas técnicas detalladas
│   ├── GRAPH_ENGINEER.md       # Investigación de modelado por grafos
│   ├── INVESTIGACION_PLATAFORMAS.md  # Análisis de la competencia
│   └── PLAN_BASE.md            # ESTE documento (guía rectora)
├── src/
│   ├── styles/
│   │   ├── base/               # reset, variables, typography
│   │   ├── atoms/              # botones, inputs, badges, tabs, chips, photo
│   │   ├── molecules/          # report-row, stat-card, form-field, pills
│   │   ├── organisms/          # topbar, bottom-nav, feed, report-form, map, toast
│   │   ├── templates/          # layouts home, report, detail, stats
│   │   └── pages/              # ajustes por página concreta
│   ├── scripts/
│   │   ├── core/               # config.js, utils.js (indirection)
│   │   └── modules/            # storage, feed, home, report-form,
│   │                           #  report-detail, stats, map, geolocation,
│   │                           #  image, fingerprint
│   ├── components/             # HTML parciales de referencia por nivel
│   └── assets/
│       ├── img/                # imágenes
│       └── vendor/             # librerías locales (leaflet, fingerprintjs)
├── api/                        # (FUTURO) backend, con su propia guía
└── db/                         # (FUTURO) base de datos, con su propia guía
```

Regla de crecimiento: carpeta nueva SIEMPRE en el nivel que corresponde,
con su CSS en `src/styles/<nivel>/` y su HTML en `src/components/<nivel>/`.
Nunca mezclar niveles en un mismo archivo. Sin CSS muerto: todo archivo
de `src/styles/` debe estar referenciado por alguna página.

## 4. Qué armar (roadmap por fases)

### FASE 0 — Base (HECHA)
- [x] Estructura de carpetas atómica
- [x] Tokens de diseño (`variables.css`)
- [x] Reset + tipografía
- [x] Ejemplo de cada nivel (botones, header, footer, template home)
- [x] `config.js` + `utils.js` + controller mínimo
- [x] Documentación (ARQUITECTURA, GRAPH_ENGINEER, PLAN_BASE)

### FASE 1 — Frontend estático completo
- [x] Páginas reales: home (feed + mapa), reportar (form anónimo), detalle
- [x] Molecules: report-card, form-field, category-pills, photo
- [x] Organisms: feed, report-form, map (Leaflet + OpenStreetMap)
- [x] Templates por tipo de página (home, report, detail)
- [x] Funcionalidad demo: reporte anónimo (solo foto + categoría
      obligatorias), foto comprimida, GPS real (permiso del navegador +
      ajuste tocando el mapa), mapa con pins y popups, "Yo también lo
      vi", tiempo real entre pestañas (evento storage)
- [x] Anti-abuso capa cliente (best-effort): huella de dispositivo
      (FingerprintJS vendored), rate-limit, dedupe del mismo
      dispositivo, voto único por dispositivo, validación de fotos
      (tipo/tamaño/dimensiones + re-encode sin EXIF), saneo de texto —
      ver `docs/ANTIABUSO.md`
- [x] Responsive mobile-first completo
- [ ] Checklist de accesibilidad (2.5) aprobada
- [ ] Tiempo real multiusuario real (WebSocket/SSE) — con backend

### FASE 2 — Backend (cuando se definan necesidades)
- [ ] Decidir modelo de datos: relacional (PostgreSQL) vs grafo (Neo4j)
      — ver `docs/GRAPH_ENGINEER.md`, sección "Decisión de modelado"
- [ ] Crear `api/` con su propia estructura (no mezclar con frontend)
- [ ] Capa de servicios en `js/modules/services/` (indirection GRASP)
- [ ] Poblar `config.apiBase` con el endpoint real
- [ ] Revalidar anti-abuso en servidor (la capa cliente es best-effort):
      rate-limit por IP + huella, dedupe global (hash de foto + geohash),
      max 1 voto por huella+IP, validación estricta de entrada —
      ver `docs/ANTIABUSO.md`
- [ ] Authentik (OIDC + PKCE) para moderadores/administradores SOLO
      (el reporte ciudadano sigue anónimo); `client_secret` en servidor
- [ ] Panel de moderación (cola de reportes sospechosos, estados)
- [ ] Seguridad OWASP checklist
- [ ] Privacidad (Ley 29733): retención de huellas, derecho de olvido

### FASE 3 — Datos de grafo (solo si el modelo lo exige)
- [ ] Definir entidades y relaciones (knowledge graph)
- [ ] Elegir stack: Neo4j / ArangoDB / Dgraph + Cypher o GraphQL
- [ ] ETL/ingesta de datos
- [ ] Consultas expuestas vía GraphQL/REST; UI consume services

### FASE 4 — Producción
- [ ] Build/empaquetado (minificación CSS/JS)
- [ ] Deploy (servidor estático + API)
- [ ] Monitoreo y logs
- [ ] Backup del backend

## 5. Definition of Done (qué cumplir en CADA entrega)

- [ ] Sigue Atomic Design (nivel correcto, sin imports hacia arriba)
- [ ] Nombres BEM correctos; sin IDs para estilos
- [ ] Sin valores mágicos: usa tokens de `variables.css`
- [ ] Funciona sin JS (progressive enhancement) y con JS
- [ ] Responsive: se ve bien en móvil (375px) y desktop (1440px)
- [ ] Accesible: teclado navegable, contraste AA, aria cuando aplique
- [ ] No rompe nada existente (verificado en navegador)
- [ ] Documentación actualizada si cambió la estructura
- [ ] Commits claros (ver 6)

## 6. Convenciones de trabajo

- **Git**: rama `main` siempre funcional. Feature branches
  `feat/<nombre>`, fixes `fix/<nombre>`. Commits en español, imperativo
  ("agrega molecule de búsqueda", no "agregado").
- **Versionado**: semver (0.x.y hasta FASE 2, 1.0.0 en producción).
- **Idioma**: código, clases y docs en español (estándar del proyecto).
- **Prohibido**: archivos duplicados, CSS muerto, console.log en prod,
  secretos en el repo.

## 7. Cómo decidir (árbol rápido)

1. ¿Es un elemento visual indivisible? → atoms
2. ¿Combina átomos con una función? → molecules
3. ¿Es una sección del layout? → organisms
4. ¿Ordena organismos para una página? → templates
5. ¿Es una página con contenido real? → pages
6. ¿Es lógica de datos/API? → `js/modules/services/` (o `api/` en backend)
7. ¿Es configuración? → `config.js`
8. ¿Es un token de diseño? → `variables.css`
9. ¿Es una regla/decisión importante? → este documento
