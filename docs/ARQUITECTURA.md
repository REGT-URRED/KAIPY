# ARQUITECTURA — kaipy

Base frontend escalable para la web app. Dos pilares:

## 1. Atomic Design (Brad Frost)

Jerarquía visual de componentes en 5 niveles. Cada nivel vive en su
carpeta correspondiente bajo `assets/css/` (estilos) y `components/`
(HTML parcial).

| Nivel       | Qué contiene                          | Ejemplo                      |
|-------------|---------------------------------------|------------------------------|
| atoms       | Elementos básicos indivisibles        | botón, input, label, ícono   |
| molecules   | Átomos combinados con función propia  | campo de búsqueda, nav       |
| organisms   | Secciones completas del layout        | header, footer, card grid    |
| templates   | Composición de organismos por página  | layout home, layout login    |
| pages       | Instancias concretas con contenido    | home con datos reales        |

Regla estructural: **los niveles solo importan niveles inferiores**.
`pages/` usa `templates/`, `templates/` usa `organisms/`, etc. Nunca al
revés. Esto garantiza que un cambio en un átomo propague sin romper
nada (protected variations).

## 2. GRASP (General Responsibility Assignment Software Patterns)

Patrones de asignación de responsabilidades aplicados al frontend:

- **Information Expert**: cada archivo maneja solo la información que le
  pertenece. `config.js` sabe de configuración, `utils.js` de helpers.
- **High Cohesion**: cada módulo hace una sola cosa. Un CSS de botones
  no contiene estilos de header.
- **Low Coupling**: los módulos no se conocen entre sí; se comunican por
  convención (clases y `window.KAIPY`).
- **Controller**: los listeners y orquestación de eventos viven en
  `assets/js/modules/` (uno por sección), no repartidos en el HTML.
- **Indirection**: la UI no habla con el backend directo; pasará por una
  capa de servicios en `js/modules/services/` cuando exista el backend.
- **Protected Variations**: los tokens de diseño (`variables.css`) aíslan
  cambios de marca; `config.js` aísla cambios de entorno.

## Convenciones

1. Nomenclatura CSS: bloque BEM (`header__inner`, `btn--primary`).
2. Los archivos CSS se cargan en orden por nivel en el HTML
   (base → atoms → molecules → organisms → templates → pages).
3. JS: IIFE por módulo, sin dependencias globales salvo `window.KAIPY`.
4. Carpetas nuevas de nivel: crear el CSS en `assets/css/<nivel>/` y el
   HTML parcial en `components/<nivel>/`.

## Próximos pasos (cuando llegue el backend)

1. Crear `assets/js/modules/services/` para llamadas HTTP.
2. Poblar `config.apiBase` con el endpoint real.
3. Generar las páginas/templates según las rutas de la app.
