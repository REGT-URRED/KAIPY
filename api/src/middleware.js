/* ============================================
   API / middleware
   Validacion de entrada en servidor (OWASP) y
   rate-limiting simple por IP para prevenir
   abuso de votos / spam de reportes.
   ============================================ */
import { categories, LIMITS } from "./config.js";

// Cache de intentos: { key: { start, count } }
const hits = new Map();

export function rateLimit(scope, max) {
  return function (req, res, next) {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const key = scope + ":" + ip;
    const now = Date.now();
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

// Valida un cuerpo de reporte. Devuelve null si es valido
// o un mensaje de error (string) si falla.
export function validateReport(body) {
  const b = body || {};
  const title = typeof b.title === "string" ? b.title.trim() : "";
  const description = typeof b.description === "string" ? b.description.trim() : "";

  if (!title) { return "El titulo es obligatorio."; }
  if (title.length > LIMITS.maxTitle) { return "El titulo no puede superar " + LIMITS.maxTitle + " caracteres."; }
  if (description.length > LIMITS.maxDescription) { return "La descripcion no puede superar " + LIMITS.maxDescription + " caracteres."; }
  if (categories.indexOf(b.category) === -1) { return "Categoria no valida."; }

  if (b.lat != null) {
    const lat = Number(b.lat);
    if (Number.isNaN(lat) || lat < -90 || lat > 90) { return "Latitud invalida."; }
  }
  if (b.lon != null) {
    const lon = Number(b.lon);
    if (Number.isNaN(lon) || lon < -180 || lon > 180) { return "Longitud invalida."; }
  }

  if (b.photo != null) {
    if (typeof b.photo !== "string" || b.photo.indexOf("data:image/") !== 0) {
      return "Foto invalida: debe ser un dataURL de imagen.";
    }
    if (Buffer.byteLength(b.photo, "utf8") > LIMITS.maxPhotoBytes) {
      return "La foto supera el tamano permitido.";
    }
  }

  return null;
}
