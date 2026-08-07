# API (backend) — pendiente

Carpeta reservada para el backend de kaipy. Cuando se definan las
necesidades (FASE 2 del `docs/PLAN_BASE.md`), aqui vivira el servicio:

- Decision de stack: Node/Express, Python/FastAPI, u otro.
- Contrato sugerido: estilo Open311 (GeoReport) — ver
  `docs/INVESTIGACION_PLATAFORMAS.md`.
- El frontend consumira via `src/scripts/modules/services/`
  reemplazando a `storage.js` (GRASP indirection ya preparado).
- `config.apiBase` (`src/scripts/core/config.js`) apuntara al endpoint.

## Anti-abuso y autenticacion (contrato FASE 2)

El detalle completo esta en `docs/ANTIABUSO.md`. Resumen del contrato
que este backend debe cumplir:

- **Revalidar SIEMPRE** la capa cliente (es best-effort): el servidor no
  confia en nada que venga del navegador.
- Cada reporte y voto llega con `deviceId` (huella FingerprintJS del
  cliente). El servidor lo usa como **campo de auditoria** y lo
  correlaciona con IP para rate-limit y dedupe global:
  - Reportes: rate-limit por IP + huella; dedupe por hash de foto +
    geohash + ventana; validacion estricta y limite de payload.
  - Votos: max 1 por huella + IP por reporte; deteccion de rafagas.
- **Authentik** (IdP OIDC auto-alojado, Docker Compose) se integra
  SOLO para moderadores/administradores, nunca para los ciudadanos que
  reportan (el anonimato ciudadano es innegociable).
  - Flujo: OIDC Authorization Code + **PKCE**; el `client_secret` vive
    en este servidor, jamás en el frontend.
  - Roles: `kaipy.moderator` (cola de moderacion, estados de reportes),
    `kaipy.admin` (gestión de moderadores, logs de abuso).
  - Los endpoints publicos de reporte no exigen sesion; el panel de
    moderacion si.
- **Privacidad (Ley 29733)**: politica de retencion de huellas, derecho
  de olvido y aviso legal dedicado.
