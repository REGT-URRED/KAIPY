/* ============================================
   API / middleware
   Validacion de entrada en servidor (OWASP) y
   rate-limiting por dispositivo + IP para
   prevenir abuso de votos / spam de reportes.
   El usuario anonimo no se autentica: envia un
   X-Device-Id (huella anonima) opcional que solo
   sirve para correlacion y limites suaves.
   ============================================ */
import { categories, LIMITS } from "./config.js";

// MIME de foto permitidos. Estricto a proposito:
// "data:image/..." generico aceptaria svg+xml u
// otros que rompen el atributo src (stored XSS).
const PHOTO_PREFIXES = [
  "data:image/jpeg;base64,",
  "data:image/png;base64,",
  "data:image/webp;base64,"
];

// Cache de intentos: { key: { start, count } }
const hits = new Map();

// Poda de entradas viejas: evita que el Map crezca
// sin limite (DoS de memoria) con keys rotativas.
function prune(now) {
  if (hits.size < 10000) { return; }
  for (const [k, v] of hits) {
    if (now - v.start > LIMITS.windowMs) { hits.delete(k); }
  }
}

export function rateLimit(scope, max) {
  return function (req, res, next) {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    // X-Device-Id: huella anonima que envia el cliente.
    // Se combina con IP para no bloquear a una NAT
    // completa (todos comparten IP) ni permitir que
    // borrar la huella evada el limite por completo.
    const device = req.get("x-device-id") || "none";
    const now = Date.now();
    prune(now);

    const key = scope + ":" + device + ":" + ip;
    const entry = hits.get(key) || { start: now, count: 0 };

    if (now - entry.start > LIMITS.windowMs) {
      entry.start = now;
      entry.count = 0;
    }
    entry.count += 1;
    hits.set(key, entry);

    if (entry.count > max) {
      return res.status(429).json({ error: "Demasiadas solicitudes. Intenta de nuevo en un momento." });
    }
    next();
  };
}

// Limpia texto libre como el frontend (utils.sanitizeText):
// el servidor NUNCA confia en el cliente (OWASP).
// Devuelve el texto saneado y truncado a max.
export function cleanText(value, max) {
  return String(value == null ? "" : value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

// Foto valida: dataURL con MIME de la whitelist, base64
// bien formado y tamano decodificado dentro del limite.
function validPhoto(photo) {
  if (typeof photo !== "string") { return false; }
  if (Buffer.byteLength(photo, "utf8") > LIMITS.maxPhotoBytes) { return false; }

  const prefix = PHOTO_PREFIXES.find((p) => photo.startsWith(p));
  if (!prefix) { return false; }

  const b64 = photo.slice(prefix.length).replace(/\s+/g, "");
  if (!/^[A-Za-z0-9+/=]+$/.test(b64)) { return false; }

  return Math.floor(b64.length * 3 / 4) <= LIMITS.maxPhotoBytes;
}

// Valida un cuerpo de reporte. Devuelve null si es valido
// o un mensaje de error (string) si falla.
export function validateReport(body) {
  const b = body || {};

  // Validar longitud ANTES de sanear: si truncamos primero,
  // esta validacion nunca dispararia (codigo muerto).
  if (b.title == null || String(b.title).trim() === "") { return "El titulo es obligatorio."; }
  if (String(b.title).length > LIMITS.maxTitle) { return "El titulo no puede superar " + LIMITS.maxTitle + " caracteres."; }
  if (String(b.description || "").length > LIMITS.maxDescription) { return "La descripcion no puede superar " + LIMITS.maxDescription + " caracteres."; }
  if (categories.indexOf(b.category) === -1) { return "Categoria no valida."; }

  const title = cleanText(b.title, LIMITS.maxTitle);
  const description = cleanText(b.description, LIMITS.maxDescription);
  if (!title) { return "El titulo es obligatorio."; }

  if (b.lat != null) {
    const lat = Number(b.lat);
    if (Number.isNaN(lat) || lat < -90 || lat > 90) { return "Latitud invalida."; }
  }
  if (b.lon != null) {
    const lon = Number(b.lon);
    if (Number.isNaN(lon) || lon < -180 || lon > 180) { return "Longitud invalida."; }
  }

  if (b.photo != null && !validPhoto(b.photo)) {
    return "Foto invalida: debe ser JPG, PNG o WebP en dataURL y no superar el tamano permitido.";
  }

  return null;
}
