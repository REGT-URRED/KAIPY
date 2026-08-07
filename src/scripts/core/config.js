/* ============================================
   CORE / config
   Configuración global del frontend.
   GRASP: indirection — única fuente de
   configuración, el resto la consume.
   ============================================ */
window.KAIPY = window.KAIPY || {};

window.KAIPY.config = {
  storageKey: "kaipy.reports",
  votedKey: "kaipy.voted",

  // Backend: base del API. Si no responde, la app cae
  // automaticamente a localStorage (modo demo offline).
  // Vacio = forzar modo local.
  apiBase: "http://localhost:3000",

  // Categorías de quejas urbanas
  categories: [
    "Alumbrado publico",
    "Baches y veredas",
    "Basura y residuos",
    "Areas verdes",
    "Senalizacion",
    "Seguridad",
    "Agua y desague",
    "Otros"
  ],

  // Estados posibles de un reporte
  states: {
    open: "Abierto",
    review: "En revision",
    resolved: "Resuelto"
  },

  // Mapa (Leaflet + OpenStreetMap)
  mapCenter: [-13.531950, -71.967463], // Cusco
  mapZoom: 13,

  // Imagenes de reportes (fotos reales de usuarios).
  // Espejo del backend (api/src/config.js LIMITS + validPhoto):
  // si cambia uno, cambia el otro. El cliente comprime SIEMPRE
  // antes de subir, asi que las fotos reales entran al limite.
  image: {
    // Archivo crudo que acepta el input de foto
    maxFileBytes: 15 * 1024 * 1024,   // 15 MB (camaras modernas)
    // Dimensiones de la imagen origen (rechaza decodificaciones raras)
    maxDimension: 10000,
    minDimension: 48,
    // Lado mayor al que se comprime la foto (nitidez vs peso)
    targetMaxDimension: 1280,
    // Calidad JPEG inicial de la exportacion
    jpegQuality: 0.8,
    // Limite del dataURL final (espejo de LIMITS.maxPhotoBytes)
    maxPhotoBytes: 3 * 1024 * 1024    // 3 MB base64
  },

  // Anti-abuso (filtro de subidas mal intencionadas)
  // La capa cliente es BEST-EFFORT: frena al vago, no al
  // determinado. El backend (FASE 2) debe revalidar todo.
  abuse: {
    // Huella de dispositivo (FingerprintJS) -> ID estable anonimo
    fingerprintEnabled: true,

    // ID de respaldo si la huella falla (ad blocker, privacidad)
    fallbackKey: "kaipy.device",

    // Rate-limit de reportes por dispositivo
    submissionKey: "kaipy.abuse.submissions",
    rateLimitWindowMs: 10 * 60 * 1000, // ventana de 10 min
    rateLimitMax: 3,                   // max reportes por ventana

    // Duplicados del MISMO dispositivo: misma categoria + radio + ventana
    duplicateWindowMs: 30 * 60 * 1000, // 30 min
    duplicateRadiusM: 100
  }
};
