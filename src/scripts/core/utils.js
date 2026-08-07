/* ============================================
   CORE / utils
   Funciones puras reutilizables.
   GRASP: high cohesion, low coupling.
   ============================================ */
window.KAIPY = window.KAIPY || {};

window.KAIPY.utils = {
  el: function (id) {
    return document.getElementById(id);
  },

  // Escapa HTML para evitar inyeccion al renderizar datos
  escapeHtml: function (value) {
    var div = document.createElement("div");
    div.textContent = value == null ? "" : String(value);
    return div.innerHTML;
  },

  // Solo devuelve fotos seguras para <img src>:
  // dataURL de la whitelist (espejo del backend) o ruta
  // local sin esquema. Rechaza svg+xml, javascript:, //,
  // o cualquier valor que pueda romper el atributo (XSS).
  safePhoto: function (value) {
    if (typeof value !== "string" || !value) { return null; }
    if (/^data:image\/(jpeg|png|webp);base64,/.test(value)) { return value; }
    if (/^[a-zA-Z0-9_\-./]+$/.test(value) && value.indexOf("//") === -1) { return value; }
    return null;
  },

  // Formatea una fecha ISO a texto corto local
  formatDate: function (iso) {
    if (!iso) { return "Fecha desconocida"; }
    var d = new Date(iso);
    if (isNaN(d.getTime())) { return "Fecha desconocida"; }
    return d.toLocaleDateString("es-PE", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  },

  // Formatea coordenadas a 5 decimales
  formatCoords: function (lat, lon) {
    if (lat == null || lon == null) { return "Sin ubicacion"; }
    return lat.toFixed(5) + ", " + lon.toFixed(5);
  },

  // Estado de un reporte: la UI registra votos por dispositivo
  // (localStorage: persiste entre sesiones, a diferencia de
  // sessionStorage). No es una frontera de seguridad; el backend
  // revalidara por huella de dispositivo (ver docs/ANTIABUSO.md).
  hasVoted: function (id) {
    var voted = JSON.parse(localStorage.getItem(window.KAIPY.config.votedKey) || "[]");
    return voted.indexOf(id) !== -1;
  },

  markVoted: function (id) {
    var voted = JSON.parse(localStorage.getItem(window.KAIPY.config.votedKey) || "[]");
    if (voted.indexOf(id) === -1) {
      voted.push(id);
      localStorage.setItem(window.KAIPY.config.votedKey, JSON.stringify(voted));
    }
  },

  // Normaliza texto libre (titulo/descripcion) antes de guardar:
  // quita espacios de mas y caracteres de control (defensa contra
  // inyeccion de contenido raro; el render ya escapa con textContent
  // o escapeHtml, pero mejor limpiar en la entrada).
  sanitizeText: function (value, max) {
    var out = String(value == null ? "" : value)
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (max) { out = out.slice(0, max); }
    return out;
  },

  // Notificacion breve (toast)
  toast: function (msg) {
    var el = document.querySelector(".toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "toast";
      el.setAttribute("role", "status");
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("is-visible");
    clearTimeout(el._timer);
    el._timer = setTimeout(function () {
      el.classList.remove("is-visible");
    }, 2400);
  },

  // Gradiente placeholder para reportes sin foto (por categoria)
  placeholderStyle: function (category) {
    var hues = { "Alumbrado publico": 210, "Baches y veredas": 30, "Basura y residuos": 140, "Areas verdes": 150, "Senalizacion": 45, "Seguridad": 260, "Agua y desague": 195, "Otros": 320 };
    var h = hues[category] != null ? hues[category] : 24;
    return "background:linear-gradient(135deg,hsl(" + h + ",65%,55%),hsl(" + (h + 40) + ",65%,40%));";
  },

  // Distancia en metros entre dos coordenadas (haversine)
  distanceMeters: function (lat1, lon1, lat2, lon2) {
    var R = 6371000;
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLon = (lon2 - lon1) * Math.PI / 180;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  },

  formatDistance: function (m) {
    if (m == null) { return "Sin ubicacion"; }
    if (m < 1000) { return "a " + Math.round(m) + " m"; }
    return "a " + (m / 1000).toFixed(1) + " km";
  }
};
